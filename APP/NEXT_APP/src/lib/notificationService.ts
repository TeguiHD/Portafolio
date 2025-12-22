import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationPriority, Role, Prisma } from "@prisma/client";

interface CreateNotificationParams {
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    targetRole?: Role;
    targetUserId?: string;
    actorId?: string;
    actorName?: string;
    expiresAt?: Date;
}

/**
 * Create a new admin notification
 */
export async function createNotification(params: CreateNotificationParams) {
    try {
        return await prisma.adminNotification.create({
            data: {
                type: params.type,
                priority: params.priority || "MEDIUM",
                title: params.title,
                message: params.message,
                metadata: params.metadata,
                targetRole: params.targetRole,
                targetUserId: params.targetUserId,
                actorId: params.actorId,
                actorName: params.actorName,
                expiresAt: params.expiresAt,
            },
        });
    } catch (error) {
        console.error("[NotificationService] Error creating notification:", error);
        // Don't throw - notifications should not break main flows
        return null;
    }
}

/**
 * Helper functions for common notification types
 */
export const NotificationHelpers = {
    // ============= USER NOTIFICATIONS =============

    async userCreated(
        newUser: { id: string; name?: string | null; email: string },
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "USER_CREATED",
            priority: "MEDIUM",
            title: "Nuevo usuario registrado",
            message: `${actor.name || "Admin"} creó el usuario ${newUser.name || newUser.email}`,
            metadata: { userId: newUser.id },
            targetRole: "SUPERADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async userRoleChanged(
        user: { id: string; name?: string | null },
        oldRole: Role,
        newRole: Role,
        actor: { id: string; name?: string | null }
    ) {
        const roleLabels: Record<Role, string> = {
            SUPERADMIN: "Super Admin",
            ADMIN: "Administrador",
            MODERATOR: "Moderador",
            USER: "Usuario",
        };

        return createNotification({
            type: "USER_ROLE_CHANGED",
            priority: "HIGH",
            title: "Cambio de rol de usuario",
            message: `${user.name || "Usuario"} cambió de ${roleLabels[oldRole]} a ${roleLabels[newRole]}`,
            metadata: { userId: user.id, oldRole, newRole },
            targetRole: "SUPERADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async userSuspended(
        user: { id: string; name?: string | null },
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "USER_SUSPENDED",
            priority: "HIGH",
            title: "Usuario suspendido",
            message: `${actor.name || "Admin"} suspendió a ${user.name || "Usuario"}`,
            metadata: { userId: user.id },
            targetRole: "SUPERADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async userActivated(
        user: { id: string; name?: string | null },
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "USER_ACTIVATED",
            priority: "MEDIUM",
            title: "Usuario activado",
            message: `${actor.name || "Admin"} activó a ${user.name || "Usuario"}`,
            metadata: { userId: user.id },
            targetRole: "SUPERADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async userDeleted(
        user: { id: string; name?: string | null },
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "USER_DELETED",
            priority: "HIGH",
            title: "Usuario eliminado",
            message: `${actor.name || "Admin"} eliminó a ${user.name || "Usuario"}`,
            metadata: { userId: user.id },
            targetRole: "SUPERADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    // ============= SECURITY NOTIFICATIONS =============

    async passwordChanged(
        user: { id: string; name?: string | null },
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "PASSWORD_CHANGED",
            priority: "MEDIUM",
            title: "Contraseña cambiada",
            message: `${actor.name || "Admin"} cambió la contraseña de ${user.name || "Usuario"}`,
            metadata: { userId: user.id },
            targetRole: "SUPERADMIN",
            targetUserId: user.id, // Also notify the affected user
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async loginRateLimited(identifier: string, attempts: number) {
        return createNotification({
            type: "LOGIN_RATE_LIMITED",
            priority: "HIGH",
            title: "Intentos de login bloqueados",
            message: `Se bloquearon ${attempts} intentos de login`,
            metadata: { identifier: identifier.substring(0, 10) + "...", attempts },
            targetRole: "SUPERADMIN",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24h
        });
    },

    // ============= QUOTATION NOTIFICATIONS =============

    async quotationCreated(
        quotation: { id: string; folio: string; clientName: string },
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "QUOTATION_CREATED",
            priority: "LOW",
            title: "Nueva cotización",
            message: `Cotización ${quotation.folio} para ${quotation.clientName}`,
            metadata: { quotationId: quotation.id, folio: quotation.folio },
            targetRole: "ADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async quotationStatusChanged(
        quotation: { id: string; folio: string },
        oldStatus: string,
        newStatus: string,
        actor: { id: string; name?: string | null }
    ) {
        const statusLabels: Record<string, string> = {
            draft: "Borrador",
            sent: "Enviada",
            accepted: "Aceptada",
            rejected: "Rechazada",
        };

        return createNotification({
            type: "QUOTATION_STATUS_CHANGED",
            priority: newStatus === "accepted" ? "HIGH" : "MEDIUM",
            title: `Cotización ${statusLabels[newStatus] || newStatus}`,
            message: `${quotation.folio} cambió de ${statusLabels[oldStatus] || oldStatus} a ${statusLabels[newStatus] || newStatus}`,
            metadata: { quotationId: quotation.id, folio: quotation.folio, oldStatus, newStatus },
            targetRole: "ADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    // ============= TOOL NOTIFICATIONS =============

    async toolStatusChanged(
        tool: { id: string; name: string },
        isPublic: boolean,
        actor: { id: string; name?: string | null }
    ) {
        return createNotification({
            type: "TOOL_STATUS_CHANGED",
            priority: "MEDIUM",
            title: isPublic ? "Herramienta publicada" : "Herramienta ocultada",
            message: `${tool.name} ahora está ${isPublic ? "pública" : "oculta"}`,
            metadata: { toolId: tool.id },
            targetRole: "ADMIN",
            actorId: actor.id,
            actorName: actor.name || undefined,
        });
    },

    async toolUsageSpike(tool: { id: string; name: string }, usageCount: number) {
        return createNotification({
            type: "TOOL_USAGE_SPIKE",
            priority: "LOW",
            title: "Pico de uso en herramienta",
            message: `${tool.name} alcanzó ${usageCount} usos hoy`,
            metadata: { toolId: tool.id, usageCount },
            targetRole: "ADMIN",
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expires in 12h
        });
    },

    // ============= SYSTEM NOTIFICATIONS =============

    async systemError(errorMessage: string, details?: Prisma.InputJsonValue) {
        return createNotification({
            type: "SYSTEM_ERROR",
            priority: "CRITICAL",
            title: "Error del sistema",
            message: errorMessage,
            metadata: details,
            targetRole: "SUPERADMIN",
        });
    },

    async systemMaintenance(message: string, scheduledAt?: Date) {
        return createNotification({
            type: "SYSTEM_MAINTENANCE",
            priority: "HIGH",
            title: "Mantenimiento programado",
            message: message,
            metadata: scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : undefined,
            targetRole: "ADMIN", // All admins should see this
        });
    },
};

/**
 * Get role hierarchy for notification visibility
 */
export function getRoleHierarchy(role: Role): Role[] {
    const hierarchy: Record<Role, Role[]> = {
        SUPERADMIN: ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"],
        ADMIN: ["ADMIN", "MODERATOR", "USER"],
        MODERATOR: ["MODERATOR", "USER"],
        USER: ["USER"],
    };
    return hierarchy[role];
}
