/**
 * Secure Token System for Quotation Access
 * 
 * Provides cryptographically secure tokens for quotation session management.
 * Uses HMAC-SHA256 for signature verification and prevents token forgery.
 * 
 * Based on 2026 security best practices:
 * - Signed tokens with HMAC
 * - Timestamp-based expiration
 * - Entropy from crypto.randomBytes
 * 
 * @module secure-token
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Secret key for HMAC - should be from environment
const getSecretKey = (): string => {
    const key = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
    if (!key) {
        throw new Error("ENCRYPTION_KEY or AUTH_SECRET environment variable is required");
    }
    return key;
};

export interface TokenPayload {
    quotationId: string;
    clientSlug: string;
    quotationSlug: string;
    issuedAt: number;
    expiresAt: number;
    nonce: string;
}

export interface TokenResult {
    valid: boolean;
    payload?: TokenPayload;
    error?: "expired" | "invalid_signature" | "malformed";
}

/**
 * Generate a secure access token for quotation access
 * 
 * Token format: base64(payload).base64(signature)
 * 
 * @param quotationId - Unique quotation identifier
 * @param clientSlug - Client URL slug
 * @param quotationSlug - Quotation URL slug
 * @param ttlSeconds - Token time-to-live in seconds (default: 24 hours)
 */
export function generateAccessToken(
    quotationId: string,
    clientSlug: string,
    quotationSlug: string,
    ttlSeconds: number = 60 * 60 * 24 // 24 hours default
): string {
    const now = Date.now();
    const nonce = randomBytes(16).toString("hex");

    const payload: TokenPayload = {
        quotationId,
        clientSlug,
        quotationSlug,
        issuedAt: now,
        expiresAt: now + (ttlSeconds * 1000),
        nonce
    };

    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString("base64url");

    // Create HMAC signature
    const signature = createHmac("sha256", getSecretKey())
        .update(payloadBase64)
        .digest("base64url");

    return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode an access token
 * 
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyAccessToken(token: string): TokenResult {
    try {
        const parts = token.split(".");
        if (parts.length !== 2) {
            return { valid: false, error: "malformed" };
        }

        const [payloadBase64, providedSignature] = parts;

        // Recalculate signature
        const expectedSignature = createHmac("sha256", getSecretKey())
            .update(payloadBase64)
            .digest("base64url");

        // Timing-safe comparison to prevent timing attacks
        const expectedBuffer = Buffer.from(expectedSignature);
        const providedBuffer = Buffer.from(providedSignature);

        if (expectedBuffer.length !== providedBuffer.length) {
            return { valid: false, error: "invalid_signature" };
        }

        if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
            return { valid: false, error: "invalid_signature" };
        }

        // Parse payload
        const payloadString = Buffer.from(payloadBase64, "base64url").toString("utf-8");
        const payload: TokenPayload = JSON.parse(payloadString);

        // Check expiration
        if (Date.now() > payload.expiresAt) {
            return { valid: false, error: "expired" };
        }

        return { valid: true, payload };
    } catch {
        return { valid: false, error: "malformed" };
    }
}

/**
 * Generate a more secure access code with higher entropy
 * 
 * Format: WORD-XXXX-XXXX-XXXX (where X is alphanumeric)
 * Entropy: ~62 bits (much stronger than previous ~16 bits)
 */
export function generateSecureAccessCode(): string {
    const words = [
        "Alpha", "Bravo", "Delta", "Echo", "Foxtrot",
        "Golf", "Hotel", "India", "Juliet", "Kilo",
        "Lima", "Mike", "Nova", "Oscar", "Papa",
        "Quebec", "Romeo", "Sierra", "Tango", "Victor"
    ];

    const word = words[Math.floor(Math.random() * words.length)];

    // Generate 3 groups of 4 characters each
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: I, O, 0, 1
    const groups: string[] = [];

    for (let g = 0; g < 3; g++) {
        let group = "";
        const bytes = randomBytes(4);
        for (let i = 0; i < 4; i++) {
            group += chars[bytes[i] % chars.length];
        }
        groups.push(group);
    }

    return `${word}-${groups.join("-")}`;
}

/**
 * Create a fingerprint hash for additional session binding
 * Combines IP and user-agent to detect session hijacking attempts
 */
export function createSessionFingerprint(ip: string, userAgent: string): string {
    return createHmac("sha256", getSecretKey())
        .update(`${ip}:${userAgent}`)
        .digest("hex")
        .substring(0, 16);
}

/**
 * Verify session fingerprint matches
 */
export function verifySessionFingerprint(
    storedFingerprint: string,
    currentIp: string,
    currentUserAgent: string
): boolean {
    const currentFingerprint = createSessionFingerprint(currentIp, currentUserAgent);
    const storedBuffer = Buffer.from(storedFingerprint);
    const currentBuffer = Buffer.from(currentFingerprint);

    if (storedBuffer.length !== currentBuffer.length) {
        return false;
    }

    return timingSafeEqual(storedBuffer, currentBuffer);
}
