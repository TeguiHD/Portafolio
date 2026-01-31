import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper to safely convert to number
function toNumber(value: number | { toNumber: () => number } | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toNumber === 'function') return value.toNumber();
    return Number(value) || 0;
}

interface Reminder {
    id: string;
    type: "daily_log" | "budget_check" | "bill_due" | "goal_update" | "weekly_review";
    title: string;
    message: string;
    scheduledFor: string;
    isActive: boolean;
    frequency: "daily" | "weekly" | "monthly" | "once";
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        const reminders: Reminder[] = [];

        // Fetch user data to generate contextual reminders
        const [budgets, goals, todayTransactions, recurringPayments] = await Promise.all([
            prisma.budget.findMany({
                where: { userId },
                include: { category: true },
            }),
            prisma.savingsGoal.findMany({
                where: { userId, isActive: true, completed: false },
            }),
            prisma.transaction.findMany({
                where: {
                    userId,
                    transactionDate: {
                        gte: new Date(today),
                        lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1)),
                    },
                },
            }),
            prisma.recurringPayment.findMany({
                where: { userId, isActive: true },
            }),
        ]);

        // Daily log reminder (if no transactions today)
        if (todayTransactions.length === 0 && now.getHours() >= 18) {
            reminders.push({
                id: "daily-log-" + today,
                type: "daily_log",
                title: "Registra tus gastos del día",
                message: "No has registrado ningún gasto hoy. ¿Tuviste algún gasto que agregar?",
                scheduledFor: now.toISOString(),
                isActive: true,
                frequency: "daily",
            });
        }

        // Budget warnings
        for (const budget of budgets) {
            const percentUsed = toNumber(budget.amount) > 0
                ? (toNumber(budget.currentSpent) / toNumber(budget.amount)) * 100
                : 0;

            if (percentUsed >= 90 && percentUsed < 100) {
                reminders.push({
                    id: `budget-warning-${budget.id}`,
                    type: "budget_check",
                    title: `Presupuesto ${budget.category?.name || "General"} al 90%`,
                    message: `Has usado el ${percentUsed.toFixed(0)}% de tu presupuesto en ${budget.category?.name || "esta categoría"}.`,
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            } else if (percentUsed >= 100) {
                reminders.push({
                    id: `budget-exceeded-${budget.id}`,
                    type: "budget_check",
                    title: `¡Presupuesto excedido!`,
                    message: `Has excedido tu presupuesto en ${budget.category?.name || "esta categoría"} por ${(percentUsed - 100).toFixed(0)}%.`,
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            }
        }

        // Goal updates
        for (const goal of goals) {
            const progress = toNumber(goal.targetAmount) > 0
                ? (toNumber(goal.currentAmount) / toNumber(goal.targetAmount)) * 100
                : 0;

            // Milestone reached
            if (progress >= 50 && progress < 51) {
                reminders.push({
                    id: `goal-milestone-${goal.id}`,
                    type: "goal_update",
                    title: `¡50% de tu meta "${goal.name}"!`,
                    message: "¡Vas a mitad de camino! Sigue así para alcanzar tu objetivo.",
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            }

            // Goal deadline approaching
            if (goal.deadline) {
                const daysToDeadline = Math.ceil(
                    (new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysToDeadline > 0 && daysToDeadline <= 7 && progress < 100) {
                    reminders.push({
                        id: `goal-deadline-${goal.id}`,
                        type: "goal_update",
                        title: `Meta "${goal.name}" vence pronto`,
                        message: `Te quedan ${daysToDeadline} días para alcanzar esta meta. ¡Puedes lograrlo!`,
                        scheduledFor: now.toISOString(),
                        isActive: true,
                        frequency: "once",
                    });
                }
            }
        }

        // Recurring payment reminders
        for (const payment of recurringPayments) {
            if (payment.nextDueDate) {
                const daysUntilDue = Math.ceil(
                    (new Date(payment.nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysUntilDue === 3 || daysUntilDue === 1) {
                    reminders.push({
                        id: `bill-due-${payment.id}`,
                        type: "bill_due",
                        title: `Pago "${payment.name}" próximo`,
                        message: `Tu pago de ${payment.name} vence en ${daysUntilDue} día${daysUntilDue > 1 ? "s" : ""}.`,
                        scheduledFor: now.toISOString(),
                        isActive: true,
                        frequency: "once",
                    });
                }
            }
        }

        // Weekly review (on Sundays)
        if (now.getDay() === 0 && now.getHours() >= 10) {
            reminders.push({
                id: "weekly-review-" + today,
                type: "weekly_review",
                title: "Hora de tu revisión semanal",
                message: "Revisa cómo te fue esta semana y planifica la próxima.",
                scheduledFor: now.toISOString(),
                isActive: true,
                frequency: "weekly",
            });
        }

        // Sort by type priority
        const typePriority: Record<string, number> = {
            budget_check: 1,
            bill_due: 2,
            goal_update: 3,
            daily_log: 4,
            weekly_review: 5,
        };

        reminders.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

        return NextResponse.json({ data: reminders.slice(0, 5) });
    } catch (error) {
        console.error("Error fetching reminders:", error);
        return NextResponse.json({ data: [] });
    }
}
