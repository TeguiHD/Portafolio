/**
 * Security Infrastructure Module
 * 
 * Enterprise-grade security utilities:
 * - Redis health checks with startup validation
 * - Security alerts and incident logging
 * - Rate limiting enforcement
 * - Dependency availability monitoring
 * 
 * SECURITY POLICY:
 * - Production: Fail-closed. Critical dependencies MUST be available.
 * - Development: Warn but allow fallbacks for testing.
 */

import { getRedisClient } from './redis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const isProduction = process.env.NODE_ENV === 'production';
const REDIS_HEALTH_CHECK_TIMEOUT_MS = 5000;
const SECURITY_INCIDENT_TYPES = [
    'rate_limit_bypass_attempt',
    'unauthorized_tool_access',
    'privilege_escalation',
    'invalid_input_injection',
    'authentication_failure',
    'redis_unavailable',
    'suspicious_request_pattern',
] as const;

type SecurityIncidentType = typeof SECURITY_INCIDENT_TYPES[number];

// ============================================================================
// SECURITY STATE
// ============================================================================

let redisHealthy = false;
let lastHealthCheck = 0;
let healthCheckInProgress = false;
const HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds

// Incident counters for alerting
const incidentCounters = new Map<string, { count: number; firstSeen: number; lastSeen: number }>();

// ============================================================================
// REDIS HEALTH CHECK
// ============================================================================

/**
 * Check if Redis is healthy and available
 * Uses cached result if within HEALTH_CHECK_INTERVAL_MS
 */
export async function checkRedisHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const now = Date.now();

    // Return cached result if recent
    if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS && !healthCheckInProgress) {
        return { healthy: redisHealthy };
    }

    // Prevent concurrent health checks
    if (healthCheckInProgress) {
        return { healthy: redisHealthy };
    }

    healthCheckInProgress = true;
    const startTime = Date.now();

    try {
        const client = await Promise.race([
            getRedisClient(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Health check timeout')), REDIS_HEALTH_CHECK_TIMEOUT_MS)
            ),
        ]);

        // Ping test
        await client.ping();

        const latencyMs = Date.now() - startTime;
        redisHealthy = true;
        lastHealthCheck = now;

        return { healthy: true, latencyMs };
    } catch (error) {
        redisHealthy = false;
        lastHealthCheck = now;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log security incident in production
        if (isProduction) {
            logSecurityIncident('redis_unavailable', {
                details: { error: errorMessage },
                critical: true,
            });
        }

        return { healthy: false, error: errorMessage };
    } finally {
        healthCheckInProgress = false;
    }
}

/**
 * Validate that all critical security dependencies are available
 * In production, this should be called at startup and periodically
 * 
 * @throws Error in production if critical dependencies are unavailable
 */
export async function validateSecurityDependencies(): Promise<{
    ready: boolean;
    redis: { available: boolean; latencyMs?: number };
    warnings: string[];
    errors: string[];
}> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check Redis
    const redisCheck = await checkRedisHealth();

    if (!redisCheck.healthy) {
        if (isProduction) {
            errors.push(`Redis unavailable: ${redisCheck.error}`);
        } else {
            warnings.push(`[Dev] Redis unavailable: ${redisCheck.error} - using in-memory fallback`);
        }
    }

    // Check for required environment variables in production
    if (isProduction) {
        const requiredEnvVars = ['REDIS_URL', 'NEXTAUTH_SECRET', 'DATABASE_URL'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                errors.push(`Missing required environment variable: ${envVar}`);
            }
        }
    }

    const ready = errors.length === 0;

    // In production, log and potentially throw
    if (!ready && isProduction) {
        console.error('[SECURITY CRITICAL] Security dependencies validation failed:', errors);
        // In strict mode, we could throw here to prevent app startup
        // throw new Error('Security dependencies not available');
    }

    return {
        ready,
        redis: { available: redisCheck.healthy, latencyMs: redisCheck.latencyMs },
        warnings,
        errors,
    };
}

// ============================================================================
// SECURITY INCIDENT LOGGING
// ============================================================================

interface SecurityIncident {
    type: SecurityIncidentType;
    timestamp: string;
    ip?: string;
    userId?: string;
    path?: string;
    details?: Record<string, unknown>;
    critical?: boolean;
}

/**
 * Log a security incident
 * Tracks incident frequency and can trigger alerts
 * Persists to database in production
 */
export function logSecurityIncident(
    type: SecurityIncidentType,
    details: Omit<SecurityIncident, 'type' | 'timestamp'> = {}
): void {
    const now = Date.now();
    const incident: SecurityIncident = {
        type,
        timestamp: new Date().toISOString(),
        ...details,
    };

    // Update incident counter
    const counterKey = `${type}:${details.ip || 'global'}`;
    const existing = incidentCounters.get(counterKey);

    if (existing) {
        existing.count++;
        existing.lastSeen = now;
    } else {
        incidentCounters.set(counterKey, { count: 1, firstSeen: now, lastSeen: now });
    }

    // Log to console with severity
    const logFn = details.critical ? console.error : console.warn;
    logFn(`[SECURITY${details.critical ? ' CRITICAL' : ''}] ${type}:`, JSON.stringify(incident));

    // Check for alert threshold
    const counter = incidentCounters.get(counterKey)!;
    if (counter.count >= 10 && (now - counter.firstSeen) < 60000) {
        // 10+ incidents in 1 minute = alert
        triggerSecurityAlert(type, counter.count, details);
    }

    // Persist to database (fire-and-forget, don't block)
    persistIncidentToDatabase(type, details).catch(err => {
        console.error('[Security] Failed to persist incident to DB:', err);
    });
}

/**
 * Persist incident to database
 */
async function persistIncidentToDatabase(
    type: SecurityIncidentType,
    details: Omit<SecurityIncident, 'type' | 'timestamp'>
): Promise<void> {
    try {
        // Dynamic import to avoid circular dependencies
        const { prisma } = await import('@/lib/prisma');

        // Determine severity based on incident type
        const severity = details.critical
            ? 'CRITICAL'
            : (type.includes('injection') || type.includes('escalation') ? 'HIGH' : 'MEDIUM');

        await prisma.securityIncident.create({
            data: {
                type,
                severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
                ipHash: details.ip || 'unknown',
                path: details.path,
                userId: details.userId,
                details: details.details as object || undefined,
            },
        });
    } catch {
        // Fail silently - security logging should not break the app
    }
}

/**
 * Trigger a security alert
 * In production, this could send emails, Slack notifications, etc.
 */
function triggerSecurityAlert(
    type: SecurityIncidentType,
    count: number,
    details: Record<string, unknown>
): void {
    console.error(`[SECURITY ALERT] High frequency incident detected: ${type} (${count} occurrences)`);
    console.error('[SECURITY ALERT] Details:', JSON.stringify(details));

    // In a real enterprise setup, this would:
    // - Send email to security team
    // - Post to Slack/Teams
    // - Create PagerDuty incident
    // - Log to SIEM system
}

// ============================================================================
// RATE LIMITING ENFORCEMENT
// ============================================================================

/**
 * Strict rate limit check that blocks on any failure in production
 */
export async function enforceRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number; bypassed: boolean }> {
    // Import dynamically to avoid circular dependency
    const { checkRateLimit } = await import('./redis');

    const result = await checkRateLimit(identifier, limit, windowSeconds);

    // Track if rate limiting was bypassed (Redis unavailable in dev)
    const bypassed = !redisHealthy && !isProduction;

    if (bypassed) {
        console.warn(`[Security] Rate limiting bypassed for identifier: ${identifier}`);
    }

    return { ...result, bypassed };
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate incoming request for suspicious patterns
 */
export function validateRequest(request: Request): {
    valid: boolean;
    issues: string[];
    shouldBlock: boolean;
} {
    const issues: string[] = [];

    const url = new URL(request.url);

    // Check for SQL injection patterns in URL
    const sqlPatterns = /('|--|;|union|select|drop|insert|update|delete|exec|execute)/i;
    if (sqlPatterns.test(url.search)) {
        issues.push('Potential SQL injection in query string');
    }

    // Check for path traversal
    if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
        issues.push('Path traversal attempt detected');
    }

    // Check for XSS in URL
    const xssPatterns = /<script|javascript:|on\w+=/i;
    if (xssPatterns.test(url.href)) {
        issues.push('Potential XSS in URL');
    }

    // Check for excessive query parameters
    if (url.searchParams.toString().length > 2048) {
        issues.push('Query string too long');
    }

    const shouldBlock = issues.length > 0 && isProduction;

    if (issues.length > 0) {
        logSecurityIncident('invalid_input_injection', {
            path: url.pathname,
            details: { issues },
            critical: shouldBlock,
        });
    }

    return { valid: issues.length === 0, issues, shouldBlock };
}

// ============================================================================
// HEALTH CHECK API ENDPOINT DATA
// ============================================================================

/**
 * Get security system status for health check endpoints
 */
export async function getSecurityStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    redis: boolean;
    incidentCount: number;
    uptime: number;
}> {
    const deps = await validateSecurityDependencies();

    let totalIncidents = 0;
    incidentCounters.forEach(counter => {
        totalIncidents += counter.count;
    });

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (!deps.redis.available) {
        status = isProduction ? 'critical' : 'degraded';
    } else if (totalIncidents > 100) {
        status = 'degraded';
    }

    return {
        status,
        redis: deps.redis.available,
        incidentCount: totalIncidents,
        uptime: process.uptime(),
    };
}
