/**
 * API Security Middleware
 * 
 * Centralized security checks for all API routes.
 * Apply this at the start of any sensitive API endpoint.
 * 
 * Features:
 * - Request validation
 * - Input sanitization
 * - Anomaly detection
 * - Audit logging
 * 
 * @module api-security
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { 
    sanitizeObject, 
    safeJsonParse,
    detectAnomalies,
    generateFingerprint
} from '@/lib/security-hardened'
import { SecurityLogger, getThreatScore, shouldBlockIp } from '@/lib/security-logger'
import { hasPermission } from '@/lib/permission-check'
import type { Role } from '@prisma/client'
import type { Session } from 'next-auth'

// ============= TYPES =============

// Extended session type
type AuthSession = Session & {
    user: {
        id: string
        email: string
        name: string | null
        role: Role
        avatar: string | null
    }
} | null

export interface SecurityContext {
    ipAddress: string
    userAgent: string
    requestId: string
    userId?: string
    sessionId?: string
    threatScore: number
}

export interface SecureApiOptions {
    // Authentication
    requireAuth?: boolean
    requiredPermission?: string
    
    // Rate limiting
    rateLimit?: {
        limit: number
        windowMs: number
    }
    
    // Input validation
    maxBodySize?: number  // in bytes
    allowedContentTypes?: string[]
    
    // Security checks
    checkThreatScore?: boolean
    threatScoreThreshold?: number
    checkAnomalies?: boolean
    
    // Audit
    auditAccess?: boolean
    sensitiveFields?: string[]
}

// ============= RATE LIMITING =============

const apiRateLimits = new Map<string, { count: number; resetAt: number; blocked: boolean }>()

function checkApiRateLimit(
    key: string, 
    limit: number, 
    windowMs: number
): { allowed: boolean; remaining: number; retryAfter?: number } {
    const now = Date.now()
    const record = apiRateLimits.get(key)
    
    if (!record || now > record.resetAt) {
        apiRateLimits.set(key, { count: 1, resetAt: now + windowMs, blocked: false })
        return { allowed: true, remaining: limit - 1 }
    }
    
    if (record.blocked) {
        return { 
            allowed: false, 
            remaining: 0,
            retryAfter: Math.ceil((record.resetAt - now) / 1000)
        }
    }
    
    if (record.count >= limit) {
        record.blocked = true
        return { 
            allowed: false, 
            remaining: 0,
            retryAfter: Math.ceil((record.resetAt - now) / 1000)
        }
    }
    
    record.count++
    return { allowed: true, remaining: limit - record.count }
}

// ============= SECURITY CONTEXT =============

export async function getSecurityContext(): Promise<SecurityContext> {
    const headersList = await headers()
    
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    const requestId = headersList.get('x-request-id') || 
                     `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    return {
        ipAddress,
        userAgent,
        requestId,
        threatScore: getThreatScore(ipAddress)
    }
}

// ============= MAIN MIDDLEWARE =============

/**
 * Secure API endpoint with comprehensive security checks
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *     const security = await secureApiEndpoint(request, {
 *         requireAuth: true,
 *         requiredPermission: 'finance.manage',
 *         rateLimit: { limit: 10, windowMs: 60000 },
 *         auditAccess: true
 *     })
 *     
 *     if (security.error) {
 *         return security.error
 *     }
 *     
 *     // Continue with secure context
 *     const { context, session, body } = security
 * }
 * ```
 */
export async function secureApiEndpoint(
    request: NextRequest,
    options: SecureApiOptions = {}
): Promise<{
    error?: NextResponse
    context: SecurityContext
    session?: AuthSession
    body?: unknown
}> {
    const context = await getSecurityContext()
    
    // ===== 1. IP BLOCKING CHECK =====
    if (shouldBlockIp(context.ipAddress)) {
        SecurityLogger.apiAbuse({
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            endpoint: request.nextUrl.pathname,
            abuseType: 'IP_BLOCKED',
            details: { threatScore: context.threatScore }
        })
        
        return {
            error: NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            ),
            context
        }
    }
    
    // ===== 2. THREAT SCORE CHECK =====
    if (options.checkThreatScore !== false) {
        const threshold = options.threatScoreThreshold || 70
        if (context.threatScore >= threshold) {
            SecurityLogger.apiAbuse({
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                endpoint: request.nextUrl.pathname,
                abuseType: 'HIGH_THREAT_SCORE',
                details: { 
                    threatScore: context.threatScore,
                    threshold
                }
            })
            
            return {
                error: NextResponse.json(
                    { error: 'Request blocked for security reasons' },
                    { status: 403 }
                ),
                context
            }
        }
    }
    
    // ===== 3. RATE LIMITING =====
    if (options.rateLimit) {
        const rateLimitKey = `${context.ipAddress}:${request.nextUrl.pathname}`
        const rateCheck = checkApiRateLimit(
            rateLimitKey,
            options.rateLimit.limit,
            options.rateLimit.windowMs
        )
        
        if (!rateCheck.allowed) {
            SecurityLogger.rateLimited({
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                endpoint: request.nextUrl.pathname,
                limit: options.rateLimit.limit,
                window: options.rateLimit.windowMs
            })
            
            return {
                error: NextResponse.json(
                    { error: 'Too many requests', retryAfter: rateCheck.retryAfter },
                    { 
                        status: 429,
                        headers: {
                            'Retry-After': String(rateCheck.retryAfter || 60),
                            'X-RateLimit-Limit': String(options.rateLimit.limit),
                            'X-RateLimit-Remaining': '0'
                        }
                    }
                ),
                context
            }
        }
    }
    
    // ===== 4. CONTENT-TYPE VALIDATION =====
    if (options.allowedContentTypes && request.method !== 'GET') {
        const contentType = request.headers.get('content-type')?.split(';')[0]
        if (contentType && !options.allowedContentTypes.includes(contentType)) {
            return {
                error: NextResponse.json(
                    { error: 'Unsupported content type' },
                    { status: 415 }
                ),
                context
            }
        }
    }
    
    // ===== 5. AUTHENTICATION =====
    let session: AuthSession = null
    
    if (options.requireAuth) {
        const authResult = await auth()
        session = authResult as AuthSession
        
        if (!session?.user?.id) {
            SecurityLogger.unauthorized({
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                resource: request.nextUrl.pathname,
                requiredPermission: 'authentication'
            })
            
            return {
                error: NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                ),
                context
            }
        }
        
        context.userId = session.user.id
        
        // Permission check
        if (options.requiredPermission) {
            const hasAccess = await hasPermission(
                session.user.id,
                session.user.role as Role,
                options.requiredPermission
            )
            
            if (!hasAccess) {
                SecurityLogger.unauthorized({
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    userId: session.user.id,
                    resource: request.nextUrl.pathname,
                    requiredPermission: options.requiredPermission
                })
                
                return {
                    error: NextResponse.json(
                        { error: 'Forbidden' },
                        { status: 403 }
                    ),
                    context
                }
            }
        }
        
        // ===== 6. ANOMALY DETECTION =====
        if (options.checkAnomalies !== false) {
            const headersList = await headers()
            const fingerprint = generateFingerprint(
                context.ipAddress,
                context.userAgent,
                new Headers([
                    ['accept-language', headersList.get('accept-language') || ''],
                    ['accept-encoding', headersList.get('accept-encoding') || '']
                ]),
                process.env.ENCRYPTION_KEY || 'placeholder-key'
            )
            
            const anomalyResult = detectAnomalies(session.user.id, fingerprint)
            
            if (anomalyResult.score >= 70) {
                SecurityLogger.sessionAnomaly({
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    userId: session.user.id,
                    sessionId: context.requestId,
                    anomalyType: 'HIGH_ANOMALY_SCORE',
                    details: {
                        score: anomalyResult.score,
                        reasons: anomalyResult.reasons
                    }
                })
            }
        }
    }
    
    // ===== 7. BODY PARSING & SANITIZATION =====
    let body: unknown = undefined
    
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        const contentType = request.headers.get('content-type')?.split(';')[0]
        
        if (contentType === 'application/json') {
            // Size check
            const contentLength = parseInt(request.headers.get('content-length') || '0')
            const maxSize = options.maxBodySize || 1024 * 1024  // 1MB default
            
            if (contentLength > maxSize) {
                return {
                    error: NextResponse.json(
                        { error: 'Request body too large' },
                        { status: 413 }
                    ),
                    context
                }
            }
            
            try {
                const text = await request.text()
                
                // Safe JSON parse (prevents prototype pollution)
                body = safeJsonParse(text)
                
                if (body === null) {
                    return {
                        error: NextResponse.json(
                            { error: 'Invalid JSON' },
                            { status: 400 }
                        ),
                        context
                    }
                }
                
                // Sanitize object
                if (typeof body === 'object' && body !== null) {
                    body = sanitizeObject(body as Record<string, unknown>)
                }
            } catch {
                return {
                    error: NextResponse.json(
                        { error: 'Failed to parse request body' },
                        { status: 400 }
                    ),
                    context
                }
            }
        }
    }
    
    // ===== 8. AUDIT LOGGING =====
    if (options.auditAccess && session?.user?.id) {
        SecurityLogger.dataAccess({
            ipAddress: context.ipAddress,
            userId: session.user.id,
            resource: request.nextUrl.pathname,
            action: request.method === 'GET' ? 'READ' : 
                   request.method === 'POST' ? 'WRITE' :
                   request.method === 'DELETE' ? 'DELETE' : 'WRITE',
            sensitiveFields: options.sensitiveFields
        })
    }
    
    return {
        context,
        session: session || undefined,
        body
    }
}

// ============= RESPONSE HELPERS =============

/**
 * Create a secure JSON response with proper headers
 */
export function secureJsonResponse(
    data: unknown,
    status = 200,
    additionalHeaders: Record<string, string> = {}
): NextResponse {
    return NextResponse.json(data, {
        status,
        headers: {
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
            ...additionalHeaders
        }
    })
}

/**
 * Create an error response that doesn't leak information
 */
export function secureErrorResponse(
    publicMessage: string,
    status: number,
    internalError?: Error
): NextResponse {
    // Log internal error for debugging
    if (internalError) {
        console.error('[API Error]', {
            message: publicMessage,
            status,
            internalError: internalError.message,
            stack: process.env.NODE_ENV === 'development' ? internalError.stack : undefined
        })
    }
    
    return NextResponse.json(
        { error: publicMessage },
        { 
            status,
            headers: {
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'no-store'
            }
        }
    )
}
