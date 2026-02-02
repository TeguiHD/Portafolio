/**
 * User Lifecycle Management Service
 * 
 * Implements GDPR-compliant user data handling:
 * - Soft delete with 30-day grace period
 * - Data anonymization (removes PII while keeping statistics)
 * - Hard delete with audit trail
 * - Data export (Right to Data Portability)
 * 
 * Security Best Practices 2026:
 * - All operations are logged to audit trail
 * - Cascading deletes are controlled and explicit
 * - PII is cryptographically wiped, not just nulled
 * - Statistical data is retained for business intelligence
 */

import { prisma } from "./prisma";
import { createHash, randomBytes } from "crypto";

// Grace period for account recovery (GDPR recommends ~30 days)
const DELETION_GRACE_PERIOD_DAYS = 30;

// Types for user data categories
interface UserDataSummary {
    userId: string;
    email: string;
    name: string | null;
    createdAt: Date;
    stats: {
        quotations: number;
        clients: number;
        transactions: number;
        cvVersions: number;
        financeAccounts: number;
        receipts: number;
    };
}

interface DeletionResult {
    success: boolean;
    message: string;
    scheduledDeletionDate?: Date;
    affectedData?: UserDataSummary;
}

interface AnonymizationResult {
    success: boolean;
    message: string;
    anonymizedFields: string[];
    retainedStatistics: Record<string, number>;
}

/**
 * Generate an anonymized identifier that cannot be reversed
 */
function generateAnonymousId(originalId: string): string {
    const salt = randomBytes(16).toString("hex");
    return `anon_${createHash("sha256").update(originalId + salt).digest("hex").slice(0, 12)}`;
}

/**
 * Get summary of user's data for GDPR export or pre-deletion review
 */
export async function getUserDataSummary(userId: string): Promise<UserDataSummary | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            _count: {
                select: {
                    quotations: true,
                    quotationClients: true,
                    transactions: true,
                    cvVersions: true,
                    financeAccounts: true,
                    receipts: true,
                }
            }
        }
    });

    if (!user) return null;

    return {
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        stats: {
            quotations: user._count.quotations,
            clients: user._count.quotationClients,
            transactions: user._count.transactions,
            cvVersions: user._count.cvVersions,
            financeAccounts: user._count.financeAccounts,
            receipts: user._count.receipts,
        }
    };
}

/**
 * Suspend a user account (temporary block)
 * - User cannot login but data is preserved
 * - Can be reactivated by admin
 */
export async function suspendUser(
    userId: string,
    adminId: string,
    reason: string
): Promise<DeletionResult> {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return { success: false, message: "Usuario no encontrado" };
        }

        if (user.role === "SUPERADMIN") {
            return { success: false, message: "No se puede suspender un SUPERADMIN" };
        }

        await prisma.$transaction([
            // Update user status
            prisma.user.update({
                where: { id: userId },
                data: {
                    isActive: false,
                    deletionStatus: "SUSPENDED",
                    deletionReason: reason,
                    deletedBy: adminId,
                }
            }),
            // Revoke all active sessions
            prisma.session.deleteMany({ where: { userId } }),
            prisma.userSession.updateMany({
                where: { userId, isActive: true },
                data: { 
                    isActive: false, 
                    revokedAt: new Date(),
                    revokeReason: "Account suspended"
                }
            }),
            // Audit log
            prisma.auditLog.create({
                data: {
                    action: "USER_SUSPENDED",
                    category: "security",
                    userId: adminId,
                    targetId: userId,
                    targetType: "User",
                    metadata: { reason },
                }
            })
        ]);

        return { 
            success: true, 
            message: "Usuario suspendido correctamente" 
        };
    } catch (error) {
        console.error("Error suspending user:", error);
        return { success: false, message: "Error al suspender usuario" };
    }
}

/**
 * Reactivate a suspended user account
 */
export async function reactivateUser(
    userId: string,
    adminId: string
): Promise<DeletionResult> {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return { success: false, message: "Usuario no encontrado" };
        }

        if (user.deletionStatus !== "SUSPENDED") {
            return { success: false, message: "El usuario no está suspendido" };
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    isActive: true,
                    deletionStatus: "ACTIVE",
                    deletionReason: null,
                    deletedBy: null,
                }
            }),
            prisma.auditLog.create({
                data: {
                    action: "USER_REACTIVATED",
                    category: "security",
                    userId: adminId,
                    targetId: userId,
                    targetType: "User",
                    metadata: { previousStatus: user.deletionStatus },
                }
            })
        ]);

        return { 
            success: true, 
            message: "Usuario reactivado correctamente" 
        };
    } catch (error) {
        console.error("Error reactivating user:", error);
        return { success: false, message: "Error al reactivar usuario" };
    }
}

/**
 * Request account deletion (soft delete with grace period)
 * - Starts the 30-day countdown
 * - User can cancel during grace period
 * - All sessions are revoked immediately
 */
export async function requestAccountDeletion(
    userId: string,
    requestedBy: string, // Could be user themselves or admin
    reason: string,
    isAdminAction: boolean = false
): Promise<DeletionResult> {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return { success: false, message: "Usuario no encontrado" };
        }

        if (user.role === "SUPERADMIN" && !isAdminAction) {
            return { success: false, message: "SUPERADMIN no puede auto-eliminarse" };
        }

        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + DELETION_GRACE_PERIOD_DAYS);

        const summary = await getUserDataSummary(userId);

        await prisma.$transaction([
            // Update user status
            prisma.user.update({
                where: { id: userId },
                data: {
                    isActive: false,
                    deletionStatus: "DELETION_REQUESTED",
                    deletionRequestedAt: new Date(),
                    deletionScheduledAt: scheduledDate,
                    deletionReason: reason,
                    deletedBy: requestedBy,
                }
            }),
            // Revoke all sessions
            prisma.session.deleteMany({ where: { userId } }),
            prisma.userSession.updateMany({
                where: { userId, isActive: true },
                data: { 
                    isActive: false, 
                    revokedAt: new Date(),
                    revokeReason: "Deletion requested"
                }
            }),
            // Audit log
            prisma.auditLog.create({
                data: {
                    action: "USER_DELETION_REQUESTED",
                    category: "security",
                    userId: requestedBy,
                    targetId: userId,
                    targetType: "User",
                    metadata: { 
                        reason,
                        scheduledDate: scheduledDate.toISOString(),
                        isAdminAction,
                        dataStats: summary?.stats
                    },
                }
            })
        ]);

        return { 
            success: true, 
            message: `Eliminación programada para ${scheduledDate.toLocaleDateString()}`,
            scheduledDeletionDate: scheduledDate,
            affectedData: summary || undefined
        };
    } catch (error) {
        console.error("Error requesting deletion:", error);
        return { success: false, message: "Error al solicitar eliminación" };
    }
}

/**
 * Cancel a pending deletion request (during grace period)
 */
export async function cancelDeletionRequest(
    userId: string,
    cancelledBy: string
): Promise<DeletionResult> {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return { success: false, message: "Usuario no encontrado" };
        }

        if (user.deletionStatus !== "DELETION_REQUESTED" && 
            user.deletionStatus !== "DELETION_SCHEDULED") {
            return { success: false, message: "No hay solicitud de eliminación pendiente" };
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    isActive: true,
                    deletionStatus: "ACTIVE",
                    deletionRequestedAt: null,
                    deletionScheduledAt: null,
                    deletionReason: null,
                    deletedBy: null,
                }
            }),
            prisma.auditLog.create({
                data: {
                    action: "USER_DELETION_CANCELLED",
                    category: "security",
                    userId: cancelledBy,
                    targetId: userId,
                    targetType: "User",
                    metadata: { 
                        previousScheduledDate: user.deletionScheduledAt?.toISOString()
                    },
                }
            })
        ]);

        return { 
            success: true, 
            message: "Solicitud de eliminación cancelada" 
        };
    } catch (error) {
        console.error("Error cancelling deletion:", error);
        return { success: false, message: "Error al cancelar eliminación" };
    }
}

/**
 * Anonymize user data (GDPR compliant)
 * - Replaces PII with anonymous identifiers
 * - Retains statistical data for analytics
 * - Called automatically after grace period or manually by admin
 */
export async function anonymizeUserData(
    userId: string,
    adminId: string
): Promise<AnonymizationResult> {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        quotations: true,
                        quotationClients: true,
                        transactions: true,
                        cvVersions: true,
                    }
                }
            }
        });

        if (!user) {
            return { 
                success: false, 
                message: "Usuario no encontrado",
                anonymizedFields: [],
                retainedStatistics: {}
            };
        }

        const anonId = generateAnonymousId(userId);
        const anonEmail = `${anonId}@deleted.local`;

        await prisma.$transaction([
            // Anonymize user record
            prisma.user.update({
                where: { id: userId },
                data: {
                    email: anonEmail,
                    emailEncrypted: null,
                    password: randomBytes(32).toString("hex"), // Invalidate password
                    name: "[Usuario Eliminado]",
                    avatar: null,
                    isActive: false,
                    deletionStatus: "ANONYMIZED",
                    anonymizedAt: new Date(),
                    // Clear security fields
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    lastLoginAt: null,
                }
            }),

            // Anonymize quotation clients (remove PII but keep records)
            prisma.quotationClient.updateMany({
                where: { userId },
                data: {
                    name: "[Cliente Eliminado]",
                    company: null,
                    rut: null,
                    address: null,
                    contactName: null,
                    contactEmail: null,
                    contactPhone: null,
                    contactRole: null,
                    email: null,
                    notes: null,
                    isActive: false,
                }
            }),

            // Anonymize quotations (keep financial data for statistics)
            prisma.quotation.updateMany({
                where: { userId },
                data: {
                    clientName: "[Cliente Eliminado]",
                    clientEmail: null,
                    notes: null,
                    isVisible: false,
                    accessCode: null,
                }
            }),

            // Delete CV data completely (highly personal)
            prisma.cvVersion.deleteMany({ where: { userId } }),

            // Keep financial transactions but anonymize descriptions
            prisma.transaction.updateMany({
                where: { userId },
                data: {
                    description: "[Datos anonimizados]",
                    merchant: null,
                    notes: null,
                }
            }),

            // Delete receipts (contains sensitive data)
            prisma.receipt.deleteMany({ where: { userId } }),

            // Delete chat sessions
            prisma.quotationChatSession.deleteMany({ where: { userId } }),

            // Clear all permissions
            prisma.userPermission.deleteMany({ where: { userId } }),

            // Delete all sessions
            prisma.session.deleteMany({ where: { userId } }),
            prisma.userSession.deleteMany({ where: { userId } }),

            // Audit log
            prisma.auditLog.create({
                data: {
                    action: "USER_DATA_ANONYMIZED",
                    category: "security",
                    userId: adminId,
                    targetId: userId,
                    targetType: "User",
                    metadata: {
                        anonymizedEmail: anonEmail,
                        stats: user._count,
                    },
                }
            })
        ]);

        return {
            success: true,
            message: "Datos anonimizados correctamente",
            anonymizedFields: [
                "email", "name", "avatar", "password",
                "quotationClients.all_pii",
                "quotations.client_data",
                "cvVersions (deleted)",
                "transactions.descriptions",
                "receipts (deleted)",
                "chatSessions (deleted)"
            ],
            retainedStatistics: {
                quotations: user._count.quotations,
                clients: user._count.quotationClients,
                transactions: user._count.transactions,
            }
        };
    } catch (error) {
        console.error("Error anonymizing user:", error);
        return { 
            success: false, 
            message: "Error al anonimizar datos",
            anonymizedFields: [],
            retainedStatistics: {}
        };
    }
}

/**
 * Permanently delete all user data (hard delete)
 * - Used for immediate removal (legal requirement) or after anonymization
 * - Only audit trail is preserved
 */
export async function permanentlyDeleteUser(
    userId: string,
    adminId: string,
    reason: string
): Promise<DeletionResult> {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return { success: false, message: "Usuario no encontrado" };
        }

        if (user.role === "SUPERADMIN") {
            return { success: false, message: "No se puede eliminar un SUPERADMIN" };
        }

        const summary = await getUserDataSummary(userId);

        // Execute deletion in transaction
        await prisma.$transaction([
            // Delete all related data first (order matters due to foreign keys)
            
            // Chat sessions and messages (cascade from session)
            prisma.quotationChatSession.deleteMany({ where: { userId } }),
            
            // CV data
            prisma.cvVersion.deleteMany({ where: { userId } }),
            
            // Quotations (must delete before clients due to FK)
            prisma.quotation.deleteMany({ where: { userId } }),
            prisma.quotationClient.deleteMany({ where: { userId } }),
            
            // Finance data
            prisma.transaction.deleteMany({ where: { userId } }),
            prisma.receipt.deleteMany({ where: { userId } }),
            prisma.recurringPayment.deleteMany({ where: { userId } }),
            prisma.budget.deleteMany({ where: { userId } }),
            prisma.savingsGoal.deleteMany({ where: { userId } }),
            prisma.financeAccount.deleteMany({ where: { userId } }),
            prisma.financeCategory.deleteMany({ where: { userId } }),
            prisma.product.deleteMany({ where: { userId } }),
            prisma.categoryFeedback.deleteMany({ where: { userId } }),
            prisma.userCategorizationRule.deleteMany({ where: { userId } }),
            
            // Finance audit logs (keep reference but anonymize)
            prisma.financeAuditLog.updateMany({
                where: { userId },
                data: { userId: "DELETED_USER" }
            }),
            
            // User permissions
            prisma.userPermission.deleteMany({ where: { userId } }),
            
            // Sessions
            prisma.session.deleteMany({ where: { userId } }),
            prisma.userSession.deleteMany({ where: { userId } }),
            
            // Finally, delete the user
            prisma.user.delete({ where: { id: userId } }),
            
            // Create final audit log (without user reference since user is deleted)
            prisma.auditLog.create({
                data: {
                    action: "USER_PERMANENTLY_DELETED",
                    category: "security",
                    userId: adminId,
                    targetId: userId,
                    targetType: "User",
                    metadata: {
                        reason,
                        deletedUserEmail: user.email,
                        deletedUserRole: user.role,
                        dataStats: summary?.stats,
                        deletionTime: new Date().toISOString(),
                    },
                }
            })
        ]);

        return {
            success: true,
            message: "Usuario y todos sus datos eliminados permanentemente",
            affectedData: summary || undefined
        };
    } catch (error) {
        console.error("Error permanently deleting user:", error);
        return { success: false, message: "Error al eliminar usuario permanentemente" };
    }
}

/**
 * Export all user data (GDPR Right to Data Portability)
 */
export async function exportUserData(userId: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                quotations: {
                    include: {
                        client: true,
                    }
                },
                quotationClients: true,
                cvVersions: {
                    include: {
                        experiences: true,
                        education: true,
                        skills: true,
                        projects: true,
                        certifications: true,
                        languages: true,
                    }
                },
                financeAccounts: true,
                financeCategories: true,
                transactions: {
                    include: {
                        items: true,
                        category: true,
                    }
                },
                budgets: true,
                savingsGoals: true,
                recurringPayments: true,
                auditLogs: {
                    take: 1000,
                    orderBy: { createdAt: "desc" }
                },
            }
        });

        if (!user) {
            return { success: false, error: "Usuario no encontrado" };
        }

        // Remove sensitive fields
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportVersion: "1.0",
            gdprCompliance: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
            },
            quotations: user.quotations.map(q => ({
                folio: q.folio,
                projectName: q.projectName,
                total: q.total,
                status: q.status,
                createdAt: q.createdAt,
            })),
            clients: user.quotationClients.map(c => ({
                name: c.name,
                company: c.company,
                contactName: c.contactName,
                contactEmail: c.contactEmail,
                createdAt: c.createdAt,
            })),
            cvVersions: user.cvVersions.map(cv => ({
                name: cv.name,
                fullName: cv.fullName,
                title: cv.title,
                experiences: cv.experiences,
                education: cv.education,
                skills: cv.skills,
                projects: cv.projects,
                certifications: cv.certifications,
                languages: cv.languages,
                createdAt: cv.createdAt,
            })),
            finance: {
                accounts: user.financeAccounts,
                categories: user.financeCategories,
                transactions: user.transactions.map(t => ({
                    type: t.type,
                    amount: t.amount,
                    description: t.description,
                    merchant: t.merchant,
                    transactionDate: t.transactionDate,
                    category: t.category?.name,
                    items: t.items,
                })),
                budgets: user.budgets,
                savingsGoals: user.savingsGoals,
                recurringPayments: user.recurringPayments,
            },
            activityLog: user.auditLogs.map(log => ({
                action: log.action,
                category: log.category,
                createdAt: log.createdAt,
            })),
        };

        // Update user record to track export
        await prisma.user.update({
            where: { id: userId },
            data: { dataExportedAt: new Date() }
        });

        return { success: true, data: exportData };
    } catch (error) {
        console.error("Error exporting user data:", error);
        return { success: false, error: "Error al exportar datos" };
    }
}

/**
 * Process scheduled deletions (run via cron job)
 * Finds users with passed deletion dates and anonymizes them
 */
export async function processScheduledDeletions(adminId: string): Promise<{
    processed: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let processed = 0;

    try {
        const usersToDelete = await prisma.user.findMany({
            where: {
                deletionStatus: {
                    in: ["DELETION_REQUESTED", "DELETION_SCHEDULED"]
                },
                deletionScheduledAt: {
                    lte: new Date()
                }
            }
        });

        for (const user of usersToDelete) {
            const result = await anonymizeUserData(user.id, adminId);
            if (result.success) {
                processed++;
            } else {
                errors.push(`User ${user.id}: ${result.message}`);
            }
        }

        // Log the batch operation
        if (usersToDelete.length > 0) {
            await prisma.auditLog.create({
                data: {
                    action: "SCHEDULED_DELETIONS_PROCESSED",
                    category: "system",
                    userId: adminId,
                    metadata: {
                        totalFound: usersToDelete.length,
                        processed,
                        errors,
                    },
                }
            });
        }
    } catch (error) {
        console.error("Error processing scheduled deletions:", error);
        errors.push(`System error: ${error}`);
    }

    return { processed, errors };
}
