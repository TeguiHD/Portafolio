"use server";

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

interface UpdateDealInput {
    title?: string;
    description?: string;
    priority?: DealPriority;
    origin?: DealOrigin;
    estimatedValue?: number;
    closeProbability?: number;
    estimatedCloseAt?: string | null;
    notes?: string;
    quotationId?: string | null;
    contractId?: string | null;
}

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

    try {
        const deal = await prisma.deal.create({
            data: {
                title: sanitizeString(input.title, 200),
                description: input.description ? sanitizeString(input.description, 2000) : null,
                stage: "PROSPECT",
                priority: input.priority || "MEDIUM",
                origin: input.origin || "DIRECT",
                estimatedValue: input.estimatedValue || 0,
                closeProbability: input.closeProbability || 50,
                estimatedCloseAt: input.estimatedCloseAt ? new Date(input.estimatedCloseAt) : null,
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

export async function updateDealAction(dealId: string, input: UpdateDealInput) {
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

    // Validate
    const validationError = validateDealInput(input);
    if (validationError) {
        return { success: false, error: validationError };
    }

    try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = sanitizeString(input.title, 200);
        if (input.description !== undefined) updateData.description = input.description ? sanitizeString(input.description, 2000) : null;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.origin !== undefined) updateData.origin = input.origin;
        if (input.estimatedValue !== undefined) updateData.estimatedValue = input.estimatedValue;
        if (input.closeProbability !== undefined) updateData.closeProbability = input.closeProbability;
        if (input.estimatedCloseAt !== undefined) updateData.estimatedCloseAt = input.estimatedCloseAt ? new Date(input.estimatedCloseAt) : null;
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
                    title: `Movido a ${newStage}`,
                    description: `"${existingDeal.title}" pasó de ${existingDeal.stage} a ${newStage}`,
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

// ============================================================================
// DATA FETCHING
// ============================================================================

export async function getDealsForPipelineAction() {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado", data: null };
    }

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.view"
    );
    if (!canView) {
        return { success: false, error: "Permiso denegado", data: null };
    }

    try {
        const deals = await prisma.deal.findMany({
            where: {
                userId: session.user.id,
                isDeleted: false,
            },
            include: {
                client: {
                    select: { id: true, name: true, slug: true, workType: true },
                },
                quotation: {
                    select: { id: true, projectName: true, total: true, status: true },
                },
                _count: {
                    select: { activities: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return { success: true, data: deals };
    } catch (error) {
        console.error("[CRM] Error fetching deals:", error);
        return { success: false, error: "Error al obtener oportunidades", data: null };
    }
}

export async function getDealDetailsAction(dealId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado", data: null };
    }

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.view"
    );
    if (!canView) {
        return { success: false, error: "Permiso denegado", data: null };
    }

    try {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                client: {
                    select: {
                        id: true, name: true, slug: true, workType: true,
                        contactName: true, contactEmail: true, contactPhone: true,
                    },
                },
                quotation: {
                    select: { id: true, projectName: true, total: true, status: true, folio: true },
                },
                contract: {
                    select: { id: true, title: true, status: true, contractNumber: true },
                },
                activities: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                    include: {
                        user: { select: { name: true } },
                    },
                },
            },
        });

        if (!deal || deal.isDeleted) {
            return { success: false, error: "Oportunidad no encontrada", data: null };
        }

        // Ownership check
        if (session.user.role !== "SUPERADMIN" && deal.userId !== session.user.id) {
            return { success: false, error: "No autorizado", data: null };
        }

        return { success: true, data: deal };
    } catch (error) {
        console.error("[CRM] Error fetching deal details:", error);
        return { success: false, error: "Error al obtener detalles", data: null };
    }
}

export async function getClientsForSelectAction() {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado", data: null };
    }

    try {
        const clients = await prisma.quotationClient.findMany({
            where: { userId: session.user.id, isActive: true },
            select: { id: true, name: true, workType: true },
            orderBy: { name: "asc" },
        });

        return { success: true, data: clients };
    } catch (error) {
        console.error("[CRM] Error fetching clients:", error);
        return { success: false, error: "Error al obtener clientes", data: null };
    }
}
