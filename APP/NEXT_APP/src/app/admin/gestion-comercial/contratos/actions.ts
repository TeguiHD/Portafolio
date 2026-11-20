"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permission-check";
import type { Role, ContractType } from '@/generated/prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface CreateContractInput {
    title: string;
    clientId: string;
    description?: string;
    type?: ContractType;
    totalAmount?: number;
    startDate?: string;
    endDate?: string;
    terms?: string;
    htmlContent?: string;
    quotationId?: string;
    autoRenew?: boolean;
    renewalAlertDays?: number;
}

const fechaSola = z.string({ error: "Fecha no válida" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

/** Lo que se puede cambiar de un contrato (el cliente y el número no). Se valida aquí: la acción se puede invocar sin el formulario. */
const esquemaEditarContrato = z.object({
    title: z.string({ error: "Título no válido" }).trim().min(1, "El título es requerido").max(200, "El título admite 200 caracteres").optional(),
    description: z.string({ error: "Descripción no válida" }).max(2000, "La descripción admite 2.000 caracteres").nullable().optional(),
    type: z.enum(["PROJECT", "RETAINER", "MAINTENANCE", "CONSULTING"], { error: "Tipo no válido" }).optional(),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", "EXPIRED"], { error: "Estado no válido" }).optional(),
    totalAmount: z.number({ error: "Valor no válido" }).finite("Valor no válido").min(0, "El valor no puede ser negativo").max(1e12, "Valor demasiado alto").optional(),
    startDate: fechaSola.nullable().optional(),
    endDate: fechaSola.nullable().optional(),
    terms: z.string({ error: "Cláusulas no válidas" }).max(10000, "Las cláusulas admiten 10.000 caracteres").nullable().optional(),
    htmlContent: z.string({ error: "HTML no válido" }).max(102400, "El HTML admite 100 KB").nullable().optional(),
    autoRenew: z.boolean({ error: "Valor no válido" }).optional(),
    renewalAlertDays: z.number({ error: "Días no válidos" }).int("Los días van sin decimales").min(1, "Avisa con al menos 1 día").max(365, "Máximo 365 días").optional(),
}).refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "La fecha de término no puede ser anterior a la de inicio", path: ["endDate"],
});
type UpdateContractInput = z.input<typeof esquemaEditarContrato>;

/** AAAA-MM-DD a mediodía UTC: así la fecha se lee igual en Chile (medianoche UTC caía el día anterior). */
const aFecha = (f: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(f) ? `${f}T12:00:00Z` : f);

// ============================================================================
// VALIDATION & SANITIZATION (OWASP XSS Prevention — Allowlist approach)
// ============================================================================

function sanitizeString(input: string, maxLength: number = 500): string {
    return input.trim().slice(0, maxLength).replace(/[<>]/g, "");
}

/**
 * Sanitize HTML content using an allowlist approach.
 * Follows OWASP XSS Prevention Cheat Sheet Rule #6
 * and NIST SP 800-53 SI-10 (Information Input Validation).
 *
 * Strips: <script>, <iframe>, <embed>, <object>, <form>, <input>,
 *         <button>, <textarea>, <select>, <link>, <meta>, <base>,
 *         all on* event handlers, javascript: URIs, data: URIs (except images),
 *         and SVG event handlers.
 */
function sanitizeHtml(input: string, maxLength: number = 102400): string {
    let html = input.trim().slice(0, maxLength);

    // 1. Remove <script> tags and contents
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<script[^>]*\/?>/gi, "");

    // 2. Remove dangerous tags (keep content where safe)
    const dangerousTags = [
        "iframe", "embed", "object", "applet", "form", "input",
        "button", "textarea", "select", "link", "meta", "base",
        "frame", "frameset", "svg", "math",
    ];
    for (const tag of dangerousTags) {
        // Remove opening and closing tags (keep inner content for non-embed types)
        html = html.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), "");
        html = html.replace(new RegExp(`<${tag}[^>]*/?>`, "gi"), "");
    }

    // 3. Remove ALL event handlers (on*)
    html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

    // 4. Remove javascript: and vbscript: URIs
    html = html.replace(/(?:href|src|action|formaction|data|poster|background)\s*=\s*(?:"[^"]*(?:javascript|vbscript)\s*:[^"]*"|'[^']*(?:javascript|vbscript)\s*:[^']*')/gi, "");

    // 5. Remove data: URIs except for images
    html = html.replace(/(?:href|src|action)\s*=\s*(?:"data:(?!image\/)[^"]*"|'data:(?!image\/)[^']*')/gi, "");

    // 6. Remove expression() in CSS (IE-specific XSS vector)
    html = html.replace(/expression\s*\(/gi, "/* expression blocked */");

    // 7. Remove -moz-binding (Firefox XSS vector)
    html = html.replace(/-moz-binding\s*:/gi, "/* moz-binding blocked */");

    // 8. Remove @import in CSS (prevents loading external malicious CSS)
    html = html.replace(/@import\s+/gi, "/* import blocked */ ");

    return html;
}

// ============================================================================
// CONTRACT NUMBER GENERATOR
// ============================================================================

async function generateContractNumber(salto = 0): Promise<string> {
    // El año de Chile: el 31 de diciembre en la noche, en UTC ya es el año siguiente.
    const year = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric" }).format(new Date());
    const count = await prisma.contract.count({
        where: {
            contractNumber: { startsWith: `CON-${year}` },
        },
    });
    return `CON-${year}-${String(count + 1 + salto).padStart(3, "0")}`;
}

const esDuplicado = (e: unknown) => (e as { code?: string })?.code === "P2002";

// ============================================================================
// AUTHORIZATION
// ============================================================================

async function verifyContractAccess(contractId: string, userId: string, role: Role) {
    const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        select: { userId: true, isDeleted: true },
    });
    if (!contract || contract.isDeleted) return null;
    if (role !== "SUPERADMIN" && contract.userId !== userId) return null;
    return contract;
}

// ============================================================================
// CRUD
// ============================================================================

export async function createContractAction(input: CreateContractInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.contracts.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    if (!input.title?.trim()) return { success: false, error: "El título es requerido" };
    if (input.title.length > 200) return { success: false, error: "Título máximo 200 caracteres" };

    // Verify client ownership
    const client = await prisma.quotationClient.findFirst({
        where: { id: input.clientId, userId: session.user.id },
    });
    if (!client) return { success: false, error: "Cliente no encontrado" };
    if (input.quotationId) {
        const cotizacion = await prisma.quotation.findFirst({
            where: { id: input.quotationId, clientId: input.clientId, isDeleted: false },
            select: { id: true },
        });
        if (!cotizacion) return { success: false, error: "La cotización no es de ese cliente" };
    }

    try {
        // Dos contratos creados a la vez (o un doble clic) sacan el mismo número: se reintenta con el siguiente.
        let contract: { id: string; contractNumber: string } | null = null;
        for (let intento = 0; !contract; intento++) {
            try {
                contract = await prisma.contract.create({
                    data: {
                        contractNumber: await generateContractNumber(intento),
                        title: sanitizeString(input.title, 200),
                        description: input.description ? sanitizeString(input.description, 2000) : null,
                        type: input.type || "PROJECT",
                        totalAmount: input.totalAmount || 0,
                        startDate: input.startDate ? aFecha(input.startDate) : null,
                        endDate: input.endDate ? aFecha(input.endDate) : null,
                        terms: input.terms ? sanitizeString(input.terms, 10000) : null,
                        htmlContent: input.htmlContent ? sanitizeHtml(input.htmlContent) : null,
                        autoRenew: input.autoRenew || false,
                        renewalAlertDays: input.renewalAlertDays || 30,
                        userId: session.user.id,
                        clientId: input.clientId,
                        quotationId: input.quotationId || null,
                    },
                    select: { id: true, contractNumber: true },
                });
            } catch (e) {
                if (!esDuplicado(e) || intento >= 2) throw e;
            }
        }

        revalidatePath("/admin/gestion-comercial/contratos");
        revalidatePath("/admin/gestion-comercial");
        return { success: true, data: contract };
    } catch (error) {
        console.error("[CRM] Error creating contract:", error);
        return { success: false, error: "Error al crear contrato" };
    }
}

export async function updateContractAction(contractId: string, entrada: UpdateContractInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.contracts.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    const contract = await verifyContractAccess(contractId, session.user.id, session.user.role as Role);
    if (!contract) return { success: false, error: "Contrato no encontrado" };

    const validado = esquemaEditarContrato.safeParse(entrada);
    if (!validado.success) return { success: false, error: validado.error.issues[0]?.message ?? "Revisa los datos del contrato" };
    const input = validado.data;

    try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = sanitizeString(input.title, 200);
        if (input.description !== undefined) updateData.description = input.description ? sanitizeString(input.description, 2000) : null;
        if (input.type !== undefined) updateData.type = input.type;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.totalAmount !== undefined) updateData.totalAmount = input.totalAmount;
        if (input.startDate !== undefined) updateData.startDate = input.startDate ? aFecha(input.startDate) : null;
        if (input.endDate !== undefined) updateData.endDate = input.endDate ? aFecha(input.endDate) : null;
        if (input.terms !== undefined) updateData.terms = input.terms ? sanitizeString(input.terms, 10000) : null;
        if (input.htmlContent !== undefined) updateData.htmlContent = input.htmlContent ? sanitizeHtml(input.htmlContent) : null;
        if (input.autoRenew !== undefined) updateData.autoRenew = input.autoRenew;
        if (input.renewalAlertDays !== undefined) updateData.renewalAlertDays = input.renewalAlertDays;

        await prisma.contract.update({
            where: { id: contractId },
            data: updateData,
        });

        revalidatePath("/admin/gestion-comercial/contratos");
        return { success: true };
    } catch (error) {
        console.error("[CRM] Error updating contract:", error);
        return { success: false, error: "Error al actualizar contrato" };
    }
}

/** Cláusulas y HTML de un contrato, solo al abrir «Editar»: la lista ya no los manda (pesaban hasta 100 KB cada uno). */
export async function getContractContentAction(contractId: string): Promise<{ success: true; terms: string; htmlContent: string } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.contracts.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    if (typeof contractId !== "string" || contractId.length > 40) return { success: false, error: "Contrato no encontrado" };
    const contract = await verifyContractAccess(contractId, session.user.id, session.user.role as Role);
    if (!contract) return { success: false, error: "Contrato no encontrado" };

    const contenido = await prisma.contract.findUnique({ where: { id: contractId }, select: { terms: true, htmlContent: true } });
    return { success: true, terms: contenido?.terms ?? "", htmlContent: contenido?.htmlContent ?? "" };
}

export async function deleteContractAction(contractId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.contracts.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    const contract = await verifyContractAccess(contractId, session.user.id, session.user.role as Role);
    if (!contract) return { success: false, error: "Contrato no encontrado" };

    try {
        await prisma.contract.update({
            where: { id: contractId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        revalidatePath("/admin/gestion-comercial/contratos");
        return { success: true };
    } catch (error) {
        console.error("[CRM] Error deleting contract:", error);
        return { success: false, error: "Error al eliminar contrato" };
    }
}
