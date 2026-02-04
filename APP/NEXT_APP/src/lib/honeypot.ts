/**
 * Honeypot API Routes
 * 
 * These routes are intentionally vulnerable-looking to attract attackers.
 * Any access to these routes is immediately flagged and the IP is blocked.
 * 
 * Common targets:
 * - /api/admin/backup (fake backup endpoint)
 * - /api/config (fake config endpoint)
 * - /api/.env (fake env endpoint)
 * - /api/debug (fake debug endpoint)
 * 
 * @module honeypot
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { SecurityLogger } from '@/lib/security-logger'

async function getClientInfo() {
    const headersList = await headers()
    return {
        ipAddress: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            headersList.get('x-real-ip') || 'unknown',
        userAgent: headersList.get('user-agent') || 'unknown',
        referer: headersList.get('referer') || undefined,
        origin: headersList.get('origin') || undefined
    }
}

export async function honeypotHandler(
    request: NextRequest,
    honeypotType: string
): Promise<NextResponse> {
    const client = await getClientInfo()

    // Log the attack attempt with HIGH severity
    SecurityLogger.apiAbuse({
        ipAddress: client.ipAddress,
        userAgent: client.userAgent,
        endpoint: request.nextUrl.pathname,
        abuseType: `HONEYPOT_${honeypotType.toUpperCase()}`,
        details: {
            method: request.method,
            referer: client.referer,
            origin: client.origin,
            queryParams: Object.fromEntries(request.nextUrl.searchParams),
            honeypotType
        }
    })

    console.error(`🍯 [HONEYPOT] Attack detected!`, {
        type: honeypotType,
        ip: client.ipAddress,
        path: request.nextUrl.pathname,
        method: request.method,
        ua: client.userAgent?.substring(0, 100)
    })

    // Return a fake response to waste attacker's time
    // Different responses based on honeypot type
    switch (honeypotType) {
        case 'backup':
            // Fake backup endpoint - return fake "processing" response
            return NextResponse.json(
                {
                    status: 'processing',
                    message: 'Backup initiated, please wait...',
                    estimatedTime: '5 minutes',
                    backupId: `bkp-${Date.now()}`
                },
                { status: 202 }
            )

        case 'config':
            // Fake config - return decoy data (honeypot trap)
            return NextResponse.json(
                {
                    database: 'postgres://fake:fake@localhost:5432/fake',
                    key: 'PLACEHOLDER_NOT_REAL_KEY',
                    token: 'HONEYPOT_TRAP_DO_NOT_USE'
                },
                { status: 200 }
            )

        case 'env':
            // Fake .env - return decoy environment (honeypot trap)
            return new NextResponse(
                `DATABASE_URL=postgres://fake:fake@localhost:5432/fake
APP_TOKEN=HONEYPOT_PLACEHOLDER_VALUE
APP_KEY=NOT_A_REAL_KEY_TRAP
TRAP_VALUE=honeypot-trap-detected
`,
                {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                }
            )

        case 'debug':
            // Fake debug endpoint
            return NextResponse.json(
                {
                    debug: true,
                    version: '1.0.0',
                    environment: 'development',
                    stack: 'Next.js + PostgreSQL',
                    internalIp: '10.0.0.1',
                    pid: 12345
                },
                { status: 200 }
            )

        case 'phpMyAdmin':
        case 'wp-admin':
        case 'admin':
            // Common attack vectors - return 404 after logging
            return NextResponse.json(
                { error: 'Not Found' },
                { status: 404 }
            )

        default:
            // Generic response
            return NextResponse.json(
                { status: 'ok' },
                { status: 200 }
            )
    }
}

// Handler for common attack paths
export async function catchAllHoneypot(request: NextRequest): Promise<NextResponse | null> {
    const path = request.nextUrl.pathname.toLowerCase()

    // Common attack patterns to catch
    const honeypotPatterns: Array<{ pattern: RegExp; type: string }> = [
        // Backup/dump attempts
        { pattern: /\/(backup|dump|export|db|database)/i, type: 'backup' },

        // Config file attempts
        { pattern: /\/(config|settings|\.env|env\.)/i, type: 'config' },

        // Debug/admin attempts
        { pattern: /\/(debug|trace|status|health-check)/i, type: 'debug' },

        // PHP attacks
        { pattern: /\.(php|asp|aspx|jsp)$/i, type: 'php_attack' },
        { pattern: /\/php(my)?admin/i, type: 'phpMyAdmin' },

        // WordPress attacks
        { pattern: /\/wp-(admin|login|content|includes)/i, type: 'wp-admin' },

        // Common vulnerability scans
        { pattern: /\/(actuator|swagger|graphql|console)/i, type: 'scanner' },
        { pattern: /\/\.(git|svn|hg|bzr)/i, type: 'vcs_exposure' },
        { pattern: /\/(cgi-bin|scripts|shell)/i, type: 'shell' },

        // Sensitive file attempts
        { pattern: /\/(passwd|shadow|id_rsa|\.ssh)/i, type: 'sensitive_file' },
        { pattern: /\/(aws|secrets)/i, type: 'credentials' },

        // Infrastructure config attempts
        { pattern: /\/(docker-compose\.yml|Dockerfile|k8s\.yml|kubernetes)/i, type: 'infra_exposure' },
        { pattern: /\/(composer\.json|package\.json|yarn\.lock|pnpm-lock\.yaml)/i, type: 'dependency_exposure' },

        // === ENHANCED PATTERNS (Issue #7) ===

        // Log4j / Log4Shell exploit (CVE-2021-44228)
        { pattern: /\$\{(jndi|lookup|lower|upper)/i, type: 'log4shell' },
        { pattern: /\/(jndi|ldap|rmi):/i, type: 'log4shell' },

        // Spring4Shell (CVE-2022-22965)
        { pattern: /class\.module\.classLoader/i, type: 'spring4shell' },

        // SQL Injection patterns in URL
        { pattern: /(union\s+(all\s+)?select|order\s+by\s+\d|--\+|;\s*drop|;\s*delete)/i, type: 'sql_injection' },
        { pattern: /('|%27)\s*(or|and)\s*('|%27|\d)/i, type: 'sql_injection' },
        { pattern: /(sleep\(|benchmark\(|waitfor\s+delay)/i, type: 'sql_injection_timing' },

        // XSS attempts in URL
        { pattern: /(<script|javascript:|on(load|error|click)=)/i, type: 'xss_attempt' },

        // Path traversal
        { pattern: /(\.\.\/|\.\.\\|%2e%2e%2f)/i, type: 'path_traversal' },

        // Server-Side Template Injection (SSTI)
        { pattern: /(\{\{|\$\{|<%|#{)/i, type: 'ssti_attempt' },

        // Remote Code Execution attempts
        { pattern: /(eval\(|exec\(|system\(|passthru\(|shell_exec)/i, type: 'rce_attempt' },

        // LFI/RFI attempts
        { pattern: /(\/etc\/passwd|c:\\windows|file:\/\/|php:\/\/)/i, type: 'lfi_rfi' },

        // API discovery scans
        { pattern: /\/(api\/v?\d|openapi|swagger\.json|api-docs)/i, type: 'api_scan' },

        // Admin panel scans
        { pattern: /\/(admin|administrator|manager|webadmin|siteadmin)/i, type: 'admin_scan' },

        // Webshell patterns
        { pattern: /\/(cmd|shell|c99|r57|webshell)/i, type: 'webshell' },
    ]

    for (const { pattern, type } of honeypotPatterns) {
        if (pattern.test(path)) {
            return honeypotHandler(request, type)
        }
    }

    return null  // Not a honeypot match
}
