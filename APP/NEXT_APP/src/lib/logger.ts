/**
 * Production-safe logger utility
 * 
 * SECURITY: Never log sensitive data in production
 * - Use logger.debug() for development-only info
 * - Use logger.info() for operational logs (sanitized)
 * - Use logger.warn() and logger.error() for issues
 * 
 * All sensitive data (emails, tokens, passwords, API keys) should NEVER be logged
 */
import 'server-only'

const isProduction = process.env.NODE_ENV === 'production'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
    [key: string]: unknown
}

/**
 * Sanitize log context to remove sensitive data
 */
function sanitizeContext(context: LogContext): LogContext {
    const sensitiveKeys = [
        'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
        'authorization', 'auth', 'cookie', 'session', 'email',
        'credentials', 'credit', 'ssn', 'phone'
    ]

    const sanitized: LogContext = {}

    for (const [key, value] of Object.entries(context)) {
        const lowerKey = key.toLowerCase()
        const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk))

        if (isSensitive) {
            sanitized[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeContext(value as LogContext)
        } else {
            sanitized[key] = value
        }
    }

    return sanitized
}

/**
 * Format log message with timestamp and level
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()

    if (isProduction) {
        // Structured JSON logging for production (Datadog/CloudWatch friendly)
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...sanitizeContext(context || {})
        })
    }

    // Human readable for development
    const sanitizedContext = context ? JSON.stringify(sanitizeContext(context)) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${sanitizedContext ? ' ' + sanitizedContext : ''}`
}

/**
 * Production-safe logger
 */
export const logger = {
    /**
     * Debug logs - ONLY in development
     * Use for detailed debugging info that should never appear in production
     */
    debug: (message: string, context?: LogContext): void => {
        if (!isProduction) {
            console.log(formatLog('debug', message, context))
        }
    },

    /**
     * Info logs - Operational information
     * Visible in production but context is sanitized
     */
    info: (message: string, context?: LogContext): void => {
        console.log(formatLog('info', message, context))
    },

    /**
     * Warning logs - Potential issues
     */
    warn: (message: string, context?: LogContext): void => {
        console.warn(formatLog('warn', message, context))
    },

    /**
     * Error logs - Actual errors
     * Context is sanitized to prevent sensitive data leakage
     */
    error: (message: string, error?: Error | unknown, context?: LogContext): void => {
        const errorInfo = error instanceof Error
            ? { name: error.name, message: error.message }
            : error
        console.error(formatLog('error', message, { ...context, error: errorInfo }))
    },

    /**
     * Auth-specific logger - extra sanitization
     * NEVER logs emails, passwords, or tokens
     */
    auth: {
        debug: (event: string, details?: { userId?: string; success?: boolean }): void => {
            if (!isProduction) {
                console.log(formatLog('debug', `[AUTH] ${event}`, details))
            }
        },
        info: (event: string, details?: { userId?: string; success?: boolean }): void => {
            console.log(formatLog('info', `[AUTH] ${event}`, details))
        },
        warn: (event: string, details?: { userId?: string; reason?: string }): void => {
            console.warn(formatLog('warn', `[AUTH] ${event}`, details))
        },
        error: (event: string, error?: Error | unknown): void => {
            const errorInfo = error instanceof Error ? error.message : 'Unknown error'
            console.error(formatLog('error', `[AUTH] ${event}`, { error: errorInfo }))
        },
    }
}

export default logger
