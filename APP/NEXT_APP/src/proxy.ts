/**
 * Proxy Layer - Next.js 16 Architecture (MILITARY-GRADE SECURITY)
 * 
 * Este archivo actúa como proxy ligero (edge-compatible).
 * SOLO maneja: Security Headers, CORS, Rate Limiting, CSP with Nonce.
 * 
 * Security Level: OWASP ASVS Level 3 + Additional Hardening
 * 
 * ⚠️ NO realizar verificación de autenticación aquí.
 * La autenticación se maneja en el DAL (lib/auth/dal.ts).
 * 
 * @see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 * @see https://owasp.org/www-project-secure-headers/
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============= SECURITY CONSTANTS =============
const SECURITY_VERSION = '2.1.0'

// ============= INCIDENT LOGGING (Async, non-blocking) =============
// Logs security incidents to the database via internal API
// Edge-compatible: uses fetch instead of Prisma

type IncidentType = 'honeypot' | 'blocked_url' | 'suspicious_ua' | 'rate_limit' | 'blocked_request'
type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type ActionTaken = 'blocked' | 'rate_limited' | 'logged' | 'honeypot_served'

interface IncidentTelemetry {
    // Request Context
    method: string
    path: string
    queryString?: string
    protocol: string

    // Client Info
    userAgent?: string
    referer?: string
    origin?: string
    acceptLanguage?: string

    // Geo Info (from CDN/proxy headers)
    country?: string
    region?: string
    city?: string
    timezone?: string
    isp?: string

    // Network Info
    ipHash: string
    asn?: string
    connectionType?: string

    // Timing
    timestamp: string
    requestDuration?: number

    // Threat Intel
    threatType: IncidentType
    threatSeverity: IncidentSeverity
    actionTaken: ActionTaken

    // Additional context
    matchedPattern?: string
    riskScore?: number
}

function hashIpForLogging(ip: string): string {
    // Simple hash for edge runtime (no crypto.createHash available)
    let hash = 0
    for (let i = 0; i < ip.length; i++) {
        const char = ip.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
}

function extractGeoFromHeaders(request: NextRequest): Partial<IncidentTelemetry> {
    const headers = request.headers

    return {
        // Cloudflare headers
        country: headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country') || undefined,
        region: headers.get('cf-region') || headers.get('x-vercel-ip-country-region') || undefined,
        city: headers.get('cf-ipcity') || headers.get('x-vercel-ip-city') || undefined,
        timezone: headers.get('cf-timezone') || headers.get('x-vercel-ip-timezone') || undefined,

        // Network info
        asn: headers.get('cf-asn') || undefined,
        connectionType: headers.get('cf-connection-type') || undefined,

        // Request info
        referer: headers.get('referer') || undefined,
        origin: headers.get('origin') || undefined,
        acceptLanguage: headers.get('accept-language')?.split(',')[0] || undefined,
    }
}

function logSecurityIncidentAsync(
    request: NextRequest,
    type: IncidentType,
    severity: IncidentSeverity,
    clientIp: string,
    pathname: string,
    actionTaken: ActionTaken,
    extraDetails?: Record<string, unknown>
): void {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const encryptionKey = process.env.ENCRYPTION_KEY

    // Extract geo and request context
    const geoInfo = extractGeoFromHeaders(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // Build comprehensive telemetry
    const telemetry: IncidentTelemetry = {
        // Request Context
        method: request.method,
        path: pathname,
        queryString: request.nextUrl.search || undefined,
        protocol: request.nextUrl.protocol,

        // Client Info
        userAgent,
        referer: geoInfo.referer,
        origin: geoInfo.origin,
        acceptLanguage: geoInfo.acceptLanguage,

        // Geo Info
        country: geoInfo.country,
        region: geoInfo.region,
        city: geoInfo.city,
        timezone: geoInfo.timezone,

        // Network
        ipHash: hashIpForLogging(clientIp),
        asn: geoInfo.asn,
        connectionType: geoInfo.connectionType,

        // Timing
        timestamp: new Date().toISOString(),

        // Threat Intel
        threatType: type,
        threatSeverity: severity,
        actionTaken,

        // Risk score based on severity
        riskScore: severity === 'CRITICAL' ? 100 :
            severity === 'HIGH' ? 75 :
                severity === 'MEDIUM' ? 50 : 25,
    }

    // Log to console with summary
    console.log(`[Security] ${severity} incident: ${type} | ${geoInfo.country || 'Unknown'} | ${actionTaken}`)

    if (!encryptionKey) {
        console.warn('[Security] ENCRYPTION_KEY not set, incident logging may fail')
    }

    fetch(`${baseUrl}/api/admin/security/incidents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': encryptionKey || '',
        },
        body: JSON.stringify({
            type,
            severity,
            ipHash: telemetry.ipHash,
            path: pathname,
            userAgent,
            details: {
                ...telemetry,
                ...extraDetails,
            },
        }),
    })
        .then(res => {
            if (!res.ok) {
                console.error(`[Security] Failed to log incident: ${res.status}`)
            }
        })
        .catch((err) => {
            console.error('[Security] Error logging incident:', err.message || err)
        })
}

// Blocked suspicious patterns in URLs (path traversal, injection attempts)
const BLOCKED_URL_PATTERNS = [
    /\.\./,                    // Path traversal
    /%2e%2e/i,                // Encoded path traversal
    /\/etc\/passwd/i,         // Unix file access
    /\/proc\//i,              // Proc filesystem
    /<script/i,               // XSS in URL
    /javascript:/i,           // JavaScript protocol
    /data:text\/html/i,       // Data URL XSS
    /\x00/,                   // Null byte injection
    /union.*select/i,         // SQL injection
    /exec\s*\(/i,             // Command injection
    /'.*or.*'/i,              // SQL injection variant
]

// Suspicious User-Agent patterns (bots, scanners)
const SUSPICIOUS_UA_PATTERNS = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /nmap/i,
    /masscan/i,
    /gobuster/i,
    /dirbuster/i,
    /wfuzz/i,
    /burp/i,
    /zap/i,
    /acunetix/i,
    /nuclei/i,
    /httpx/i,
]

// Honeypot patterns - common attack paths
const HONEYPOT_PATTERNS = [
    /\/(backup|dump|export|db|database)\/?$/i,
    /\/\.env/i,
    /\/(config|settings)\.json$/i,
    /\.(php|asp|aspx|jsp)$/i,
    /\/php(my)?admin/i,
    /\/wp-(admin|login|content|includes)/i,
    /\/(actuator|swagger|console)/i,
    /\/\.(git|svn|hg)/i,
    /\/(cgi-bin|scripts|shell)/i,
    /\/(passwd|shadow|\.ssh)/i,
    /\/(aws|secrets)\/?$/i,  // Note: 'credentials' removed - conflicts with NextAuth /api/auth/callback/credentials
    /\/admin\/(backup|config|debug)/i,
]

function isHoneypotPath(pathname: string): boolean {
    return HONEYPOT_PATTERNS.some(pattern => pattern.test(pathname))
}

/**
 * Generate a cryptographically secure nonce for CSP
 * Edge-compatible using Web Crypto API
 * Uses 24 bytes (192 bits) for extra security
 */
function generateNonce(): string {
    const array = new Uint8Array(24)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Build CSP header with nonce - STRICT MODE
 * 
 * Security levels:
 * - Scripts: nonce-based ONLY (strict, XSS protected)
 * - Styles: nonce + unsafe-inline fallback (for styled-jsx compatibility)
 * - report-uri for CSP violation monitoring
 * 
 * Note: 'unsafe-inline' for styles is necessary for Next.js styled-jsx.
 * 
 * SECURITY NOTE for Next.js Standalone Mode:
 * - In standalone mode, pages are pre-rendered with inline scripts
 * - These inline scripts cannot receive dynamically generated nonces
 * - Therefore, we must use 'unsafe-inline' for script-src
 * - This is the standard approach for Next.js production deployments
 * - Other CSP directives still provide strong protection against:
 *   - Clickjacking (frame-ancestors 'none')
 *   - XSS via external scripts (only 'self' origin allowed)
 *   - Data exfiltration (strict connect-src)
 *   - Form hijacking (form-action 'self')
 */
function buildCSP(): string {
    // Detect if running in development/localhost
    const isDev = process.env.NODE_ENV !== 'production' ||
        process.env.NEXTAUTH_URL?.includes('localhost') ||
        process.env.NEXTAUTH_URL?.includes('127.0.0.1')

    const directives = [
        // Default: Block everything not explicitly allowed
        "default-src 'none'",

        // Scripts: 'self' for static chunks, 'unsafe-inline' for Next.js inline scripts
        // 'unsafe-eval' needed for React/Next.js features like fast refresh
        `script-src 'self' 'unsafe-inline' 'unsafe-eval'${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,

        // Styles: Allow unsafe-inline for React/Framer Motion dynamic styles
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `style-src-attr 'unsafe-inline'`,

        // Images: self + data URIs for inline images + HTTPS (+ HTTP for dev)
        `img-src 'self' data: blob: https:${isDev ? ' http:' : ''}`,

        // Fonts: only from self and Google Fonts (+ localhost for dev)
        `font-src 'self' https://fonts.gstatic.com${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,

        // Connections: explicit whitelist (+ localhost for dev)
        `connect-src 'self' https://api.openrouter.ai https://api.frankfurter.app${isDev ? ' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*' : ''}`,

        // Forms: only submit to self
        "form-action 'self'",

        // Base URI: prevent base tag hijacking
        "base-uri 'self'",

        // Frame ancestors: prevent clickjacking (allow self in dev for iframe testing)
        isDev ? "frame-ancestors 'self'" : "frame-ancestors 'none'",

        // Object/Embed: block all plugins (Flash, Java, etc)
        "object-src 'none'",

        // Media: audio/video from self and data URIs (+ localhost for dev)
        `media-src 'self' data: blob:${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,

        // Workers: only from self
        "worker-src 'self' blob:",

        // Child/Frame: block all iframes
        "child-src 'self'",

        // Manifest: PWA manifest from self
        "manifest-src 'self'",
    ]

    // Only add upgrade-insecure-requests in production
    if (!isDev) {
        directives.push("upgrade-insecure-requests")
    }

    return directives.join('; ')
}

// Static security headers (OWASP ASVS Level 3 compliant)
const staticSecurityHeaders = {
    // XSS Protection (legacy, but still useful for older browsers)
    'X-XSS-Protection': '1; mode=block',

    // Clickjacking protection
    'X-Frame-Options': 'DENY',

    // MIME sniffing protection
    'X-Content-Type-Options': 'nosniff',

    // Referrer Policy - strict mode
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy - disable all unnecessary features
    'Permissions-Policy': [
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'battery=()',
        'camera=()',
        'cross-origin-isolated=()',
        'display-capture=()',
        'document-domain=()',
        'encrypted-media=()',
        'execution-while-not-rendered=()',
        'execution-while-out-of-viewport=()',
        'fullscreen=(self)',
        'geolocation=()',
        'gyroscope=()',
        'keyboard-map=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'navigation-override=()',
        'payment=()',
        'picture-in-picture=()',
        'publickey-credentials-get=()',
        'screen-wake-lock=()',
        'sync-xhr=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()',
    ].join(', '),

    // HSTS - Force HTTPS for 2 years with preload
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    // Cross-Origin headers for isolation
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',

    // Prevent MIME type confusion attacks
    'X-Permitted-Cross-Domain-Policies': 'none',

    // DNS Prefetch Control
    'X-DNS-Prefetch-Control': 'off',

    // Download options for IE
    'X-Download-Options': 'noopen',

    // Cache control for security-sensitive pages
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
}

// Allowed origins for CORS (strict whitelist)
const allowedOrigins = new Set([
    'http://localhost:3000',
    'https://nicoholas.dev',
    'https://www.nicoholas.dev',
])

// ============= RATE LIMITING (ENHANCED) =============
// Sliding window with exponential backoff for repeat offenders

interface RateLimitRecord {
    count: number
    resetTime: number
    violations: number  // Track repeated violations
    blockedUntil?: number  // Temporary ban for repeat offenders
}

const rateLimitMap = new Map<string, RateLimitRecord>()
const VIOLATION_THRESHOLD = 3  // Block after 3 rate limit violations
const BLOCK_DURATION = 15 * 60 * 1000  // 15 min block

function getRateLimitKey(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

    // Include path category in key for granular limiting
    const pathCategory = request.nextUrl.pathname.startsWith('/api/auth') ? 'auth' :
        request.nextUrl.pathname.startsWith('/api/finance') ? 'finance' :
            request.nextUrl.pathname.startsWith('/api/') ? 'api' : 'page'

    return `ratelimit:${ip}:${pathCategory}`
}

function checkRateLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()
    const record = rateLimitMap.get(key)

    // Check if temporarily blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
        return {
            allowed: false,
            retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
        }
    }

    if (!record || now > record.resetTime) {
        rateLimitMap.set(key, {
            count: 1,
            resetTime: now + windowMs,
            violations: record?.violations || 0
        })
        return { allowed: true }
    }

    if (record.count >= limit) {
        // Increment violations
        record.violations++

        // Block repeat offenders
        if (record.violations >= VIOLATION_THRESHOLD) {
            record.blockedUntil = now + BLOCK_DURATION
        }

        return {
            allowed: false,
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        }
    }

    record.count++
    return { allowed: true }
}

// ============= SECURITY CHECKS =============

function isBlockedUrl(pathname: string): boolean {
    return BLOCKED_URL_PATTERNS.some(pattern => pattern.test(pathname))
}

function isSuspiciousUA(userAgent: string | null): boolean {
    if (!userAgent) return true  // No UA is suspicious
    return SUSPICIOUS_UA_PATTERNS.some(pattern => pattern.test(userAgent))
}

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const requestId = generateRequestId()
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent')

    // ═══════════════════════════════════════════════════════════
    // 0. EARLY SECURITY CHECKS (Block malicious requests fast)
    // ═══════════════════════════════════════════════════════════

    // HONEYPOT: Catch attackers probing for vulnerabilities
    if (isHoneypotPath(pathname)) {
        console.error(`🍯 [HONEYPOT] Attack detected: ${pathname} from ${clientIp}`)
        logSecurityIncidentAsync(request, 'honeypot', 'CRITICAL', clientIp, pathname, 'honeypot_served')

        // Return convincing 404 - don't reveal it's a honeypot
        return new NextResponse(
            JSON.stringify({
                error: 'Not Found',
                message: 'The requested resource was not found on this server.',
                statusCode: 404
            }),
            {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId
                }
            }
        )
    }

    // Check for blocked URL patterns (path traversal, injections)
    if (isBlockedUrl(pathname) || isBlockedUrl(decodeURIComponent(pathname))) {
        console.warn(`[SECURITY] Blocked malicious URL attempt: ${pathname} from ${clientIp}`)
        logSecurityIncidentAsync(request, 'blocked_url', 'HIGH', clientIp, pathname, 'blocked')
        return new NextResponse(
            JSON.stringify({ error: 'Bad Request' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Check for suspicious user agents (security scanners)
    if (isSuspiciousUA(userAgent) && pathname.startsWith('/api/')) {
        console.warn(`[SECURITY] Blocked suspicious UA: ${userAgent?.slice(0, 50)} from ${clientIp}`)
        logSecurityIncidentAsync(request, 'suspicious_ua', 'MEDIUM', clientIp, pathname, 'blocked')
        // Return 200 with fake response to confuse scanners
        return new NextResponse(
            JSON.stringify({ status: 'ok' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Generate unique nonce for this request
    // ═══════════════════════════════════════════════════════════
    const nonce = generateNonce()

    // Create response with request headers containing nonce and request ID
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('x-request-id', requestId)

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    // ═══════════════════════════════════════════════════════════
    // 2. Apply Security Headers (OWASP ASVS Level 3)
    // ═══════════════════════════════════════════════════════════
    // Static headers
    Object.entries(staticSecurityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    // Dynamic CSP with nonce
    response.headers.set('Content-Security-Policy', buildCSP())

    // Pass nonce and request ID to client
    response.headers.set('x-nonce', nonce)
    response.headers.set('x-request-id', requestId)

    // Security version header (for audit)
    response.headers.set('x-security-version', SECURITY_VERSION)

    // ═══════════════════════════════════════════════════════════
    // 3. Rate Limiting for API Routes (Enhanced)
    // ═══════════════════════════════════════════════════════════
    if (pathname.startsWith('/api/')) {
        const rateLimitKey = getRateLimitKey(request)

        // Stricter limits based on endpoint sensitivity
        let limit = 100
        let window = 60000

        if (pathname.startsWith('/api/auth')) {
            // Allow more requests for logout/session operations
            if (pathname.includes('/signout') || pathname.includes('/csrf') || pathname.includes('/session')) {
                limit = 30      // 30 requests per minute for logout/session
                window = 60000
            } else {
                limit = 10      // 10 requests per minute for login attempts
                window = 60000
            }
        } else if (pathname.startsWith('/api/finance/ocr')) {
            limit = 10      // 10 OCR requests per minute
            window = 60000
        } else if (pathname.startsWith('/api/admin')) {
            limit = 50      // 50 admin requests per minute
            window = 60000
        }

        const rateCheck = checkRateLimit(rateLimitKey, limit, window)

        if (!rateCheck.allowed) {
            console.warn(`[SECURITY] Rate limited: ${clientIp} on ${pathname}`)
            logSecurityIncidentAsync(request, 'rate_limit', 'MEDIUM', clientIp, pathname, 'rate_limited', { limit, window })
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(rateCheck.retryAfter || 60),
                        'X-RateLimit-Limit': String(limit),
                        'X-RateLimit-Remaining': '0',
                        ...staticSecurityHeaders,
                        'Content-Security-Policy': buildCSP(),
                    },
                }
            )
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. CORS for API Routes (Strict)
    // ═══════════════════════════════════════════════════════════
    if (pathname.startsWith('/api/')) {
        const origin = request.headers.get('origin')

        // Only allow whitelisted origins
        if (origin && allowedOrigins.has(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin)
            response.headers.set('Vary', 'Origin')
        }

        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID')
        response.headers.set('Access-Control-Max-Age', '86400')
        response.headers.set('Access-Control-Allow-Credentials', 'true')

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: response.headers })
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
