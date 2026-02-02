"use server";

import { prisma } from "@/lib/prisma";
import type { PaymentMethod, QuotationStatus } from "@prisma/client";

/**
 * Enterprise-grade Payment Tracking Service
 * 
 * Features:
 * - Register partial payments (abonos)
 * - Automatic status update when fully paid
 * - Full payment history with audit trail
 * - Support for multiple payment methods
 */

export interface RegisterPaymentInput {
    quotationId: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
    registeredBy: string;
    paidAt?: Date;
}

export interface RegisterPaymentResult {
    success: boolean;
    error?: string;
    paymentId?: string;
    newTotalPaid?: number;
    remaining?: number;
    isFullyPaid?: boolean;
}

/**
 * Register a payment for a quotation
 */
export async function registerPayment(
    input: RegisterPaymentInput
): Promise<RegisterPaymentResult> {
    try {
        // Get quotation with current payment status
        const quotation = await prisma.quotation.findUnique({
            where: { id: input.quotationId },
            include: { client: true },
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        // Only allow payments for APPROVED quotations
        if (quotation.status !== "APPROVED" && quotation.status !== "COMPLETED") {
            return {
                success: false,
                error: "Solo se pueden registrar pagos para cotizaciones aprobadas"
            };
        }

        // Validate amount
        if (input.amount <= 0) {
            return { success: false, error: "El monto debe ser mayor a 0" };
        }

        const newTotalPaid = quotation.totalPaid + input.amount;
        const remaining = quotation.total - newTotalPaid;

        // Check if overpaying
        if (newTotalPaid > quotation.total * 1.001) { // Small tolerance for rounding
            return {
                success: false,
                error: `El monto excede el saldo pendiente. Máximo: $${(quotation.total - quotation.totalPaid).toLocaleString("es-CL")}`
            };
        }

        const isFullyPaid = remaining <= 0.01; // Tolerance for floating point

        // Transaction: Create payment and update quotation
        const [payment] = await prisma.$transaction([
            // Create payment record
            prisma.quotationPayment.create({
                data: {
                    quotationId: input.quotationId,
                    amount: input.amount,
                    method: input.method,
                    reference: input.reference?.trim() || null,
                    notes: input.notes?.trim() || null,
                    registeredBy: input.registeredBy,
                    paidAt: input.paidAt || new Date(),
                },
            }),
            // Update quotation totals
            prisma.quotation.update({
                where: { id: input.quotationId },
                data: {
                    totalPaid: newTotalPaid,
                    status: isFullyPaid ? "COMPLETED" : quotation.status,
                },
            }),
            // If status changes to COMPLETED, add history entry
            ...(isFullyPaid ? [
                prisma.quotationStatusHistory.create({
                    data: {
                        quotationId: input.quotationId,
                        fromStatus: quotation.status as QuotationStatus,
                        toStatus: "COMPLETED",
                        changedBy: input.registeredBy,
                        reason: "Pago completo registrado",
                        metadata: { totalPaid: newTotalPaid },
                    },
                }),
            ] : []),
        ]);

        return {
            success: true,
            paymentId: payment.id,
            newTotalPaid,
            remaining: Math.max(0, remaining),
            isFullyPaid,
        };
    } catch (error) {
        console.error("Error registering payment:", error);
        return { success: false, error: "Error al registrar pago" };
    }
}

/**
 * Get payment history for a quotation
 */
export async function getPaymentHistory(
    quotationId: string
): Promise<{
    success: boolean;
    error?: string;
    payments?: Array<{
        id: string;
        amount: number;
        method: PaymentMethod;
        reference: string | null;
        notes: string | null;
        paidAt: Date;
        registeredBy: string;
    }>;
    summary?: {
        total: number;
        totalPaid: number;
        remaining: number;
        paymentCount: number;
        percentagePaid: number;
    };
}> {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: {
                payments: {
                    orderBy: { paidAt: "desc" },
                },
            },
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        const remaining = Math.max(0, quotation.total - quotation.totalPaid);
        const percentagePaid = quotation.total > 0
            ? Math.min(100, (quotation.totalPaid / quotation.total) * 100)
            : 0;

        return {
            success: true,
            payments: quotation.payments.map((p) => ({
                id: p.id,
                amount: p.amount,
                method: p.method,
                reference: p.reference,
                notes: p.notes,
                paidAt: p.paidAt,
                registeredBy: p.registeredBy,
            })),
            summary: {
                total: quotation.total,
                totalPaid: quotation.totalPaid,
                remaining,
                paymentCount: quotation.payments.length,
                percentagePaid,
            },
        };
    } catch (error) {
        console.error("Error getting payment history:", error);
        return { success: false, error: "Error al obtener historial de pagos" };
    }
}

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
