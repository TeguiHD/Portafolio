"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hash } from "argon2";
import { randomBytes } from "crypto";
import { sanitizeQuotationHtml } from "@/lib/quotation-sanitizer";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";

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

    // SECURITY: Check granular permission
    const canCreate = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.create"
    );
    if (!canCreate) {
        return { success: false, error: "Permiso denegado" };
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
        const client = await prisma.quotationClient.findUnique({
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
        const existingSlug = await prisma.quotation.findFirst({
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
        await prisma.quotation.create({
            data: {
                folio,
                slug,
                projectName,
                clientName: client.name,
                total,
                subtotal: total,
                items: [],
                htmlContent: cleanHtmlContent,
                status: "PENDING",
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

    // SECURITY: Check granular permission
    const canEdit = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.edit"
    );
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
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

        await prisma.quotation.update({
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

    // SECURITY: Check granular permission
    const canEdit = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.edit"
    );
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await prisma.quotation.findUnique({
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

        await prisma.quotation.update({
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

export async function deleteQuotationAction(quotationId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canDelete = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.delete"
    );
    if (!canDelete) {
        return { success: false, error: "Permiso denegado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await prisma.quotation.findUnique({
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

        // Soft Delete (Business Requirement: Retention for backup/audit)
        await prisma.quotation.update({
            where: { id: quotationId },
            data: {
                isDeleted: true,
                deletedAt: new Date()
            }
        });

        revalidatePath("/admin/cotizaciones");

        return { success: true };
    } catch (error) {
        console.error("Error deleting quotation:", error);
        return { success: false, error: "Error al eliminar cotización" };
    }
}

export async function getQuotationForEditAction(quotationId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado", data: null };
    }

    // SECURITY: Check granular permission
    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.view"
    );
    if (!canView) {
        return { success: false, error: "Permiso denegado", data: null };
    }

    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { client: true }
        });

        if (!quotation) {
            return { success: false, error: "Cotización no encontrada", data: null };
        }

        // Check ownership: user must own the client or be superadmin
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        if (!isSuperAdmin && quotation.client?.userId !== session.user.id) {
            return { success: false, error: "No autorizado", data: null };
        }

        return {
            success: true,
            data: {
                id: quotation.id,
                folio: quotation.folio,
                projectName: quotation.projectName,
                htmlContent: quotation.htmlContent,
                total: quotation.total,
                status: quotation.status,
                notes: quotation.notes
            }
        };
    } catch (error) {
        console.error("Error getting quotation:", error);
        return { success: false, error: "Error al obtener cotización", data: null };
    }
}

export async function updateQuotationAction(
    quotationId: string,
    data: {
        projectName?: string;
        htmlContent?: string;
        total?: number;
        notes?: string;
    }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    // SECURITY: Check granular permission
    const canEdit = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.edit"
    );
    if (!canEdit) {
        return { success: false, error: "Permiso denegado" };
    }

    try {
        // Verify ownership (unless superadmin)
        const quotation = await prisma.quotation.findUnique({
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

        // Sanitize HTML if provided
        const updateData: Record<string, unknown> = {};
        if (data.projectName) updateData.projectName = data.projectName.trim().slice(0, 200);
        if (data.htmlContent) updateData.htmlContent = sanitizeQuotationHtml(data.htmlContent);
        if (data.total !== undefined) updateData.total = data.total;
        if (data.notes !== undefined) updateData.notes = data.notes?.trim().slice(0, 1000) || null;

        await prisma.quotation.update({
            where: { id: quotationId },
            data: updateData
        });

        revalidatePath("/admin/cotizaciones");

        return { success: true };
    } catch (error) {
        console.error("Error updating quotation:", error);
        return { success: false, error: "Error al actualizar cotización" };
    }
}
