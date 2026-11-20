import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from '@/generated/prisma/client';
import { accesoFinanzas, categoriaUsable, cuentaPropia, monedaActiva, monedaPorDefecto } from "../_lib/acceso";
import { crearRecurrenteSchema, equivalenteMensual, primeraFecha, tipoDeRecurrente } from "../_lib/recurrentes";
import { diaGuardado, diasEntre, hoyChile } from "@/modules/finance/fechas";

export const dynamic = "force-dynamic";

const CATEGORIA = { select: { id: true, name: true, icon: true, color: true, type: true } } as const;

// GET - List recurring payments
export async function GET(request: Request) {
    try {
        const acceso = await accesoFinanzas("finance.recurring.view");
        if (!acceso.ok) return acceso.respuesta;
        const userId = acceso.userId;

        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get("includeInactive") === "true";

        const whereClause: Prisma.RecurringPaymentWhereInput = { userId };
        if (!includeInactive) {
            whereClause.isActive = true;
        }

        const recurring = await prisma.recurringPayment.findMany({
            where: whereClause,
            include: { category: CATEGORIA },
            orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
        });

        // La cuenta no es una relación en el esquema: se busca aparte, solo entre las del usuario.
        const idsCuentas = [...new Set(recurring.map((p) => p.accountId).filter((id): id is string => Boolean(id)))];
        const cuentas = idsCuentas.length
            ? await prisma.financeAccount.findMany({
                where: { id: { in: idsCuentas }, userId },
                select: { id: true, name: true, icon: true },
            })
            : [];
        const cuentaPorId = new Map(cuentas.map((c) => [c.id, c]));

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const withStatus = recurring.map((payment) => {
            const daysUntilDue = diasEntre(hoyChile(now), diaGuardado(payment.nextDueDate)); // días de calendario en Chile

            let status: "upcoming" | "due_soon" | "overdue" | "inactive" = "upcoming";
            if (!payment.isActive) status = "inactive";
            else if (daysUntilDue < 0) status = "overdue";
            else if (daysUntilDue <= 3) status = "due_soon";

            return {
                ...payment,
                type: tipoDeRecurrente(payment.category),
                account: payment.accountId ? cuentaPorId.get(payment.accountId) ?? null : null,
                daysUntilDue,
                status,
            };
        });

        const activePayments = withStatus.filter((p) => p.isActive);
        // Solo gastos: un ingreso recurrente no suma al gasto mensual.
        const totalMonthlyExpenses = activePayments
            .filter((p) => p.type === "EXPENSE")
            .reduce((sum, p) => sum + equivalenteMensual(p.amount, p.frequency), 0);

        const upcomingThisMonth = activePayments.filter((p) => p.nextDueDate <= thirtyDaysFromNow);

        return NextResponse.json({
            data: withStatus,
            meta: {
                total: recurring.length,
                active: activePayments.length,
                totalMonthlyExpenses: Math.round(totalMonthlyExpenses),
                upcomingCount: upcomingThisMonth.length,
                overdueCount: withStatus.filter((p) => p.status === "overdue").length,
            },
        });
    } catch (error) {
        console.error("Error fetching recurring payments:", error);
        return NextResponse.json({ error: "Error al obtener pagos recurrentes" }, { status: 500 });
    }
}

// POST - Create recurring payment
export async function POST(request: Request) {
    try {
        const acceso = await accesoFinanzas("finance.recurring.manage");
        if (!acceso.ok) return acceso.respuesta;
        const userId = acceso.userId;

        const data = crearRecurrenteSchema.parse(await request.json().catch(() => null));

        const startDate = new Date(data.startDate);
        const endDate = data.endDate ? new Date(data.endDate) : null;
        if (endDate && endDate < startDate) {
            return NextResponse.json({ error: "La fecha de fin no puede ser anterior a la de inicio" }, { status: 400 });
        }

        if (data.categoryId) {
            const categoria = await categoriaUsable(userId, data.categoryId);
            if (!categoria || categoria.type === "TRANSFER") {
                return NextResponse.json({ error: "La categoría no es válida" }, { status: 400 });
            }
        }

        let monedaDeCuenta: string | null = null;
        if (data.accountId) {
            const cuenta = await cuentaPropia(userId, data.accountId);
            if (!cuenta) return NextResponse.json({ error: "La cuenta no es válida" }, { status: 400 });
            monedaDeCuenta = cuenta.currencyId;
        }

        let currencyId: string | null;
        if (data.currencyId) {
            currencyId = await monedaActiva(data.currencyId);
            if (!currencyId) return NextResponse.json({ error: "La moneda no es válida" }, { status: 400 });
        } else {
            currencyId = await monedaPorDefecto(userId, monedaDeCuenta);
            if (!currencyId) {
                return NextResponse.json({ error: "No hay monedas configuradas. Crea una cuenta primero." }, { status: 400 });
            }
        }

        // El día del mes solo aplica a los pagos mensuales.
        const dayOfMonth = data.frequency === "monthly" ? data.dayOfMonth ?? null : null;

        const payment = await prisma.recurringPayment.create({
            data: {
                userId,
                name: data.name,
                amount: data.amount,
                currencyId,
                categoryId: data.categoryId || null,
                accountId: data.accountId || null,
                frequency: data.frequency,
                startDate,
                endDate,
                dayOfMonth,
                dayOfWeek: data.dayOfWeek ?? null,
                reminderDays: data.reminderDays,
                nextDueDate: primeraFecha(startDate, data.frequency, dayOfMonth),
                isActive: true,
            },
            include: { category: CATEGORIA },
        });

        return NextResponse.json({ data: { ...payment, type: tipoDeRecurrente(payment.category) } }, { status: 201 });
    } catch (error) {
        console.error("Error creating recurring payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear pago recurrente" }, { status: 500 });
    }
}
