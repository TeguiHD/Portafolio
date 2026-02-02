import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint } from "@/lib/api-security";
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
        // SECURITY: Verify session + permission
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
            requiredPermission: "quotations.view",
        });

        if (security.error) return security.error;
        const session = security.session!;

        const quotations = await prisma.quotation.findMany({
            where: {
                OR: [
                    { userId: session.user.id },
                    {
                        client: {
                            sharedWith: {
                                some: {
                                    sharedWithUserId: session.user.id
                                }
                            }
                        }
                    }
                ]
            },
            orderBy: { createdAt: "desc" },
            include: {
                client: {
                    select: {
                        name: true,
                        sharedWith: {
                            where: { sharedWithUserId: session.user.id },
                            select: { permission: true }
                        }
                    }
                }
            }
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
        // SECURITY: Verify session + permission
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
            requiredPermission: "quotations.create",
        });

        if (security.error) return security.error;
        const session = security.session!;

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
            clientId, // [NEW] Accept clientId
        } = body;

        // [NEW] Validate Client Ownership if provided
        if (clientId) {
            const client = await prisma.quotationClient.findUnique({
                where: { id: clientId },
                select: { userId: true }
            });

            if (!client) {
                return NextResponse.json(
                    { error: "Cliente no encontrado" },
                    { status: 404 }
                );
            }

            if (client.userId !== session.user.id) {
                return NextResponse.json(
                    { error: "No tienes permiso para usar este cliente" },
                    { status: 403 }
                );
            }
        }

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

        // SECURITY: Generate folio atomically to prevent race conditions
        // Uses transaction with retry logic to handle concurrent quotation creation
        const MAX_RETRIES = 3;
        let quotation = null;
        let lastError = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                quotation = await prisma.$transaction(async (tx) => {
                    // Get next folio number atomically within transaction
                    const year = new Date().getFullYear();
                    const prefix = `WEB-${year}`;

                    // Use raw SQL for atomic count to avoid race conditions
                    const result = await tx.$queryRaw<[{ count: bigint }]>`
                        SELECT COUNT(*) as count FROM "Quotation" 
                        WHERE "folio" LIKE ${prefix + '%'}
                        FOR UPDATE
                    `;
                    const count = Number(result[0]?.count || 0);
                    const folio = `${prefix}-${String(count + 1).padStart(3, "0")}`;

                    // Create quotation with the generated folio
                    return await tx.quotation.create({
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
                            clientId: clientId || null, // [NEW] Link to client
                        },
                    });
                });

                // Success - break out of retry loop
                break;
            } catch (error) {
                lastError = error;
                // Check if it's a unique constraint violation (P2002) - retry
                if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
                    console.warn(`[Quotation] Folio collision on attempt ${attempt + 1}, retrying...`);
                    continue;
                }
                // Other errors - rethrow immediately
                throw error;
            }
        }

        if (!quotation) {
            console.error("[Quotation] Failed to create after max retries:", lastError);
            throw lastError || new Error("Failed to generate unique folio");
        }

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

