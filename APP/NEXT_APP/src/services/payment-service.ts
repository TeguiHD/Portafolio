// Solo servidor: estas funciones reciben el userId por parámetro y no verifican la sesión,
// así que nunca pueden ser acciones públicas ("use server"). Las llaman rutas que ya autentican.
import "server-only";

import { prisma } from "@/lib/prisma";
import type { QuotationStatus } from '@/generated/prisma/client';

/** Estado de las propuestas y su historial (los pagos se registran en src/app/admin/gestion-comercial/pagos/actions.ts). */

export interface UpdateStatusInput {
    quotationId: string;
    newStatus: QuotationStatus;
    changedBy: string;
    reason?: string;
}

/**
 * Update quotation status with workflow validation
 */
export async function updateQuotationStatus(
    input: UpdateStatusInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: input.quotationId },
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        const currentStatus = quotation.status as QuotationStatus;
        const newStatus = input.newStatus;

        // Define valid transitions
        const validTransitions: Record<QuotationStatus, QuotationStatus[]> = {
            DRAFT: ["PENDING"],
            PENDING: ["APPROVED", "REJECTED", "REVISION"],
            REVISION: ["PENDING"],
            APPROVED: ["COMPLETED"], // Only via payment or manual override
            REJECTED: [], // Terminal state
            COMPLETED: [], // Terminal state
        };

        // Validate transition
        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            return {
                success: false,
                error: `No se puede cambiar de ${currentStatus} a ${newStatus}`
            };
        }

        // Transaction: Update status and create history
        await prisma.$transaction([
            prisma.quotation.update({
                where: { id: input.quotationId },
                data: { status: newStatus },
            }),
            prisma.quotationStatusHistory.create({
                data: {
                    quotationId: input.quotationId,
                    fromStatus: currentStatus,
                    toStatus: newStatus,
                    changedBy: input.changedBy,
                    reason: input.reason?.trim() || null,
                },
            }),
        ]);

        return { success: true };
    } catch (error) {
        console.error("Error updating quotation status:", error);
        return { success: false, error: "Error al actualizar estado" };
    }
}

/**
 * Get status history for a quotation
 */
export async function getStatusHistory(
    quotationId: string
): Promise<{
    success: boolean;
    error?: string;
    history?: Array<{
        id: string;
        fromStatus: QuotationStatus | null;
        toStatus: QuotationStatus;
        changedBy: string;
        reason: string | null;
        createdAt: Date;
    }>;
}> {
    try {
        const history = await prisma.quotationStatusHistory.findMany({
            where: { quotationId },
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            history: history.map((h) => ({
                id: h.id,
                fromStatus: h.fromStatus,
                toStatus: h.toStatus,
                changedBy: h.changedBy,
                reason: h.reason,
                createdAt: h.createdAt,
            })),
        };
    } catch (error) {
        console.error("Error getting status history:", error);
        return { success: false, error: "Error al obtener historial" };
    }
}
