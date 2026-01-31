/**
 * Quotation Access Service
 * 
 * Manages secure access to quotations with:
 * - Rate-limited code validation
 * - Secure code generation with high entropy
 * - Duration-based expiration
 * - Audit logging for security
 */

import { prisma } from "@/lib/prisma";
import { hash, verify } from "argon2";
import { checkRateLimit, resetRateLimit } from "@/lib/redis";
import { generateSecureAccessCode, createSessionFingerprint } from "@/lib/secure-token";

// Rate limit config
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type AccessMode = "public" | "code";
export type CodeDuration = "7d" | "15d" | "30d" | "indefinite";

export interface AccessResult {
    allowed: boolean;
    reason: "valid" | "public" | "expired" | "invalid" | "rate_limited" | "not_found";
    remainingAttempts?: number;
    quotationId?: string;
    fingerprint?: string;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
        .replace(/\s+/g, "-") // Spaces to hyphens
        .replace(/-+/g, "-") // Multiple hyphens to single
        .substring(0, 50); // Limit length
}

function calculateExpiration(duration: CodeDuration): Date | null {
    if (duration === "indefinite") return null;

    const days = {
        "7d": 7,
        "15d": 15,
        "30d": 30
    }[duration];

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + days);
    return expiration;
}

export class QuotationAccessService {

    /**
     * Validate access code with rate limiting and audit logging
     */
    static async validateCode(
        clientSlug: string,
        quotationSlug: string,
        inputCode: string,
        ip: string,
        userAgent?: string
    ): Promise<AccessResult> {
        const rateLimitKey = `qt_rate:${ip}:${clientSlug}:${quotationSlug}`;

        // Check rate limit using Redis utility
        const rateResult = await checkRateLimit(rateLimitKey, MAX_ATTEMPTS, LOCKOUT_MINUTES * 60);
        if (!rateResult.allowed) {
            return { allowed: false, reason: "rate_limited", remainingAttempts: 0 };
        }

        // Find quotation (only visible ones)
        const quotation = await prisma.quotation.findFirst({
            where: {
                slug: quotationSlug,
                client: { slug: clientSlug },
                isVisible: true // Only allow access to visible quotations
            },
            include: { client: true }
        });

        if (!quotation) {
            return { allowed: false, reason: "not_found" };
        }

        // Check if public
        if (quotation.accessMode === "public") {
            return { allowed: true, reason: "public" };
        }

        // Check expiration
        if (quotation.codeExpiresAt && new Date() > quotation.codeExpiresAt) {
            return { allowed: false, reason: "expired" };
        }

        // Validate code
        const codeToCheck = quotation.accessCode || quotation.client?.accessCode;
        if (!codeToCheck) {
            return { allowed: false, reason: "not_found" };
        }

        try {
            const isValid = await verify(codeToCheck, inputCode);
            const fingerprint = createSessionFingerprint(ip, userAgent || "unknown");

            // Log access attempt
            await this.logAccessAttempt(
                quotation.id,
                clientSlug,
                quotationSlug,
                ip,
                userAgent,
                fingerprint,
                isValid ? "success" : "invalid_code"
            );

            if (isValid) {
                // Clear rate limit on success
                await resetRateLimit(rateLimitKey);
                return {
                    allowed: true,
                    reason: "valid",
                    quotationId: quotation.id,
                    fingerprint
                };
            } else {
                // Already incremented by checkRateLimit, just return remaining
                return {
                    allowed: false,
                    reason: "invalid",
                    remainingAttempts: rateResult.remaining
                };
            }
        } catch (e) {
            console.error("Error verifying code:", e);
            return { allowed: false, reason: "invalid" };
        }
    }

    /**
     * Log access attempt for security audit
     */
    private static async logAccessAttempt(
        quotationId: string,
        clientSlug: string,
        quotationSlug: string,
        ipAddress: string,
        userAgent: string | undefined,
        fingerprint: string,
        accessResult: string
    ): Promise<void> {
        try {
            await prisma.quotationAccessLog.create({
                data: {
                    quotationId,
                    clientSlug,
                    quotationSlug,
                    ipAddress,
                    userAgent,
                    fingerprint,
                    accessResult
                }
            });
        } catch (e) {
            // Don't fail the request if logging fails
            console.error("Failed to log access attempt:", e);
        }
    }

    /**
     * Generate a new secure access code with high entropy
     */
    static generateCode(): string {
        return generateSecureAccessCode();
    }

    /**
     * Create slug from project name
     */
    static createSlug(projectName: string): string {
        return slugify(projectName);
    }

    /**
     * Set or update access code for a quotation
     */
    static async setQuotationAccess(
        quotationId: string,
        mode: AccessMode,
        duration?: CodeDuration
    ): Promise<{ success: boolean; code?: string; expiresAt?: Date | null }> {

        if (mode === "public") {
            await prisma.quotation.update({
                where: { id: quotationId },
                data: {
                    accessMode: "public",
                    accessCode: null,
                    codeExpiresAt: null
                }
            });
            return { success: true };
        }

        // Generate new code with high entropy
        const plainCode = generateSecureAccessCode();
        const hashedCode = await hash(plainCode);
        const expiresAt = duration ? calculateExpiration(duration) : null;

        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                accessMode: "code",
                accessCode: hashedCode,
                codeExpiresAt: expiresAt
            }
        });

        return { success: true, code: plainCode, expiresAt };
    }

    /**
     * Rotate access code (generates new one, invalidates old)
     */
    static async rotateCode(
        quotationId: string,
        duration: CodeDuration
    ): Promise<{ success: boolean; code?: string; expiresAt?: Date | null; error?: string }> {

        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        return this.setQuotationAccess(quotationId, "code", duration);
    }

    /**
     * Get quotation by slugs (for public access)
     */
    static async getQuotationBySlugs(clientSlug: string, quotationSlug: string) {
        return prisma.quotation.findFirst({
            where: {
                slug: quotationSlug,
                client: { slug: clientSlug },
                isVisible: true
            },
            include: {
                client: {
                    select: { name: true, slug: true }
                }
            }
        });
    }

    /**
     * Check if code is expired
     */
    static isExpired(expiresAt: Date | null): boolean {
        if (!expiresAt) return false;
        return new Date() > expiresAt;
    }
}
