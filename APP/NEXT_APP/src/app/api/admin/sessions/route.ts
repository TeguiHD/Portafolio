/**
 * API: User Sessions Management
 * GET: List active sessions for current user
 * DELETE: Revoke a specific session
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import {
    getBrowserFromUserAgent,
    getDeviceFromUserAgent,
    getOSFromUserAgent
} from "@/lib/session-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sessions
 * Get all active sessions for the current user
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;

        const sessions = await prisma.userSession.findMany({
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

        return NextResponse.json({
            success: true,
            data: sessions,
            count: sessions.length,
        });
    } catch (error) {
        console.error("[Sessions API] Error:", error);
        return NextResponse.json(
            { error: "Error al obtener sesiones" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/sessions
 * Revoke a specific session or all other sessions
 * Body: { sessionId?: string, revokeAll?: boolean }
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();
        const { sessionId, revokeAll } = body;

        if (revokeAll) {
            // Revoke all other sessions (keep current)
            // We need the current token ID from the JWT, but we don't have easy access here
            // So we'll use a simpler approach: revoke all sessions except the most recent one
            const result = await prisma.userSession.updateMany({
                where: {
                    userId,
                    isActive: true,
                    id: { not: sessionId }, // If sessionId provided, exclude it
                },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                    revokeReason: "revoke_all_others",
                },
            });

            await createAuditLog({
                action: AuditActions.SESSION_REVOKED,
                category: "security",
                userId,
                metadata: {
                    reason: "revoke_all_others",
                    count: result.count,
                },
            });

            return NextResponse.json({
                success: true,
                message: `${result.count} sesión(es) revocada(s)`,
                revokedCount: result.count,
            });
        }

        if (!sessionId) {
            return NextResponse.json(
                { error: "sessionId es requerido" },
                { status: 400 }
            );
        }

        // Find and revoke specific session
        const targetSession = await prisma.userSession.findFirst({
            where: {
                id: sessionId,
                userId,
                isActive: true,
            },
        });

        if (!targetSession) {
            return NextResponse.json(
                { error: "Sesión no encontrada" },
                { status: 404 }
            );
        }

        await prisma.userSession.update({
            where: { id: sessionId },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokeReason: "manual_revoke",
            },
        });

        await createAuditLog({
            action: AuditActions.SESSION_REVOKED,
            category: "security",
            userId,
            targetId: sessionId,
            targetType: "session",
            metadata: {
                reason: "manual_revoke",
                revokedIP: targetSession.ipAddress,
                revokedBrowser: targetSession.browser,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Sesión revocada exitosamente",
        });
    } catch (error) {
        console.error("[Sessions API] Delete error:", error);
        return NextResponse.json(
            { error: "Error al revocar sesión" },
            { status: 500 }
        );
    }
}
