/**
 * SuperAdmin Firewall API
 * 
 * GET: UFW status + Fail2Ban status with banned IPs
 * POST: Block IP via UFW
 * DELETE: Unblock IP via UFW
 * 
 * SUPERADMIN-only access.
 * Security: NIST SC-7 (boundary protection), MITRE T1110 (brute force)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand, runParameterizedCommand } from '@/lib/vps/command-executor'
import { parseUFWStatus, parseFail2BanStatus, parseFail2BanJail } from '@/lib/vps/parsers'
import { lookupIPs } from '@/lib/vps/geo-ip'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const [ufwResult, fail2banResult] = await Promise.all([
            runCommand('firewall.ufw_status'),
            runCommand('firewall.fail2ban_status'),
        ])

        const ufw = parseUFWStatus(ufwResult.stdout)
        const fail2ban = parseFail2BanStatus(fail2banResult.stdout)

        // Get details for each jail
        const jailDetails = await Promise.all(
            fail2ban.jails.map(async (jailName) => {
                const result = await runParameterizedCommand('firewall.fail2ban_jail', jailName)
                return parseFail2BanJail(result.stdout, jailName)
            })
        )

        // Collect all banned IPs for GeoIP
        const allBannedIPs = jailDetails.flatMap(j => j.bannedIPs)
        const geoData = allBannedIPs.length > 0 ? await lookupIPs(allBannedIPs) : new Map()

        const enrichedJails = jailDetails.map(jail => ({
            ...jail,
            bannedIPsEnriched: jail.bannedIPs.map(ip => ({
                ip,
                geo: geoData.get(ip) || { country: 'Unknown', flag: '🌐', city: '' },
            })),
        }))

        return NextResponse.json({
            success: true,
            data: {
                ufw,
                fail2ban: { jails: enrichedJails },
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[SuperAdmin API] Firewall error:', error)
        return NextResponse.json({ error: 'Error al obtener estado del firewall' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { ip } = body

        if (!ip || typeof ip !== 'string') {
            return NextResponse.json({ error: 'IP requerida' }, { status: 400 })
        }

        console.log(`[SuperAdmin] SUPERADMIN ${session.user.email} blocking IP: ${ip}`)

        const result = await runParameterizedCommand('firewall.block_ip', ip)

        if (result.exitCode !== 0) {
            return NextResponse.json(
                { success: false, message: 'No se pudo bloquear la IP en este momento.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `IP ${ip} bloqueada exitosamente`,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error'
        if (message === 'Invalid IP address') {
            return NextResponse.json({ error: 'IP inválida' }, { status: 400 })
        }
        return NextResponse.json({ error: 'No se pudo bloquear la IP' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { ip } = body

        if (!ip || typeof ip !== 'string') {
            return NextResponse.json({ error: 'IP requerida' }, { status: 400 })
        }

        console.log(`[SuperAdmin] SUPERADMIN ${session.user.email} unblocking IP: ${ip}`)

        const result = await runParameterizedCommand('firewall.unblock_ip', ip)

        if (result.exitCode !== 0) {
            return NextResponse.json(
                { success: false, message: 'No se pudo desbloquear la IP en este momento.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `IP ${ip} desbloqueada exitosamente`,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error'
        if (message === 'Invalid IP address') {
            return NextResponse.json({ error: 'IP inválida' }, { status: 400 })
        }
        return NextResponse.json({ error: 'No se pudo desbloquear la IP' }, { status: 500 })
    }
}
