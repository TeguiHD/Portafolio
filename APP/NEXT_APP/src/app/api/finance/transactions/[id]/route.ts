import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma, Role, TransactionType } from '@/generated/prisma/client';
import { convertCurrency, type SupportedCurrency } from "@/services/exchange-rate";
import { logFinanceEvent, AuditActions } from "@/lib/audit";
import { accesoFinanzas, categoriaUsable, cuentaPropia, monedaActiva } from "../../_lib/acceso";

export const dynamic = "force-dynamic";

const updateTransactionSchema = z.object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
    amount: z.number().finite().positive().optional(),
    description: z.string().optional(),
    merchant: z.string().optional(),
    notes: z.string().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    // Antes la cuenta, el destino y la moneda se descartaban: el cambio de cuenta no se guardaba.
    accountId: z.string().min(1).optional(),
    toAccountId: z.string().min(1).nullable().optional(),
    currencyId: z.string().min(1).optional(),
    transactionDate: z
        .string()
        .refine((s) => !Number.isNaN(Date.parse(s)), "Fecha inválida")
        .transform((s) => new Date(s))
        .optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "Al menos un campo debe ser actualizado",
});

/** Lo que un movimiento le hace a los saldos (el mismo criterio que POST y DELETE). */
interface Efecto {
    type: TransactionType;
    amount: number;
    accountId: string;
    toAccountId: string | null;
}

/** Aplica (signo 1) o revierte (signo -1) el efecto de un movimiento en los saldos. */
async function moverSaldos(tx: Prisma.TransactionClient, efecto: Efecto, signo: 1 | -1) {
    const monto = efecto.amount * signo;
    if (efecto.type === "INCOME") {
        await tx.financeAccount.update({ where: { id: efecto.accountId }, data: { currentBalance: { increment: monto } } });
    } else if (efecto.type === "EXPENSE") {
        await tx.financeAccount.update({ where: { id: efecto.accountId }, data: { currentBalance: { decrement: monto } } });
    } else if (efecto.type === "TRANSFER" && efecto.toAccountId) {
        await tx.financeAccount.update({ where: { id: efecto.accountId }, data: { currentBalance: { decrement: monto } } });
        await tx.financeAccount.update({ where: { id: efecto.toAccountId }, data: { currentBalance: { increment: monto } } });
    }
}

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
        const acceso = await accesoFinanzas("finance.transactions.edit");
        if (!acceso.ok) return acceso.respuesta;
        const userId = acceso.userId;
        const { id } = await params;

        const data = updateTransactionSchema.parse(await request.json().catch(() => null));

        const existing = await prisma.transaction.findFirst({
            where: { id, userId, isDeleted: false },
            select: {
                type: true,
                amount: true,
                accountId: true,
                toAccountId: true,
                categoryId: true,
                currencyId: true,
                originalAmount: true,
                exchangeRate: true,
                account: { select: { currency: { select: { code: true } } } },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        const type = data.type ?? existing.type;
        // Una transferencia mueve dos saldos: convertirla en gasto o ingreso (o al revés) dejaría uno mal.
        if ((existing.type === "TRANSFER") !== (type === "TRANSFER")) {
            return NextResponse.json(
                { error: "Una transferencia no se puede convertir en gasto o ingreso. Elimínala y registra el movimiento de nuevo." },
                { status: 400 }
            );
        }

        // Cuenta de origen: se valida solo si cambia (puede seguir apuntando a una cuenta ya eliminada).
        const accountId = data.accountId ?? existing.accountId;
        let monedaCuenta = existing.account.currency.code;
        if (accountId !== existing.accountId) {
            const cuenta = await cuentaPropia(userId, accountId);
            if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
            monedaCuenta = cuenta.currency.code;
        }

        // Cuenta de destino: solo en transferencias; se conserva la que tenía si no llega otra.
        const toAccountId = type === "TRANSFER"
            ? (data.toAccountId !== undefined ? data.toAccountId : existing.toAccountId)
            : null;
        if (toAccountId && toAccountId !== existing.toAccountId) {
            const destino = await cuentaPropia(userId, toAccountId);
            if (!destino) return NextResponse.json({ error: "Cuenta destino no encontrada" }, { status: 404 });
        }
        if (toAccountId && toAccountId === accountId) {
            return NextResponse.json({ error: "La cuenta de destino debe ser distinta de la de origen" }, { status: 400 });
        }

        if (data.categoryId && data.categoryId !== existing.categoryId) {
            const categoria = await categoriaUsable(userId, data.categoryId);
            if (!categoria) return NextResponse.json({ error: "La categoría no es válida" }, { status: 400 });
        }

        const currencyId = data.currencyId ?? existing.currencyId;
        if (currencyId !== existing.currencyId && !(await monedaActiva(currencyId))) {
            return NextResponse.json({ error: "La moneda no es válida" }, { status: 400 });
        }

        const amount = data.amount ?? existing.amount;

        // Tipo de cambio: como al crear, se recalcula si cambia el monto, la moneda o la cuenta.
        let originalAmount = existing.originalAmount;
        let exchangeRate = existing.exchangeRate;
        if (amount !== existing.amount || currencyId !== existing.currencyId || accountId !== existing.accountId) {
            originalAmount = null;
            exchangeRate = null;
            const moneda = await prisma.currency.findUnique({ where: { id: currencyId }, select: { code: true } });
            if (moneda && moneda.code !== monedaCuenta) {
                originalAmount = amount;
                try {
                    const convertido = await convertCurrency(amount, moneda.code as SupportedCurrency, monedaCuenta as SupportedCurrency);
                    exchangeRate = convertido / amount;
                } catch (error) {
                    // Sin tasa disponible se guarda igual el movimiento; el saldo usa el monto, como al crear.
                    console.error("Error converting currency on update:", error);
                }
            }
        }

        const cambios: Prisma.TransactionUncheckedUpdateInput = {
            type,
            amount,
            accountId,
            toAccountId,
            currencyId,
            originalAmount,
            exchangeRate,
            wasManuallyEdited: true,
        };
        if (data.description !== undefined) cambios.description = data.description;
        if (data.merchant !== undefined) cambios.merchant = data.merchant;
        if (data.notes !== undefined) cambios.notes = data.notes;
        if (data.categoryId !== undefined) cambios.categoryId = data.categoryId;
        if (data.transactionDate !== undefined) cambios.transactionDate = data.transactionDate;

        // Revertir el efecto viejo en sus cuentas y aplicar el nuevo en las nuevas, todo o nada.
        const result = await prisma.$transaction(async (tx) => {
            await moverSaldos(tx, existing, -1);
            const updated = await tx.transaction.update({
                where: { id },
                data: cambios,
                include: {
                    category: true,
                    account: { include: { currency: true } },
                    currency: true,
                },
            });
            await moverSaldos(tx, { type, amount, accountId, toAccountId }, 1);
            return updated;
        });

        await logFinanceEvent(AuditActions.TRANSACTION_UPDATED, userId, "transaction", id, {
            cambios: Object.keys(data),
            cuentaCambiada: accountId !== existing.accountId,
        });

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Error updating transaction:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
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
