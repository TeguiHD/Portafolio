import { NextResponse } from "next/server";
import { verifySessionForApi } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { convertCurrency, type SupportedCurrency } from "@/services/exchange-rate";
import { formatCurrency } from "@/lib/currency";
import type { FinanceDashboardData, DashboardSummary, CategorySummary, RecentTransaction, BudgetStatus, FinanceAlert } from "@/modules/finance/types";
import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Types for joined queries - defined inline since Prisma types may not be generated yet
type AccountWithCurrency = {
    id: string;
    name: string;
    currentBalance: number;
    currency: { code: string; symbol: string };
};
type TransactionWithRelations = {
    id: string;
    type: string;
    amount: number;
    description: string | null;
    categoryId: string | null;
    transactionDate: Date;
    category: { id: string; name: string; icon: string } | null;
    account: { name: string; currency: { code: string } };
};
type BudgetWithCategory = {
    id: string;
    amount: number;
    categoryId: string;
    category: { name: string; icon: string } | null;
};

export async function GET(request: Request) {
    try {
        // DAL pattern: Verify session
        const session = await verifySessionForApi();

        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Check permission
        const canViewFinance = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canViewFinance) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const currency = (searchParams.get("currency") || "CLP") as SupportedCurrency;
        const startDate = searchParams.get("startDate")
            ? new Date(searchParams.get("startDate")!)
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = searchParams.get("endDate")
            ? new Date(searchParams.get("endDate")!)
            : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const userId = session.user.id;

        // Fetch all data in parallel
        const [
            accounts,
            transactions,
            budgets,
            categories,
            previousMonthTransactions,
        ] = await Promise.all([
            // Active accounts
            prisma.financeAccount.findMany({
                where: { userId, isActive: true },
                include: { currency: true },
            }),
            // Current month transactions
            prisma.transaction.findMany({
                where: {
                    userId,
                    isDeleted: false,
                    transactionDate: { gte: startDate, lte: endDate },
                },
                include: {
                    category: true,
                    account: { include: { currency: true } },
                },
                orderBy: { transactionDate: "desc" },
            }),
            // Active budgets for current period
            prisma.budget.findMany({
                where: {
                    userId,
                    isActive: true,
                },
                include: { category: true },
            }),
            // All categories for reference
            prisma.financeCategory.findMany({
                where: {
                    OR: [
                        { userId: null }, // Global categories
                        { userId },
                    ],
                    isActive: true,
                },
            }),
            // Previous month transactions for comparison
            prisma.transaction.findMany({
                where: {
                    userId,
                    isDeleted: false,
                    transactionDate: {
                        gte: new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1),
                        lt: startDate,
                    },
                },
                include: { account: { include: { currency: true } } },
            }),
        ]);

        // Calculate total balance across all accounts (converted to target currency)
        let totalBalance = 0;
        for (const account of accounts as AccountWithCurrency[]) {
            const converted = await convertCurrency(
                account.currentBalance,
                account.currency.code as SupportedCurrency,
                currency
            );
            totalBalance += converted;
        }

        // Calculate income and expenses for current month
        let totalIncome = 0;
        let totalExpenses = 0;
        const expensesByCategory: Map<string, { amount: number; count: number; categoryName: string; icon: string | null }> = new Map();

        for (const tx of transactions as TransactionWithRelations[]) {
            const converted = await convertCurrency(
                tx.amount,
                tx.account.currency.code as SupportedCurrency,
                currency
            );

            if (tx.type === "INCOME") {
                totalIncome += converted;
            } else {
                totalExpenses += converted;

                // Group by category
                if (tx.category) {
                    const existing = expensesByCategory.get(tx.categoryId!) || {
                        amount: 0,
                        count: 0,
                        categoryName: tx.category.name,
                        icon: tx.category.icon,
                    };
                    existing.amount += converted;
                    existing.count += 1;
                    expensesByCategory.set(tx.categoryId!, existing);
                }
            }
        }

        // Previous month totals for comparison
        let previousMonthExpenses = 0;
        for (const tx of previousMonthTransactions) {
            if (tx.type === "EXPENSE") {
                const converted = await convertCurrency(
                    tx.amount,
                    tx.account.currency.code as SupportedCurrency,
                    currency
                );
                previousMonthExpenses += converted;
            }
        }

        // Calculate projections
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const daysElapsed = today.getDate();
        const daysRemaining = daysInMonth - daysElapsed;
        const dailyAverage = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;
        const projectedExpenses = dailyAverage * daysInMonth;

        // Balance change from previous month
        const balanceChange = totalExpenses - previousMonthExpenses;
        const balanceChangePercent = previousMonthExpenses > 0
            ? ((totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
            : 0;

        // Format categories for response
        const categorySummaries: CategorySummary[] = Array.from(expensesByCategory.entries())
            .map(([id, data]) => ({
                categoryId: id,
                categoryName: data.categoryName,
                icon: data.icon,
                amount: data.amount,
                percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
                transactionCount: data.count,
                trend: 0, // TODO: Calculate trend from previous month
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        // Recent transactions
        const recentTransactions: RecentTransaction[] = (transactions as TransactionWithRelations[]).slice(0, 5).map((tx) => ({
            id: tx.id,
            description: tx.description || "",
            amount: tx.amount,
            type: tx.type as "INCOME" | "EXPENSE" | "TRANSFER",
            date: tx.transactionDate.toISOString(),
            categoryName: tx.category?.name || null,
            categoryIcon: tx.category?.icon || null,
            accountName: tx.account.name,
        }));

        // Budget status
        const budgetStatuses: BudgetStatus[] = await Promise.all(
            (budgets as BudgetWithCategory[]).map(async (budget) => {
                // Sum expenses for this category in current period
                const categoryExpenses = (transactions as TransactionWithRelations[])
                    .filter((tx) => tx.type === "EXPENSE" && tx.categoryId === budget.categoryId)
                    .reduce((sum: number, tx) => sum + tx.amount, 0);

                const convertedBudget = await convertCurrency(
                    budget.amount,
                    "CLP", // Budgets stored in CLP
                    currency
                );

                const convertedSpent = await convertCurrency(categoryExpenses, "CLP", currency);
                const percentage = convertedBudget > 0 ? (convertedSpent / convertedBudget) * 100 : 0;

                return {
                    id: budget.id,
                    categoryName: budget.category?.name || "Sin categoría",
                    categoryIcon: budget.category?.icon || null,
                    budgetAmount: convertedBudget,
                    spentAmount: convertedSpent,
                    remainingAmount: convertedBudget - convertedSpent,
                    percentage,
                    status: percentage >= 100 ? "exceeded" : percentage >= 80 ? "warning" : "ok",
                };
            })
        );

        // Generate alerts
        const alerts: FinanceAlert[] = [];

        // Budget alerts
        for (const budget of budgetStatuses) {
            if (budget.status === "exceeded") {
                alerts.push({
                    id: `budget-exceeded-${budget.id}`,
                    type: "budget_exceeded",
                    priority: "high",
                    title: `Presupuesto excedido: ${budget.categoryName}`,
                    message: `Has gastado ${formatCurrency(budget.spentAmount, currency)} de ${formatCurrency(budget.budgetAmount, currency)} (${budget.percentage.toFixed(0)}%)`,
                    actionUrl: "/admin/finance/budgets",
                    createdAt: new Date().toISOString(),
                });
            } else if (budget.status === "warning") {
                alerts.push({
                    id: `budget-warning-${budget.id}`,
                    type: "budget_warning",
                    priority: "medium",
                    title: `Alerta de presupuesto: ${budget.categoryName}`,
                    message: `Has usado el ${budget.percentage.toFixed(0)}% de tu presupuesto`,
                    actionUrl: "/admin/finance/budgets",
                    createdAt: new Date().toISOString(),
                });
            }
        }

        // Expense spike alert
        if (previousMonthExpenses > 0 && totalExpenses > previousMonthExpenses * 1.2) {
            alerts.push({
                id: "expense-spike",
                type: "expense_spike",
                priority: "medium",
                title: "Aumento de gastos detectado",
                message: `Tus gastos han aumentado un ${balanceChangePercent.toFixed(0)}% respecto al mes anterior`,
                createdAt: new Date().toISOString(),
            });
        }

        // Assemble response
        const summary: DashboardSummary = {
            totalBalance,
            balanceChange,
            balanceChangePercent,
            totalIncome,
            totalExpenses,
            netFlow: totalIncome - totalExpenses,
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
            projectedExpenses,
            daysElapsed,
            daysRemaining,
            dailyAverage,
            accountCount: accounts.length,
        };

        const data: FinanceDashboardData = {
            summary,
            expensesByCategory: categorySummaries,
            recentTransactions,
            budgets: budgetStatuses,
            alerts: alerts.sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }),
        };

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Finance dashboard error:", error);
        return NextResponse.json(
            { error: "Error al cargar el dashboard de finanzas" },
            { status: 500 }
        );
    }
}
