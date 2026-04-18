/**
 * API: User Profile Management
 * GET: Get current user's profile
 * PATCH: Update profile (name, avatar)
 * PUT: Change password
 * 
 * Security: NIST SP 800-63B compliant password policies
 * Audit: All profile changes logged per NIST SP 800-53 AU-3
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security.server";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── PATCH: Update profile ─────────────────────────────────────────
const updateProfileSchema = z.object({
    name: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(100).optional(),
    avatar: z.string().url().nullable().optional(),
});

export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const data = updateProfileSchema.parse(body);

        // Nothing to update
        if (!data.name && data.avatar === undefined) {
            return NextResponse.json({ error: "No hay cambios" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        const changes: string[] = [];

        if (data.name !== undefined) {
            updateData.name = data.name.trim();
            changes.push(`nombre → "${data.name.trim()}"`);
        }
        if (data.avatar !== undefined) {
            updateData.avatar = data.avatar;
            changes.push("avatar actualizado");
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: { id: true, name: true, email: true, avatar: true },
        });

        // Audit trail
        await createAuditLog({
            action: "profile.updated",
            category: "users",
            userId: session.user.id,
            metadata: { changes, timestamp: new Date().toISOString() },
        });

        return NextResponse.json({
            success: true,
            data: user,
            message: "Perfil actualizado correctamente",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        console.error("[Profile API] PATCH error:", error);
        return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
    }
}

// ─── PUT: Change password ──────────────────────────────────────────
const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z
        .string()
        .min(12, "La nueva contraseña debe tener al menos 12 caracteres")
        .max(128)
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
            "Debe incluir mayúsculas, minúsculas, número y carácter especial"
        ),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const data = changePasswordSchema.parse(body);

        // Get current user with password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, password: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Verify current password
        const isCurrentValid = await verifyPassword(data.currentPassword, user.password);
        if (!isCurrentValid) {
            // Audit failed attempt
            await createAuditLog({
                action: "PASSWORD_CHANGE_FAILED",
                category: "security",
                userId: session.user.id,
                metadata: { reason: "incorrect_current_password" },
            });
            return NextResponse.json(
                { error: "La contraseña actual es incorrecta" },
                { status: 403 }
            );
        }

        // Check new password isn't same as current
        const isSamePassword = await verifyPassword(data.newPassword, user.password);
        if (isSamePassword) {
            return NextResponse.json(
                { error: "La nueva contraseña debe ser diferente a la actual" },
                { status: 400 }
            );
        }

        // Hash new password with Argon2id
        const hashedPassword = await hashPassword(data.newPassword);

        // Update password and revoke all other sessions atomically
        await prisma.$transaction([
            prisma.user.update({
                where: { id: session.user.id },
                data: { password: hashedPassword },
            }),
            // Revoke all other active sessions (NIST SP 800-63B: credential change invalidates sessions)
            prisma.userSession.updateMany({
                where: {
                    userId: session.user.id,
                    isActive: true,
                },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                    revokeReason: "password_changed",
                },
            }),
        ]);

        // Audit trail
        await createAuditLog({
            action: AuditActions.PASSWORD_CHANGED,
            category: "security",
            userId: session.user.id,
            metadata: {
                timestamp: new Date().toISOString(),
                method: "self-service",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Contraseña actualizada correctamente. Todas las demás sesiones han sido cerradas.",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        console.error("[Profile API] PUT (password) error:", error);
        return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
    }
}

// ─── GET: Export user data (GDPR Article 20) ───────────────────────
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "export") {
            // Export all user data (GDPR compliance)
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatar: true,
                    createdAt: true,
                    lastLoginAt: true,
                    sharingCode: true,
                    _count: {
                        select: {
                            quotations: true,
                            contracts: true,
                            quotationClients: true,
                            transactions: true,
                            financeAccounts: true,
                            auditLogs: true,
                            userSessions: true,
                        },
                    },
                },
            });

            if (!user) {
                return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
            }

            // Get recent audit logs
            const auditLogs = await prisma.auditLog.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: "desc" },
                take: 100,
                select: {
                    action: true,
                    category: true,
                    metadata: true,
                    createdAt: true,
                },
            });

            // Get sessions
            const sessions = await prisma.userSession.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: "desc" },
                take: 50,
                select: {
                    browser: true,
                    device: true,
                    os: true,
                    city: true,
                    country: true,
                    isActive: true,
                    createdAt: true,
                    lastActivity: true,
                },
            });

            // Mark data export
            await prisma.user.update({
                where: { id: session.user.id },
                data: { dataExportedAt: new Date() },
            });

            // Audit
            await createAuditLog({
                action: "DATA_EXPORT",
                category: "users",
                userId: session.user.id,
                metadata: { format: "json", timestamp: new Date().toISOString() },
            });

            return NextResponse.json({
                exportDate: new Date().toISOString(),
                gdprArticle: "Art. 20 - Right to data portability",
                userData: user,
                auditLogs,
                sessions,
            });
        }

        // Default: get profile
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                createdAt: true,
                lastLoginAt: true,
                sharingCode: true,
                dataExportedAt: true,
            },
        });

        return NextResponse.json({ data: user });
    } catch (error) {
        console.error("[Profile API] GET error:", error);
        return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
    }
}
