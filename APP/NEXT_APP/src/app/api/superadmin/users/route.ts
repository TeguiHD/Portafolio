/**
 * SuperAdmin Users API
 * GET: VPS system users with sudo status.
 * SUPERADMIN-only access.
 */

import { NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand } from '@/lib/vps/command-executor'
import { parseUsers } from '@/lib/vps/parsers'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const [usersResult, sudoResult, lastLoginResult] = await Promise.all([
            runCommand('users.list'),
            runCommand('users.sudo_group'),
            runCommand('users.last_login'),
        ])

        const users = parseUsers(usersResult.stdout, sudoResult.stdout)

        return NextResponse.json({
            success: true,
            data: { users, lastLoginRaw: lastLoginResult.stdout },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[SuperAdmin API] Users error:', error)
        return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }
}
