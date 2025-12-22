import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateTransactionSchema = z.object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
    amount: z.number().positive().optional(),
    description: z.string().optional(),
    merchant: z.string().optional(),
    notes: z.string().optional(),
    categoryId: z.string().nullable().optional(),
    transactionDate: z.string().transform(s => new Date(s)).optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "Al menos un campo debe ser actualizado",
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get single transaction
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.transactions.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                userId: session.user.id,
                isDeleted: false,
            },
            include: {
                category: { select: { id: true, name: true, icon: true, type: true } },
                account: { 
                    select: { 
                        id: true, 
                        name: true, 
                        type: true,
                        currency: { select: { code: true, symbol: true } },
                    } 
                },
                toAccount: { select: { id: true, name: true } },
                currency: { select: { id: true, code: true, symbol: true, name: true } },
                receipt: { 
                    select: { 
                        id: true, 
                        filename: true, 
                        storagePath: true,
                        status: true,
                        ocrParsedData: true,
                    } 
                },
                recurringPayment: { select: { id: true, name: true } },
            },
        });

        if (!transaction) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        return NextResponse.json({ data: transaction });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return NextResponse.json({ error: "Error al obtener transacción" }, { status: 500 });
    }
}

// PUT - Update transaction
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canEdit = await hasPermission(session.user.id, session.user.role as Role, "finance.transactions.edit");
        if (!canEdit) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = updateTransactionSchema.parse(body);

        // Verify transaction exists and belongs to user
        const existingTransaction = await prisma.transaction.findFirst({
            where: { id, userId: session.user.id, isDeleted: false },
            include: { account: true },
        });

        if (!existingTransaction) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        // If amount changed, we need to reverse the old balance change and apply new one
        const oldAmount = existingTransaction.amount;
        const newAmount = data.amount ?? oldAmount;
        const oldType = existingTransaction.type;
        const newType = data.type ?? oldType;

        // Start transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Reverse old balance impact
            if (oldType === "INCOME") {
                await tx.financeAccount.update({
                    where: { id: existingTransaction.accountId },
                    data: { currentBalance: { decrement: oldAmount } },
                });
            } else if (oldType === "EXPENSE") {
                await tx.financeAccount.update({
                    where: { id: existingTransaction.accountId },
                    data: { currentBalance: { increment: oldAmount } },
                });
            } else if (oldType === "TRANSFER" && existingTransaction.toAccountId) {
                await tx.financeAccount.update({
                    where: { id: existingTransaction.accountId },
                    data: { currentBalance: { increment: oldAmount } },
                });
                await tx.financeAccount.update({
                    where: { id: existingTransaction.toAccountId },
                    data: { currentBalance: { decrement: oldAmount } },
                });
            }

            // Update transaction
            const updated = await tx.transaction.update({
                where: { id },
                data: {
                    ...data,
                    wasManuallyEdited: true,
                },
                include: {
                    category: true,
                    account: { include: { currency: true } },
                    currency: true,
                },
            });

            // Apply new balance impact
            if (newType === "INCOME") {
                await tx.financeAccount.update({
                    where: { id: existingTransaction.accountId },
                    data: { currentBalance: { increment: newAmount } },
                });
            } else if (newType === "EXPENSE") {
                await tx.financeAccount.update({
                    where: { id: existingTransaction.accountId },
                    data: { currentBalance: { decrement: newAmount } },
                });
            } else if (newType === "TRANSFER" && existingTransaction.toAccountId) {
                await tx.financeAccount.update({
                    where: { id: existingTransaction.accountId },
                    data: { currentBalance: { decrement: newAmount } },
                });
                await tx.financeAccount.update({
                    where: { id: existingTransaction.toAccountId },
                    data: { currentBalance: { increment: newAmount } },
                });
            }

            return updated;
        });

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Error updating transaction:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al actualizar transacción" }, { status: 500 });
    }
}

// DELETE - Soft delete transaction
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canDelete = await hasPermission(session.user.id, session.user.role as Role, "finance.transactions.delete");
        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // Verify transaction exists and belongs to user
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: session.user.id, isDeleted: false },
        });

        if (!transaction) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        // Reverse balance impact and soft delete
        await prisma.$transaction(async (tx) => {
            // Reverse balance
            if (transaction.type === "INCOME") {
                await tx.financeAccount.update({
                    where: { id: transaction.accountId },
                    data: { currentBalance: { decrement: transaction.amount } },
                });
            } else if (transaction.type === "EXPENSE") {
                await tx.financeAccount.update({
                    where: { id: transaction.accountId },
                    data: { currentBalance: { increment: transaction.amount } },
                });
            } else if (transaction.type === "TRANSFER" && transaction.toAccountId) {
                await tx.financeAccount.update({
                    where: { id: transaction.accountId },
                    data: { currentBalance: { increment: transaction.amount } },
                });
                await tx.financeAccount.update({
                    where: { id: transaction.toAccountId },
                    data: { currentBalance: { decrement: transaction.amount } },
                });
            }

            // Soft delete
            await tx.transaction.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json({ error: "Error al eliminar transacción" }, { status: 500 });
    }
}
