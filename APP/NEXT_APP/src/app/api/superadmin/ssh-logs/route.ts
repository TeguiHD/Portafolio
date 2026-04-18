/**
 * SuperAdmin SSH Logs API
 * 
 * Returns parsed SSH authentication logs with GeoIP data.
 * Supports filtering by success/failed, with pagination.
 * SUPERADMIN-only access.
 * 
 * Security: NIST AU-3 (audit content), AU-6 (audit review)
 * 
 * @module api/superadmin/ssh-logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand, type CommandId } from '@/lib/vps/command-executor'
import type { SSHCommandResult } from '@/lib/vps/ssh-client'
import { parseAuthLog } from '@/lib/vps/parsers'
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

export async function GET(request: NextRequest) {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all' // all | failed | accepted
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

        // Fetch appropriate log
        let logResult: SSHCommandResult
        switch (filter) {
            case 'failed':
                logResult = await safeRun('ssh.auth_log_failed', 'NO_LOG_ACCESS')
                break
            case 'accepted':
                logResult = await safeRun('ssh.auth_log_accepted', 'NO_LOG_ACCESS')
                break
            default:
                logResult = await safeRun('ssh.auth_log', 'NO_LOG_ACCESS')
        }

        const warnings: string[] = []
        if (logResult.stdout.includes('NO_LOG_ACCESS')) {
            warnings.push('No se pudieron leer los logs SSH del host con los permisos actuales.')
        }

        // Parse entries
        let entries = parseAuthLog(logResult.stdout)

        // Apply limit
        entries = entries.slice(-limit)

        // Reverse so newest first
        entries.reverse()

        // GeoIP lookup for all unique IPs
        const uniqueIPs = [...new Set(entries.map(e => e.ip).filter(Boolean))]
        const geoData = uniqueIPs.length > 0
            ? await lookupIPs(uniqueIPs).catch((error) => {
                console.error('[SuperAdmin API] SSH geo lookup error:', error)
                warnings.push('No se pudo completar la geolocalización de algunas IPs SSH.')
                return new Map()
            })
            : new Map()

        // Enrich entries with geo data
        const enrichedEntries = entries.map(entry => {
            const geo = geoData.get(entry.ip)
            return {
                ...entry,
                country: geo?.country || 'Unknown',
                countryCode: geo?.countryCode || '',
                city: geo?.city || '',
                flag: geo?.flag || '🌐',
            }
        })

        // Summary stats
        const totalFailed = enrichedEntries.filter(e => !e.success).length
        const totalAccepted = enrichedEntries.filter(e => e.success).length
        const uniqueAttackerIPs = new Set(
            enrichedEntries.filter(e => !e.success).map(e => e.ip)
        ).size

        // Brute force detection: IPs with ≥5 failed attempts
        const ipFailCounts = new Map<string, number>()
        enrichedEntries.filter(e => !e.success).forEach(e => {
            ipFailCounts.set(e.ip, (ipFailCounts.get(e.ip) || 0) + 1)
        })
        const bruteForceIPs = Array.from(ipFailCounts.entries())
            .filter(([, count]) => count >= 5)
            .map(([ip, count]) => ({
                ip,
                count,
                geo: geoData.get(ip),
            }))
            .sort((a, b) => b.count - a.count)

        const topSourceIPs = Array.from(
            enrichedEntries.reduce((acc, entry) => {
                const current = acc.get(entry.ip) || {
                    ip: entry.ip,
                    count: 0,
                    successCount: 0,
                    failureCount: 0,
                    country: entry.country,
                    flag: entry.flag,
                }

                current.count += 1
                if (entry.success) current.successCount += 1
                else current.failureCount += 1

                acc.set(entry.ip, current)
                return acc
            }, new Map<string, {
                ip: string
                count: number
                successCount: number
                failureCount: number
                country: string
                flag: string
            }>()).values()
        )
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        return NextResponse.json({
            success: true,
            data: enrichedEntries,
            summary: {
                total: enrichedEntries.length,
                failed: totalFailed,
                accepted: totalAccepted,
                uniqueAttackerIPs,
                bruteForceIPs,
                topSourceIPs,
            },
            warnings,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[SuperAdmin API] SSH logs error:', error)
        return NextResponse.json(
            { error: 'Error al obtener logs SSH' },
            { status: 500 }
        )
    }
}
