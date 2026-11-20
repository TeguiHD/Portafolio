"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permission-check";
import type { Role, ExpenseCategory, ExpenseFrequency } from '@/generated/prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface CreateExpenseInput {
    clientId: string;
    contractId?: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    isRecurring?: boolean;
    frequency?: ExpenseFrequency;
    expenseDate?: string;
    notes?: string;
}

/** Lo que se puede cambiar de un gasto (el cliente y el contrato no). Se valida aquí: la acción se puede invocar sin el formulario. */
const esquemaEditarGasto = z.object({
    category: z.enum(["HOSTING", "DOMAIN", "LICENSES", "THIRD_PARTY", "TOOLS", "OTHER"], { error: "Categoría no válida" }).optional(),
    description: z.string({ error: "Descripción no válida" }).trim().min(1, "La descripción es requerida").max(500, "La descripción admite 500 caracteres").optional(),
    amount: z.number({ error: "Monto no válido" }).finite("Monto no válido").min(0, "El monto no puede ser negativo").max(1e12, "Monto demasiado alto").optional(),
    isRecurring: z.boolean({ error: "Valor no válido" }).optional(),
    frequency: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"], { error: "Frecuencia no válida" }).optional(),
    expenseDate: z.string({ error: "Fecha no válida" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida").optional(),
    notes: z.string({ error: "Notas no válidas" }).max(2000, "Las notas admiten 2.000 caracteres").nullable().optional(),
}).refine((d) => !d.isRecurring || d.frequency === undefined || d.frequency !== "ONE_TIME", {
    message: "Un gasto recurrente es mensual o anual", path: ["frequency"],
});
type UpdateExpenseInput = z.input<typeof esquemaEditarGasto>;

// ============================================================================
// VALIDATION
// ============================================================================

function sanitizeString(input: string, maxLength: number = 500): string {
    return input.trim().slice(0, maxLength).replace(/[<>]/g, "");
}

function validateExpenseInput(data: Partial<CreateExpenseInput>): string | null {
    if (data.description !== undefined && (!data.description || data.description.trim().length === 0)) {
        return "La descripción es requerida";
    }
    if (data.amount !== undefined && data.amount < 0) {
        return "El monto no puede ser negativo";
    }
    if (data.category !== undefined) {
        const validCategories: ExpenseCategory[] = [
            "HOSTING", "DOMAIN", "LICENSES", "THIRD_PARTY", "TOOLS", "OTHER"
        ];
        if (!validCategories.includes(data.category)) {
            return "Categoría inválida";
        }
    }
    return null;
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

async function verifyExpenseAccess(expenseId: string, userId: string, role: Role) {
    const expense = await prisma.clientExpense.findUnique({
        where: { id: expenseId },
        select: { userId: true, isDeleted: true },
    });
    if (!expense || expense.isDeleted) return null;
    if (role !== "SUPERADMIN" && expense.userId !== userId) return null;
    return expense;
}

// ============================================================================
// CRUD
// ============================================================================

export async function createExpenseAction(input: CreateExpenseInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.expenses.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    const validationError = validateExpenseInput(input);
    if (validationError) return { success: false, error: validationError };

    // Verify client ownership
    const client = await prisma.quotationClient.findFirst({
        where: { id: input.clientId, userId: session.user.id },
    });
    if (!client) return { success: false, error: "Cliente no encontrado" };

    // Verify contract if provided
    if (input.contractId) {
        const contract = await prisma.contract.findFirst({
            where: { id: input.contractId, userId: session.user.id, isDeleted: false },
        });
        if (!contract) return { success: false, error: "Contrato no encontrado" };
    }

    try {
        const expense = await prisma.clientExpense.create({
            data: {
                userId: session.user.id,
                clientId: input.clientId,
                contractId: input.contractId || null,
                category: input.category,
                description: sanitizeString(input.description, 500),
                amount: input.amount,
                isRecurring: input.isRecurring || false,
                frequency: input.frequency || "ONE_TIME",
                expenseDate: input.expenseDate ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate) ? `${input.expenseDate}T12:00:00Z` : input.expenseDate) : new Date(),
                notes: input.notes ? sanitizeString(input.notes, 2000) : null,
            },
        });

        revalidatePath("/admin/gestion-comercial/gastos");
        revalidatePath("/admin/gestion-comercial");
        return { success: true, data: expense };
    } catch (error) {
        console.error("[CRM] Error creating expense:", error);
        return { success: false, error: "Error al crear gasto" };
    }
}

export async function updateExpenseAction(expenseId: string, entrada: UpdateExpenseInput) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.expenses.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    const expense = await verifyExpenseAccess(expenseId, session.user.id, session.user.role as Role);
    if (!expense) return { success: false, error: "Gasto no encontrado" };

    const validado = esquemaEditarGasto.safeParse(entrada);
    if (!validado.success) return { success: false, error: validado.error.issues[0]?.message ?? "Revisa los datos del gasto" };
    const input = validado.data;

    try {
        const updateData: Record<string, unknown> = {};
        if (input.category !== undefined) updateData.category = input.category;
        if (input.description !== undefined) updateData.description = sanitizeString(input.description, 500);
        if (input.amount !== undefined) updateData.amount = input.amount;
        if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring;
        if (input.frequency !== undefined) updateData.frequency = input.frequency;
        // Si deja de ser recurrente, la frecuencia vuelve a «único».
        if (input.isRecurring === false) updateData.frequency = "ONE_TIME";
        if (input.expenseDate !== undefined) updateData.expenseDate = new Date(`${input.expenseDate}T12:00:00Z`);
        if (input.notes !== undefined) updateData.notes = input.notes ? sanitizeString(input.notes, 2000) : null;

        await prisma.clientExpense.update({
            where: { id: expenseId },
            data: updateData,
        });

        revalidatePath("/admin/gestion-comercial/gastos");
        return { success: true };
    } catch (error) {
        console.error("[CRM] Error updating expense:", error);
        return { success: false, error: "Error al actualizar gasto" };
    }
}

export async function deleteExpenseAction(expenseId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };

    const canManage = await hasPermission(session.user.id, session.user.role as Role, "crm.expenses.manage");
    if (!canManage) return { success: false, error: "Permiso denegado" };

    const expense = await verifyExpenseAccess(expenseId, session.user.id, session.user.role as Role);
    if (!expense) return { success: false, error: "Gasto no encontrado" };

    try {
        await prisma.clientExpense.update({
            where: { id: expenseId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        revalidatePath("/admin/gestion-comercial/gastos");
        return { success: true };
    } catch (error) {
        console.error("[CRM] Error deleting expense:", error);
        return { success: false, error: "Error al eliminar gasto" };
    }
}
