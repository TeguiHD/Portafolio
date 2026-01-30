"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hash } from "argon2";
import { randomBytes } from "crypto";
import { sanitizeQuotationHtml } from "@/lib/quotation-sanitizer";

// Generate readable secure code
function generateSecureCode(): string {
    const words = ["Sol", "Luna", "Mar", "Rio", "Nube", "Flor", "Arbol", "Monte", "Cielo", "Viento"];
    const word = words[Math.floor(Math.random() * words.length)];
    const year = new Date().getFullYear();
    const random = randomBytes(2).toString("hex").toUpperCase();
    return `${word}${year}${random}!`;
}

// Create URL-friendly slug
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
}

// Calculate expiration date
function calculateExpiration(duration: string): Date | null {
    if (duration === "indefinite") return null;
    const days = { "7d": 7, "15d": 15, "30d": 30 }[duration] || 15;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

export async function createQuotationAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    const clientId = formData.get("clientId") as string;
    const folio = formData.get("folio") as string;
    const projectName = formData.get("projectName") as string;
    const total = parseFloat(formData.get("total") as string) || 0;
    const htmlContent = formData.get("htmlContent") as string;
    const accessMode = formData.get("accessMode") as "public" | "code" || "code";
    const codeDuration = formData.get("codeDuration") as string || "15d";

    if (!clientId || !folio || !projectName || !htmlContent) {
        return { success: false, error: "Faltan campos requeridos" };
    }

    try {
        // Get client
        const client = await (prisma as any).quotationClient.findUnique({
            where: { id: clientId }
        });

        if (!client) {
            return { success: false, error: "Cliente no encontrado" };
        }

        // Sanitize HTML Content (OWASP Security Measure)
        // Removes malicious scripts/events while preserving Tailwind/Fonts
        const cleanHtmlContent = sanitizeQuotationHtml(htmlContent);

        // Generate unique slug
        let slug = slugify(projectName);
        const existingSlug = await (prisma as any).quotation.findFirst({
            where: { clientId, slug }
        });
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        // Prepare access control
        let accessCode: string | null = null;
        let accessCodePlain: string | undefined;
        let codeExpiresAt: Date | null = null;

        if (accessMode === "code") {
            accessCodePlain = generateSecureCode();
            accessCode = await hash(accessCodePlain);
            codeExpiresAt = calculateExpiration(codeDuration);
        }

        // Create quotation
        await (prisma as any).quotation.create({
            data: {
                folio,
                slug,
                projectName,
                clientName: client.name,
                total,
                subtotal: total,
                items: [],
                htmlContent: cleanHtmlContent,
                status: "sent",
                validDays: 15,
                userId: session.user.id,
                clientId,
                accessMode,
                accessCode,
                codeExpiresAt
            }
        });

        revalidatePath(`/admin/cotizaciones/${clientId}`);

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const link = `${baseUrl}/cotizacion/${client.slug}/${slug}`;

        return {
            success: true,
            link,
            accessCode: accessCodePlain
        };
    } catch (error) {
        console.error("Error creating quotation:", error);
        return { success: false, error: "Error al crear cotización" };
    }
}

export async function updateQuotationAccessAction(
    quotationId: string,
    mode: "public" | "code",
    duration?: string
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    try {
        let accessCode: string | null = null;
        let accessCodePlain: string | undefined;
        let codeExpiresAt: Date | null = null;

        if (mode === "code") {
            accessCodePlain = generateSecureCode();
            accessCode = await hash(accessCodePlain);
            codeExpiresAt = calculateExpiration(duration || "15d");
        }

        await (prisma as any).quotation.update({
            where: { id: quotationId },
            data: {
                accessMode: mode,
                accessCode,
                codeExpiresAt
            }
        });

        revalidatePath("/admin/cotizaciones");

        return {
            success: true,
            code: accessCodePlain
        };
    } catch (error) {
        console.error("Error updating access:", error);
        return { success: false, error: "Error al actualizar acceso" };
    }
}

export async function toggleVisibilityAction(
    quotationId: string,
    isVisible: boolean
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await (prisma as any).quotation.findUnique({
            where: { id: quotationId },
            include: { client: true }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada" };
        }

        // Check ownership: user must own the client or be superadmin
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
            return { success: false, error: "No autorizado" };
        }

        await (prisma as any).quotation.update({
            where: { id: quotationId },
            data: { isVisible }
        });

        revalidatePath("/admin/cotizaciones");

        return { success: true };
    } catch (error) {
        console.error("Error toggling visibility:", error);
        return { success: false, error: "Error al cambiar visibilidad" };
    }
}
