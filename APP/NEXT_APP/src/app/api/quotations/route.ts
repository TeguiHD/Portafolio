import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionForApi } from "@/lib/auth/dal";
import { NotificationHelpers } from "@/lib/notificationService";
import { sanitizeInput, isValidEmail } from "@/lib/security";
import { createAuditLog, AuditActions } from "@/lib/audit";

// Field limits for quotations
const QUOTATION_FIELD_LIMITS = {
    clientName: 200,
    clientEmail: 254,
    projectName: 300,
    paymentTerms: 500,
    timeline: 500,
    notes: 5000,
};

// Get all quotations for current user
export async function GET(request: NextRequest) {
    try {
        // DAL pattern: Verify session
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const quotations = await prisma.quotation.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(quotations);
    } catch (error) {
        console.error("Quotations fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch quotations" },
            { status: 500 }
        );
    }
}

// Create new quotation
export async function POST(request: NextRequest) {
    try {
        // DAL pattern: Verify session
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            clientName,
            clientEmail,
            projectName,
            items,
            subtotal,
            discount = 0,
            total,
            validDays = 15,
            paymentTerms,
            timeline,
            notes,
        } = body;

        // SECURITY: Validate email format if provided
        if (clientEmail && !isValidEmail(clientEmail)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // SECURITY: Sanitize string fields
        const sanitizedClientName = clientName
            ? sanitizeInput(String(clientName).trim().slice(0, QUOTATION_FIELD_LIMITS.clientName))
            : null;
        const sanitizedClientEmail = clientEmail
            ? sanitizeInput(String(clientEmail).trim().slice(0, QUOTATION_FIELD_LIMITS.clientEmail))
            : null;
        const sanitizedProjectName = projectName
            ? sanitizeInput(String(projectName).trim().slice(0, QUOTATION_FIELD_LIMITS.projectName))
            : null;
        const sanitizedPaymentTerms = paymentTerms
            ? sanitizeInput(String(paymentTerms).trim().slice(0, QUOTATION_FIELD_LIMITS.paymentTerms))
            : null;
        const sanitizedTimeline = timeline
            ? sanitizeInput(String(timeline).trim().slice(0, QUOTATION_FIELD_LIMITS.timeline))
            : null;
        const sanitizedNotes = notes
            ? sanitizeInput(String(notes).trim().slice(0, QUOTATION_FIELD_LIMITS.notes))
            : null;

        // Generate folio
        const year = new Date().getFullYear();
        const count = await prisma.quotation.count({
            where: {
                folio: { startsWith: `WEB-${year}` },
            },
        });
        const folio = `WEB-${year}-${String(count + 1).padStart(3, "0")}`;

        const quotation = await prisma.quotation.create({
            data: {
                folio,
                clientName: sanitizedClientName || "",
                clientEmail: sanitizedClientEmail || "",
                projectName: sanitizedProjectName || "",
                items,
                subtotal: Number(subtotal) || 0,
                discount: Number(discount) || 0,
                total: Number(total) || 0,
                validDays: Number(validDays) || 15,
                paymentTerms: sanitizedPaymentTerms,
                timeline: sanitizedTimeline,
                notes: sanitizedNotes,
                userId: session.user.id,
            },
        });

        // Create notification for new quotation
        await NotificationHelpers.quotationCreated(
            { id: quotation.id, folio: quotation.folio, clientName: quotation.clientName },
            { id: session.user.id, name: session.user.name }
        );

        // Audit log
        await createAuditLog({
            action: AuditActions.QUOTATION_CREATED,
            category: "quotations",
            userId: session.user.id,
            targetId: quotation.id,
            targetType: "quotation",
            metadata: { folio: quotation.folio, clientName: quotation.clientName },
        });

        return NextResponse.json(quotation, { status: 201 });
    } catch (error) {
        console.error("Quotation create error:", error);
        return NextResponse.json(
            { error: "Failed to create quotation" },
            { status: 500 }
        );
    }
}

