import { NextRequest, NextResponse } from "next/server";
import { accesoFinanzas } from "../../_lib/acceso";
import prisma from "@/lib/prisma";
import { differenceInDays, subMonths } from "date-fns";
import { fechasDelPeriodo } from "../../_lib/presupuestos";
import { hoyChile } from "@/modules/finance/fechas";

const CATEGORY_ICONS: Record<string, string> = {
    "alimentacion": "🍔",
    "alimentación": "🍔",
    "food": "🍔",
    "comida": "🍔",
    "transporte": "🚗",
    "transport": "🚗",
    "entretenimiento": "🎬",
    "entertainment": "🎬",
    "salud": "💊",
    "health": "💊",
    "educacion": "📚",
    "educación": "📚",
    "education": "📚",
    "hogar": "🏠",
    "home": "🏠",
    "servicios": "📱",
    "utilities": "📱",
    "ropa": "👕",
    "clothing": "👕",
    "otros": "📦",
    "other": "📦",
    "sueldo": "💼",
    "salary": "💼",
    "inversiones": "📈",
    "investments": "📈",
    "freelance": "💻",
};

const CATEGORY_COLORS: Record<string, string> = {
    "alimentacion": "#ef4444",
    "alimentación": "#ef4444",
    "food": "#ef4444",
    "comida": "#ef4444",
    "transporte": "#f97316",
    "transport": "#f97316",
    "entretenimiento": "#a855f7",
    "entertainment": "#a855f7",
    "salud": "#22c55e",
    "health": "#22c55e",
    "educacion": "#3b82f6",
    "educación": "#3b82f6",
    "education": "#3b82f6",
    "hogar": "#eab308",
    "home": "#eab308",
    "servicios": "#06b6d4",
    "utilities": "#06b6d4",
    "ropa": "#ec4899",
    "clothing": "#ec4899",
    "otros": "#6b7280",
    "other": "#6b7280",
};

const GOAL_ICONS: Record<string, string> = {
    "emergency": "🛡️",
    "emergencia": "🛡️",
    "vacation": "✈️",
    "vacaciones": "✈️",
    "car": "🚗",
    "auto": "🚗",
    "house": "🏠",
    "casa": "🏠",
    "education": "🎓",
    "educacion": "🎓",
    "educación": "🎓",
    "retirement": "🏖️",
    "retiro": "🏖️",
    "wedding": "💒",
    "boda": "💒",
    "tech": "💻",
    "tecnologia": "💻",
    "tecnología": "💻",
    "default": "🎯",
};

export async function GET(request: NextRequest) {
    try {
        const acceso = await accesoFinanzas("finance.dashboard");
        if (!acceso.ok) return acceso.respuesta;

        const userId = acceso.userId;
        const { searchParams } = new URL(request.url);
        const _currency = searchParams.get("currency") || "CLP";

        const now = new Date();
        // El mes de Chile, en días guardados (medianoche UTC): antes el mes cambiaba a las 21:00 del último día.
        const { start: monthStart, end: monthEnd } = fechasDelPeriodo("MONTHLY", now);
        const { start: lastMonthStart, end: lastMonthEnd } = fechasDelPeriodo("MONTHLY", new Date(monthStart.getTime() - 12 * 3_600_000));

        // Check if user needs onboarding
        const transactionCount = await prisma.transaction.count({
            where: { userId },
        });

        const accountCount = await prisma.financeAccount.count({
            where: { userId },
        });

        const needsOnboarding = transactionCount === 0 && accountCount === 0;

        // Get accounts for balance calculation
        const accounts = await prisma.financeAccount.findMany({
            where: {
                userId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                currentBalance: true,
                currency: true,
            },
        });

        // Calculate total balance
        const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

        // Get this month's transactions
        const thisMonthTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                transactionDate: {
                    gte: monthStart,
                    lte: monthEnd,
                },
                isDeleted: false,
            },
            include: {
                category: true,
            },
            orderBy: { transactionDate: "desc" },
        });

        // Get last month's transactions for comparison
        const lastMonthTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                transactionDate: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd,
                },
                isDeleted: false,
            },
            include: {
                category: true,
            },
        });

        // Calculate spending
        const thisMonthExpenses = thisMonthTransactions
            .filter(t => t.type === "EXPENSE")
            .reduce((sum, t) => sum + t.amount, 0);

        const lastMonthExpenses = lastMonthTransactions
            .filter(t => t.type === "EXPENSE")
            .reduce((sum, t) => sum + t.amount, 0);

        const thisMonthIncome = thisMonthTransactions
            .filter(t => t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);

        const lastMonthIncome = lastMonthTransactions
            .filter(t => t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);

        // Get budget for this month
        const budgets = await prisma.budget.findMany({
            where: {
                userId,
                isActive: true,
                OR: [
                    {
                        periodStart: { lte: monthEnd },
                        periodEnd: { gte: monthStart },
                    },
                    {
                        period: "MONTHLY",
                    },
                ],
            },
        });

        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0) || thisMonthIncome;

        // Day progress
        const dayOfMonth = Number(hoyChile(now).slice(8, 10));
        const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
        const expectedSpendingToDate = (totalBudget / daysInMonth) * dayOfMonth;

        let monthStatus: "under" | "on-track" | "over" = "under";
        if (thisMonthExpenses > expectedSpendingToDate * 1.1) {
            monthStatus = "over";
        } else if (thisMonthExpenses > expectedSpendingToDate * 0.9) {
            monthStatus = "on-track";
        }

        // Calculate balance change
        const netThisMonth = thisMonthIncome - thisMonthExpenses;
        const netLastMonth = lastMonthIncome - lastMonthExpenses;
        const balanceChange = netThisMonth - netLastMonth;
        const balanceChangePercent = netLastMonth !== 0
            ? ((netThisMonth - netLastMonth) / Math.abs(netLastMonth)) * 100
            : 0;

        // Category spending
        const categorySpending = new Map<string, { amount: number; name: string; lastMonth: number }>();

        for (const tx of thisMonthTransactions.filter(t => t.type === "EXPENSE")) {
            const catName = tx.category?.name || "Otros";
            const current = categorySpending.get(catName) || { amount: 0, name: catName, lastMonth: 0 };
            current.amount += tx.amount;
            categorySpending.set(catName, current);
        }

        // Add last month data for comparison
        for (const tx of lastMonthTransactions.filter(t => t.type === "EXPENSE")) {
            const catName = tx.category?.name || "Otros";
            const current = categorySpending.get(catName);
            if (current) {
                current.lastMonth += tx.amount;
            }
        }

        const topCategories = Array.from(categorySpending.entries())
            .map(([id, data]) => {
                const change = data.lastMonth > 0
                    ? Math.round(((data.amount - data.lastMonth) / data.lastMonth) * 100)
                    : 0;
                const nameLower = data.name.toLowerCase();
                return {
                    id,
                    name: data.name,
                    amount: data.amount,
                    percentage: thisMonthExpenses > 0 ? (data.amount / thisMonthExpenses) * 100 : 0,
                    change,
                    icon: CATEGORY_ICONS[nameLower] || "📦",
                    color: CATEGORY_COLORS[nameLower] || "#6b7280",
                };
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 8);

        // Get goals
        const goals = await prisma.savingsGoal.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: { deadline: "asc" },
            take: 4,
        });

        const formattedGoals = goals.map(g => {
            const nameLower = g.name.toLowerCase();
            let icon = GOAL_ICONS.default;
            for (const [key, value] of Object.entries(GOAL_ICONS)) {
                if (nameLower.includes(key)) {
                    icon = value;
                    break;
                }
            }
            return {
                id: g.id,
                name: g.name,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                deadline: g.deadline?.toISOString() || null,
                icon: g.icon || icon,
                color: g.color || "#3b82f6",
            };
        });

        // Generate smart alerts
        const alerts = generateSmartAlerts({
            thisMonthExpenses,
            totalBudget,
            categorySpending: topCategories,
            dayOfMonth,
            daysInMonth,
            goals: formattedGoals,
            totalBalance,
        });

        // Generate insights
        const insights = generateInsights({
            userId,
            thisMonthTransactions,
            lastMonthTransactions,
            thisMonthExpenses,
            lastMonthExpenses,
            categorySpending: topCategories,
        });

        // Get frequent transactions for quick actions
        const frequentTransactions = await prisma.transaction.groupBy({
            by: ["description", "categoryId", "type"],
            where: {
                userId,
                transactionDate: { gte: subMonths(now, 3) },
                isDeleted: false,
            },
            _count: { id: true },
            _avg: { amount: true },
            having: {
                id: { _count: { gte: 3 } },
            },
            orderBy: { _count: { id: "desc" } },
            take: 5,
        });

        // Get category info for frequent transactions
        const categoryIds = [...new Set(frequentTransactions.map(ft => ft.categoryId).filter(Boolean))];
        const categories = await prisma.financeCategory.findMany({
            where: { id: { in: categoryIds as string[] } },
        });
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const quickActions = frequentTransactions.map((ft, index) => {
            const cat = ft.categoryId ? categoryMap.get(ft.categoryId) : null;
            const catNameLower = cat?.name?.toLowerCase() || "otros";
            return {
                id: `quick-${index}`,
                label: (ft.description || "").slice(0, 20),
                amount: Math.round(ft._avg.amount || 0),
                icon: CATEGORY_ICONS[catNameLower] || "📦",
                category: cat?.name || "Otros",
                frequency: ft._count.id,
            };
        });

        // Format recent transactions
        const recentTransactions = thisMonthTransactions.slice(0, 10).map(tx => {
            const catNameLower = tx.category?.name?.toLowerCase() || "otros";
            const txType = tx.type.toLowerCase() as "income" | "expense" | "transfer";
            return {
                id: tx.id,
                description: tx.description || tx.merchant || "Sin descripción",
                amount: tx.amount,
                type: txType,
                category: tx.category?.name || "Sin categoría",
                categoryIcon: CATEGORY_ICONS[catNameLower] || "📦",
                date: tx.transactionDate.toISOString(),
                merchant: tx.merchant || undefined,
            };
        });

        // Get pending recurring payments count for this month
        const pendingReminders = await prisma.recurringPayment.count({
            where: {
                userId,
                isActive: true,
                nextDueDate: {
                    gte: now,
                    lte: monthEnd,
                },
            },
        });

        return NextResponse.json({
            success: true,
            needsOnboarding,
            data: {
                balance: {
                    available: totalBalance,
                    total: totalBalance,
                    change: balanceChange,
                    changePercent: balanceChangePercent,
                },
                monthProgress: {
                    spent: thisMonthExpenses,
                    projected: (thisMonthExpenses / dayOfMonth) * daysInMonth,
                    budget: totalBudget,
                    dayOfMonth,
                    daysInMonth,
                    dailyAverage: thisMonthExpenses / dayOfMonth,
                    status: monthStatus,
                },
                alerts,
                insights,
                goals: formattedGoals,
                topCategories,
                recentTransactions,
                quickActions,
                pendingReminders,
            },
        });
    } catch (error) {
        console.error("Dashboard V2 Error:", error);
        return NextResponse.json(
            { error: "No se pudo cargar el resumen de finanzas" },
            { status: 500 }
        );
    }
}

interface AlertGeneratorInput {
    thisMonthExpenses: number;
    totalBudget: number;
    categorySpending: Array<{ name: string; amount: number; percentage: number }>;
    dayOfMonth: number;
    daysInMonth: number;
    goals: Array<{ name: string; currentAmount: number; targetAmount: number; deadline: string | null }>;
    totalBalance: number;
}

function generateSmartAlerts(input: AlertGeneratorInput) {
    const alerts: Array<{
        id: string;
        type: "warning" | "info" | "success" | "danger";
        title: string;
        message: string;
        action?: { label: string; href: string };
        dismissable: boolean;
    }> = [];

    const budgetUsedPercent = input.totalBudget > 0
        ? (input.thisMonthExpenses / input.totalBudget) * 100
        : 0;

    const dayProgressPercent = (input.dayOfMonth / input.daysInMonth) * 100;

    // Budget alerts
    if (budgetUsedPercent >= 100) {
        alerts.push({
            id: "budget-exceeded",
            type: "danger",
            title: "Presupuesto excedido",
            message: `Has superado tu presupuesto mensual en ${(budgetUsedPercent - 100).toFixed(0)}%`,
            action: { label: "Ver detalle", href: "/admin/finance/budgets" },
            dismissable: false,
        });
    } else if (budgetUsedPercent >= 90) {
        alerts.push({
            id: "budget-warning-90",
            type: "warning",
            title: "¡Atención con el presupuesto!",
            message: `Has usado el ${budgetUsedPercent.toFixed(0)}% de tu presupuesto y quedan ${input.daysInMonth - input.dayOfMonth} días`,
            dismissable: true,
        });
    } else if (budgetUsedPercent >= 75 && budgetUsedPercent > dayProgressPercent) {
        alerts.push({
            id: "budget-warning-75",
            type: "info",
            title: "Vas adelantado en gastos",
            message: `Llevas ${budgetUsedPercent.toFixed(0)}% del presupuesto al ${dayProgressPercent.toFixed(0)}% del mes`,
            dismissable: true,
        });
    }

    // Goal close to completion
    for (const goal of input.goals) {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        if (progress >= 90 && progress < 100) {
            alerts.push({
                id: `goal-almost-${goal.name}`,
                type: "success",
                title: `¡Casi logras "${goal.name}"!`,
                message: `Te falta solo ${((goal.targetAmount - goal.currentAmount) / goal.targetAmount * 100).toFixed(0)}% para completar tu meta`,
                action: { label: "Ver meta", href: "/admin/finance/goals" },
                dismissable: true,
            });
            break; // Only show one goal alert
        }
    }

    // Low balance warning
    const avgDailySpending = input.thisMonthExpenses / input.dayOfMonth;
    const daysOfFundsLeft = avgDailySpending > 0 ? input.totalBalance / avgDailySpending : 999;

    if (daysOfFundsLeft < 7 && daysOfFundsLeft > 0) {
        alerts.push({
            id: "low-balance",
            type: "warning",
            title: "Balance bajo",
            message: `A tu ritmo actual, tus fondos alcanzarían solo ${Math.floor(daysOfFundsLeft)} días más`,
            dismissable: true,
        });
    }

    return alerts.slice(0, 3); // Max 3 alerts
}

interface TransactionWithCategory {
    id: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    description: string | null;
    transactionDate: Date;
    category: { name: string } | null;
}

interface InsightGeneratorInput {
    userId: string;
    thisMonthTransactions: TransactionWithCategory[];
    lastMonthTransactions: TransactionWithCategory[];
    thisMonthExpenses: number;
    lastMonthExpenses: number;
    categorySpending: Array<{ name: string; amount: number; change: number }>;
}

function generateInsights(input: InsightGeneratorInput) {
    const insights: Array<{
        id: string;
        type: "spending_pattern" | "saving_opportunity" | "anomaly" | "achievement";
        title: string;
        description: string;
        impact?: number;
        icon: string;
    }> = [];

    // Detect "gastos hormiga" (small recurring expenses)
    const smallExpenses = input.thisMonthTransactions.filter(
        t => t.type === "EXPENSE" && t.amount < 10000 // Less than 10,000 CLP
    );

    const smallExpenseTotal = smallExpenses.reduce((sum: number, t) => sum + t.amount, 0);
    const smallExpensePercent = input.thisMonthExpenses > 0
        ? (smallExpenseTotal / input.thisMonthExpenses) * 100
        : 0;

    if (smallExpensePercent > 20 && smallExpenses.length > 10) {
        insights.push({
            id: "gastos-hormiga",
            type: "saving_opportunity",
            title: "Gastos hormiga detectados",
            description: `${smallExpenses.length} compras pequeñas suman ${smallExpensePercent.toFixed(0)}% de tus gastos`,
            impact: smallExpenseTotal * 0.3, // Potential 30% savings
            icon: "🐜",
        });
    }

    // Category with highest increase
    const increasedCategories = input.categorySpending
        .filter(c => c.change > 20)
        .sort((a, b) => b.change - a.change);

    if (increasedCategories.length > 0) {
        const topIncrease = increasedCategories[0];
        insights.push({
            id: "category-increase",
            type: "anomaly",
            title: `${topIncrease.name} aumentó ${topIncrease.change}%`,
            description: `Gastaste significativamente más en ${topIncrease.name} comparado con el mes pasado`,
            icon: "📈",
        });
    }

    // Check for spending reduction achievement
    if (input.lastMonthExpenses > 0 && input.thisMonthExpenses < input.lastMonthExpenses * 0.9) {
        const savings = input.lastMonthExpenses - input.thisMonthExpenses;
        insights.push({
            id: "spending-down",
            type: "achievement",
            title: "¡Excelente control de gastos!",
            description: `Redujiste tus gastos en ${((input.lastMonthExpenses - input.thisMonthExpenses) / input.lastMonthExpenses * 100).toFixed(0)}% vs mes pasado`,
            impact: savings,
            icon: "🎉",
        });
    }

    // Weekend spending pattern
    const weekendExpenses = input.thisMonthTransactions.filter((t) => {
        const day = new Date(t.transactionDate).getDay();
        return t.type === "EXPENSE" && (day === 0 || day === 6);
    });

    const weekendTotal = weekendExpenses.reduce((sum: number, t) => sum + t.amount, 0);
    const weekendPercent = input.thisMonthExpenses > 0
        ? (weekendTotal / input.thisMonthExpenses) * 100
        : 0;

    if (weekendPercent > 40) {
        insights.push({
            id: "weekend-spending",
            type: "spending_pattern",
            title: "Gastas más los fines de semana",
            description: `El ${weekendPercent.toFixed(0)}% de tus gastos ocurren en sábado y domingo`,
            icon: "📅",
        });
    }

    // Check for subscription-like recurring expenses
    const subscriptionKeywords = ["netflix", "spotify", "disney", "hbo", "amazon", "apple", "google", "microsoft", "icloud", "youtube"];

    const subscriptionExpenses = input.thisMonthTransactions.filter((t) =>
        t.type === "EXPENSE" &&
        t.description &&
        subscriptionKeywords.some(kw => t.description!.toLowerCase().includes(kw))
    );

    if (subscriptionExpenses.length >= 3) {
        const subsTotal = subscriptionExpenses.reduce((sum: number, t) => sum + t.amount, 0);
        insights.push({
            id: "subscriptions",
            type: "spending_pattern",
            title: `${subscriptionExpenses.length} suscripciones activas`,
            description: `Pagas aproximadamente ${formatLocalCurrency(subsTotal)} al mes en servicios de streaming y apps`,
            icon: "📺",
        });
    }

    return insights.slice(0, 4); // Max 4 insights
}

function formatLocalCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
