/**
 * User Lifecycle Management API
 * 
 * Endpoints for managing user account lifecycle:
 * - Suspend/reactivate accounts
 * - Request/cancel deletion
 * - Anonymize data (GDPR)
 * - Permanent deletion
 * - Data export
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import {
    suspendUser,
    reactivateUser,
    requestAccountDeletion,
    cancelDeletionRequest,
    anonymizeUserData,
    permanentlyDeleteUser,
    exportUserData,
    getUserDataSummary,
    processScheduledDeletions
} from "@/lib/user-lifecycle";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Rate limiting for sensitive operations
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(adminId: string): boolean {
    const now = Date.now();
    const entry = requestCounts.get(adminId);

    if (!entry || now > entry.resetAt) {
        requestCounts.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (entry.count >= MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Only admins can manage user lifecycle
        const canManage = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "users.manage"
        );

        if (!canManage) {
            return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
        }

        // Rate limiting
        if (!checkRateLimit(session.user.id)) {
            return NextResponse.json(
                { error: "Demasiadas solicitudes. Espera un momento." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { action, userId, reason } = body;

        if (!action || !userId) {
            return NextResponse.json(
                { error: "Acción y userId son requeridos" },
                { status: 400 }
            );
        }

        // Prevent self-destruction
        if (userId === session.user.id && ["delete", "permanent_delete", "anonymize"].includes(action)) {
            return NextResponse.json(
                { error: "No puedes eliminar tu propia cuenta desde el panel de administración" },
                { status: 400 }
            );
        }

        let result;

        switch (action) {
            case "suspend":
                if (!reason) {
                    return NextResponse.json(
                        { error: "Se requiere una razón para suspender" },
                        { status: 400 }
                    );
                }
                result = await suspendUser(userId, session.user.id, reason);
                break;

            case "reactivate":
                result = await reactivateUser(userId, session.user.id);
                break;

            case "request_deletion":
                if (!reason) {
                    return NextResponse.json(
                        { error: "Se requiere una razón para la eliminación" },
                        { status: 400 }
                    );
                }
                result = await requestAccountDeletion(
                    userId,
                    session.user.id,
                    reason,
                    true // isAdminAction
                );
                break;

            case "cancel_deletion":
                result = await cancelDeletionRequest(userId, session.user.id);
                break;

            case "anonymize":
                // Extra confirmation required
                if (body.confirm !== "ANONYMIZE") {
                    return NextResponse.json(
                        { error: "Confirmación requerida: envía confirm='ANONYMIZE'" },
                        { status: 400 }
                    );
                }
                result = await anonymizeUserData(userId, session.user.id);
                break;

            case "permanent_delete":
                // Extra confirmation required
                if (body.confirm !== "DELETE_PERMANENTLY") {
                    return NextResponse.json(
                        { error: "Confirmación requerida: envía confirm='DELETE_PERMANENTLY'" },
                        { status: 400 }
                    );
                }
                if (!reason) {
                    return NextResponse.json(
                        { error: "Se requiere una razón para la eliminación permanente" },
                        { status: 400 }
                    );
                }
                result = await permanentlyDeleteUser(userId, session.user.id, reason);
                break;

            case "get_summary": {
                const summary = await getUserDataSummary(userId);
                if (!summary) {
                    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
                }
                return NextResponse.json({ success: true, data: summary });
            }

            case "export_data": {
                const exportResult = await exportUserData(userId);
                if (!exportResult.success) {
                    return NextResponse.json({ error: exportResult.error }, { status: 500 });
                }
                return NextResponse.json({
                    success: true,
                    data: exportResult.data,
                    message: "Datos exportados correctamente"
                });
            }

            case "process_scheduled": {
                // Only SUPERADMIN can process scheduled deletions
                if (session.user.role !== "SUPERADMIN") {
                    return NextResponse.json({ error: "Solo SUPERADMIN puede ejecutar esto" }, { status: 403 });
                }
                const processResult = await processScheduledDeletions(session.user.id);
                return NextResponse.json({
                    success: true,
                    processed: processResult.processed,
                    errors: processResult.errors
                });
            }

            default:
                return NextResponse.json(
                    { error: `Acción desconocida: ${action}` },
                    { status: 400 }
                );
        }

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("User lifecycle API error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * GET: List users with their lifecycle status
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "users.view"
        );

        if (!canView) {
            return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") as "ACTIVE" | "SUSPENDED" | "DELETION_REQUESTED" | "DELETION_SCHEDULED" | "ANONYMIZED" | "DELETED" | null;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: status ? { deletionStatus: status } : undefined,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    deletionStatus: true,
                    deletionRequestedAt: true,
                    deletionScheduledAt: true,
                    deletionReason: true,
                    createdAt: true,
                    lastLoginAt: true,
                    _count: {
                        select: {
                            quotations: true,
                            quotationClients: true,
                            transactions: true,
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.user.count({ where: status ? { deletionStatus: status } : undefined })
        ]);

        // Count users pending deletion
        const pendingDeletions = await prisma.user.count({
            where: {
                AND: [
                    { deletionStatus: { in: ["DELETION_REQUESTED", "DELETION_SCHEDULED"] } },
                    { deletionScheduledAt: { lte: new Date() } }
                ]
            }
        });

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            stats: {
                pendingDeletions
            }
        });

    } catch (error) {
        console.error("User lifecycle GET error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
