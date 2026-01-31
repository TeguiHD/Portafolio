/**
 * Enterprise Security Wrapper for API Routes
 * 
 * Provides a consistent security layer for all sensitive API endpoints:
 * - Rate limiting (with in-memory fallback for development)
 * - Request validation (SQLi, XSS, path traversal detection)
 * - Authentication verification
 * - Security incident logging to dashboard
 * 
 * Usage:
 * ```typescript
 * export const GET = withSecurity(handler, {
 *     rateLimit: { limit: 30, window: 60 },
 *     requireAuth: true,
 *     requiredRole: ["ADMIN", "SUPERADMIN"],
 * });
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/redis";
import { logSecurityIncident, validateRequest } from "@/lib/security-infra";
import { createHash } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

type Role = "SUPERADMIN" | "ADMIN" | "MODERATOR" | "USER";

interface SecurityOptions {
    /** Rate limiting configuration */
    rateLimit?: {
        /** Max requests per window */
        limit: number;
        /** Window in seconds */
        window: number;
        /** Custom identifier prefix (default: route path) */
        prefix?: string;
    };
    /** Require authenticated user */
    requireAuth?: boolean;
    /** Required roles (any of these) */
    requiredRole?: Role[];
    /** Enable request validation (SQLi, XSS detection) */
    validateInput?: boolean;
    /** Custom security context for logging */
    context?: string;
}

type ApiHandler = (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

// ============================================================================
// HELPERS
// ============================================================================

const isProduction = process.env.NODE_ENV === "production";

function hashIP(ip: string): string {
    return createHash("sha256")
        .update(ip + (process.env.ENCRYPTION_KEY || "salt"))
        .digest("hex")
        .substring(0, 16);
}

function getClientIP(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

// ============================================================================
// SECURITY WRAPPER
// ============================================================================

/**
 * Wraps an API handler with enterprise security features
 */
export function withSecurity(
    handler: ApiHandler,
    options: SecurityOptions = {}
): ApiHandler {
    const {
        rateLimit,
        requireAuth = false,
        requiredRole,
        validateInput = true,
        context,
    } = options;

    return async (request: NextRequest, handlerContext?: { params?: Promise<Record<string, string>> }) => {
        const url = new URL(request.url);
        const ip = getClientIP(request);
        const ipHash = hashIP(ip);
        const path = url.pathname;
        const method = request.method;
        const securityContext = context || path;

        try {
            // ================================================================
            // 1. REQUEST VALIDATION
            // ================================================================
            if (validateInput) {
                const validation = validateRequest(request);

                if (validation.shouldBlock) {
                    logSecurityIncident("invalid_input_injection", {
                        ip: ipHash,
                        path,
                        details: {
                            issues: validation.issues,
                            method,
                            context: securityContext,
                        },
                        critical: true,
                    });

                    return NextResponse.json(
                        { error: "Request blocked for security reasons" },
                        { status: 403 }
                    );
                }

                if (validation.issues.length > 0) {
                    // Log but don't block in development
                    logSecurityIncident("suspicious_request_pattern", {
                        ip: ipHash,
                        path,
                        details: {
                            issues: validation.issues,
                            method,
                            context: securityContext,
                        },
                    });
                }
            }

            // ================================================================
            // 2. RATE LIMITING
            // ================================================================
            if (rateLimit) {
                const rateLimitKey = `${rateLimit.prefix || path}:${ipHash}`;
                const { allowed, remaining, resetIn } = await checkRateLimit(
                    rateLimitKey,
                    rateLimit.limit,
                    rateLimit.window
                );

                if (!allowed) {
                    logSecurityIncident("rate_limit_bypass_attempt", {
                        ip: ipHash,
                        path,
                        details: {
                            limit: rateLimit.limit,
                            window: rateLimit.window,
                            method,
                            context: securityContext,
                        },
                    });

                    return NextResponse.json(
                        {
                            error: "Too many requests",
                            retryAfter: resetIn,
                        },
                        {
                            status: 429,
                            headers: {
                                "Retry-After": String(resetIn),
                                "X-RateLimit-Limit": String(rateLimit.limit),
                                "X-RateLimit-Remaining": String(remaining),
                                "X-RateLimit-Reset": String(resetIn),
                            },
                        }
                    );
                }
            }

            // ================================================================
            // 3. AUTHENTICATION
            // ================================================================
            if (requireAuth || requiredRole) {
                const session = await auth();

                if (!session?.user) {
                    logSecurityIncident("authentication_failure", {
                        ip: ipHash,
                        path,
                        details: {
                            reason: "No session",
                            method,
                            context: securityContext,
                        },
                    });

                    return NextResponse.json(
                        { error: "Authentication required" },
                        { status: 401 }
                    );
                }

                // Role check
                if (requiredRole && requiredRole.length > 0) {
                    const userRole = (session.user as { role?: string })?.role;

                    if (!userRole || !requiredRole.includes(userRole as Role)) {
                        logSecurityIncident("privilege_escalation", {
                            ip: ipHash,
                            path,
                            userId: session.user.id,
                            details: {
                                userRole,
                                requiredRole,
                                method,
                                context: securityContext,
                            },
                            critical: true,
                        });

                        return NextResponse.json(
                            { error: "Insufficient permissions" },
                            { status: 403 }
                        );
                    }
                }
            }

            // ================================================================
            // 4. EXECUTE HANDLER
            // ================================================================
            return await handler(request, handlerContext);

        } catch (error) {
            // Log unexpected errors
            console.error(`[Security] Error in ${securityContext}:`, error);

            if (isProduction) {
                logSecurityIncident("suspicious_request_pattern", {
                    ip: ipHash,
                    path,
                    details: {
                        error: error instanceof Error ? error.message : "Unknown error",
                        method,
                        context: securityContext,
                    },
                });
            }

            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    };
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/** High security for admin routes */
export const ADMIN_SECURITY: SecurityOptions = {
    rateLimit: { limit: 60, window: 60 },
    requireAuth: true,
    requiredRole: ["ADMIN", "SUPERADMIN"],
    validateInput: true,
    context: "admin",
};

/** Standard security for authenticated routes */
export const AUTH_SECURITY: SecurityOptions = {
    rateLimit: { limit: 30, window: 60 },
    requireAuth: true,
    validateInput: true,
};

/** Strict security for auth endpoints */
export const LOGIN_SECURITY: SecurityOptions = {
    rateLimit: { limit: 10, window: 60 },
    requireAuth: false,
    validateInput: true,
    context: "auth",
};

/** Security for financial data */
export const FINANCE_SECURITY: SecurityOptions = {
    rateLimit: { limit: 30, window: 60 },
    requireAuth: true,
    requiredRole: ["ADMIN", "SUPERADMIN"],
    validateInput: true,
    context: "finance",
};

/** Security for CV/personal data */
export const CV_SECURITY: SecurityOptions = {
    rateLimit: { limit: 20, window: 60 },
    requireAuth: true,
    validateInput: true,
    context: "cv",
};

/** Security for quotations */
export const QUOTATION_SECURITY: SecurityOptions = {
    rateLimit: { limit: 30, window: 60 },
    requireAuth: true,
    validateInput: true,
    context: "quotations",
};

/** Public API with rate limiting only */
export const PUBLIC_SECURITY: SecurityOptions = {
    rateLimit: { limit: 60, window: 60 },
    requireAuth: false,
    validateInput: true,
    context: "public",
};
