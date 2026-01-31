import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const createRecurringPaymentSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    amount: z.number().positive("El monto debe ser positivo"),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
    currencyId: z.string(),
    frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    reminderDays: z.number().min(0).max(30).default(3),
});

// GET - List recurring payments
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.recurring.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get("includeInactive") === "true";

        const whereClause: any = { userId: session.user.id };
        if (!includeInactive) {
            whereClause.isActive = true;
        }

        const recurring = await prisma.recurringPayment.findMany({
            where: whereClause,
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
            orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
        });

        // Calculate upcoming payments for next 30 days
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const withStatus = recurring.map((payment) => {
            const daysUntilDue = payment.nextDueDate
                ? Math.ceil((new Date(payment.nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            let status: "upcoming" | "due_soon" | "overdue" | "inactive" = "upcoming";
            if (!payment.isActive) {
                status = "inactive";
            } else if (daysUntilDue !== null) {
                if (daysUntilDue < 0) status = "overdue";
                else if (daysUntilDue <= 3) status = "due_soon";
            }

            return {
                ...payment,
                daysUntilDue,
                status,
            };
        });

        // Summary
        const activePayments = withStatus.filter((p) => p.isActive);
        const totalMonthlyExpenses = activePayments
            .reduce((sum, p) => sum + calculateMonthlyEquivalent(p.amount, p.frequency), 0);

        const upcomingThisMonth = activePayments.filter(
            (p) => p.nextDueDate && new Date(p.nextDueDate) <= thirtyDaysFromNow
        );

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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canCreate = await hasPermission(session.user.id, session.user.role as Role, "finance.recurring.manage");
        if (!canCreate) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = createRecurringPaymentSchema.parse(body);

        // Calculate next due date
        const startDate = new Date(data.startDate);
        let nextDueDate = startDate;

        // If start date is in the past, calculate next occurrence
        const now = new Date();
        if (startDate < now) {
            nextDueDate = calculateNextOccurrence(startDate, data.frequency, data.dayOfMonth, data.dayOfWeek);
        }

        const payment = await prisma.recurringPayment.create({
            data: {
                userId: session.user.id,
                name: data.name,
                amount: data.amount,
                currencyId: data.currencyId,
                categoryId: data.categoryId || null,
                accountId: data.accountId || null,
                frequency: data.frequency,
                startDate,
                endDate: data.endDate ? new Date(data.endDate) : null,
                dayOfMonth: data.dayOfMonth,
                dayOfWeek: data.dayOfWeek,
                reminderDays: data.reminderDays,
                nextDueDate,
                isActive: true,
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        return NextResponse.json({ data: payment }, { status: 201 });
    } catch (error) {
        console.error("Error creating recurring payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear pago recurrente" }, { status: 500 });
    }
}

function calculateMonthlyEquivalent(amount: number, frequency: string): number {
    switch (frequency.toLowerCase()) {
        case "daily":
            return amount * 30;
        case "weekly":
            return amount * 4.33;
        case "biweekly":
            return amount * 2.17;
        case "monthly":
            return amount;
        case "quarterly":
            return amount / 3;
        case "yearly":
            return amount / 12;
        default:
            return amount;
    }
}

function calculateNextOccurrence(
    fromDate: Date,
    frequency: string,
    dayOfMonth?: number,
    _dayOfWeek?: number
): Date {
    const now = new Date();
    const next = new Date(fromDate);
    const freq = frequency.toLowerCase();

    while (next <= now) {
        switch (freq) {
            case "daily":
                next.setDate(next.getDate() + 1);
                break;
            case "weekly":
                next.setDate(next.getDate() + 7);
                break;
            case "biweekly":
                next.setDate(next.getDate() + 14);
                break;
            case "monthly":
                next.setMonth(next.getMonth() + 1);
                if (dayOfMonth) {
                    next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
                }
                break;
            case "quarterly":
                next.setMonth(next.getMonth() + 3);
                break;
            case "yearly":
                next.setFullYear(next.getFullYear() + 1);
                break;
        }
    }

    return next;
}

function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
