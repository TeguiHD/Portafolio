"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface UpdateClientInput {
    name?: string;
    company?: string;
    rut?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactRole?: string;
    workType?: string;
    notes?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

function sanitizeString(input: string, maxLength: number = 500): string {
    return input.trim().slice(0, maxLength).replace(/[<>]/g, "");
}

// ============================================================================
// CRUD
// ============================================================================

export async function updateClientAction(clientId: string, input: UpdateClientInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "quotations.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    // Verify ownership
    const client = await prisma.quotationClient.findFirst({
        where: { id: clientId, userId: session.user.id },
    });
    if (!client) return { success: false, error: "Cliente no encontrado" };

    try {
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = sanitizeString(input.name, 200);
        if (input.company !== undefined) updateData.company = input.company ? sanitizeString(input.company, 200) : null;
        if (input.rut !== undefined) updateData.rut = input.rut ? sanitizeString(input.rut, 20) : null;
        if (input.address !== undefined) updateData.address = input.address ? sanitizeString(input.address, 500) : null;
        if (input.contactName !== undefined) updateData.contactName = input.contactName ? sanitizeString(input.contactName, 200) : null;
        if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail ? sanitizeString(input.contactEmail, 200) : null;
        if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone ? sanitizeString(input.contactPhone, 30) : null;
        if (input.contactRole !== undefined) updateData.contactRole = input.contactRole ? sanitizeString(input.contactRole, 200) : null;
        if (input.workType !== undefined) updateData.workType = input.workType ? sanitizeString(input.workType, 100) : null;
        if (input.notes !== undefined) updateData.notes = input.notes ? sanitizeString(input.notes, 2000) : null;

        await prisma.quotationClient.update({
            where: { id: clientId },
            data: updateData,
        });

        revalidatePath("/admin/gestion-comercial/clientes");
        return { success: true };
    } catch (error) {
        console.error("[CRM] Error updating client:", error);
        return { success: false, error: "Error al actualizar cliente" };
    }
}

export async function getClientDetailsAction(clientId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado", data: null };

    const canView = await hasPermission(session.user.id, session.user.role as Role, "quotations.view");
    if (!canView) return { success: false, error: "Permiso denegado", data: null };

    try {
        const client = await prisma.quotationClient.findFirst({
            where: { id: clientId, userId: session.user.id },
            include: {
                quotations: {
                    where: { isDeleted: false },
                    select: { id: true, projectName: true, total: true, status: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
                deals: {
                    where: { isDeleted: false },
                    select: { id: true, title: true, stage: true, estimatedValue: true },
                    orderBy: { updatedAt: "desc" },
                    take: 10,
                },
                contracts: {
                    where: { isDeleted: false },
                    select: { id: true, title: true, status: true, contractNumber: true, totalAmount: true },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
                expenses: {
                    where: { isDeleted: false },
                    select: { id: true, description: true, amount: true, category: true, expenseDate: true },
                    orderBy: { expenseDate: "desc" },
                    take: 10,
                },
                _count: {
                    select: { quotations: true, deals: true, contracts: true, expenses: true },
                },
            },
        });

        if (!client) return { success: false, error: "Cliente no encontrado", data: null };

        return { success: true, data: client };
    } catch (error) {
        console.error("[CRM] Error fetching client:", error);
        return { success: false, error: "Error al obtener cliente", data: null };
    }
}
