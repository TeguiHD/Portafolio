import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - Monthly report with insights
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.reports.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

        // Calculate date ranges
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const prevStartDate = new Date(year, month - 2, 1);
        const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59);

        // Current month transactions
        const currentTransactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                isDeleted: false,
                transactionDate: { gte: startDate, lte: endDate },
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
            orderBy: { transactionDate: "desc" },
        });

        // Previous month transactions
        const prevTransactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                isDeleted: false,
                transactionDate: { gte: prevStartDate, lte: prevEndDate },
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        // Calculate totals
        const currentIncome = currentTransactions
            .filter((t) => t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);
        const currentExpenses = currentTransactions
            .filter((t) => t.type === "EXPENSE")
            .reduce((sum, t) => sum + t.amount, 0);

        const prevIncome = prevTransactions
            .filter((t) => t.type === "INCOME")
            .reduce((sum, t) => sum + t.amount, 0);
        const prevExpenses = prevTransactions
            .filter((t) => t.type === "EXPENSE")
            .reduce((sum, t) => sum + t.amount, 0);

        // By category
        const expensesByCategory = new Map<string, { category: { id: string; name: string; icon: string | null; color: string | null }; amount: number; count: number }>();
        currentTransactions
            .filter((t) => t.type === "EXPENSE")
            .forEach((t) => {
                const catId = t.categoryId || "uncategorized";
                const existing = expensesByCategory.get(catId) || {
                    category: t.category || { id: "uncategorized", name: "Sin categoría", icon: "❓", color: "#6B7280" },
                    amount: 0,
                    count: 0,
                };
                existing.amount += t.amount;
                existing.count += 1;
                expensesByCategory.set(catId, existing);
            });

        const prevExpensesByCategory = new Map<string, number>();
        prevTransactions
            .filter((t) => t.type === "EXPENSE")
            .forEach((t) => {
                const catId = t.categoryId || "uncategorized";
                prevExpensesByCategory.set(catId, (prevExpensesByCategory.get(catId) || 0) + t.amount);
            });

        // Category comparison with delta
        const categoryBreakdown = Array.from(expensesByCategory.entries())
            .map(([catId, data]) => {
                const prevAmount = prevExpensesByCategory.get(catId) || 0;
                const delta = prevAmount > 0 ? ((data.amount - prevAmount) / prevAmount) * 100 : 100;
                return {
                    ...data,
                    prevAmount,
                    delta: Math.round(delta * 10) / 10,
                    percentage: currentExpenses > 0 ? Math.round((data.amount / currentExpenses) * 1000) / 10 : 0,
                };
            })
            .sort((a, b) => b.amount - a.amount);

        // Daily spending for chart
        const dailySpending = new Map<string, { income: number; expense: number }>();
        const daysInMonth = endDate.getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            dailySpending.set(dateKey, { income: 0, expense: 0 });
        }

        currentTransactions.forEach((t) => {
            const dateKey = t.transactionDate.toISOString().split("T")[0];
            const day = dailySpending.get(dateKey);
            if (day) {
                if (t.type === "INCOME") day.income += t.amount;
                else day.expense += t.amount;
            }
        });

        const dailyData = Array.from(dailySpending.entries()).map(([date, data]) => ({
            date,
            day: parseInt(date.split("-")[2]),
            ...data,
            balance: data.income - data.expense,
        }));

        // Top merchants
        const merchantSpending = new Map<string, { name: string; amount: number; count: number }>();
        currentTransactions
            .filter((t) => t.type === "EXPENSE" && t.merchant)
            .forEach((t) => {
                const existing = merchantSpending.get(t.merchant!) || { name: t.merchant!, amount: 0, count: 0 };
                existing.amount += t.amount;
                existing.count += 1;
                merchantSpending.set(t.merchant!, existing);
            });

        const topMerchants = Array.from(merchantSpending.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

        // Largest transactions
        const largestExpenses = currentTransactions
            .filter((t) => t.type === "EXPENSE")
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map((t) => ({
                id: t.id,
                amount: t.amount,
                date: t.transactionDate,
                merchant: t.merchant,
                category: t.category,
                description: t.description,
            }));

        // Generate insights
        const insights = generateInsights({
            currentExpenses,
            prevExpenses,
            categoryBreakdown,
            currentTransactions,
            dailyData,
        });

        // Calculate deltas
        const incomeChange = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;
        const expenseChange = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;

        return NextResponse.json({
            data: {
                period: { year, month, startDate, endDate },
                summary: {
                    income: currentIncome,
                    expenses: currentExpenses,
                    balance: currentIncome - currentExpenses,
                    prevIncome,
                    prevExpenses,
                    incomeChange: Math.round(incomeChange * 10) / 10,
                    expenseChange: Math.round(expenseChange * 10) / 10,
                    transactionCount: currentTransactions.length,
                },
                categoryBreakdown,
                dailyData,
                topMerchants,
                largestExpenses,
                insights,
            },
        });
    } catch (error) {
        console.error("Error generating report:", error);
        return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
    }
}

interface CategoryBreakdownItem {
    category: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    };
    amount: number;
    count: number;
    prevAmount: number;
    delta: number;
    percentage: number;
}

interface TransactionForInsight {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    merchant: string | null;
    description: string | null;
}

interface DailyDataItem {
    date: string;
    day: number;
    income: number;
    expense: number;
    balance: number;
}

interface InsightParams {
    currentExpenses: number;
    prevExpenses: number;
    categoryBreakdown: CategoryBreakdownItem[];
    currentTransactions: TransactionForInsight[];
    dailyData: DailyDataItem[];
}

function generateInsights(params: InsightParams): Array<{ type: string; icon: string; title: string; description: string; impact: "high" | "medium" | "low" }> {
    const insights = [];
    const { currentExpenses, prevExpenses, categoryBreakdown, currentTransactions, dailyData } = params;

    // Insight 1: Overall spending change
    if (prevExpenses > 0) {
        const change = ((currentExpenses - prevExpenses) / prevExpenses) * 100;
        if (change > 20) {
            insights.push({
                type: "spending_increase",
                icon: "📈",
                title: "Gastos aumentaron significativamente",
                description: `Gastaste ${Math.abs(Math.round(change))}% más que el mes anterior. Revisa tus categorías principales.`,
                impact: "high" as const,
            });
        } else if (change < -15) {
            insights.push({
                type: "spending_decrease",
                icon: "🎉",
                title: "¡Excelente control de gastos!",
                description: `Redujiste tus gastos en ${Math.abs(Math.round(change))}% comparado con el mes anterior.`,
                impact: "low" as const,
            });
        }
    }

    // Insight 2: Category with highest increase
    const biggestIncrease = categoryBreakdown.find((c) => c.delta > 50 && c.prevAmount > 0);
    if (biggestIncrease) {
        insights.push({
            type: "category_spike",
            icon: "⚠️",
            title: `${biggestIncrease.category.icon || "📈"} ${biggestIncrease.category.name} aumentó ${Math.round(biggestIncrease.delta)}%`,
            description: `Esta categoría pasó de $${formatAmount(biggestIncrease.prevAmount)} a $${formatAmount(biggestIncrease.amount)}.`,
            impact: "medium" as const,
        });
    }

    // Insight 3: Small transactions (gastos hormiga)
    const smallTransactions = currentTransactions.filter((t) => t.type === "EXPENSE" && t.amount < 10000);
    const smallTotal = smallTransactions.reduce((sum, t) => sum + t.amount, 0);
    if (smallTransactions.length > 20 && smallTotal > 100000) {
        insights.push({
            type: "small_expenses",
            icon: "🐜",
            title: "Gastos hormiga detectados",
            description: `${smallTransactions.length} transacciones menores a $10k suman $${formatAmount(smallTotal)}. Considera reducir compras impulsivas.`,
            impact: "medium" as const,
        });
    }

    // Insight 4: Highest spending day
    const maxDay = dailyData.reduce((max, d) => (d.expense > max.expense ? d : max), dailyData[0]);
    if (maxDay && maxDay.expense > currentExpenses * 0.15) {
        insights.push({
            type: "peak_day",
            icon: "📅",
            title: `Día ${maxDay.day}: Pico de gastos`,
            description: `El día ${maxDay.day} gastaste $${formatAmount(maxDay.expense)}, representando ${Math.round((maxDay.expense / currentExpenses) * 100)}% del mes.`,
            impact: "low" as const,
        });
    }

    // Insight 5: Dominant category
    if (categoryBreakdown.length > 0 && categoryBreakdown[0].percentage > 40) {
        const top = categoryBreakdown[0];
        insights.push({
            type: "dominant_category",
            icon: top.category.icon || "📊",
            title: `${top.category.name} domina tu gasto`,
            description: `${Math.round(top.percentage)}% de tus gastos van a esta categoría. ¿Es intencional?`,
            impact: "medium" as const,
        });
    }

    return insights.slice(0, 5); // Max 5 insights
}

function formatAmount(amount: number): string {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
    return amount.toString();
}
