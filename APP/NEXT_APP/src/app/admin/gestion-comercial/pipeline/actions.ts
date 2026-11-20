"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permission-check";
import type { Role, DealStage, DealPriority, DealOrigin } from '@/generated/prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface CreateDealInput {
    title: string;
    clientId: string;
    description?: string;
    priority?: DealPriority;
    origin?: DealOrigin;
    estimatedValue?: number;
    closeProbability?: number;
    estimatedCloseAt?: string;
    notes?: string;
    quotationId?: string;
}

/** Lo que se puede cambiar de un negocio. Se valida en el servidor: la acción se puede invocar sin pasar por el formulario. */
const esquemaEditarNegocio = z.object({
    title: z.string({ error: "Título no válido" }).trim().min(1, "El título es requerido").max(200, "El título admite 200 caracteres").optional(),
    description: z.string({ error: "Descripción no válida" }).max(2000, "La descripción admite 2.000 caracteres").optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"], { error: "Prioridad no válida" }).optional(),
    origin: z.enum(["REFERRAL", "WEB", "SOCIAL_MEDIA", "DIRECT", "OTHER"], { error: "Origen no válido" }).optional(),
    estimatedValue: z.number({ error: "Valor no válido" }).finite("Valor no válido").min(0, "El valor estimado no puede ser negativo").max(1e12, "Valor demasiado alto").optional(),
    closeProbability: z.number({ error: "Probabilidad no válida" }).int("La probabilidad va sin decimales").min(0, "La probabilidad va de 0 a 100").max(100, "La probabilidad va de 0 a 100").optional(),
    estimatedCloseAt: z.string({ error: "Fecha no válida" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida").nullable().optional(),
    notes: z.string({ error: "Notas no válidas" }).max(2000, "Las notas admiten 2.000 caracteres").optional(),
    quotationId: z.string({ error: "Propuesta no válida" }).max(40, "Propuesta no válida").nullable().optional(),
    contractId: z.string({ error: "Contrato no válido" }).max(40, "Contrato no válido").nullable().optional(),
});
type UpdateDealInput = z.input<typeof esquemaEditarNegocio>;

const ETAPAS: Record<DealStage, string> = {
    PROSPECT: "Prospecto", CONTACTED: "Contactado", PROPOSAL: "Propuesta",
    NEGOTIATION: "Negociación", WON: "Ganado", LOST: "Perdido",
};

// ============================================================================
// VALIDATION (OWASP Input Validation)
// ============================================================================

function sanitizeString(input: string, maxLength: number = 500): string {
    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[<>]/g, ""); // Basic XSS prevention for plain text
}

function validateDealInput(data: { title?: string; estimatedValue?: number; closeProbability?: number }): string | null {
    if (data.title !== undefined) {
        if (!data.title || data.title.trim().length === 0) return "El título es requerido";
        if (data.title.length > 200) return "El título no puede exceder 200 caracteres";
    }
    if (data.estimatedValue !== undefined && data.estimatedValue < 0) {
        return "El valor estimado no puede ser negativo";
    }
    if (data.closeProbability !== undefined) {
        if (data.closeProbability < 0 || data.closeProbability > 100) {
            return "La probabilidad debe estar entre 0 y 100";
        }
    }
    return null;
}

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

async function verifyDealAccess(dealId: string, userId: string, role: Role) {
    const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        select: { userId: true, isDeleted: true },
    });
    if (!deal || deal.isDeleted) return null;
    // Ownership check: must own the deal or be superadmin
    if (role !== "SUPERADMIN" && deal.userId !== userId) return null;
    return deal;
}

// ============================================================================
// DEAL CRUD
// ============================================================================

export async function createDealAction(input: CreateDealInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    const canManage = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.manage"
    );
    if (!canManage) {
        return { success: false, error: "Permiso denegado" };
    }

    // Validate input
    const validationError = validateDealInput(input);
    if (validationError) {
        return { success: false, error: validationError };
    }

    // Verify client exists and belongs to user
    const client = await prisma.quotationClient.findFirst({
        where: {
            id: input.clientId,
            userId: session.user.id,
        },
    });
    if (!client) {
        return { success: false, error: "Cliente no encontrado" };
    }
    // La cotización enlazada tiene que ser de ese mismo cliente (si no, el negocio filtra datos ajenos).
    if (input.quotationId) {
        const cotizacion = await prisma.quotation.findFirst({
            where: { id: input.quotationId, clientId: input.clientId, isDeleted: false },
            select: { id: true },
        });
        if (!cotizacion) return { success: false, error: "La cotización no es de ese cliente" };
    }

    try {
        const deal = await prisma.deal.create({
            data: {
                title: sanitizeString(input.title, 200),
                description: input.description ? sanitizeString(input.description, 2000) : null,
                stage: "PROSPECT",
                priority: input.priority || "MEDIUM",
                origin: input.origin || "DIRECT",
                estimatedValue: input.estimatedValue || 0,
                closeProbability: input.closeProbability ?? 50,
                // Una fecha sola (AAAA-MM-DD) se guarda a mediodía UTC para que en Chile no caiga el día anterior.
                estimatedCloseAt: input.estimatedCloseAt ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(input.estimatedCloseAt) ? `${input.estimatedCloseAt}T12:00:00Z` : input.estimatedCloseAt) : null,
                notes: input.notes ? sanitizeString(input.notes, 2000) : null,
                userId: session.user.id,
                clientId: input.clientId,
                quotationId: input.quotationId || null,
            },
        });

        // Log activity
        await prisma.dealActivity.create({
            data: {
                dealId: deal.id,
                userId: session.user.id,
                type: "status_change",
                title: "Oportunidad creada",
                description: `Se creó la oportunidad "${deal.title}" para ${client.name}`,
                metadata: { stage: "PROSPECT" },
            },
        });

        revalidatePath("/admin/gestion-comercial");
        revalidatePath("/admin/gestion-comercial/pipeline");

        return { success: true, data: deal };
    } catch (error) {
        console.error("[CRM] Error creating deal:", error);
        return { success: false, error: "Error al crear oportunidad" };
    }
}

export async function updateDealAction(dealId: string, entrada: UpdateDealInput) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    const canManage = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.manage"
    );
    if (!canManage) {
        return { success: false, error: "Permiso denegado" };
    }

    const deal = await verifyDealAccess(dealId, session.user.id, session.user.role as Role);
    if (!deal) {
        return { success: false, error: "Oportunidad no encontrada" };
    }

    const validado = esquemaEditarNegocio.safeParse(entrada);
    if (!validado.success) {
        return { success: false, error: validado.error.issues[0]?.message ?? "Revisa los datos del negocio" };
    }
    const input = validado.data;

    // Enlaces nuevos: solo a cotizaciones y contratos vigentes del mismo cliente del negocio.
    if (input.quotationId || input.contractId) {
        const negocio = await prisma.deal.findUnique({ where: { id: dealId }, select: { clientId: true } });
        if (!negocio) return { success: false, error: "Negocio no encontrado" };
        if (input.quotationId) {
            const q = await prisma.quotation.findFirst({ where: { id: input.quotationId, clientId: negocio.clientId, isDeleted: false }, select: { id: true } });
            if (!q) return { success: false, error: "La cotización no es de ese cliente" };
        }
        if (input.contractId) {
            const c = await prisma.contract.findFirst({ where: { id: input.contractId, clientId: negocio.clientId, isDeleted: false }, select: { id: true } });
            if (!c) return { success: false, error: "El contrato no es de ese cliente" };
        }
    }

    try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = sanitizeString(input.title, 200);
        if (input.description !== undefined) updateData.description = input.description ? sanitizeString(input.description, 2000) : null;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.origin !== undefined) updateData.origin = input.origin;
        if (input.estimatedValue !== undefined) updateData.estimatedValue = input.estimatedValue;
        if (input.closeProbability !== undefined) updateData.closeProbability = input.closeProbability;
        if (input.estimatedCloseAt !== undefined) updateData.estimatedCloseAt = input.estimatedCloseAt ? new Date(`${input.estimatedCloseAt}T12:00:00Z`) : null;
        if (input.notes !== undefined) updateData.notes = input.notes ? sanitizeString(input.notes, 2000) : null;
        if (input.quotationId !== undefined) updateData.quotationId = input.quotationId;
        if (input.contractId !== undefined) updateData.contractId = input.contractId;

        await prisma.deal.update({
            where: { id: dealId },
            data: updateData,
        });

        revalidatePath("/admin/gestion-comercial");
        revalidatePath("/admin/gestion-comercial/pipeline");

        return { success: true };
    } catch (error) {
        console.error("[CRM] Error updating deal:", error);
        return { success: false, error: "Error al actualizar oportunidad" };
    }
}

export async function moveDealStageAction(dealId: string, newStage: DealStage) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    const canManage = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.manage"
    );
    if (!canManage) {
        return { success: false, error: "Permiso denegado" };
    }

    // Validate stage
    const validStages: DealStage[] = ["PROSPECT", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
    if (!validStages.includes(newStage)) {
        return { success: false, error: "Etapa inválida" };
    }

    const existingDeal = await prisma.deal.findUnique({
        where: { id: dealId },
        select: { userId: true, isDeleted: true, stage: true, title: true },
    });
    if (!existingDeal || existingDeal.isDeleted) {
        return { success: false, error: "Oportunidad no encontrada" };
    }
    if (session.user.role !== "SUPERADMIN" && existingDeal.userId !== session.user.id) {
        return { success: false, error: "No autorizado" };
    }

    if (existingDeal.stage === newStage) {
        return { success: true }; // No change needed
    }

    try {
        await prisma.$transaction([
            prisma.deal.update({
                where: { id: dealId },
                data: { stage: newStage },
            }),
            prisma.dealActivity.create({
                data: {
                    dealId,
                    userId: session.user.id,
                    type: "status_change",
                    title: `Pasó a ${ETAPAS[newStage]}`,
                    description: `"${existingDeal.title}" pasó de ${ETAPAS[existingDeal.stage]} a ${ETAPAS[newStage]}`,
                    metadata: {
                        fromStage: existingDeal.stage,
                        toStage: newStage,
                    },
                },
            }),
        ]);

        revalidatePath("/admin/gestion-comercial");
        revalidatePath("/admin/gestion-comercial/pipeline");

        return { success: true };
    } catch (error) {
        console.error("[CRM] Error moving deal stage:", error);
        return { success: false, error: "Error al mover oportunidad" };
    }
}

export async function deleteDealAction(dealId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    const canManage = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.manage"
    );
    if (!canManage) {
        return { success: false, error: "Permiso denegado" };
    }

    const deal = await verifyDealAccess(dealId, session.user.id, session.user.role as Role);
    if (!deal) {
        return { success: false, error: "Oportunidad no encontrada" };
    }

    try {
        // Soft delete (NIST data retention)
        await prisma.deal.update({
            where: { id: dealId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });

        revalidatePath("/admin/gestion-comercial");
        revalidatePath("/admin/gestion-comercial/pipeline");

        return { success: true };
    } catch (error) {
        console.error("[CRM] Error deleting deal:", error);
        return { success: false, error: "Error al eliminar oportunidad" };
    }
}

// ============================================================================
// DEAL ACTIVITIES
// ============================================================================

export async function addDealActivityAction(
    dealId: string,
    input: { type: string; title: string; description?: string }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    const canManage = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.manage"
    );
    if (!canManage) {
        return { success: false, error: "Permiso denegado" };
    }

    // Validate activity type (whitelist approach - OWASP)
    const validTypes = ["note", "call", "email", "meeting", "task"];
    if (!validTypes.includes(input.type)) {
        return { success: false, error: "Tipo de actividad inválido" };
    }

    const deal = await verifyDealAccess(dealId, session.user.id, session.user.role as Role);
    if (!deal) {
        return { success: false, error: "Oportunidad no encontrada" };
    }

    try {
        await prisma.dealActivity.create({
            data: {
                dealId,
                userId: session.user.id,
                type: input.type,
                title: sanitizeString(input.title, 200),
                description: input.description ? sanitizeString(input.description, 2000) : null,
            },
        });

        revalidatePath("/admin/gestion-comercial/pipeline");

        return { success: true };
    } catch (error) {
        console.error("[CRM] Error adding activity:", error);
        return { success: false, error: "Error al agregar actividad" };
    }
}
