/**
 * SuperAdmin Changes API
 * GET: Git log + recently modified files.
 * SUPERADMIN-only access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand, runParameterizedCommand } from '@/lib/vps/command-executor'
import { parseGitLog, parseRecentFiles } from '@/lib/vps/parsers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const commitHash = searchParams.get('commit')

        // If specific commit requested, show diff
        if (commitHash) {
            const diffResult = await runParameterizedCommand('changes.git_diff', commitHash)
            return NextResponse.json({
                success: true,
                data: { diff: diffResult.stdout },
            })
        }

        const [gitResult, recentResult, statusResult] = await Promise.all([
            runCommand('changes.git_log'),
            runCommand('changes.recent_files'),
            runCommand('changes.git_status'),
        ])

        const commits = parseGitLog(gitResult.stdout)
        const recentFiles = parseRecentFiles(recentResult.stdout)

        return NextResponse.json({
            success: true,
            data: {
                commits,
                recentFiles,
                gitStatus: statusResult.stdout === 'NO_GIT_REPO' ? null : statusResult.stdout,
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[SuperAdmin API] Changes error:', error)
        return NextResponse.json({ error: 'Error al obtener cambios' }, { status: 500 })
    }
}
