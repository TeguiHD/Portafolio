import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from '@/generated/prisma/client';
import { accesoFinanzas, categoriaUsable, cuentaPropia, monedaActiva } from "../../_lib/acceso";
import { diaAncla, editarRecurrenteSchema, esFrecuencia, primeraFecha, siguienteFecha, tipoDeRecurrente } from "../../_lib/recurrentes";
import { diaGuardado, diasEntre, hoyChile } from "@/modules/finance/fechas";

export const dynamic = "force-dynamic";

const CATEGORIA = { select: { id: true, name: true, icon: true, color: true, type: true } } as const;

const accionSchema = z.object({ action: z.enum(["mark_paid", "skip", "snooze"]) });

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get single recurring payment with history
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const acceso = await accesoFinanzas("finance.recurring.view");
        if (!acceso.ok) return acceso.respuesta;
        const userId = acceso.userId;
        const { id } = await params;

        const payment = await prisma.recurringPayment.findFirst({
            where: { id, userId },
            include: { category: CATEGORIA },
        });

        if (!payment) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }

        // Últimos 12 movimientos, solo con lo que se muestra (sin notas ni datos del documento).
        const relatedTransactions = await prisma.transaction.findMany({
            where: { userId, recurringPaymentId: id, isDeleted: false },
            orderBy: { transactionDate: "desc" },
            take: 12,
            select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                transactionDate: true,
                category: { select: { name: true, icon: true } },
            },
        });

        const now = new Date();
        const daysUntilDue = diasEntre(hoyChile(now), diaGuardado(payment.nextDueDate)); // días de calendario en Chile

        let status: "upcoming" | "due_soon" | "overdue" | "inactive" = "upcoming";
        if (!payment.isActive) status = "inactive";
        else if (daysUntilDue < 0) status = "overdue";
        else if (daysUntilDue <= 3) status = "due_soon";

        const totalPaid = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);

        return NextResponse.json({
            data: {
                ...payment,
                type: tipoDeRecurrente(payment.category),
                daysUntilDue,
                status,
                totalPaid,
                transactionCount: relatedTransactions.length,
                recentTransactions: relatedTransactions,
            },
        });
    } catch (error) {
        console.error("Error fetching recurring payment:", error);
        return NextResponse.json({ error: "Error al obtener pago recurrente" }, { status: 500 });
    }
}

// PUT - Update recurring payment (mismas reglas que al crear)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const acceso = await accesoFinanzas("finance.recurring.manage");
        if (!acceso.ok) return acceso.respuesta;
        const userId = acceso.userId;
        const { id } = await params;

        const data = editarRecurrenteSchema.parse(await request.json().catch(() => null));

        const existing = await prisma.recurringPayment.findFirst({ where: { id, userId } });
        if (!existing) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }

        const cambios: Prisma.RecurringPaymentUncheckedUpdateInput = {};
        if (data.name !== undefined) cambios.name = data.name;
        if (data.amount !== undefined) cambios.amount = data.amount;
        if (data.reminderDays !== undefined) cambios.reminderDays = data.reminderDays;
        if (data.isActive !== undefined) cambios.isActive = data.isActive;
        if (data.dayOfWeek !== undefined) cambios.dayOfWeek = data.dayOfWeek;

        // Fechas: se valida el par final (lo nuevo o lo que ya había).
        const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        const endDate = data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : existing.endDate;
        if (endDate && endDate < startDate) {
            return NextResponse.json({ error: "La fecha de fin no puede ser anterior a la de inicio" }, { status: 400 });
        }
        if (data.startDate) cambios.startDate = startDate;
        if (data.endDate !== undefined) cambios.endDate = endDate;

        // Categoría: se valida solo si cambia (una ya asignada que luego se desactivó no impide guardar lo demás).
        if (data.categoryId !== undefined && data.categoryId !== existing.categoryId) {
            if (data.categoryId) {
                const categoria = await categoriaUsable(userId, data.categoryId);
                if (!categoria || categoria.type === "TRANSFER") {
                    return NextResponse.json({ error: "La categoría no es válida" }, { status: 400 });
                }
            }
            cambios.categoryId = data.categoryId || null;
        }

        // Cuenta: igual; si cambia y no llega moneda, el pago pasa a la moneda de la cuenta nueva.
        if (data.accountId !== undefined && data.accountId !== existing.accountId) {
            if (data.accountId) {
                const cuenta = await cuentaPropia(userId, data.accountId);
                if (!cuenta) return NextResponse.json({ error: "La cuenta no es válida" }, { status: 400 });
                if (!data.currencyId) cambios.currencyId = cuenta.currencyId;
            }
            cambios.accountId = data.accountId || null;
        }
        if (data.currencyId && data.currencyId !== existing.currencyId) {
            const moneda = await monedaActiva(data.currencyId);
            if (!moneda) return NextResponse.json({ error: "La moneda no es válida" }, { status: 400 });
            cambios.currencyId = moneda;
        }

        // Calendario: si cambia la frecuencia, el inicio o el día del mes, se recalcula el próximo vencimiento.
        const frecuenciaGuardada = existing.frequency.toLowerCase();
        const frequency = data.frequency ?? (esFrecuencia(frecuenciaGuardada) ? frecuenciaGuardada : "monthly");
        const dayOfMonth = frequency === "monthly"
            ? (data.dayOfMonth !== undefined ? data.dayOfMonth ?? null : existing.dayOfMonth)
            : null;
        // El día del mes solo cuenta en los mensuales: pausar un pago semanal viejo con día guardado no debe recalcular.
        const cambiaCalendario =
            frequency !== frecuenciaGuardada ||
            startDate.getTime() !== existing.startDate.getTime() ||
            (frequency === "monthly" && dayOfMonth !== existing.dayOfMonth);
        if (cambiaCalendario) {
            cambios.frequency = frequency;
            cambios.dayOfMonth = dayOfMonth;
            cambios.nextDueDate = primeraFecha(startDate, frequency, dayOfMonth);
        }

        const payment = await prisma.recurringPayment.update({
            where: { id },
            data: cambios,
            include: { category: CATEGORIA },
        });

        return NextResponse.json({ data: { ...payment, type: tipoDeRecurrente(payment.category) } });
    } catch (error) {
        console.error("Error updating recurring payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al actualizar pago recurrente" }, { status: 500 });
    }
}

class YaRegistrado extends Error {}

// PATCH - Mark as paid / Skip / Snooze
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const acceso = await accesoFinanzas("finance.recurring.manage");
        if (!acceso.ok) return acceso.respuesta;
        const userId = acceso.userId;
        const { id } = await params;

        const { action } = accionSchema.parse(await request.json().catch(() => null));

        const existing = await prisma.recurringPayment.findFirst({
            where: { id, userId },
            include: { category: { select: { type: true } } },
        });

        if (!existing) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }
        if (!existing.isActive) {
            return NextResponse.json({ error: "El pago está pausado. Actívalo para registrarlo o saltarlo." }, { status: 400 });
        }

        // Cuenta para registrar el pago: la del pago si sigue siendo propia y activa; si no, la principal.
        let accountId: string | null = null;
        if (action === "mark_paid") {
            const propia = existing.accountId ? await cuentaPropia(userId, existing.accountId) : null;
            if (propia) {
                accountId = propia.id;
            } else {
                const principal = await prisma.financeAccount.findFirst({
                    where: { userId, isActive: true },
                    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
                    select: { id: true },
                });
                if (!principal) {
                    return NextResponse.json({ error: "No hay cuenta disponible para registrar el pago" }, { status: 400 });
                }
                accountId = principal.id;
            }
        }

        const ancla = diaAncla(existing.startDate, existing.frequency.toLowerCase() === "monthly" ? existing.dayOfMonth : null);
        const nextDueDate = siguienteFecha(existing.nextDueDate, existing.frequency, ancla);
        const shouldDeactivate = Boolean(existing.endDate && nextDueDate > existing.endDate);
        const transactionType = tipoDeRecurrente(existing.category);

        // Movimiento, saldo y próximo vencimiento juntos: o se guardan los tres o ninguno.
        const transaction = await prisma.$transaction(async (tx) => {
            // Primero se avanza el vencimiento, solo si sigue siendo el que se leyó: un doble toque (o dos pestañas)
            // ya no registra el pago dos veces ni descuenta dos veces el saldo.
            const avance = await tx.recurringPayment.updateMany({
                where: { id, userId, isActive: true, nextDueDate: existing.nextDueDate },
                data: shouldDeactivate ? { isActive: false } : { nextDueDate },
            });
            if (avance.count === 0) throw new YaRegistrado();

            let creada: { id: string; amount: number } | null = null;
            if (action === "mark_paid" && accountId) {
                creada = await tx.transaction.create({
                    data: {
                        userId,
                        amount: existing.amount,
                        type: transactionType,
                        categoryId: existing.categoryId,
                        accountId,
                        currencyId: existing.currencyId,
                        description: existing.name,
                        merchant: existing.name,
                        // El día de hoy en Chile, guardado como los demás movimientos (medianoche UTC de ese día).
                        transactionDate: new Date(`${hoyChile()}T00:00:00Z`),
                        recurringPaymentId: id,
                        source: "recurring",
                    },
                    select: { id: true, amount: true },
                });
                await tx.financeAccount.update({
                    where: { id: accountId },
                    data: {
                        currentBalance: transactionType === "INCOME" ? { increment: existing.amount } : { decrement: existing.amount },
                    },
                });
            }

            return creada;
        });

        return NextResponse.json({
            success: true,
            action,
            transaction,
            nextDueDate: shouldDeactivate ? null : nextDueDate,
        });
    } catch (error) {
        if (error instanceof YaRegistrado) {
            return NextResponse.json({ error: "Ese vencimiento ya se registró. La lista se actualizó." }, { status: 409 });
        }
        console.error("Error processing recurring payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
    }
}

// DELETE - Delete recurring payment
export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const acceso = await accesoFinanzas("finance.recurring.manage");
        if (!acceso.ok) return acceso.respuesta;
        const { id } = await params;

        const existing = await prisma.recurringPayment.findFirst({
            where: { id, userId: acceso.userId },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }

        await prisma.recurringPayment.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting recurring payment:", error);
        return NextResponse.json({ error: "Error al eliminar pago recurrente" }, { status: 500 });
    }
}
