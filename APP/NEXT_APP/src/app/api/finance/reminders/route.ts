import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesoFinanzas } from "../_lib/acceso";
import { gastoDelPeriodo } from "../_lib/presupuestos";
import { diaGuardado, diasEntre, hoyChile } from "@/modules/finance/fechas";

export const dynamic = "force-dynamic";

interface Reminder {
    id: string;
    type: "daily_log" | "budget_check" | "bill_due" | "goal_update" | "weekly_review";
    title: string;
    message: string;
    scheduledFor: string;
    isActive: boolean;
    frequency: "daily" | "weekly" | "monthly" | "once";
}

const DIA_MS = 1000 * 60 * 60 * 24;

/** Fecha corta (AAAA-MM-DD) para el id: así «Descartar» vale para ese vencimiento o período y no para siempre. */
function dia(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
}

export async function GET() {
    try {
        const acceso = await accesoFinanzas("finance.view");
        if (!acceso.ok) return acceso.respuesta;

        const userId = acceso.userId;
        const now = new Date();
        // Hoy y la hora en Chile (el servidor corre en UTC: desde las 21:00 ya era «mañana»).
        const today = hoyChile(now);
        const horaChile = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", hour12: false }).format(now));
        const inicioHoy = new Date(today);
        const finHoy = new Date(inicioHoy.getTime() + DIA_MS);
        const reminders: Reminder[] = [];

        const [budgets, goals, todayTransactions, recurringPayments] = await Promise.all([
            prisma.budget.findMany({
                where: { userId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    amount: true,
                    period: true,
                    categoryId: true,
                    alertAt75: true,
                    alertAt90: true,
                    alertAt100: true,
                    category: { select: { name: true } },
                },
            }),
            prisma.savingsGoal.findMany({
                where: { userId, isActive: true, completed: false },
                select: { id: true, name: true, targetAmount: true, currentAmount: true, deadline: true },
            }),
            prisma.transaction.count({
                where: { userId, isDeleted: false, transactionDate: { gte: inicioHoy, lt: finHoy } },
            }),
            prisma.recurringPayment.findMany({
                where: { userId, isActive: true },
                select: { id: true, name: true, nextDueDate: true, reminderDays: true },
            }),
        ]);

        // Recordatorio de registro diario (si hoy no hay movimientos)
        if (todayTransactions === 0 && horaChile >= 18) {
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

        // Presupuestos: con el gasto real del período y respetando los avisos (75, 90, 100 %) que eligió el dueño.
        const gastos = await Promise.all(budgets.map((b) => gastoDelPeriodo(userId, b)));
        budgets.forEach((budget, i) => {
            const { gastado, start } = gastos[i];
            const porcentaje = budget.amount > 0 ? (gastado / budget.amount) * 100 : 0;
            const nombre = budget.category?.name || budget.name || "General";
            const periodo = dia(start);

            if (porcentaje >= 100 && budget.alertAt100) {
                reminders.push({
                    id: `budget-exceeded-${budget.id}-${periodo}`,
                    type: "budget_check",
                    title: `Presupuesto ${nombre} excedido`,
                    message: `Superaste el presupuesto de ${nombre} en un ${(porcentaje - 100).toFixed(0)} %.`,
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            } else if (porcentaje >= 90 && porcentaje < 100 && budget.alertAt90) {
                reminders.push({
                    id: `budget-warning-${budget.id}-${periodo}`,
                    type: "budget_check",
                    title: `Presupuesto ${nombre} al 90 %`,
                    message: `Has usado el ${porcentaje.toFixed(0)} % del presupuesto de ${nombre}.`,
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            } else if (porcentaje >= 75 && porcentaje < 90 && budget.alertAt75) {
                reminders.push({
                    id: `budget-75-${budget.id}-${periodo}`,
                    type: "budget_check",
                    title: `Presupuesto ${nombre} al 75 %`,
                    message: `Has usado el ${porcentaje.toFixed(0)} % del presupuesto de ${nombre}.`,
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            }
        });

        // Metas
        for (const goal of goals) {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

            if (progress >= 50 && progress < 51) {
                reminders.push({
                    id: `goal-milestone-${goal.id}`,
                    type: "goal_update",
                    title: `¡50 % de tu meta «${goal.name}»!`,
                    message: "Vas a mitad de camino.",
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            }

            if (goal.deadline) {
                const daysToDeadline = diasEntre(today, diaGuardado(goal.deadline));
                if (daysToDeadline > 0 && daysToDeadline <= 7 && progress < 100) {
                    reminders.push({
                        id: `goal-deadline-${goal.id}-${dia(goal.deadline)}`,
                        type: "goal_update",
                        title: `La meta «${goal.name}» vence pronto`,
                        message: `Te quedan ${daysToDeadline} día${daysToDeadline === 1 ? "" : "s"} para alcanzarla.`,
                        scheduledFor: now.toISOString(),
                        isActive: true,
                        frequency: "once",
                    });
                }
            }
        }

        // Pagos recurrentes: avisa desde los días que eligió el dueño («Notificar») hasta el día del vencimiento.
        for (const payment of recurringPayments) {
            const daysUntilDue = diasEntre(today, diaGuardado(payment.nextDueDate));
            if (daysUntilDue >= 0 && daysUntilDue <= payment.reminderDays) {
                reminders.push({
                    id: `bill-due-${payment.id}-${dia(payment.nextDueDate)}`,
                    type: "bill_due",
                    title: `Pago «${payment.name}» próximo`,
                    message:
                        daysUntilDue === 0
                            ? `Tu pago de ${payment.name} vence hoy.`
                            : `Tu pago de ${payment.name} vence en ${daysUntilDue} día${daysUntilDue === 1 ? "" : "s"}.`,
                    scheduledFor: now.toISOString(),
                    isActive: true,
                    frequency: "once",
                });
            }
        }

        // Revisión semanal (domingos)
        if (new Date(`${today}T12:00:00Z`).getUTCDay() === 0 && horaChile >= 10) {
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

        const typePriority: Record<Reminder["type"], number> = {
            budget_check: 1,
            bill_due: 2,
            goal_update: 3,
            daily_log: 4,
            weekly_review: 5,
        };
        reminders.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

        // Más de 5: la pantalla oculta los descartados y no deben esconder a los que siguen.
        return NextResponse.json({ data: reminders.slice(0, 20) });
    } catch (error) {
        console.error("Error fetching reminders:", error);
        return NextResponse.json({ error: "No se pudieron cargar los recordatorios" }, { status: 500 });
    }
}
