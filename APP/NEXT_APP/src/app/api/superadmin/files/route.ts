/**
 * SuperAdmin Files API
 * GET: Secure file browser with path traversal protection.
 * SUPERADMIN-only access.
 * 
 * Security: OWASP A01 (path traversal), restricted base paths.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runParameterizedCommand } from '@/lib/vps/command-executor'
import { parseDirectoryListing } from '@/lib/vps/parsers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const path = searchParams.get('path') || '/home/teguihd'
        const action = searchParams.get('action') || 'list' // list | read

        if (action === 'read') {
            // Read file contents
            const result = await runParameterizedCommand('files.read', path)
            if (result.stdout === 'FILE_NOT_READABLE') {
                return NextResponse.json({ error: 'Archivo no legible' }, { status: 404 })
            }
            if (result.stdout === 'PATH_NOT_ALLOWED' || result.stdout === 'SYMLINK_NOT_ALLOWED') {
                return NextResponse.json({ error: 'Ruta no permitida' }, { status: 403 })
            }
            return NextResponse.json({
                success: true,
                data: {
                    path,
                    content: result.stdout,
                    size: result.stdout.length,
                },
            })
        }

        // List directory
        const [listResult, statResult] = await Promise.all([
            runParameterizedCommand('files.list', path),
            runParameterizedCommand('files.stat', path).catch(() => null),
        ])

        if (listResult.stdout === 'PATH_NOT_FOUND') {
            return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })
        }

        if (listResult.stdout === 'PATH_NOT_ALLOWED' || listResult.stdout === 'SYMLINK_NOT_ALLOWED') {
            return NextResponse.json({ error: 'Ruta no permitida' }, { status: 403 })
        }

        const entries = parseDirectoryListing(listResult.stdout)

        return NextResponse.json({
            success: true,
            data: {
                path,
                entries,
                stat: statResult?.stdout,
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error'
        if (message === 'Invalid path') {
            return NextResponse.json({ error: 'Ruta no permitida' }, { status: 403 })
        }
        console.error('[SuperAdmin API] Files error:', error)
        return NextResponse.json({ error: 'Error al acceder archivos' }, { status: 500 })
    }
}
