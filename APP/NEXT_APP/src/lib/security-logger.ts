/**
 * Security Event Logger
 * 
 * Centralized security event logging for threat detection and forensics.
 * Implements OWASP logging best practices.
 * 
 * Events are structured for SIEM integration (Splunk, ELK, etc.)
 * 
 * @module security-logger
 */

import 'server-only'
import { createHash } from 'crypto'

// ============= TYPES =============

export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type SecurityEventCategory =
    | 'AUTHENTICATION'
    | 'AUTHORIZATION'
    | 'INPUT_VALIDATION'
    | 'RATE_LIMITING'
    | 'SESSION'
    | 'FILE_UPLOAD'
    | 'API_ABUSE'
    | 'INJECTION_ATTEMPT'
    | 'XSS_ATTEMPT'
    | 'CSRF_ATTEMPT'
    | 'BRUTE_FORCE'
    | 'ENUMERATION'
    | 'DATA_EXFILTRATION'
    | 'CONFIGURATION'
    | 'INTEGRITY'

export interface SecurityEvent {
    // Event identification
    eventId: string
    timestamp: string

    // Event classification
    category: SecurityEventCategory
    severity: SecurityEventSeverity
    eventType: string

    // Request context
    requestId?: string
    ipAddress: string
    ipAddressHash: string  // For privacy-compliant logging
    userAgent?: string
    userAgentHash?: string

    // User context
    userId?: string
    sessionId?: string

    // Event details
    resource?: string
    action?: string
    outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED'

    // Additional context
    details?: Record<string, unknown>

    // Threat indicators
    iocType?: string  // Indicator of Compromise type
    iocValue?: string

    // Enhanced security data (Issue #7)
    enrichedData?: EnrichedSecurityData
}

// Enhanced security data for better threat analysis
export interface EnrichedSecurityData {
    os: string           // Windows, macOS, Linux, iOS, Android, Unknown
    browser: string      // Chrome, Firefox, Safari, Edge, Bot, Unknown
    requestCount: number // Requests from this IP in last 5 min
    bypassAttempts: BypassAttemptData
}

export interface BypassAttemptData {
    headerSpoofing: boolean      // X-Forwarded-For manipulation detected
    proxyDetected: boolean       // Proxy/VPN indicators found
    ipMismatch: boolean          // Multiple IPs in request
    botSignature: boolean        // Known bot patterns in UA
    suspiciousHeaders: string[]  // List of suspicious headers found
}

// ============= CONFIGURATION =============

const LOG_SECRET = process.env.ENCRYPTION_KEY || 'placeholder-change-in-production'
const isDevelopment = process.env.NODE_ENV === 'development'

// In-memory event buffer for batch processing
const eventBuffer: SecurityEvent[] = []
const BUFFER_SIZE = 100
const FLUSH_INTERVAL = 30000  // 30 seconds

// Threat tracking
const threatScores = new Map<string, { score: number; events: string[]; lastUpdate: number }>()
const THREAT_DECAY_MS = 30 * 60 * 1000  // 30 minutes
const THREAT_THRESHOLD = 50

// Cleanup stale threat scores periodically
function cleanupStaleThreatScores(): void {
    const now = Date.now()
    for (const [key, record] of threatScores.entries()) {
        if (now - record.lastUpdate > THREAT_DECAY_MS) {
            threatScores.delete(key)
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupStaleThreatScores, 5 * 60 * 1000)
}

// ============= HELPER FUNCTIONS =============

function generateEventId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 10)
    return `SEC-${timestamp}-${random}`.toUpperCase()
}

function hashValue(value: string): string {
    return createHash('sha256')
        .update(value + LOG_SECRET)
        .digest('hex')
        .slice(0, 16)
}

function sanitizeForLog(value: string, maxLength = 200): string {
    return value
        .replace(/[\n\r]/g, ' ')      // Remove newlines
        // eslint-disable-next-line no-control-regex
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F]/g, '')    // Remove control chars
        .slice(0, maxLength)
}

// ============= ENHANCED SECURITY DETECTION (Issue #7) =============

// IP request counter for tracking request frequency
const ipRequestCounts = new Map<string, { count: number; firstSeen: number }>()
const REQUEST_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

// Cleanup old request counts periodically
function cleanupOldRequestCounts(): void {
    const now = Date.now()
    for (const [key, record] of ipRequestCounts.entries()) {
        if (now - record.firstSeen > REQUEST_WINDOW_MS) {
            ipRequestCounts.delete(key)
        }
    }
}

if (typeof setInterval !== 'undefined') {
    setInterval(cleanupOldRequestCounts, 60 * 1000) // Every minute
}

/**
 * Parse User-Agent to extract OS and browser information
 */
export function parseUserAgent(ua: string): { os: string; browser: string } {
    const uaLower = ua.toLowerCase()

    // Detect OS
    let os = 'Unknown'
    if (uaLower.includes('windows nt 10') || uaLower.includes('windows nt 11')) {
        os = 'Windows 10/11'
    } else if (uaLower.includes('windows')) {
        os = 'Windows'
    } else if (uaLower.includes('mac os x') || uaLower.includes('macintosh')) {
        os = 'macOS'
    } else if (uaLower.includes('iphone') || uaLower.includes('ipad')) {
        os = 'iOS'
    } else if (uaLower.includes('android')) {
        os = 'Android'
    } else if (uaLower.includes('linux')) {
        os = 'Linux'
    } else if (uaLower.includes('curl') || uaLower.includes('wget') || uaLower.includes('python')) {
        os = 'CLI/Script'
    }

    // Detect Browser
    let browser = 'Unknown'
    if (uaLower.includes('edg/')) {
        browser = 'Edge'
    } else if (uaLower.includes('chrome') && !uaLower.includes('edg')) {
        browser = 'Chrome'
    } else if (uaLower.includes('firefox')) {
        browser = 'Firefox'
    } else if (uaLower.includes('safari') && !uaLower.includes('chrome')) {
        browser = 'Safari'
    } else if (uaLower.includes('bot') || uaLower.includes('crawler') || uaLower.includes('spider')) {
        browser = 'Bot'
    } else if (uaLower.includes('curl')) {
        browser = 'cURL'
    } else if (uaLower.includes('python')) {
        browser = 'Python'
    } else if (uaLower.includes('postman')) {
        browser = 'Postman'
    }

    return { os, browser }
}

/**
 * Track and count requests from an IP address
 */
export function trackIpRequests(ipHash: string): number {
    const now = Date.now()
    const existing = ipRequestCounts.get(ipHash)

    if (existing) {
        // Check if within window
        if (now - existing.firstSeen < REQUEST_WINDOW_MS) {
            existing.count++
            return existing.count
        } else {
            // Reset counter
            ipRequestCounts.set(ipHash, { count: 1, firstSeen: now })
            return 1
        }
    } else {
        ipRequestCounts.set(ipHash, { count: 1, firstSeen: now })
        return 1
    }
}

/**
 * Get current request count for an IP (without incrementing)
 */
export function getIpRequestCount(ipHash: string): number {
    const existing = ipRequestCounts.get(ipHash)
    if (!existing) return 0

    const now = Date.now()
    if (now - existing.firstSeen > REQUEST_WINDOW_MS) return 0

    return existing.count
}

// Known bad bot signatures
const BOT_SIGNATURES = [
    'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'nuclei',
    'wpscan', 'dirbuster', 'gobuster', 'ffuf', 'burpsuite',
    'acunetix', 'nessus', 'openvas', 'qualys', 'owasp',
    'havij', 'slowloris', 'loic', 'hoic'
]

// Suspicious header names that may indicate attacks
const SUSPICIOUS_HEADERS = [
    'x-injected', 'x-attack', 'x-exploit', 'x-hack',
    'x-sql', 'x-cmd', 'x-shell', 'x-payload'
]

/**
 * Detect potential bypass attempts from request headers
 */
export function detectBypassAttempts(headers: Headers): BypassAttemptData {
    const suspiciousFound: string[] = []

    // Check for header spoofing (multiple X-Forwarded-For values)
    const xForwardedFor = headers.get('x-forwarded-for') || ''
    const hasMultipleIps = xForwardedFor.split(',').length > 3
    const headerSpoofing = hasMultipleIps ||
        (xForwardedFor.includes('127.0.0.1') && xForwardedFor.includes(','))

    if (headerSpoofing) suspiciousFound.push('x-forwarded-for-spoofing')

    // Check for proxy indicators
    const proxyHeaders = ['via', 'x-proxy', 'forwarded', 'x-real-ip']
    let proxyCount = 0
    for (const h of proxyHeaders) {
        if (headers.get(h)) proxyCount++
    }
    const proxyDetected = proxyCount >= 2

    if (proxyDetected) suspiciousFound.push('multiple-proxy-headers')

    // Check for IP mismatch indicators
    const cfConnectingIp = headers.get('cf-connecting-ip')
    const xRealIp = headers.get('x-real-ip')
    const ipMismatch = !!(cfConnectingIp && xRealIp && cfConnectingIp !== xRealIp)

    if (ipMismatch) suspiciousFound.push('ip-mismatch')

    // Check for bot signatures in User-Agent
    const ua = (headers.get('user-agent') || '').toLowerCase()
    const botSignature = BOT_SIGNATURES.some(sig => ua.includes(sig))

    if (botSignature) suspiciousFound.push('known-attack-tool')

    // Check for suspicious custom headers
    for (const suspicious of SUSPICIOUS_HEADERS) {
        if (headers.has(suspicious)) {
            suspiciousFound.push(suspicious)
        }
    }

    return {
        headerSpoofing,
        proxyDetected,
        ipMismatch,
        botSignature,
        suspiciousHeaders: suspiciousFound
    }
}

/**
 * Create enriched security data from request
 */
export function createEnrichedSecurityData(
    userAgent: string,
    ipHash: string,
    headers?: Headers
): EnrichedSecurityData {
    const { os, browser } = parseUserAgent(userAgent)
    const requestCount = trackIpRequests(ipHash)
    const bypassAttempts = headers
        ? detectBypassAttempts(headers)
        : { headerSpoofing: false, proxyDetected: false, ipMismatch: false, botSignature: false, suspiciousHeaders: [] }

    return {
        os,
        browser,
        requestCount,
        bypassAttempts
    }
}

// ============= EVENT LOGGING =============

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'eventId' | 'timestamp' | 'ipAddressHash'>): void {
    const fullEvent: SecurityEvent = {
        eventId: generateEventId(),
        timestamp: new Date().toISOString(),
        ipAddressHash: hashValue(event.ipAddress),
        userAgentHash: event.userAgent ? hashValue(event.userAgent) : undefined,
        ...event,
        // Sanitize string fields
        userAgent: event.userAgent ? sanitizeForLog(event.userAgent, 300) : undefined,
        resource: event.resource ? sanitizeForLog(event.resource, 500) : undefined,
    }

    // Log to console (structured for log aggregation)
    const logLevel = getSeverityLogLevel(event.severity)
    console[logLevel]('[SECURITY]', JSON.stringify(fullEvent))

    // Add to buffer for batch processing
    eventBuffer.push(fullEvent)

    // Update threat score
    updateThreatScore(fullEvent)

    // Flush if buffer is full
    if (eventBuffer.length >= BUFFER_SIZE) {
        flushEventBuffer()
    }

    // Alert on critical events
    if (event.severity === 'CRITICAL') {
        handleCriticalEvent(fullEvent)
    }
}

function getSeverityLogLevel(severity: SecurityEventSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
        case 'LOW': return 'log'
        case 'MEDIUM': return 'warn'
        case 'HIGH':
        case 'CRITICAL': return 'error'
    }
}

// ============= THREAT SCORING =============

const SEVERITY_SCORES: Record<SecurityEventSeverity, number> = {
    LOW: 5,
    MEDIUM: 15,
    HIGH: 30,
    CRITICAL: 50,
}

function updateThreatScore(event: SecurityEvent): void {
    const key = event.ipAddressHash
    const now = Date.now()

    const existing = threatScores.get(key)

    if (existing) {
        // Apply decay
        const elapsed = now - existing.lastUpdate
        const decay = Math.floor(elapsed / 60000) * 2  // Decay 2 points per minute
        const decayedScore = Math.max(0, existing.score - decay)

        // Add new score
        const newScore = decayedScore + SEVERITY_SCORES[event.severity]
        existing.score = newScore
        existing.events.push(event.eventType)
        existing.lastUpdate = now

        // Check threshold
        if (newScore >= THREAT_THRESHOLD && decayedScore < THREAT_THRESHOLD) {
            handleThreatThresholdExceeded(key, newScore, existing.events)
        }
    } else {
        threatScores.set(key, {
            score: SEVERITY_SCORES[event.severity],
            events: [event.eventType],
            lastUpdate: now,
        })
    }
}

/**
 * Get current threat score for an IP
 */
export function getThreatScore(ipAddress: string): number {
    const key = hashValue(ipAddress)
    const record = threatScores.get(key)

    if (!record) return 0

    // Apply decay
    const elapsed = Date.now() - record.lastUpdate
    const decay = Math.floor(elapsed / 60000) * 2
    return Math.max(0, record.score - decay)
}

/**
 * Check if an IP should be blocked based on threat score
 */
export function shouldBlockIp(ipAddress: string): boolean {
    return getThreatScore(ipAddress) >= THREAT_THRESHOLD
}

// ============= EVENT HANDLERS =============

function handleCriticalEvent(event: SecurityEvent): void {
    // In production, this would send alerts to:
    // - PagerDuty/OpsGenie
    // - Slack/Teams webhook
    // - Email to security team

    console.error('🚨 [CRITICAL SECURITY EVENT]', {
        eventId: event.eventId,
        category: event.category,
        type: event.eventType,
        ip: event.ipAddressHash,
        user: event.userId,
        resource: event.resource,
    })

    // TODO: Implement webhook notification
    // await sendSecurityAlert(event)
}

function handleThreatThresholdExceeded(
    ipHash: string,
    score: number,
    events: string[]
): void {
    console.error('🚨 [THREAT THRESHOLD EXCEEDED]', {
        ipHash,
        score,
        recentEvents: events.slice(-10),
        threshold: THREAT_THRESHOLD,
    })

    // TODO: Implement automatic blocking
    // await addToBlocklist(ipHash)
}

function flushEventBuffer(): void {
    if (eventBuffer.length === 0) return

    // In production, this would send to:
    // - SIEM (Splunk, ELK, etc.)
    // - Security data lake
    // - Audit database

    if (isDevelopment) {
        console.log(`[SECURITY] Flushed ${eventBuffer.length} events`)
    }

    eventBuffer.length = 0
}

// Periodic flush
if (typeof setInterval !== 'undefined') {
    setInterval(flushEventBuffer, FLUSH_INTERVAL)
}

// ============= CONVENIENCE LOGGERS =============

export const SecurityLogger = {
    /**
     * Log authentication event
     */
    auth(params: {
        success: boolean
        userId?: string
        ipAddress: string
        userAgent?: string
        reason?: string
        method?: string
    }): void {
        logSecurityEvent({
            category: 'AUTHENTICATION',
            severity: params.success ? 'LOW' : 'MEDIUM',
            eventType: params.success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
            outcome: params.success ? 'SUCCESS' : 'FAILURE',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            userId: params.userId,
            details: {
                method: params.method,
                reason: params.reason,
            },
        })
    },

    /**
     * Log brute force attempt
     */
    bruteForce(params: {
        ipAddress: string
        userAgent?: string
        targetResource: string
        attemptCount: number
    }): void {
        const severity: SecurityEventSeverity =
            params.attemptCount >= 10 ? 'HIGH' :
                params.attemptCount >= 5 ? 'MEDIUM' : 'LOW'

        logSecurityEvent({
            category: 'BRUTE_FORCE',
            severity,
            eventType: 'BRUTE_FORCE_DETECTED',
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            resource: params.targetResource,
            details: {
                attemptCount: params.attemptCount,
            },
        })
    },

    /**
     * Log injection attempt
     */
    injectionAttempt(params: {
        ipAddress: string
        userAgent?: string
        type: 'SQL' | 'XSS' | 'COMMAND' | 'PATH_TRAVERSAL' | 'LDAP' | 'NOSQL'
        payload: string
        location: string
    }): void {
        logSecurityEvent({
            category: 'INJECTION_ATTEMPT',
            severity: 'HIGH',
            eventType: `${params.type}_INJECTION_ATTEMPT`,
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            resource: params.location,
            details: {
                injectionType: params.type,
                payload: sanitizeForLog(params.payload, 100),
            },
            iocType: 'injection_pattern',
            iocValue: params.type,
        })
    },

    /**
     * Log rate limit violation
     */
    rateLimited(params: {
        ipAddress: string
        userAgent?: string
        endpoint: string
        limit: number
        window: number
    }): void {
        logSecurityEvent({
            category: 'RATE_LIMITING',
            severity: 'MEDIUM',
            eventType: 'RATE_LIMIT_EXCEEDED',
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            resource: params.endpoint,
            details: {
                limit: params.limit,
                windowMs: params.window,
            },
        })
    },

    /**
     * Log unauthorized access attempt
     */
    unauthorized(params: {
        ipAddress: string
        userAgent?: string
        userId?: string
        resource: string
        requiredPermission?: string
    }): void {
        logSecurityEvent({
            category: 'AUTHORIZATION',
            severity: 'MEDIUM',
            eventType: 'UNAUTHORIZED_ACCESS',
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            userId: params.userId,
            resource: params.resource,
            details: {
                requiredPermission: params.requiredPermission,
            },
        })
    },

    /**
     * Log suspicious file upload
     */
    suspiciousUpload(params: {
        ipAddress: string
        userAgent?: string
        userId?: string
        filename: string
        declaredType: string
        detectedType?: string
        reason: string
    }): void {
        logSecurityEvent({
            category: 'FILE_UPLOAD',
            severity: 'HIGH',
            eventType: 'SUSPICIOUS_FILE_UPLOAD',
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            userId: params.userId,
            details: {
                filename: sanitizeForLog(params.filename, 100),
                declaredType: params.declaredType,
                detectedType: params.detectedType,
                reason: params.reason,
            },
        })
    },

    /**
     * Log API abuse
     */
    apiAbuse(params: {
        ipAddress: string
        userAgent?: string
        userId?: string
        endpoint: string
        abuseType: string
        details?: Record<string, unknown>
    }): void {
        logSecurityEvent({
            category: 'API_ABUSE',
            severity: 'MEDIUM',
            eventType: 'API_ABUSE_DETECTED',
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            userId: params.userId,
            resource: params.endpoint,
            details: {
                abuseType: params.abuseType,
                ...params.details,
            },
        })
    },

    /**
     * Log session anomaly
     */
    sessionAnomaly(params: {
        ipAddress: string
        userAgent?: string
        userId?: string
        sessionId: string
        anomalyType: string
        details?: Record<string, unknown>
    }): void {
        logSecurityEvent({
            category: 'SESSION',
            severity: 'HIGH',
            eventType: 'SESSION_ANOMALY',
            outcome: 'BLOCKED',
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            userId: params.userId,
            sessionId: params.sessionId,
            details: {
                anomalyType: params.anomalyType,
                ...params.details,
            },
        })
    },

    /**
     * Log data access for compliance
     */
    dataAccess(params: {
        ipAddress: string
        userId: string
        resource: string
        action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT'
        recordCount?: number
        sensitiveFields?: string[]
    }): void {
        logSecurityEvent({
            category: 'DATA_EXFILTRATION',
            severity: params.action === 'EXPORT' ? 'MEDIUM' : 'LOW',
            eventType: `DATA_${params.action}`,
            outcome: 'SUCCESS',
            ipAddress: params.ipAddress,
            userId: params.userId,
            resource: params.resource,
            action: params.action,
            details: {
                recordCount: params.recordCount,
                sensitiveFields: params.sensitiveFields,
            },
        })
    },
}

// ============= EXPORTS =============

export { flushEventBuffer }
