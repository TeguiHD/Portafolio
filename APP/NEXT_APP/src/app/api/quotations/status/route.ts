import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateQuotationStatus, getStatusHistory } from "@/services/payment-service";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role, QuotationStatus } from "@prisma/client";

/**
 * PUT /api/quotations/status - Update quotation status
 */
export async function PUT(request: NextRequest) {
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
        const { quotationId, newStatus, reason } = body;

        // Validate required fields
        if (!quotationId || !newStatus) {
            return NextResponse.json(
                { error: "quotationId y newStatus son requeridos" },
                { status: 400 }
            );
        }

        // Validate status
        const validStatuses: QuotationStatus[] = [
            "DRAFT", "PENDING", "REVISION", "APPROVED", "REJECTED", "COMPLETED"
        ];
        if (!validStatuses.includes(newStatus)) {
            return NextResponse.json(
                { error: "Estado inválido" },
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
                { error: "No tienes permiso para modificar esta cotización" },
                { status: 403 }
            );
        }

        const result = await updateQuotationStatus({
            quotationId,
            newStatus: newStatus as QuotationStatus,
            changedBy: session.user.id,
            reason: reason?.trim().slice(0, 500),
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating status:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/quotations/status?quotationId=xxx - Get status history
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

        const result = await getStatusHistory(quotationId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error getting status history:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
