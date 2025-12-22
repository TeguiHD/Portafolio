import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateRecurringPaymentSchema = z.object({
    name: z.string().optional(),
    amount: z.number().positive().optional(),
    categoryId: z.string().nullable().optional(),
    accountId: z.string().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
    reminderDays: z.number().min(0).max(30).optional(),
    isActive: z.boolean().optional(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get single recurring payment with history
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.recurring.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const payment = await prisma.recurringPayment.findFirst({
            where: { id, userId: session.user.id },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        if (!payment) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }

        // Get related transactions (last 12)
        const relatedTransactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                recurringPaymentId: id,
                isDeleted: false,
            },
            orderBy: { transactionDate: "desc" },
            take: 12,
            include: {
                category: { select: { name: true, icon: true } },
            },
        });

        // Calculate stats
        const now = new Date();
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

        // Total paid/received
        const totalPaid = relatedTransactions.reduce((sum, t) => sum + t.amount, 0);

        return NextResponse.json({
            data: {
                ...payment,
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

// PUT - Update recurring payment
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canEdit = await hasPermission(session.user.id, session.user.role as Role, "finance.recurring.manage");
        if (!canEdit) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = updateRecurringPaymentSchema.parse(body);

        // Verify ownership
        const existing = await prisma.recurringPayment.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }

        const payment = await prisma.recurringPayment.update({
            where: { id },
            data: {
                ...data,
                endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        return NextResponse.json({ data: payment });
    } catch (error) {
        console.error("Error updating recurring payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al actualizar pago recurrente" }, { status: 500 });
    }
}

// PATCH - Mark as paid / Skip / Process
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canEdit = await hasPermission(session.user.id, session.user.role as Role, "finance.recurring.manage");
        if (!canEdit) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const action = body.action as "mark_paid" | "skip" | "snooze";

        const existing = await prisma.recurringPayment.findFirst({
            where: { id, userId: session.user.id },
            include: {
                category: true,
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Pago recurrente no encontrado" }, { status: 404 });
        }

        let transaction = null;

        if (action === "mark_paid") {
            // Determine type from category or default to EXPENSE
            const transactionType = existing.category?.type || "EXPENSE";
            
            // Get account ID - use existing or find default account
            let accountId = existing.accountId;
            if (!accountId) {
                const defaultAccount = await prisma.financeAccount.findFirst({
                    where: { userId: session.user.id, isActive: true },
                    orderBy: { isDefault: "desc" },
                });
                if (!defaultAccount) {
                    return NextResponse.json({ error: "No hay cuenta disponible para registrar el pago" }, { status: 400 });
                }
                accountId = defaultAccount.id;
            }
            
            // Create the transaction
            transaction = await prisma.transaction.create({
                data: {
                    userId: session.user.id,
                    amount: existing.amount,
                    type: transactionType,
                    categoryId: existing.categoryId,
                    accountId: accountId,
                    currencyId: existing.currencyId,
                    description: existing.name,
                    merchant: existing.name,
                    transactionDate: new Date(),
                    recurringPaymentId: id,
                    source: "recurring",
                },
            });

            // Update account balance
            await prisma.financeAccount.update({
                where: { id: accountId },
                data: {
                    currentBalance: {
                        [transactionType === "INCOME" ? "increment" : "decrement"]: existing.amount,
                    },
                },
            });
        }

        // Calculate next due date
        const nextDueDate = calculateNextDueDate(
            existing.nextDueDate || new Date(),
            existing.frequency,
            existing.dayOfMonth ?? undefined,
            existing.dayOfWeek ?? undefined
        );

        // Check if payment should end
        const shouldDeactivate = existing.endDate && nextDueDate > existing.endDate;

        await prisma.recurringPayment.update({
            where: { id },
            data: {
                nextDueDate: shouldDeactivate ? new Date() : nextDueDate,
                isActive: shouldDeactivate ? false : true,
            },
        });

        return NextResponse.json({
            success: true,
            action,
            transaction: transaction ? { id: transaction.id, amount: transaction.amount } : null,
            nextDueDate: shouldDeactivate ? null : nextDueDate,
        });
    } catch (error) {
        console.error("Error processing recurring payment:", error);
        return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
    }
}

// DELETE - Delete recurring payment
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canDelete = await hasPermission(session.user.id, session.user.role as Role, "finance.recurring.manage");
        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const existing = await prisma.recurringPayment.findFirst({
            where: { id, userId: session.user.id },
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

function calculateNextDueDate(
    currentDate: Date,
    frequency: string,
    dayOfMonth?: number,
    dayOfWeek?: number
): Date {
    const next = new Date(currentDate);
    const freq = frequency.toUpperCase();

    switch (freq) {
        case "DAILY":
            next.setDate(next.getDate() + 1);
            break;
        case "WEEKLY":
            next.setDate(next.getDate() + 7);
            break;
        case "BIWEEKLY":
            next.setDate(next.getDate() + 14);
            break;
        case "MONTHLY":
            next.setMonth(next.getMonth() + 1);
            if (dayOfMonth) {
                const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                next.setDate(Math.min(dayOfMonth, daysInMonth));
            }
            break;
        case "QUARTERLY":
            next.setMonth(next.getMonth() + 3);
            break;
        case "YEARLY":
            next.setFullYear(next.getFullYear() + 1);
            break;
    }

    return next;
}
