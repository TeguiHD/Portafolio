"use server";

// Antes en src/app/admin/gestion-comercial/clientes/actions.ts (esa ruta ahora redirige aquí).
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';

// ============================================================================
// VALIDACIÓN
// ============================================================================

function sanitizeString(input: string, maxLength: number = 500): string {
    return input.trim().slice(0, maxLength).replace(/[<>]/g, "");
}

const texto = (max: number) => z.string({ error: "Texto no válido" }).max(max, `Admite ${max.toLocaleString("es-CL")} caracteres`).optional();

/** Campos de la ficha. El contacto también se edita desde «Contacto» (updateClientContactAction). */
const esquemaCliente = z.object({
    name: z.string({ error: "Nombre no válido" }).trim().min(1, "El nombre es requerido").max(200, "El nombre admite 200 caracteres").optional(),
    company: texto(200),
    rut: texto(20),
    address: texto(500),
    contactName: texto(200),
    contactEmail: texto(200),
    contactPhone: texto(30),
    contactRole: texto(200),
    workType: texto(100),
    notes: texto(2000),
});
type UpdateClientInput = z.input<typeof esquemaCliente>;

// ============================================================================
// ACCIONES
// ============================================================================

export async function updateClientAction(clientId: string, entrada: UpdateClientInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "quotations.edit");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    const validado = esquemaCliente.safeParse(entrada);
    if (!validado.success) return { success: false, error: validado.error.issues[0]?.message ?? "Revisa los datos del cliente" };
    const input = validado.data;

    // Solo el dueño del cliente.
    const client = await prisma.quotationClient.findFirst({
        where: { id: clientId, userId: session.user.id },
        select: { id: true },
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

        revalidatePath("/admin/clientes");
        revalidatePath(`/admin/clientes/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("[Clientes] Error al actualizar cliente:", error);
        return { success: false, error: "No se pudo actualizar el cliente" };
    }
}

/** Resumen de un cliente con `select` explícito: sin accessCode ni notas, y sin lo borrado en listas ni conteos. */
export async function getClientDetailsAction(clientId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado", data: null };

    const canView = await hasPermission(session.user.id, session.user.role as Role, "quotations.view");
    if (!canView) return { success: false, error: "Permiso denegado", data: null };

    try {
        const client = await prisma.quotationClient.findFirst({
            where: { id: clientId, userId: session.user.id },
            select: {
                id: true, name: true, slug: true, email: true, company: true, rut: true, address: true,
                contactName: true, contactEmail: true, contactPhone: true, contactRole: true, workType: true,
                isActive: true, createdAt: true, updatedAt: true,
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
                    select: {
                        quotations: { where: { isDeleted: false } },
                        deals: { where: { isDeleted: false } },
                        contracts: { where: { isDeleted: false } },
                        expenses: { where: { isDeleted: false } },
                    },
                },
            },
        });

        if (!client) return { success: false, error: "Cliente no encontrado", data: null };

        return { success: true, data: client };
    } catch (error) {
        console.error("[Clientes] Error al leer cliente:", error);
        return { success: false, error: "No se pudo leer el cliente", data: null };
    }
}
