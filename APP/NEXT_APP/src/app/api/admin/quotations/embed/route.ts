import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeQuotationHTML } from "@/lib/quotation-sanitizer";

export const dynamic = "force-dynamic";

/**
 * Generate a unique slug from project name
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50);
}

/**
 * POST /api/admin/quotations/embed
 * Creates an embedded quotation from external HTML
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

        const body = await request.json();
        const { clientId, folio, projectName, total, htmlContent } = body;

        // Validate required fields
        if (!clientId || !folio || !projectName || !htmlContent) {
            return NextResponse.json(
                { error: "Faltan campos requeridos" },
                { status: 400 }
            );
        }

        // Verify client ownership
        const client = await prisma.quotationClient.findFirst({
            where: {
                id: clientId,
                OR: [
                    { userId: session.user.id },
                    ...(session.user.role === "SUPERADMIN" ? [{}] : []),
                ],
            },
        });

        if (!client) {
            return NextResponse.json(
                { error: "Cliente no encontrado o sin permisos" },
                { status: 404 }
            );
        }

        // Check for duplicate folio
        const existingFolio = await prisma.quotation.findFirst({
            where: { folio },
        });

        if (existingFolio) {
            return NextResponse.json(
                { error: "Ya existe una cotización con ese folio" },
                { status: 400 }
            );
        }

        // Sanitize HTML content
        const { sanitized: safeHtml } = sanitizeQuotationHTML(htmlContent);

        // Generate unique slug
        let baseSlug = generateSlug(projectName);
        let slug = baseSlug;
        let counter = 1;

        // Check for existing slugs using findFirst instead of findUnique
        while (await prisma.quotation.findFirst({ where: { clientId, slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Calculate total value
        const totalValue = parseFloat(total) || 0;

        // Create quotation with all required fields
        const quotation = await prisma.quotation.create({
            data: {
                folio,
                slug,
                projectName,
                clientName: client.name,
                clientEmail: client.email,
                items: [], // Empty items for embedded quotations
                subtotal: totalValue,
                total: totalValue,
                htmlContent: safeHtml,
                status: "DRAFT",
                accessMode: "code",
                isVisible: true,
                clientId,
                userId: session.user.id,
            },
        });

        // Log audit event
        await prisma.auditLog.create({
            data: {
                action: "QUOTATION_EMBED_CREATE",
                category: "quotations",
                userId: session.user.id,
                targetId: quotation.id,
                targetType: "Quotation",
                metadata: {
                    folio,
                    projectName,
                    source: "embedded",
                    clientId,
                },
            },
        });

        return NextResponse.json({ quotation });
    } catch (error) {
        console.error("Error in embed quotation API:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
