import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const currency = searchParams.get("currency") || "CLP";

        const userId = session.user.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Fetch all necessary data in parallel
        const [
            monthlyTransactions,
            yearlyTransactions,
            lastMonthTransactions,
            budgets,
            transactionDays,
        ] = await Promise.all([
            // This month's transactions
            prisma.transaction.findMany({
                where: {
                    userId,
                    transactionDate: { gte: startOfMonth },
                },
                select: {
                    type: true,
                    amount: true,
                    category: { select: { name: true } },
                },
            }),
            // This year's transactions
            prisma.transaction.findMany({
                where: {
                    userId,
                    transactionDate: { gte: startOfYear },
                },
                select: {
                    type: true,
                    amount: true,
                },
            }),
            // Last month's transactions
            prisma.transaction.findMany({
                where: {
                    userId,
                    transactionDate: {
                        gte: startOfLastMonth,
                        lte: endOfLastMonth,
                    },
                },
                select: {
                    type: true,
                    amount: true,
                },
            }),
            // User budgets
            prisma.budget.findMany({
                where: { userId },
                select: { amount: true, currentSpent: true },
            }),
            // Days with transactions this month (for streak)
            prisma.transaction.findMany({
                where: {
                    userId,
                    transactionDate: { gte: startOfMonth },
                },
                select: {
                    transactionDate: true,
                },
                distinct: ["transactionDate"],
            }),
        ]);

        // Calculate monthly totals
        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === "INCOME")
            .reduce((sum, t) => sum + toNumber(t.amount), 0);

        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === "EXPENSE")
            .reduce((sum, t) => sum + toNumber(t.amount), 0);

        // Calculate yearly totals
        const yearlyIncome = yearlyTransactions
            .filter(t => t.type === "INCOME")
            .reduce((sum, t) => sum + toNumber(t.amount), 0);

        const yearlyExpenses = yearlyTransactions
            .filter(t => t.type === "EXPENSE")
            .reduce((sum, t) => sum + toNumber(t.amount), 0);

        // Calculate last month totals
        const lastMonthExpenses = lastMonthTransactions
            .filter(t => t.type === "EXPENSE")
            .reduce((sum, t) => sum + toNumber(t.amount), 0);

        // Calculate savings rate
        const savingsRate = monthlyIncome > 0 
            ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
            : 0;

        // Calculate streaks
        const loggedDays = transactionDays.length;
        
        // Budget streak (days under budget)
        const totalBudget = budgets.reduce((sum, b) => sum + toNumber(b.amount), 0);
        const totalSpent = budgets.reduce((sum, b) => sum + toNumber(b.currentSpent), 0);
        const budgetStreak = totalBudget > 0 && totalSpent <= totalBudget ? now.getDate() : 0;

        // Month comparison
        const vsLastMonth = lastMonthExpenses > 0 
            ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
            : 0;

        // Category trends (simplified - would need more historical data for accuracy)
        const categorySpending = monthlyTransactions
            .filter(t => t.type === "EXPENSE" && t.category)
            .reduce((acc, t) => {
                const catName = t.category?.name || "Sin categoría";
                acc[catName] = (acc[catName] || 0) + toNumber(t.amount);
                return acc;
            }, {} as Record<string, number>);

        // Calculate financial health score
        let healthScore = 50; // Base score
        const factors: { name: string; impact: "positive" | "negative" | "neutral"; value: string }[] = [];

        // Savings rate factor
        if (savingsRate >= 20) {
            healthScore += 20;
            factors.push({ name: "Tasa de ahorro", impact: "positive", value: `${savingsRate.toFixed(1)}%` });
        } else if (savingsRate >= 10) {
            healthScore += 10;
            factors.push({ name: "Tasa de ahorro", impact: "neutral", value: `${savingsRate.toFixed(1)}%` });
        } else if (savingsRate < 0) {
            healthScore -= 20;
            factors.push({ name: "Tasa de ahorro", impact: "negative", value: `${savingsRate.toFixed(1)}%` });
        } else {
            factors.push({ name: "Tasa de ahorro", impact: "neutral", value: `${savingsRate.toFixed(1)}%` });
        }

        // Budget compliance factor
        if (totalBudget > 0) {
            const budgetUsage = (totalSpent / totalBudget) * 100;
            if (budgetUsage <= 80) {
                healthScore += 15;
                factors.push({ name: "Cumplimiento presupuesto", impact: "positive", value: `${budgetUsage.toFixed(0)}% usado` });
            } else if (budgetUsage <= 100) {
                healthScore += 5;
                factors.push({ name: "Cumplimiento presupuesto", impact: "neutral", value: `${budgetUsage.toFixed(0)}% usado` });
            } else {
                healthScore -= 15;
                factors.push({ name: "Cumplimiento presupuesto", impact: "negative", value: `${budgetUsage.toFixed(0)}% usado` });
            }
        }

        // Tracking consistency factor
        const expectedDays = now.getDate();
        const trackingRate = (loggedDays / expectedDays) * 100;
        if (trackingRate >= 80) {
            healthScore += 10;
            factors.push({ name: "Consistencia de registro", impact: "positive", value: `${loggedDays} días` });
        } else if (trackingRate >= 50) {
            healthScore += 5;
            factors.push({ name: "Consistencia de registro", impact: "neutral", value: `${loggedDays} días` });
        } else {
            factors.push({ name: "Consistencia de registro", impact: "negative", value: `${loggedDays} días` });
        }

        // Expense trend factor
        if (vsLastMonth < -10) {
            healthScore += 5;
            factors.push({ name: "Tendencia de gastos", impact: "positive", value: `${vsLastMonth.toFixed(1)}%` });
        } else if (vsLastMonth > 20) {
            healthScore -= 10;
            factors.push({ name: "Tendencia de gastos", impact: "negative", value: `+${vsLastMonth.toFixed(1)}%` });
        }

        healthScore = Math.max(0, Math.min(100, healthScore));

        const healthStatus = 
            healthScore >= 80 ? "excellent" :
            healthScore >= 60 ? "good" :
            healthScore >= 40 ? "fair" : "poor";

        const metrics = {
            savingsRate: Math.max(0, savingsRate),
            monthlyAverage: {
                income: monthlyIncome,
                expenses: monthlyExpenses,
            },
            yearlyTotal: {
                income: yearlyIncome,
                expenses: yearlyExpenses,
                savings: yearlyIncome - yearlyExpenses,
            },
            streaks: {
                noSpendDays: Math.max(0, now.getDate() - loggedDays),
                loggedDays,
                budgetStreak,
            },
            comparisons: {
                vsLastMonth,
                vsLastYear: 0, // Would need more historical data
                vsBudget: totalBudget > 0 ? ((totalSpent / totalBudget) * 100) - 100 : 0,
            },
            categoryTrends: {
                increasing: Object.keys(categorySpending).slice(0, 3),
                decreasing: [],
            },
            financialHealth: {
                score: healthScore,
                status: healthStatus,
                factors,
            },
        };

        return NextResponse.json({ data: metrics });
    } catch (error) {
        console.error("Error fetching metrics:", error);
        return NextResponse.json(
            { error: "Error al obtener métricas" },
            { status: 500 }
        );
    }
}
