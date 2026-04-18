/**
 * SuperAdmin Domains & SSL API
 * GET: Nginx sites + Certbot SSL certificate status.
 * SUPERADMIN-only access.
 */

import { NextResponse } from 'next/server'
import { verifySuperAdminForApi } from '@/lib/auth/dal'
import { runCommand } from '@/lib/vps/command-executor'
import { parseSSLCerts } from '@/lib/vps/parsers'

export const dynamic = 'force-dynamic'

function sanitizeNginxPreview(raw: string): string {
    return raw
        .replace(/(^\s*ssl_certificate_key\s+).+;$/gim, '$1[REDACTED];')
        .replace(/(^\s*auth_basic_user_file\s+).+;$/gim, '$1[REDACTED];')
        .replace(/(^\s*set\s+\$\w*(?:token|secret|password)\w*\s+).+;$/gim, '$1[REDACTED];')
        .replace(/(proxy_set_header\s+Authorization\s+).+;$/gim, '$1[REDACTED];')
}

export async function GET() {
    try {
        const session = await verifySuperAdminForApi()
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const [sitesResult, sslResult, nginxResult] = await Promise.all([
            runCommand('domains.nginx_sites'),
            runCommand('domains.ssl_expiry'),
            runCommand('domains.nginx_test'),
        ])

        const certs = parseSSLCerts(sslResult.stdout)

        // Parse nginx sites
        const sites = sitesResult.stdout === 'NO_NGINX' ? [] :
            sitesResult.stdout.split('\n')
                .filter(l => l.trim() && !l.startsWith('total'))
                .map(line => {
                    const parts = line.split(/\s+/)
                    const name = parts[parts.length - 1] || ''
                    const isSymlink = line.includes('->')
                    const target = isSymlink ? parts[parts.length - 1] : ''
                    return {
                        name: isSymlink ? parts[parts.length - 3]?.replace(',', '') || name : name,
                        target,
                        isSymlink,
                    }
                })

        return NextResponse.json({
            success: true,
            data: {
                sites,
                certificates: certs,
                nginxConfigPreview: sanitizeNginxPreview(nginxResult.stdout).substring(0, 2000),
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[SuperAdmin API] Domains error:', error)
        return NextResponse.json({ error: 'Error al obtener dominios' }, { status: 500 })
    }
}
