/**
 * Proxy Layer - Next.js 16 Architecture (MILITARY-GRADE SECURITY)
 * 
 * Este archivo actúa como proxy ligero en runtime Node.js.
 * Maneja: enforcement Redis, Security Headers, CORS, Rate Limiting, CSP with Nonce.
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
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { getRedisClient, isRedisAvailable, CACHE_KEYS } from '@/lib/redis'
import { parseArParams } from '@/lib/ar-launch'
import { ipCliente } from '@/lib/ip-cliente'

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

function legacyHashIp(ip: string): string {
    let hash = 0
    for (let i = 0; i < ip.length; i++) {
        const char = ip.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
}

function hashIpForLogging(ip: string): string {
    const secret = process.env.IP_HASH_SECRET
    if (secret) {
        return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16)
    }

    if (process.env.NODE_ENV === 'production') {
        console.error('[Security] IP_HASH_SECRET missing; falling back to legacy incident hash')
    }

    return legacyHashIp(ip)
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
    // Un incidente sobre la propia ruta de incidentes generaría otro, y ese otro… (bucle). Sin secreto interno la ruta
    // responde 401 a todo, así que tampoco se manda nada: solo queda el registro en consola.
    if (pathname === '/api/admin/security/incidents') return
    const baseUrl = process.env.INTERNAL_API_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    // SECURITY: Use dedicated INTERNAL_API_SECRET, never reuse ENCRYPTION_KEY.
    // NIST SP 800-57: one key must serve one purpose only.
    const internalSecret = process.env.INTERNAL_API_SECRET

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

    if (!internalSecret) {
        console.warn('[Security] INTERNAL_API_SECRET not set: incident not sent')
        return
    }

    fetch(`${baseUrl}/api/admin/security/incidents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': internalSecret || '',
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
    // eslint-disable-next-line no-control-regex
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
 * - Scripts: nonce-based in production (strict, XSS protected)
 * - Styles: nonce + unsafe-inline fallback (for styled-jsx compatibility)
 * - report-uri for CSP violation monitoring
 * 
 * Note: 'unsafe-inline' for styles is necessary for Next.js styled-jsx.
 * 
 * SECURITY NOTE:
 * - The proxy places the nonce in the request CSP header.
 * - Next.js reads that nonce and applies it to framework scripts.
 * - Development keeps unsafe-inline/unsafe-eval because dev tooling needs them.
 * - Production script-src removes unsafe-inline and blocks inline event handlers.
 */
function buildCSP(nonce?: string, modelOrigin?: string, embeddedPreview = false, incrustable = false): string {
    // Detect if running in development/localhost
    const isDev = process.env.NODE_ENV !== 'production' ||
        process.env.NEXTAUTH_URL?.includes('localhost') ||
        process.env.NEXTAUTH_URL?.includes('127.0.0.1')

    const scriptSources = isDev
        ? [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'blob:',
            'https://static.cloudflareinsights.com',
            'http://localhost:*',
            'http://127.0.0.1:*',
        ]
        : [
            "'self'",
            nonce ? `'nonce-${nonce}'` : '',
            "'strict-dynamic'",
            'blob:',
            'https://static.cloudflareinsights.com',
        ].filter(Boolean)

    // El visor 3D descomprime la malla con WebAssembly. Solo se concede en las
    // rutas del visor, nunca en el resto del sitio.
    if (modelOrigin) scriptSources.push("'wasm-unsafe-eval'")

    const directives = [
        // Default: Block everything not explicitly allowed
        "default-src 'none'",

        // Scripts: production uses per-request nonce + strict-dynamic.
        // Dev keeps inline/eval because Next dev tooling requires them.
        // https://static.cloudflareinsights.com is Cloudflare's official RUM/Analytics CDN
        // OWASP 2025 A04 / MITRE T1059: Prevent eval()-based XSS execution
        `script-src ${scriptSources.join(' ')}`,

        // Explicit script element/attribute directives reduce browser fallback ambiguity.
        `script-src-elem ${scriptSources.join(' ')}`,
        isDev ? "script-src-attr 'unsafe-inline'" : "script-src-attr 'none'",

        // Styles: Allow unsafe-inline for React/Framer Motion dynamic styles
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`,
        `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`,
        `style-src-attr 'unsafe-inline'`,

        // Images: self + data URIs for inline images + HTTPS (+ HTTP for dev)
        `img-src 'self' data: blob: https:${isDev ? ' http:' : ''}`,

        // Fonts: only from self and Google Fonts (+ localhost for dev)
        `font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`,

        // Connections: explicit whitelist (+ localhost for dev)
        // https://cloudflareinsights.com is for Cloudflare RUM beacon data
        // https://staticimgly.com hosts the background-removal model assets used by the local image editor
        `connect-src 'self' blob: https://cloudflareinsights.com https://*.cloudflareinsights.com https://staticimgly.com${modelOrigin ? ` ${modelOrigin} https://www.gstatic.com` : ''}${isDev ? ' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*' : ''}`,

        // Forms: self + Overleaf (LaTeX editor "open in Overleaf" POST)
        "form-action 'self' https://www.overleaf.com",

        // Base URI: prevent base tag hijacking
        "base-uri 'self'",

        // Frame ancestors: prevent clickjacking (allow self in dev for iframe testing)
        // /insertar/<herramienta> se ofrece para incrustar en cualquier sitio (botón «Insertar»): solo esas rutas.
        incrustable ? "frame-ancestors *" : (isDev || embeddedPreview) ? "frame-ancestors 'self'" : "frame-ancestors 'none'",

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
    // El filtro XSS de los navegadores viejos se podía usar para filtrar datos; OWASP recomienda apagarlo (la CSP protege).
    'X-XSS-Protection': '0',

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

    // Cross-Origin Opener Policy - Prevents window.opener attacks
    // Keeps popup isolation for security while allowing cross-origin resources
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',

    // NOTE: CORP and COEP headers are intentionally NOT set.
    // Rationale:
    // - COEP (credentialless/require-corp) blocks third-party scripts without CORS
    // - CORP (same-origin) prevents cross-origin resource loading
    // - These headers are primarily useful for apps using SharedArrayBuffer
    //   to mitigate Spectre/Meltdown timing attacks
    // - This portfolio does NOT use SharedArrayBuffer or high-resolution timers
    // - Cloudflare Insights (injected by CF proxy) requires cross-origin access
    // - Security is maintained through: CSP, HSTS, rate limiting, authentication
    // See: https://web.dev/why-coop-coep/

    // Prevent MIME type confusion attacks
    'X-Permitted-Cross-Domain-Policies': 'none',

    // DNS Prefetch Control
    'X-DNS-Prefetch-Control': 'off',

    // Download options for IE
    'X-Download-Options': 'noopen',

    // NOTE: Cache-Control is now applied conditionally per route type
    // Sensitive paths (/admin, /api) → no-cache; public pages → allow caching
    // See the proxy() function for implementation
}

function normalizeOrigin(origin: string): string | null {
    try {
        const parsed = new URL(origin)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null
        }

        return `${parsed.protocol}//${parsed.host}`
    } catch {
        return null
    }
}

function resolveAllowedCorsOrigins(): Set<string> {
    const defaults = new Set<string>([
        'https://nicoholas.dev',
        'https://www.nicoholas.dev',
    ])

    if (process.env.NODE_ENV !== 'production') {
        defaults.add('http://localhost:3000')
    }

    const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((entry) => normalizeOrigin(entry.trim()))
        .filter((entry): entry is string => Boolean(entry))

    envOrigins.forEach((origin) => defaults.add(origin))
    return defaults
}

// Allowed origins for CORS (strict whitelist)
const allowedOrigins = resolveAllowedCorsOrigins()

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
    const ip = getClientIp(request)

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

async function checkProxyRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    redisUp: boolean
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
    if (!redisUp) {
        return checkRateLimit(key, limit, windowMs)
    }

    try {
        const client = await getRedisClient()
        const windowSeconds = Math.ceil(windowMs / 1000)
        const blockSeconds = Math.ceil(BLOCK_DURATION / 1000)
        const counterKey = `${CACHE_KEYS.RATE_LIMIT}:proxy:${key}`
        const violationsKey = `${counterKey}:violations`
        const blockedKey = `${counterKey}:blocked`

        const blockedTtl = await client.ttl(blockedKey)
        if (blockedTtl > 0) {
            return { allowed: false, retryAfter: blockedTtl }
        }

        const count = await client.incr(counterKey)
        if (count === 1) {
            await client.expire(counterKey, windowSeconds)
        }

        const ttl = await client.ttl(counterKey)
        if (count > limit) {
            const violations = await client.incr(violationsKey)
            if (violations === 1) {
                await client.expire(violationsKey, 24 * 60 * 60)
            }

            if (violations >= VIOLATION_THRESHOLD) {
                await client.setEx(blockedKey, blockSeconds, '1')
                return { allowed: false, retryAfter: blockSeconds }
            }

            return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSeconds }
        }

        return { allowed: true, remaining: Math.max(0, limit - count) }
    } catch (error) {
        console.error('[Proxy] Redis rate limit failed:', error instanceof Error ? error.message : error)
        return checkRateLimit(key, limit, windowMs)
    }
}

// ============= SECURITY CHECKS =============

function isBlockedUrl(pathname: string): boolean {
    return BLOCKED_URL_PATTERNS.some(pattern => pattern.test(pathname))
}

function isSuspiciousUA(userAgent: string | null): boolean {
    if (!userAgent) return true  // No UA is suspicious
    return SUSPICIOUS_UA_PATTERNS.some(pattern => pattern.test(userAgent))
}

// La misma regla que el resto de la app (cf-connecting-ip → x-real-ip → último salto de XFF): el primer valor de
// X-Forwarded-For lo escribe el visitante.
function getClientIp(request: NextRequest): string {
    return ipCliente(request.headers)
}

function getSessionCookieValue(request: NextRequest): string | null {
    return request.cookies.get('__Secure-authjs.session-token')?.value
        ?? request.cookies.get('authjs.session-token')?.value
        ?? request.cookies.get('__Secure-next-auth.session-token')?.value
        ?? request.cookies.get('next-auth.session-token')?.value
        ?? null
}

// ── Threat Enforcement Helpers ────────────────────────────────────

/** HMAC-SHA256 IP hash using IP_HASH_SECRET (matches threat-scoring.ts). */
function hashIpForThreat(ip: string): string {
    const secret = process.env.IP_HASH_SECRET
    if (!secret) {
        return ip.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
            .toString(16).replace('-', '').padStart(8, '0')
    }
    return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16)
}

/** Aviso de incidente que manda el propio proxy (POST con el secreto interno correcto). */
function esIncidenteInterno(request: NextRequest, pathname: string): boolean {
    const secreto = process.env.INTERNAL_API_SECRET
    const recibido = request.headers.get('x-internal-secret')
    if (!secreto || !recibido || request.method !== 'POST' || pathname !== '/api/admin/security/incidents') return false
    const a = createHash('sha256').update(secreto).digest()
    const b = createHash('sha256').update(recibido).digest()
    return timingSafeEqual(a, b)
}

/** SHA-256 session cookie hash for MFA step-up lookup. */
function hashSessionCookie(cookie: string): string {
    return createHash('sha256').update(cookie).digest('hex').slice(0, 16)
}

/** Routes that must fail-closed when Redis is unavailable. */
function isSecurePath(pathname: string): boolean {
    return pathname.startsWith('/api/admin') ||
        pathname.startsWith('/api/superadmin') ||
        pathname.startsWith('/api/finance') ||
        pathname.startsWith('/api/auth')
}

async function checkEnforcement(
    ipHash: string,
    sessionHash: string | null,
    pathname: string
): Promise<{ action: 'block' | 'mfa' | 'cooldown'; ttl?: number } | null> {
    try {
        const client = await getRedisClient()
        const [blockLevel, mfaFlag, cooldownActive] = await Promise.all([
            client.get(`${CACHE_KEYS.THREAT_BLOCK}:${ipHash}`),
            sessionHash ? client.get(`${CACHE_KEYS.THREAT_MFA_STEP_UP}:${sessionHash}`) : Promise.resolve(null),
            client.get(`${CACHE_KEYS.THREAT_ENDPOINT_COOLDOWN}:${pathname}:${ipHash}`),
        ])

        if (blockLevel) return { action: 'block' }
        if (mfaFlag) return { action: 'mfa' }
        if (cooldownActive) {
            const ttlKey = `${CACHE_KEYS.THREAT_ENDPOINT_COOLDOWN}:${pathname}:${ipHash}`
            const ttl = await client.ttl(ttlKey)
            return { action: 'cooldown', ttl: ttl > 0 ? ttl : 60 }
        }
        return null
    } catch {
        return null
    }
}

async function getRateLimitOverride(ipHash: string, category: string): Promise<number | null> {
    try {
        const client = await getRedisClient()
        const raw = await client.get(`${CACHE_KEYS.THREAT_RATE_OVERRIDE}:${ipHash}:${category}`)
        return raw ? parseFloat(raw) : null
    } catch {
        return null
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const requestId = generateRequestId()
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent')
    const nonce = generateNonce()
    // El origen del modelo se añade a la CSP solo en las dos rutas del visor y
    // solo si parseArParams lo validó: HTTPS, sin credenciales y con extensión
    // permitida. El servidor nunca descarga el modelo. El resto de rutas
    // conserva su CSP intacta.
    const isArViewer = pathname === '/ar' || pathname === '/ar/preview'
    const arModel = isArViewer ? parseArParams(Object.fromEntries(request.nextUrl.searchParams)) : null
    const modelOrigin = arModel?.glb ? new URL(arModel.glb).origin : undefined
    const incrustable = pathname.startsWith('/insertar/')
    const csp = buildCSP(nonce, modelOrigin, pathname === '/ar/preview', incrustable)
    const earlySecurityHeaders = {
        ...staticSecurityHeaders,
        'Content-Security-Policy': csp,
        'X-Request-ID': requestId,
        'Cache-Control': 'no-store',
    }

    // ═══════════════════════════════════════════════════════════
    // 0a. THREAT ENFORCEMENT (Redis — before all other logic)
    // ═══════════════════════════════════════════════════════════
    const threatIpHash = hashIpForThreat(clientIp)
    const sessionCookieValue = getSessionCookieValue(request)
    const sessionHash = sessionCookieValue ? hashSessionCookie(sessionCookieValue) : null

    const redisUp = await isRedisAvailable()

    if (!redisUp && isSecurePath(pathname)) {
        console.error('[Proxy] SECURITY: Redis unavailable — blocking sensitive route:', pathname)
        return new NextResponse(
            JSON.stringify({ error: 'Service temporarily unavailable' }),
            { status: 503, headers: { 'Content-Type': 'application/json', ...earlySecurityHeaders } }
        )
    }

    if (redisUp) {
        const enforcement = await checkEnforcement(threatIpHash, sessionHash, pathname)
        if (enforcement) {
            const blockId = threatIpHash.slice(0, 8)
            if (enforcement.action === 'block') {
                return new NextResponse(
                    JSON.stringify({ error: 'Access denied' }),
                    {
                        status: 403,
                        headers: { 'Content-Type': 'application/json', 'X-Security-ID': blockId, ...earlySecurityHeaders },
                    }
                )
            }
            if (enforcement.action === 'mfa') {
                return new NextResponse(
                    JSON.stringify({ error: 'MFA verification required' }),
                    {
                        status: 401,
                        headers: { 'Content-Type': 'application/json', 'X-MFA-Required': 'step-up', 'X-Security-ID': blockId, ...earlySecurityHeaders },
                    }
                )
            }
            if (enforcement.action === 'cooldown') {
                return new NextResponse(
                    JSON.stringify({ error: 'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.' }),
                    {
                        status: 429,
                        headers: { 'Content-Type': 'application/json', 'Retry-After': String(enforcement.ttl ?? 60), 'X-Security-ID': blockId, ...earlySecurityHeaders },
                    }
                )
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 0b. EARLY SECURITY CHECKS (Block malicious requests fast)
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
                    ...earlySecurityHeaders,
                }
            }
        )
    }

    // Check for blocked URL patterns (path traversal, injections)
    let decodedPathname = pathname
    try {
        decodedPathname = decodeURIComponent(pathname)
    } catch {
        decodedPathname = pathname
    }

    if (isBlockedUrl(pathname) || isBlockedUrl(decodedPathname)) {
        console.warn(`[SECURITY] Blocked malicious URL attempt: ${pathname} from ${clientIp}`)
        logSecurityIncidentAsync(request, 'blocked_url', 'HIGH', clientIp, pathname, 'blocked')
        return new NextResponse(
            JSON.stringify({ error: 'Bad Request' }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...earlySecurityHeaders,
                },
            }
        )
    }

    // Check for suspicious user agents (security scanners)
    if (isSuspiciousUA(userAgent) && pathname.startsWith('/api/')) {
        console.warn(`[SECURITY] Blocked suspicious UA: ${userAgent?.slice(0, 50)} from ${clientIp}`)
        logSecurityIncidentAsync(request, 'suspicious_ua', 'MEDIUM', clientIp, pathname, 'blocked')
        // Return 200 with fake response to confuse scanners
        return new NextResponse(
            JSON.stringify({ status: 'ok' }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...earlySecurityHeaders,
                },
            }
        )
    }

    // SECURITY: Validate Content-Type for API mutations (OWASP A01 anti-tampering)
    // Prevents Burp Suite / proxy content-type manipulation attacks
    if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const contentType = request.headers.get('content-type')
        // Allow form-urlencoded only for Auth.js endpoints; cross-site forms can otherwise
        // become a CSRF primitive for JSON APIs.
        const formUrlencodedAllowed = pathname.startsWith('/api/auth/')
        const isAllowedContentType = !contentType
            || contentType.includes('application/json')
            || contentType.includes('multipart/form-data')
            || (formUrlencodedAllowed && contentType.includes('application/x-www-form-urlencoded'))

        if (!isAllowedContentType) {
            logSecurityIncidentAsync(request, 'blocked_request', 'MEDIUM', clientIp, pathname, 'blocked',
                { reason: 'invalid_content_type', contentType: contentType.slice(0, 100) })
            return new NextResponse(
                JSON.stringify({ error: 'Unsupported Media Type' }),
                {
                    status: 415,
                    headers: {
                        'Content-Type': 'application/json',
                        ...earlySecurityHeaders,
                    },
                }
            )
        }

        // SECURITY: Block oversized payloads (DoS protection / OWASP A02)
        const contentLength = parseInt(request.headers.get('content-length') || '0')
        const MAX_BODY = pathname.startsWith('/api/finance/ocr') ? 10 * 1024 * 1024 : 1024 * 1024 // 10MB for OCR, 1MB otherwise
        if (contentLength > MAX_BODY) {
            logSecurityIncidentAsync(request, 'blocked_request', 'MEDIUM', clientIp, pathname, 'blocked',
                { reason: 'payload_too_large', size: contentLength, limit: MAX_BODY })
            return new NextResponse(
                JSON.stringify({ error: 'Payload too large' }),
                {
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        ...earlySecurityHeaders,
                    },
                }
            )
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Forward nonce/request context to Next.js
    // ═══════════════════════════════════════════════════════════
    // Create response with request headers containing nonce and request ID
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('x-request-id', requestId)
    // Next.js reads the request CSP nonce and applies it to framework scripts.
    requestHeaders.set('Content-Security-Policy', csp)

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
    response.headers.set('Content-Security-Policy', csp)
    // La vista previa se incrusta desde el editor del mismo origen. El resto
    // del sitio mantiene DENY.
    if (pathname === '/ar/preview') response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    // Incrustable: sin X-Frame-Options (la CSP frame-ancestors * manda; con ella el navegador ignora ese encabezado).
    if (incrustable) response.headers.delete('X-Frame-Options')
    // El QR puede llenar la ubicación actual (con el permiso del navegador): solo esa página la pide; el resto la bloquea.
    if (pathname === '/herramientas/qr') {
        response.headers.set('Permissions-Policy', staticSecurityHeaders['Permissions-Policy'].replace('geolocation=()', 'geolocation=(self)'))
    }

    // Pass request ID to client for support/debug correlation.
    // The CSP nonce is intentionally kept request-side only (server components read it via headers()).
    // Never expose nonce in HTTP response headers — it belongs only in CSP and HTML nonce attributes.
    // `x-nonce` (unprefixed) is what would actually reach the client, so it is stripped here.
    // `x-middleware-request-x-nonce` is NOT client-facing: it is Next.js's internal transport
    // for request-header overrides (see NextResponse.next({ request: { headers } })) — deleting
    // it here does not protect the client, it just tells the router to drop its own override,
    // so headers().get('x-nonce') would come back empty in every Server Component. Keep it.
    response.headers.set('x-request-id', requestId)
    response.headers.delete('x-nonce')

    // Security version header (for audit)
    response.headers.set('x-security-version', SECURITY_VERSION)

    // ═══════════════════════════════════════════════════════════
    // 2b. Conditional Cache-Control (OWASP A02)
    // Sensitive routes: no-cache | Public pages: allow caching
    // ═══════════════════════════════════════════════════════════
    // /cotizacion y /aprobar muestran documentos con código de acceso y firmas de clientes:
    // nunca en cachés compartidas, y la versión firmada tiene que verse apenas se firma.
    if (pathname.startsWith('/api/pulse/')) {
        // Titulares, mercado y rellenos del blog son públicos: su propia ruta decide la caché (antes se forzaba no-store
        // y cada imagen de relleno llegaba a Node).
    } else if (pathname.startsWith('/admin') || pathname.startsWith('/api/') ||
        pathname.startsWith('/cotizacion') || pathname.startsWith('/aprobar')) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
    } else if (/\.[a-z0-9]{2,5}$/i.test(pathname)) {
        // Archivos de public/ (imágenes, íconos, manifiesto): caché pública como siempre.
        response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    } else {
        // Páginas HTML: llevan el nonce de la CSP de esta respuesta, así que no van a cachés compartidas, y tras un
        // despliegue el navegador no debe reutilizar un HTML que apunta a paquetes viejos.
        response.headers.set('Cache-Control', 'private, no-cache')
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Rate Limiting for API Routes (Enhanced)
    // ═══════════════════════════════════════════════════════════
    // Los incidentes que registra este mismo proxy no cuentan: si un 429 generara otro incidente que a su vez
    // recibiera 429, se armaría un bucle.
    // /api/health tampoco: lo consulta Docker cada 15 s y un 429 haría reiniciar la web sin motivo.
    if (pathname.startsWith('/api/') && pathname !== '/api/health' && !esIncidenteInterno(request, pathname)) {
        const rateLimitKey = getRateLimitKey(request)

        // Stricter limits based on endpoint sensitivity
        let limit = 100
        let window = 60000
        let pathCategory = 'api'

        if (pathname.startsWith('/api/auth')) {
            pathCategory = 'auth'
            // Allow more requests for logout/session operations
            if (pathname.includes('/signout') || pathname.includes('/csrf') || pathname.includes('/session')) {
                limit = 30      // 30 requests per minute for logout/session
                window = 60000
            } else if (pathname.includes('/password-reset/request')) {
                limit = 3       // 3 password reset requests per hour
                window = 60 * 60 * 1000
            } else {
                limit = 10      // 10 requests per minute for login attempts
                window = 60000
            }
        } else if (pathname.startsWith('/api/finance/ocr')) {
            pathCategory = 'finance'
            limit = 10      // 10 OCR requests per minute
            window = 60000
        } else if (pathname.startsWith('/api/admin')) {
            pathCategory = 'admin'
            limit = 50      // 50 admin requests per minute
            window = 60000
        }

        // Apply dynamic rate limit override from EnforcementExecutor
        if (redisUp) {
            const override = await getRateLimitOverride(threatIpHash, pathCategory)
            if (override !== null) {
                limit = Math.max(1, Math.floor(limit * override))
            }
        }

        const rateCheck = await checkProxyRateLimit(rateLimitKey, limit, window, redisUp)

        if (!rateCheck.allowed) {
            console.warn(`[SECURITY] Rate limited: ${clientIp} on ${pathname}`)
            logSecurityIncidentAsync(request, 'rate_limit', 'MEDIUM', clientIp, pathname, 'rate_limited', { limit, window })
            return new NextResponse(
                JSON.stringify({ error: 'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(rateCheck.retryAfter || 60),
                        'X-RateLimit-Limit': String(limit),
                        'X-RateLimit-Remaining': '0',
                        ...staticSecurityHeaders,
                        'Content-Security-Policy': csp,
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
        const normalizedOrigin = origin ? normalizeOrigin(origin) : null

        if (origin && (!normalizedOrigin || !allowedOrigins.has(normalizedOrigin))) {
            logSecurityIncidentAsync(
                request,
                'blocked_request',
                'MEDIUM',
                clientIp,
                pathname,
                'blocked',
                { reason: 'cors_origin_blocked', origin }
            )
            return new NextResponse(
                JSON.stringify({ error: 'Origin not allowed' }),
                {
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        ...earlySecurityHeaders,
                    },
                }
            )
        }

        // Only allow whitelisted origins
        if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
            response.headers.set('Access-Control-Allow-Origin', normalizedOrigin)
            response.headers.set('Vary', 'Origin')
        }

        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
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
