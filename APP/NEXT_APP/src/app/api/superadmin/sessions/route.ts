/**
 * SuperAdmin Sessions API
 * 
 * GET: Active VPS sessions, login history, failed login attempts.
 * SUPERADMIN-only access.
 */

import { NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand, type CommandId } from '@/lib/vps/command-executor'
import type { SSHCommandResult } from '@/lib/vps/ssh-client'
import { parseSessions, parseLoginHistory } from '@/lib/vps/parsers'
import { lookupIPs } from '@/lib/vps/geo-ip'

export const dynamic = 'force-dynamic'

function buildFallbackResult(stdout = ''): SSHCommandResult {
    return {
        stdout,
        stderr: '',
        exitCode: 1,
        duration: 0,
    }
}

async function safeRun(commandId: CommandId, fallbackStdout = ''): Promise<SSHCommandResult> {
    try {
        return await runCommand(commandId)
    } catch (error) {
        console.error(`[SuperAdmin API] Failed command ${commandId}:`, error)
        return buildFallbackResult(fallbackStdout)
    }
}

export async function GET() {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const [wResult, lastResult, lastbResult] = await Promise.all([
            safeRun('sessions.w'),
            safeRun('sessions.last'),
            safeRun('sessions.lastb', 'NO_LASTB_ACCESS'),
        ])

        const activeSessions = parseSessions(wResult.stdout)
        const loginHistory = parseLoginHistory(lastResult.stdout)
        const failedLogins = parseLoginHistory(lastbResult.stdout)
        const warnings: string[] = []

        if (!wResult.stdout.trim()) {
            warnings.push('No se pudieron leer las sesiones activas del VPS.')
        }
        if (!lastResult.stdout.trim()) {
            warnings.push('No se pudo leer el historial reciente de accesos.')
        }
        if (lastbResult.stdout.includes('NO_LASTB_ACCESS')) {
            warnings.push('No hubo permisos para leer intentos fallidos con lastb.')
        }

        // GeoIP for IPs in login history
        const allIPs = [
            ...loginHistory.map(l => l.from),
            ...failedLogins.map(l => l.from),
            ...activeSessions.map(s => s.from),
        ].filter(ip => ip && ip !== '-' && ip !== '0.0.0.0')

        const geoData = allIPs.length > 0
            ? await lookupIPs(allIPs).catch((error) => {
                console.error('[SuperAdmin API] Sessions geo lookup error:', error)
                warnings.push('No se pudo completar la geolocalización de algunas IPs.')
                return new Map()
            })
            : new Map()

        const enrichedActive = activeSessions.map(s => ({
            ...s,
            geo: geoData.get(s.from),
        }))
        const enrichedHistory = loginHistory.map(l => ({
            ...l,
            geo: geoData.get(l.from),
        }))
        const enrichedFailed = failedLogins.map(l => ({
            ...l,
            geo: geoData.get(l.from),
        }))

        const uniqueSourceIPs = new Set([
            ...enrichedActive.map(item => item.from),
            ...enrichedHistory.map(item => item.from),
            ...enrichedFailed.map(item => item.from),
        ].filter(ip => ip && ip !== '-' && ip !== '0.0.0.0')).size

        return NextResponse.json({
            success: true,
            data: {
                active: enrichedActive,
                history: enrichedHistory,
                failed: enrichedFailed,
                summary: {
                    activeCount: enrichedActive.length,
                    historyCount: enrichedHistory.length,
                    failedCount: enrichedFailed.length,
                    uniqueSourceIPs,
                    activeUsers: new Set(enrichedActive.map(item => item.user).filter(Boolean)).size,
                },
                warnings,
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[SuperAdmin API] Sessions error:', error)
        return NextResponse.json({ error: 'Error al obtener sesiones' }, { status: 500 })
    }
}
