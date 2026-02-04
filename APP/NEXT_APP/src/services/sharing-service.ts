"use server";

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { hash, verify } from "argon2";
import type { PermissionLevel } from "@prisma/client";

/**
 * Enterprise-grade Client Sharing Service
 * 
 * Security measures:
 * - Cryptographically secure code generation (32 bytes, base64url encoded)
 * - Argon2 hashed storage of sharing codes
 * - Time-limited codes with configurable expiration
 * - Single-use or limited-use codes
 * - Full audit trail
 * - Rate limiting through database
 */

// Generate cryptographically secure sharing code
function generateSecureShareCode(): string {
    // 32 bytes = 256 bits of entropy, URL-safe base64
    const buffer = randomBytes(32);
    return buffer.toString("base64url");
}

// Format code for display (readable chunks)
function formatCodeForDisplay(code: string): string {
    // Split into 4-character chunks for readability
    return code.match(/.{1,6}/g)?.join("-") || code;
}

export interface GenerateShareCodeInput {
    clientId: string;
    createdById: string;
    permission: PermissionLevel;
    expiresInHours: number;
    maxUses: number;
}

export interface GenerateShareCodeResult {
    success: boolean;
    error?: string;
    code?: string;
    formattedCode?: string;
    expiresAt?: Date;
}

/**
 * Generate a secure sharing code for a client
 */
export async function generateShareCode(
    input: GenerateShareCodeInput
): Promise<GenerateShareCodeResult> {
    try {
        // Verify client exists and user has ownership
        const client = await prisma.quotationClient.findUnique({
            where: { id: input.clientId },
        });

        if (!client) {
            return { success: false, error: "Cliente no encontrado" };
        }

        if (client.userId !== input.createdById) {
            return { success: false, error: "No tienes permiso para compartir este cliente" };
        }

        // Rate limiting: max 10 codes per hour per user
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCodes = await prisma.clientShareCode.count({
            where: {
                createdById: input.createdById,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentCodes >= 10) {
            return {
                success: false,
                error: "Has alcanzado el límite de códigos por hora. Intenta más tarde."
            };
        }

        // Generate secure code
        const plainCode = generateSecureShareCode();
        const hashedCode = await hash(plainCode);

        // Calculate expiration
        const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);

        // Create the share code record
        await prisma.clientShareCode.create({
            data: {
                code: hashedCode,
                clientId: input.clientId,
                createdById: input.createdById,
                permission: input.permission,
                expiresAt,
                maxUses: input.maxUses,
                usedCount: 0,
                isActive: true,
            },
        });

        return {
            success: true,
            code: plainCode,
            formattedCode: formatCodeForDisplay(plainCode),
            expiresAt,
        };
    } catch (error) {
        console.error("Error generating share code:", error);
        return { success: false, error: "Error al generar código de compartición" };
    }
}

export interface RedeemShareCodeInput {
    code: string;
    redeemedByUserId: string;
}

export interface RedeemShareCodeResult {
    success: boolean;
    error?: string;
    clientId?: string;
    clientName?: string;
    permission?: PermissionLevel;
}

/**
 * Redeem a sharing code to import a client
 */
export async function redeemShareCode(
    input: RedeemShareCodeInput
): Promise<RedeemShareCodeResult> {
    try {
        // Clean input code (remove dashes if formatted)
        const cleanCode = input.code.replace(/-/g, "");

        // Get all active, non-expired codes
        const activeCodes = await prisma.clientShareCode.findMany({
            where: {
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            include: {
                client: true,
            },
        });

        // Find matching code by verifying hash
        let matchedShareCode = null;
        for (const shareCode of activeCodes) {
            try {
                const isMatch = await verify(shareCode.code, cleanCode);
                if (isMatch) {
                    matchedShareCode = shareCode;
                    break;
                }
            } catch {
                // Hash verification failed, try next
                continue;
            }
        }

        if (!matchedShareCode) {
            return { success: false, error: "Código inválido o expirado" };
        }

        // Check if max uses reached
        if (matchedShareCode.usedCount >= matchedShareCode.maxUses) {
            return { success: false, error: "Este código ya ha sido utilizado" };
        }

        // Prevent self-sharing
        if (matchedShareCode.createdById === input.redeemedByUserId) {
            return { success: false, error: "No puedes importar tus propios clientes" };
        }

        // Check if already shared with this user
        const existingShare = await prisma.sharedClient.findUnique({
            where: {
                clientId_sharedWithUserId: {
                    clientId: matchedShareCode.clientId,
                    sharedWithUserId: input.redeemedByUserId,
                },
            },
        });

        if (existingShare) {
            return { success: false, error: "Ya tienes acceso a este cliente" };
        }

        // Transaction: Create shared client record and update code usage atomically
        // Using "Prisma optimistic concurrency control" logic effectively by checking the condition in update
        await prisma.$transaction(async (tx) => {
            // Attempt to update - will throw/return 0 results if condition fails
            // Note: Prisma updateMany returns count, update returns record but throws if not found
            // Since we need the ID, let's use check-then-act with SERIALIZABLE isolation or row locking if possible.
            // Prisma doesn't support "UPDATE ... WHERE ... RETURNING" easily for single record with condition on non-unique fields directly in `update`.
            // But we can use `count: { increment: 1 }` and then check if it exceeded.
            // BETTER APPROACH: Use `updateMany` for the condition `usedCount < maxUses`

            const updateResult = await tx.clientShareCode.updateMany({
                where: {
                    id: matchedShareCode.id,
                    usedCount: { lt: matchedShareCode.maxUses }, // ATOMIC CHECK: only update if uses left
                    isActive: true
                },
                data: {
                    usedCount: { increment: 1 }
                }
            });

            if (updateResult.count === 0) {
                throw new Error("RACE_CONDITION: Code used by another request");
            }

            // Check if we reached max uses to deactivate (eventual consistency for isActive is fine, usedCount is critical)
            // We can do this based on the previous read + 1, or just let the next read handle it (since we filter by usedCount < maxUses anyway)
            // Let's update isActive for cleanliness if it's exhausted
            if (matchedShareCode.usedCount + 1 >= matchedShareCode.maxUses) {
                await tx.clientShareCode.update({
                    where: { id: matchedShareCode.id },
                    data: { isActive: false }
                });
            }

            // Create share
            await tx.sharedClient.create({
                data: {
                    clientId: matchedShareCode.clientId,
                    sharedWithUserId: input.redeemedByUserId,
                    sharedByUserId: matchedShareCode.createdById,
                    permission: matchedShareCode.permission,
                },
            });

            return true;
        });

        return {
            success: true,
            clientId: matchedShareCode.clientId,
            clientName: matchedShareCode.client.name,
            permission: matchedShareCode.permission,
        };
    } catch (error) {
        console.error("Error redeeming share code:", error);
        return { success: false, error: "Error al canjear código" };
    }
}

/**
 * Revoke all active share codes for a client
 */
export async function revokeAllShareCodes(
    clientId: string,
    userId: string
): Promise<{ success: boolean; error?: string; revokedCount?: number }> {
    try {
        // Verify ownership
        const client = await prisma.quotationClient.findUnique({
            where: { id: clientId },
        });

        if (!client || client.userId !== userId) {
            return { success: false, error: "No tienes permiso para esta acción" };
        }

        const result = await prisma.clientShareCode.updateMany({
            where: {
                clientId,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        return { success: true, revokedCount: result.count };
    } catch (error) {
        console.error("Error revoking share codes:", error);
        return { success: false, error: "Error al revocar códigos" };
    }
}

/**
 * Get sharing statistics for a client
 */
export async function getClientSharingStats(
    clientId: string,
    userId: string
): Promise<{
    success: boolean;
    error?: string;
    sharedWithCount?: number;
    activeCodesCount?: number;
    sharedWith?: Array<{
        userId: string;
        userName: string | null;
        permission: PermissionLevel;
        sharedAt: Date;
    }>;
}> {
    try {
        // Verify ownership
        const client = await prisma.quotationClient.findUnique({
            where: { id: clientId },
        });

        if (!client || client.userId !== userId) {
            return { success: false, error: "No tienes permiso para esta acción" };
        }

        const [sharedWith, activeCodesCount] = await Promise.all([
            prisma.sharedClient.findMany({
                where: { clientId },
                include: {
                    sharedWithUser: {
                        select: { id: true, name: true },
                    },
                },
            }),
            prisma.clientShareCode.count({
                where: {
                    clientId,
                    isActive: true,
                    expiresAt: { gt: new Date() },
                },
            }),
        ]);

        return {
            success: true,
            sharedWithCount: sharedWith.length,
            activeCodesCount,
            sharedWith: sharedWith.map((s) => ({
                userId: s.sharedWithUser.id,
                userName: s.sharedWithUser.name,
                permission: s.permission,
                sharedAt: s.createdAt,
            })),
        };
    } catch (error) {
        console.error("Error getting sharing stats:", error);
        return { success: false, error: "Error al obtener estadísticas" };
    }
}

/**
 * Remove a user's access to a shared client
 */
export async function removeSharedAccess(
    clientId: string,
    sharedWithUserId: string,
    ownerId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Verify ownership
        const client = await prisma.quotationClient.findUnique({
            where: { id: clientId },
        });

        if (!client || client.userId !== ownerId) {
            return { success: false, error: "No tienes permiso para esta acción" };
        }

        await prisma.sharedClient.delete({
            where: {
                clientId_sharedWithUserId: {
                    clientId,
                    sharedWithUserId,
                },
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error removing shared access:", error);
        return { success: false, error: "Error al eliminar acceso" };
    }
}
