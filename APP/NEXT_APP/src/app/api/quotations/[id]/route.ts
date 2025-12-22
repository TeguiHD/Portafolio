import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionForApi } from "@/lib/auth/dal";
import { createAuditLog, AuditActions } from "@/lib/audit";

// Get specific quotation
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // DAL pattern: Verify session close to data access
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const quotation = await prisma.quotation.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (!quotation) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(quotation);
    } catch (error) {
        console.error("Quotation fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch quotation" },
            { status: 500 }
        );
    }
}

// Update quotation
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // DAL pattern: Verify session close to data access
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // SECURITY: Whitelist of allowed fields to prevent mass assignment
        const allowedFields = [
            'clientName', 'clientEmail', 'projectName', 'items',
            'subtotal', 'discount', 'total', 'validDays',
            'paymentTerms', 'timeline', 'notes', 'status'
        ];

        // Filter body to only include allowed fields
        const sanitizedData: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                // Sanitize string fields
                if (typeof body[key] === 'string') {
                    sanitizedData[key] = body[key].trim().slice(0, 10000); // Limit field length
                } else {
                    sanitizedData[key] = body[key];
                }
            }
        }

        if (Object.keys(sanitizedData).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const quotation = await prisma.quotation.updateMany({
            where: {
                id,
                userId: session.user.id,
            },
            data: sanitizedData,
        });

        if (quotation.count === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Audit log
        await createAuditLog({
            action: AuditActions.QUOTATION_UPDATED,
            category: "quotations",
            userId: session.user.id,
            targetId: id,
            targetType: "quotation",
            metadata: { changedFields: Object.keys(sanitizedData) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Quotation update error:", error);
        return NextResponse.json(
            { error: "Failed to update quotation" },
            { status: 500 }
        );
    }
}

// Delete quotation
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // DAL pattern: Verify session close to data access
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const result = await prisma.quotation.deleteMany({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Audit log
        await createAuditLog({
            action: AuditActions.QUOTATION_DELETED,
            category: "quotations",
            userId: session.user.id,
            targetId: id,
            targetType: "quotation",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Quotation delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete quotation" },
            { status: 500 }
        );
    }
}
