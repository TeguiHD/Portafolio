/**
 * Session Management Service
 * Handles user session tracking, concurrent session detection, and session revocation
 */

import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { createNotification } from "@/lib/notificationService";
import type { NotificationType, NotificationPriority } from "@prisma/client";

// Helper to extract browser name from user agent
export function getBrowserFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return "Unknown";

    if (userAgent.includes("Edg/")) return "Edge";
    if (userAgent.includes("Chrome/")) return "Chrome";
    if (userAgent.includes("Firefox/")) return "Firefox";
    if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) return "Opera";
    if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) return "Internet Explorer";

    return "Other";
}

// Helper to extract device type from user agent
export function getDeviceFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return "Unknown";

    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";

    return "desktop";
}

// Helper to extract OS from user agent
export function getOSFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return "Unknown";

    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac OS")) return "macOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";

    return "Other";
}

interface CreateSessionParams {
    userId: string;
    tokenId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    expiresAt: Date;
}

/**
 * Create a new user session and check for concurrent sessions
 */
export async function createUserSession(params: CreateSessionParams): Promise<{
    session: { id: string };
    concurrentSessions: number;
    isNewLocation: boolean;
}> {
    const { userId, tokenId, ipAddress, userAgent, expiresAt } = params;

    const browser = getBrowserFromUserAgent(userAgent || null);
    const device = getDeviceFromUserAgent(userAgent || null);
    const os = getOSFromUserAgent(userAgent || null);

    // Get existing active sessions for concurrent detection
    const existingSessions = await prisma.userSession.findMany({
        where: {
            userId,
            isActive: true,
            expiresAt: { gt: new Date() },
        },
        select: {
            id: true,
            ipAddress: true,
            browser: true,
            device: true,
        },
    });

    // Check if this is a new location (different IP)
    const isNewLocation = existingSessions.length > 0 &&
        !existingSessions.some(s => s.ipAddress === ipAddress);

    // Check for concurrent sessions from different devices/browsers
    const differentDeviceSessions = existingSessions.filter(
        s => s.ipAddress !== ipAddress || s.browser !== browser
    );

    // Create the new session
    const session = await prisma.userSession.create({
        data: {
            userId,
            tokenId,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            browser,
            device,
            os,
            expiresAt,
        },
        select: { id: true },
    });

    // If there are concurrent sessions from different locations, create notification
    if (differentDeviceSessions.length > 0) {
        await createNotification({
            type: "CONCURRENT_SESSION_DETECTED",
            priority: "HIGH",
            title: "Sesión detectada en otro dispositivo",
            message: `Se inició sesión desde ${browser} en ${os} (${device}). Ya tienes ${differentDeviceSessions.length} sesión(es) activa(s) en otros dispositivos.`,
            metadata: {
                newIP: ipAddress,
                newBrowser: browser,
                newDevice: device,
                existingSessions: differentDeviceSessions.length,
            },
            targetUserId: userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        });

        // Log security event
        await createAuditLog({
            action: AuditActions.CONCURRENT_SESSION,
            category: "security",
            userId,
            metadata: {
                newIP: ipAddress?.substring(0, 10) + "...",
                existingSessions: differentDeviceSessions.length,
                browser,
                device,
            },
            ipAddress: ipAddress || undefined,
            userAgent: userAgent || undefined,
        });
    }

    // If this is a new location, create a different notification
    if (isNewLocation && differentDeviceSessions.length === 0) {
        await createNotification({
            type: "SESSION_FROM_NEW_LOCATION",
            priority: "MEDIUM",
            title: "Inicio de sesión desde nueva ubicación",
            message: `Se inició sesión desde una nueva ubicación IP. Navegador: ${browser}, Dispositivo: ${device}.`,
            metadata: {
                ip: ipAddress,
                browser,
                device,
                os,
            },
            targetUserId: userId,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
        });
    }

    return {
        session,
        concurrentSessions: differentDeviceSessions.length,
        isNewLocation,
    };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
    return prisma.userSession.findMany({
        where: {
            userId,
            isActive: true,
            expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivity: "desc" },
        select: {
            id: true,
            tokenId: true,
            ipAddress: true,
            browser: true,
            device: true,
            os: true,
            city: true,
            country: true,
            lastActivity: true,
            createdAt: true,
            expiresAt: true,
        },
    });
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
    sessionId: string,
    userId: string,
    reason: string = "manual_revoke",
    actorId?: string
): Promise<boolean> {
    const session = await prisma.userSession.findFirst({
        where: {
            id: sessionId,
            userId,
            isActive: true,
        },
    });

    if (!session) return false;

    await prisma.userSession.update({
        where: { id: sessionId },
        data: {
            isActive: false,
            revokedAt: new Date(),
            revokeReason: reason,
        },
    });

    // Log the revocation
    await createAuditLog({
        action: AuditActions.SESSION_REVOKED,
        category: "security",
        userId: actorId || userId,
        targetId: sessionId,
        targetType: "session",
        metadata: {
            reason,
            revokedSessionIP: session.ipAddress,
            revokedSessionBrowser: session.browser,
        },
    });

    return true;
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeAllOtherSessions(
    userId: string,
    currentTokenId: string
): Promise<number> {
    const result = await prisma.userSession.updateMany({
        where: {
            userId,
            tokenId: { not: currentTokenId },
            isActive: true,
        },
        data: {
            isActive: false,
            revokedAt: new Date(),
            revokeReason: "revoke_all_others",
        },
    });

    if (result.count > 0) {
        await createAuditLog({
            action: AuditActions.SESSION_REVOKED,
            category: "security",
            userId,
            metadata: {
                reason: "revoke_all_others",
                count: result.count,
            },
        });
    }

    return result.count;
}

/**
 * Update last activity for a session
 */
export async function updateSessionActivity(tokenId: string): Promise<void> {
    await prisma.userSession.updateMany({
        where: { tokenId, isActive: true },
        data: { lastActivity: new Date() },
    });
}

/**
 * Cleanup expired sessions (should run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.userSession.updateMany({
        where: {
            expiresAt: { lt: new Date() },
            isActive: true,
        },
        data: {
            isActive: false,
            revokeReason: "expired",
        },
    });

    return result.count;
}
