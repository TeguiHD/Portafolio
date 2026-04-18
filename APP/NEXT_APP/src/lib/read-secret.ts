/**
 * Docker Secrets Reader
 * 
 * Reads secrets from Docker Secrets mount (/run/secrets/<name>)
 * with environment variable fallback for development.
 * 
 * Security references:
 * - NIST SP 800-53 Rev 5.2.0: SC-28 (Protection of Information at Rest)
 * - OWASP 2025 A02: Security Misconfiguration
 * - MITRE ATT&CK T1552.001: Credentials In Files
 * 
 * @module lib/read-secret
 */
import 'server-only'
import { readFileSync, existsSync } from 'fs'

/**
 * Cache for resolved secrets (avoid repeated filesystem reads)
 * Secrets are immutable during process lifetime, so caching is safe.
 */
const secretCache = new Map<string, string>()

/**
 * Read a secret from Docker Secrets or fallback to environment variable.
 * 
 * Resolution order:
 * 1. Docker Secret file at /run/secrets/<secretName>
 * 2. Environment variable matching secretName (converted: kebab-case → UPPER_SNAKE_CASE)
 * 3. Explicit envFallbackKey if provided
 * 
 * In production, throws if secret is not found (fail-closed).
 * In development, returns empty string with warning.
 * 
 * @param secretName - Docker secret name (e.g., 'db-password')
 * @param envFallbackKey - Explicit env var name to use as fallback (e.g., 'DATABASE_URL')
 */
export function readSecret(secretName: string, envFallbackKey?: string): string {
    // Check cache first
    const cacheKey = `${secretName}:${envFallbackKey || ''}`
    const cached = secretCache.get(cacheKey)
    if (cached !== undefined) return cached

    let value = ''

    // 1. Try Docker Secrets mount
    const secretPath = `/run/secrets/${secretName}`
    try {
        if (existsSync(secretPath)) {
            value = readFileSync(secretPath, 'utf8').trim()
        }
    } catch {
        // File doesn't exist or not readable — continue to fallback
    }

    // 2. Try environment variable
    if (!value) {
        const envKey = envFallbackKey || secretName.toUpperCase().replace(/-/g, '_')
        value = process.env[envKey] || ''
    }

    // 3. Fail-closed in production
    if (!value && process.env.NODE_ENV === 'production') {
        console.error(`[SECURITY] CRITICAL: Secret "${secretName}" not found via Docker Secrets or env var`)
        throw new Error(`Secret "${secretName}" is required in production`)
    }

    if (!value && process.env.NODE_ENV !== 'production') {
        console.warn(`[Dev] Secret "${secretName}" not configured — using empty string`)
    }

    // Cache the resolved value
    secretCache.set(cacheKey, value)
    return value
}

/**
 * Convenience accessors for commonly used secrets.
 * These provide type-safe, documented access to critical secrets.
 */
export const secrets = {
    get encryptionKey() { return readSecret('encryption-key', 'ENCRYPTION_KEY') },
    get nextauthSecret() { return readSecret('nextauth-secret', 'NEXTAUTH_SECRET') },
    get passwordPepper() { return readSecret('password-pepper', 'PASSWORD_PEPPER') },
    get auditSigningKey() { return readSecret('audit-signing-key', 'AUDIT_SIGNING_KEY') },
    get redisPassword() { return readSecret('redis-password', 'REDIS_PASSWORD') },
    get databaseUrl() { return readSecret('database-url', 'DATABASE_URL') },
} as const
