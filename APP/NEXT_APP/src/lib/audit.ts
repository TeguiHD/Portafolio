/**
 * Audit Logging Utilities
 * Records security-relevant events for administrative review
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Audit categories
export type AuditCategory =
    | "auth"       // Login, logout, failed attempts
    | "users"      // User CRUD, role changes
    | "security"   // Permission changes, lockouts
    | "tools"      // Tool changes
    | "quotations" // Quotation CRUD
    | "finance"    // Finance module events
    | "system";    // System events

// Common audit actions
export const AuditActions = {
    // Auth
    LOGIN_SUCCESS: "login.success",
    LOGIN_FAILED: "login.failed",
    LOGOUT: "logout",
    ACCOUNT_LOCKED: "account.locked",
    ACCOUNT_UNLOCKED: "account.unlocked",

    // Users
    USER_CREATED: "user.created",
    USER_UPDATED: "user.updated",
    USER_DELETED: "user.deleted",
    USER_ROLE_CHANGED: "user.role.changed",
    USER_SUSPENDED: "user.suspended",
    USER_ACTIVATED: "user.activated",
    PASSWORD_CHANGED: "password.changed",

    // Security
    PERMISSION_GRANTED: "permission.granted",
    PERMISSION_REVOKED: "permission.revoked",
    PERMISSION_RESET: "permission.reset",
    CONCURRENT_SESSION: "session.concurrent",
    SESSION_REVOKED: "session.revoked",

    // Tools
    TOOL_CREATED: "tool.created",
    TOOL_UPDATED: "tool.updated",
    TOOL_DELETED: "tool.deleted",
    TOOL_VISIBILITY_CHANGED: "tool.visibility.changed",

    // Quotations
    QUOTATION_CREATED: "quotation.created",
    QUOTATION_UPDATED: "quotation.updated",
    QUOTATION_DELETED: "quotation.deleted",

    // Finance
    TRANSACTION_CREATED: "transaction.created",
    TRANSACTION_UPDATED: "transaction.updated",
    TRANSACTION_DELETED: "transaction.deleted",
    TRANSACTION_BATCH: "transaction.batch",
    ACCOUNT_CREATED: "finance.account.created",
    ACCOUNT_UPDATED: "finance.account.updated",
    ACCOUNT_DELETED: "finance.account.deleted",
    BUDGET_CREATED: "budget.created",
    BUDGET_UPDATED: "budget.updated",
    BUDGET_DELETED: "budget.deleted",
    BUDGET_EXCEEDED: "budget.exceeded",
    GOAL_CREATED: "goal.created",
    GOAL_UPDATED: "goal.updated",
    GOAL_COMPLETED: "goal.completed",
    OCR_PROCESSED: "ocr.processed",
    OCR_FAILED: "ocr.failed",
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

interface AuditLogParams {
    action: AuditAction | string;
    category: AuditCategory;
    userId?: string | null;
    targetId?: string;
    targetType?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                action: params.action,
                category: params.category,
                userId: params.userId || null,
                targetId: params.targetId || null,
                targetType: params.targetType || null,
                metadata: params.metadata as unknown as Prisma.InputJsonValue | undefined,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
            },
        });
    } catch (error) {
        // Don't throw - audit logging should never break the main flow
        console.error("[Audit] Failed to create log:", error);
    }
}

/**
 * Helper: Log authentication events
 */
export async function logAuth(
    action: "login.success" | "login.failed" | "logout" | "account.locked",
    userId: string | null,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await createAuditLog({
        action,
        category: "auth",
        userId,
        metadata,
        ipAddress,
        userAgent,
    });
}

/**
 * Helper: Log user management events
 */
export async function logUserEvent(
    action: AuditAction,
    actorId: string | null,
    targetUserId: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string
): Promise<void> {
    await createAuditLog({
        action,
        category: "users",
        userId: actorId,
        targetId: targetUserId,
        targetType: "user",
        metadata,
        ipAddress,
    });
}

/**
 * Helper: Log security/permission events
 */
export async function logSecurityEvent(
    action: AuditAction,
    actorId: string | null,
    targetUserId: string,
    permissionCode: string,
    ipAddress?: string
): Promise<void> {
    await createAuditLog({
        action,
        category: "security",
        userId: actorId,
        targetId: targetUserId,
        targetType: "user",
        metadata: { permissionCode },
        ipAddress,
    });
}

/**
 * Get audit logs with pagination and filters
 */
export async function getAuditLogs(options: {
    page?: number;
    limit?: number;
    category?: AuditCategory;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
}) {
    const {
        page = 1,
        limit = 50,
        category,
        action,
        userId,
        startDate,
        endDate,
    } = options;

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
        where.createdAt = {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
        };
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

// Finance entity types for audit
export type FinanceEntityType =
    | "transaction"
    | "account"
    | "budget"
    | "goal"
    | "category"
    | "receipt";

/**
 * Helper: Log finance module events
 * @param action - The action performed (from AuditActions)
 * @param userId - The user who performed the action
 * @param entityType - Type of finance entity affected
 * @param entityId - ID of the affected entity
 * @param metadata - Additional context (amounts, changes, etc.)
 * @param ipAddress - Optional IP address
 * @param userAgent - Optional user agent
 */
export async function logFinanceEvent(
    action: AuditAction | string,
    userId: string,
    entityType: FinanceEntityType,
    entityId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await createAuditLog({
        action,
        category: "finance",
        userId,
        targetId: entityId,
        targetType: entityType,
        metadata,
        ipAddress,
        userAgent,
    });
}
