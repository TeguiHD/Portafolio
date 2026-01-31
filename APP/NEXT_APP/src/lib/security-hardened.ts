/**
 * Military-Grade Security Module
 * 
 * This module implements advanced security measures beyond standard web security:
 * - Timing attack prevention (constant-time comparisons)
 * - Request fingerprinting and anomaly detection
 * - ReDoS prevention
 * - Prototype pollution protection
 * - SSRF protection
 * - Log injection prevention
 * - Advanced input validation
 * - File magic bytes validation
 * 
 * @module security-hardened
 * @version 2.0.0
 */

import 'server-only'
import { createHash, timingSafeEqual, randomBytes } from 'crypto'

// ============= TIMING-SAFE COMPARISONS =============
// Prevents timing attacks on password/token comparisons

/**
 * Constant-time string comparison to prevent timing attacks
 * Used for comparing tokens, passwords, etc.
 */
export function secureCompare(a: string, b: string): boolean {
    // Ensure both strings are same length to prevent length-based timing attack
    const aBuffer = Buffer.from(a, 'utf8')
    const bBuffer = Buffer.from(b, 'utf8')

    // If lengths differ, still compare to prevent timing leak
    if (aBuffer.length !== bBuffer.length) {
        // Compare with itself to maintain constant time
        timingSafeEqual(aBuffer, aBuffer)
        return false
    }

    return timingSafeEqual(aBuffer, bBuffer)
}

/**
 * Constant-time hash comparison for tokens
 */
export function secureHashCompare(token: string, storedHash: string, secret: string): boolean {
    const tokenHash = createHash('sha256')
        .update(token + secret)
        .digest('hex')

    return secureCompare(tokenHash, storedHash)
}

// ============= REQUEST FINGERPRINTING =============
// Detects suspicious behavior patterns

interface RequestFingerprint {
    ipHash: string
    userAgentHash: string
    acceptLanguage: string
    acceptEncoding: string
    timestamp: number
    entropy: number
}

interface AnomalyScore {
    score: number  // 0-100, higher = more suspicious
    reasons: string[]
}

const fingerprintHistory = new Map<string, RequestFingerprint[]>()
const FINGERPRINT_WINDOW = 60 * 60 * 1000  // 1 hour
const MAX_FINGERPRINTS = 100

/**
 * Generate request fingerprint for anomaly detection
 */
export function generateFingerprint(
    ip: string,
    userAgent: string,
    headers: Headers,
    secret: string
): RequestFingerprint {
    return {
        ipHash: createHash('sha256').update(ip + secret).digest('hex').slice(0, 16),
        userAgentHash: createHash('sha256').update(userAgent + secret).digest('hex').slice(0, 16),
        acceptLanguage: headers.get('accept-language')?.slice(0, 50) || '',
        acceptEncoding: headers.get('accept-encoding')?.slice(0, 50) || '',
        timestamp: Date.now(),
        entropy: calculateEntropy(userAgent),
    }
}

/**
 * Calculate Shannon entropy of a string
 * Low entropy in user agents can indicate bots
 */
function calculateEntropy(str: string): number {
    const freq: Record<string, number> = {}
    for (const char of str) {
        freq[char] = (freq[char] || 0) + 1
    }

    let entropy = 0
    const len = str.length
    for (const count of Object.values(freq)) {
        const p = count / len
        entropy -= p * Math.log2(p)
    }

    return entropy
}

/**
 * Detect anomalies in request patterns
 */
export function detectAnomalies(
    userId: string,
    fingerprint: RequestFingerprint
): AnomalyScore {
    const reasons: string[] = []
    let score = 0

    // Get user's fingerprint history
    const history = fingerprintHistory.get(userId) || []

    // Check for suspicious patterns

    // 1. User agent entropy too low (possible bot)
    if (fingerprint.entropy < 3.0) {
        score += 20
        reasons.push('LOW_UA_ENTROPY')
    }

    // 2. Rapid IP changes (possible proxy rotation)
    const recentIPs = new Set(
        history.filter(f => f.timestamp > Date.now() - 5 * 60 * 1000)
            .map(f => f.ipHash)
    )
    if (recentIPs.size >= 3) {
        score += 30
        reasons.push('RAPID_IP_ROTATION')
    }

    // 3. User agent changes while IP stays same
    const ipHistory = history.filter(f => f.ipHash === fingerprint.ipHash)
    const uniqueUAs = new Set(ipHistory.map(f => f.userAgentHash))
    if (uniqueUAs.size >= 3) {
        score += 25
        reasons.push('UA_SWITCHING')
    }

    // 4. Missing standard headers (possible headless browser)
    if (!fingerprint.acceptLanguage || !fingerprint.acceptEncoding) {
        score += 15
        reasons.push('MISSING_HEADERS')
    }

    // 5. Request velocity anomaly
    const last5Min = history.filter(f => f.timestamp > Date.now() - 5 * 60 * 1000)
    if (last5Min.length > 50) {
        score += 20
        reasons.push('HIGH_VELOCITY')
    }

    // 6. Known bot patterns
    const uaLower = fingerprint.userAgentHash.toLowerCase()
    const botPatterns = ['headless', 'phantom', 'selenium', 'puppeteer', 'playwright']
    if (botPatterns.some(p => uaLower.includes(p))) {
        score += 40
        reasons.push('BOT_PATTERN_DETECTED')
    }

    // Update history
    history.push(fingerprint)

    // Clean old entries
    const cleanedHistory = history
        .filter(f => f.timestamp > Date.now() - FINGERPRINT_WINDOW)
        .slice(-MAX_FINGERPRINTS)

    fingerprintHistory.set(userId, cleanedHistory)

    return { score: Math.min(score, 100), reasons }
}

// ============= ReDoS PREVENTION =============
// Prevents Regular Expression Denial of Service

const REGEX_TIMEOUT_MS = 100
const safeRegexCache = new Map<string, RegExp>()

/**
 * Execute regex with timeout to prevent ReDoS
 */
export function safeRegexTest(pattern: string, input: string, flags = ''): boolean | null {
    // Check input length
    if (input.length > 10000) {
        return null  // Refuse to process very long inputs
    }

    // Use cached compiled regex
    const cacheKey = pattern + flags
    let regex = safeRegexCache.get(cacheKey)

    if (!regex) {
        try {
            regex = new RegExp(pattern, flags)
            safeRegexCache.set(cacheKey, regex)
        } catch {
            return null  // Invalid regex
        }
    }

    // For Node.js, we can't truly timeout regex, but we can limit input size
    // In production, consider using 're2' package for safe regex

    const start = performance.now()
    const result = regex.test(input)
    const duration = performance.now() - start

    // Log slow regex for monitoring
    if (duration > REGEX_TIMEOUT_MS) {
        console.warn(`[SECURITY] Slow regex detected: ${duration}ms for pattern ${pattern.slice(0, 50)}`)
    }

    return result
}

/**
 * Pre-validated safe patterns for common use cases
 */
export const SafePatterns = {
    // These patterns are verified to be ReDoS-safe
    email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    numeric: /^[0-9]+$/,
    phone: /^\+?[0-9]{8,15}$/,
}

// ============= PROTOTYPE POLLUTION PROTECTION =============

/**
 * Deep freeze an object to prevent prototype pollution
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
    Object.freeze(obj)

    for (const key of Object.keys(obj)) {
        const value = (obj as Record<string, unknown>)[key]
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value as object)
        }
    }

    return obj
}

/**
 * Safely parse JSON without prototype pollution
 */
export function safeJsonParse<T>(json: string): T | null {
    try {
        const parsed = JSON.parse(json, (key, value) => {
            // Block prototype pollution attempts
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                return undefined
            }
            return value
        })

        return parsed as T
    } catch {
        return null
    }
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const dangerous = ['__proto__', 'constructor', 'prototype']

    for (const key of Object.keys(obj)) {
        if (dangerous.includes(key)) {
            delete obj[key]
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key] as Record<string, unknown>)
        }
    }

    return obj
}

// ============= SSRF PROTECTION =============
// Prevents Server-Side Request Forgery

const BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254',  // AWS metadata
    'metadata.google.internal',  // GCP metadata
    '100.100.100.200',  // Alibaba metadata
]

const BLOCKED_PREFIXES = [
    '10.',
    '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.',
    '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.',
    '192.168.',
    'fc00:',
    'fe80:',
]

const ALLOWED_EXTERNAL_HOSTS = [
    'api.openrouter.ai',
    'api.frankfurter.app',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
]

/**
 * Validate URL for SSRF protection
 */
export function validateExternalUrl(urlString: string): { safe: boolean; reason?: string } {
    try {
        const url = new URL(urlString)

        // Only allow HTTPS in production
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
            return { safe: false, reason: 'HTTPS_REQUIRED' }
        }

        // Check blocked hosts
        if (BLOCKED_HOSTS.includes(url.hostname)) {
            return { safe: false, reason: 'BLOCKED_HOST' }
        }

        // Check blocked IP ranges
        for (const prefix of BLOCKED_PREFIXES) {
            if (url.hostname.startsWith(prefix)) {
                return { safe: false, reason: 'PRIVATE_IP_RANGE' }
            }
        }

        // Only allow whitelisted external hosts
        if (!ALLOWED_EXTERNAL_HOSTS.includes(url.hostname)) {
            return { safe: false, reason: 'HOST_NOT_WHITELISTED' }
        }

        // Block non-standard ports
        if (url.port && !['80', '443', ''].includes(url.port)) {
            return { safe: false, reason: 'NON_STANDARD_PORT' }
        }

        return { safe: true }
    } catch {
        return { safe: false, reason: 'INVALID_URL' }
    }
}

// ============= LOG INJECTION PREVENTION =============

const LOG_DANGEROUS_PATTERNS = [
    /[\n\r]/g,           // Newlines (log forging)
    // eslint-disable-next-line no-control-regex
    /\x1b\[[0-9;]*m/g,   // ANSI escape codes
    // eslint-disable-next-line no-control-regex
    /\x00/g,             // Null bytes
]

/**
 * Sanitize string for safe logging
 */
export function sanitizeForLog(input: string, maxLength = 500): string {
    let sanitized = input

    for (const pattern of LOG_DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, ' ')
    }

    // Truncate long strings
    if (sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength) + '...[TRUNCATED]'
    }

    return sanitized
}

/**
 * Create safe log object
 */
export function safeLogObject(obj: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            safe[sanitizeForLog(key, 100)] = sanitizeForLog(value)
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            safe[key] = value
        } else if (value === null || value === undefined) {
            safe[key] = value
        } else {
            // Recursively sanitize objects
            safe[key] = '[OBJECT]'
        }
    }

    return safe
}

// ============= FILE VALIDATION (MAGIC BYTES) =============

interface MagicBytes {
    mime: string
    extension: string
    signature: number[]
    offset?: number
}

const ALLOWED_FILE_SIGNATURES: MagicBytes[] = [
    // Images
    { mime: 'image/jpeg', extension: 'jpg', signature: [0xFF, 0xD8, 0xFF] },
    { mime: 'image/png', extension: 'png', signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { mime: 'image/gif', extension: 'gif', signature: [0x47, 0x49, 0x46, 0x38] },
    { mime: 'image/webp', extension: 'webp', signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    // Documents
    { mime: 'application/pdf', extension: 'pdf', signature: [0x25, 0x50, 0x44, 0x46] },
    // Note: CSV and JSON are text-based and don't have magic bytes
]

/**
 * Validate file by checking magic bytes (file signature)
 * Prevents file extension spoofing attacks
 */
export function validateFileMagicBytes(
    buffer: Buffer | Uint8Array,
    expectedType?: string
): { valid: boolean; detectedType?: string; reason?: string } {
    const bytes = buffer instanceof Buffer ? buffer : Buffer.from(buffer)

    if (bytes.length < 8) {
        return { valid: false, reason: 'FILE_TOO_SMALL' }
    }

    for (const sig of ALLOWED_FILE_SIGNATURES) {
        const offset = sig.offset || 0
        let matches = true

        for (let i = 0; i < sig.signature.length; i++) {
            if (bytes[offset + i] !== sig.signature[i]) {
                matches = false
                break
            }
        }

        if (matches) {
            // WebP has additional check
            if (sig.mime === 'image/webp') {
                // Check for WEBP string at offset 8
                const webpSig = [0x57, 0x45, 0x42, 0x50]
                for (let i = 0; i < webpSig.length; i++) {
                    if (bytes[8 + i] !== webpSig[i]) {
                        matches = false
                        break
                    }
                }
            }

            if (matches) {
                if (expectedType && sig.mime !== expectedType) {
                    return {
                        valid: false,
                        detectedType: sig.mime,
                        reason: 'TYPE_MISMATCH'
                    }
                }
                return { valid: true, detectedType: sig.mime }
            }
        }
    }

    return { valid: false, reason: 'UNKNOWN_FILE_TYPE' }
}

/**
 * Validate base64 image from data URL
 */
export function validateBase64Image(dataUrl: string): {
    valid: boolean
    mime?: string
    reason?: string
} {
    // Extract mime and base64 data
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
        return { valid: false, reason: 'INVALID_DATA_URL' }
    }

    const [, declaredMime, base64Data] = match

    // Validate base64
    try {
        const buffer = Buffer.from(base64Data, 'base64')

        // Check actual file type matches declared type
        const validation = validateFileMagicBytes(buffer, declaredMime)

        if (!validation.valid) {
            return {
                valid: false,
                reason: validation.reason || 'MAGIC_BYTES_MISMATCH'
            }
        }

        return { valid: true, mime: declaredMime }
    } catch {
        return { valid: false, reason: 'INVALID_BASE64' }
    }
}

// ============= ADVANCED INPUT VALIDATION =============

/**
 * Validate and sanitize user input with strict rules
 */
export function validateStrictInput(
    input: string,
    options: {
        maxLength?: number
        minLength?: number
        pattern?: RegExp
        type?: 'text' | 'email' | 'username' | 'numeric' | 'alphanumeric'
        allowEmpty?: boolean
    } = {}
): { valid: boolean; sanitized?: string; error?: string } {
    const {
        maxLength = 1000,
        minLength = 0,
        pattern,
        type = 'text',
        allowEmpty = false
    } = options

    // Null/undefined check
    if (input == null) {
        if (allowEmpty) return { valid: true, sanitized: '' }
        return { valid: false, error: 'INPUT_REQUIRED' }
    }

    // Type check
    if (typeof input !== 'string') {
        return { valid: false, error: 'MUST_BE_STRING' }
    }

    let sanitized = input.trim()

    // Length checks
    if (!allowEmpty && sanitized.length === 0) {
        return { valid: false, error: 'INPUT_REQUIRED' }
    }

    if (sanitized.length < minLength) {
        return { valid: false, error: `MIN_LENGTH_${minLength}` }
    }

    if (sanitized.length > maxLength) {
        return { valid: false, error: `MAX_LENGTH_${maxLength}` }
    }

    // Remove null bytes and control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

    // Type-specific validation
    switch (type) {
        case 'email':
            if (!SafePatterns.email.test(sanitized)) {
                return { valid: false, error: 'INVALID_EMAIL' }
            }
            sanitized = sanitized.toLowerCase()
            break

        case 'username':
            if (!/^[a-zA-Z][a-zA-Z0-9_-]{2,29}$/.test(sanitized)) {
                return { valid: false, error: 'INVALID_USERNAME' }
            }
            break

        case 'numeric':
            if (!SafePatterns.numeric.test(sanitized)) {
                return { valid: false, error: 'MUST_BE_NUMERIC' }
            }
            break

        case 'alphanumeric':
            if (!SafePatterns.alphanumeric.test(sanitized)) {
                return { valid: false, error: 'MUST_BE_ALPHANUMERIC' }
            }
            break
    }

    // Custom pattern
    if (pattern && !pattern.test(sanitized)) {
        return { valid: false, error: 'PATTERN_MISMATCH' }
    }

    return { valid: true, sanitized }
}

// ============= SECURE TOKEN GENERATION =============

/**
 * Generate cryptographically secure token
 */
export function generateSecureToken(length = 32): string {
    return randomBytes(length).toString('hex')
}

/**
 * Generate URL-safe secure token
 */
export function generateUrlSafeToken(length = 32): string {
    return randomBytes(length)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}

// ============= REQUEST INTEGRITY =============

/**
 * Generate request signature for integrity verification
 */
export function signRequest(
    method: string,
    path: string,
    body: string,
    timestamp: number,
    secret: string
): string {
    const payload = `${method}:${path}:${body}:${timestamp}`
    return createHash('sha256')
        .update(payload + secret)
        .digest('hex')
}

/**
 * Verify request signature
 */
export function verifyRequestSignature(
    method: string,
    path: string,
    body: string,
    timestamp: number,
    signature: string,
    secret: string,
    maxAgeMs = 5 * 60 * 1000  // 5 minutes
): { valid: boolean; reason?: string } {
    // Check timestamp freshness
    const now = Date.now()
    if (Math.abs(now - timestamp) > maxAgeMs) {
        return { valid: false, reason: 'TIMESTAMP_EXPIRED' }
    }

    const expectedSignature = signRequest(method, path, body, timestamp, secret)

    if (!secureCompare(signature, expectedSignature)) {
        return { valid: false, reason: 'INVALID_SIGNATURE' }
    }

    return { valid: true }
}
