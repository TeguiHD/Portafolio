import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    registerPayment,
    getPaymentHistory
} from "@/services/payment-service";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role, PaymentMethod } from "@prisma/client";

/**
 * POST /api/quotations/payments - Register a payment
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        // Check permission
        const canEdit = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "quotations.edit"
        );
        if (!canEdit) {
            return NextResponse.json(
                { error: "Permiso denegado" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { quotationId, amount, method, reference, notes, paidAt } = body;

        // Validate required fields
        if (!quotationId || typeof amount !== "number") {
            return NextResponse.json(
                { error: "quotationId y amount son requeridos" },
                { status: 400 }
            );
        }

        // Validate payment method
        const validMethods: PaymentMethod[] = [
            "CASH", "TRANSFER", "CREDIT_CARD", "DEBIT_CARD",
            "CHECK", "PAYPAL", "CRYPTO", "OTHER"
        ];
        if (!validMethods.includes(method)) {
            return NextResponse.json(
                { error: "Método de pago inválido" },
                { status: 400 }
            );
        }

        // Verify ownership or shared access
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: {
                client: {
                    include: { sharedWith: true }
                }
            },
        });

        if (!quotation) {
            return NextResponse.json(
                { error: "Cotización no encontrada" },
                { status: 404 }
            );
        }

        const isOwner = quotation.userId === session.user.id || quotation.client?.userId === session.user.id;
        const hasSharedAccess = quotation.client?.sharedWith?.some(
            (s) => s.sharedWithUserId === session.user.id &&
                (s.permission === "EDIT" || s.permission === "FULL")
        );
        const isSuperAdmin = session.user.role === "SUPERADMIN";

        if (!isOwner && !hasSharedAccess && !isSuperAdmin) {
            return NextResponse.json(
                { error: "No tienes permiso para registrar pagos en esta cotización" },
                { status: 403 }
            );
        }

        const result = await registerPayment({
            quotationId,
            amount,
            method: method as PaymentMethod,
            reference: reference?.trim().slice(0, 100),
            notes: notes?.trim().slice(0, 500),
            registeredBy: session.user.id,
            paidAt: paidAt ? new Date(paidAt) : undefined,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error registering payment:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/quotations/payments?quotationId=xxx - Get payment history
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const quotationId = searchParams.get("quotationId");

        if (!quotationId) {
            return NextResponse.json(
                { error: "quotationId es requerido" },
                { status: 400 }
            );
        }

        // Verify access
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: {
                client: {
                    include: { sharedWith: true }
                }
            },
        });

        if (!quotation) {
            return NextResponse.json(
                { error: "Cotización no encontrada" },
                { status: 404 }
            );
        }

        const isOwner = quotation.userId === session.user.id || quotation.client?.userId === session.user.id;
        const hasSharedAccess = quotation.client?.sharedWith?.some(
            (s) => s.sharedWithUserId === session.user.id
        );
        const isSuperAdmin = session.user.role === "SUPERADMIN";

        if (!isOwner && !hasSharedAccess && !isSuperAdmin) {
            return NextResponse.json(
                { error: "No tienes permiso para ver esta cotización" },
                { status: 403 }
            );
        }

        const result = await getPaymentHistory(quotationId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error getting payment history:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
