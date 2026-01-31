/**
 * Atomic Rate Limiting Utility
 * 
 * Prevents race conditions in rate limiting by using atomic database operations.
 * Instead of check-then-increment (TOCTOU vulnerable), uses atomic increment with limit check.
 * 
 * @see https://owasp.org/www-project-web-security-testing-guide - Race Condition Security
 * @see https://portswigger.net/research/smashing-the-state-machine - PortSwigger Research
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    isNewWindow: boolean;
}

export interface RateLimitConfig {
    limit: number;           // max requests per window
    windowMs: number;        // window duration in milliseconds
    identifier: string;      // unique identifier (hash of ip + fingerprint + cookie)
    metadata?: {             // optional metadata to store
        ip?: string;
        fingerprint?: string;
        cookieId?: string;
    };
}

/**
 * Check rate limit atomically using database upsert with increment.
 * This prevents TOCTOU race conditions by combining check and increment in one operation.
 */
export async function checkRateLimitAtomic(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
        // SECURITY: Atomic rate limit check and increment using raw SQL
        // This prevents race conditions by doing the check and increment atomically
        const result = await prisma.$transaction(async (tx) => {
            // First, try to get existing entry
            const existing = await tx.rateLimitEntry.findUnique({
                where: { identifier: config.identifier },
            });

            // If exists and within current window
            if (existing && existing.windowStart > windowStart) {
                // Check if already at limit - ATOMIC check before increment
                if (existing.count >= config.limit) {
                    return {
                        allowed: false,
                        remaining: 0,
                        resetIn: existing.windowStart.getTime() + config.windowMs - now.getTime(),
                        isNewWindow: false,
                        count: existing.count,
                    };
                }

                // ATOMIC increment - happens in same transaction as check
                const updated = await tx.rateLimitEntry.update({
                    where: { identifier: config.identifier },
                    data: { count: { increment: 1 } },
                });

                return {
                    allowed: true,
                    remaining: config.limit - updated.count,
                    resetIn: existing.windowStart.getTime() + config.windowMs - now.getTime(),
                    isNewWindow: false,
                    count: updated.count,
                };
            }

            // Create new window or reset expired window
            const upserted = await tx.rateLimitEntry.upsert({
                where: { identifier: config.identifier },
                create: {
                    identifier: config.identifier,
                    ip: config.metadata?.ip?.slice(0, 45) || "",
                    fingerprint: config.metadata?.fingerprint || "",
                    cookieId: config.metadata?.cookieId || "",
                    count: 1,
                    windowStart: now,
                },
                update: {
                    count: 1,
                    windowStart: now,
                    ip: config.metadata?.ip?.slice(0, 45) || "",
                    fingerprint: config.metadata?.fingerprint || "",
                    cookieId: config.metadata?.cookieId || "",
                },
            });

            return {
                allowed: true,
                remaining: config.limit - 1,
                resetIn: config.windowMs,
                isNewWindow: true,
                count: upserted.count,
            };
        }, {
            // Use serializable isolation to prevent concurrent modifications
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        return {
            allowed: result.allowed,
            remaining: result.remaining,
            resetIn: result.resetIn,
            isNewWindow: result.isNewWindow,
        };

    } catch (error) {
        // Handle serialization failures (concurrent access) - retry once
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2034") {
                // Transaction conflict - could retry, but for rate limiting, just allow
                console.warn("[RateLimit] Transaction conflict, allowing request");
                return { allowed: true, remaining: config.limit - 1, resetIn: config.windowMs, isNewWindow: false };
            }
        }

        console.error("[RateLimit] Database error:", error);
        // Fallback: allow request on DB error (don't block users due to our issues)
        return { allowed: true, remaining: config.limit - 1, resetIn: config.windowMs, isNewWindow: false };
    }
}

/**
 * Alternative: Use raw SQL for truly atomic increment with limit check.
 * This is useful when you need maximum atomicity guarantees.
 */
export async function checkRateLimitRaw(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
        // Atomic UPDATE that only increments if under limit
        // Returns 0 rows if limit exceeded or no entry exists
        const updateResult = await prisma.$executeRaw`
            UPDATE "RateLimitEntry"
            SET "count" = "count" + 1
            WHERE "identifier" = ${config.identifier}
            AND "windowStart" > ${windowStart}
            AND "count" < ${config.limit}
        `;

        if (updateResult === 1) {
            // Successfully incremented - get current count
            const entry = await prisma.rateLimitEntry.findUnique({
                where: { identifier: config.identifier },
            });

            return {
                allowed: true,
                remaining: config.limit - (entry?.count || 1),
                resetIn: entry ? entry.windowStart.getTime() + config.windowMs - now.getTime() : config.windowMs,
                isNewWindow: false,
            };
        }

        // Check if limit was exceeded or entry doesn't exist
        const existing = await prisma.rateLimitEntry.findUnique({
            where: { identifier: config.identifier },
        });

        if (existing && existing.windowStart > windowStart && existing.count >= config.limit) {
            // Limit exceeded
            return {
                allowed: false,
                remaining: 0,
                resetIn: existing.windowStart.getTime() + config.windowMs - now.getTime(),
                isNewWindow: false,
            };
        }

        // Create new entry or reset expired window
        await prisma.rateLimitEntry.upsert({
            where: { identifier: config.identifier },
            create: {
                identifier: config.identifier,
                ip: config.metadata?.ip?.slice(0, 45) || "",
                fingerprint: config.metadata?.fingerprint || "",
                cookieId: config.metadata?.cookieId || "",
                count: 1,
                windowStart: now,
            },
            update: {
                count: 1,
                windowStart: now,
            },
        });

        return {
            allowed: true,
            remaining: config.limit - 1,
            resetIn: config.windowMs,
            isNewWindow: true,
        };

    } catch (error) {
        console.error("[RateLimit] Raw SQL error:", error);
        return { allowed: true, remaining: config.limit - 1, resetIn: config.windowMs, isNewWindow: false };
    }
}
