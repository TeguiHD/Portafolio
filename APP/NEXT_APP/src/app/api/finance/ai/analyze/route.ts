import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role } from "@prisma/client";
import { analyzeFinancesWithAI, askFinanceQuestion, FinancialData } from "@/services/finance-ai";
import { z } from "zod";

// POST /api/finance/ai/analyze - Get AI analysis of financial data
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canAccess = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canAccess) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const action = body.action || "analyze";

        const userId = session.user.id;

        // Get current month data
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Fetch all financial data
        const [transactions, accounts, budgets, goals, recurring] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    userId,
                    transactionDate: { gte: startOfMonth, lte: endOfMonth },
                },
                include: { category: true },
            }),
            prisma.financeAccount.findMany({
                where: { userId, isActive: true },
            }),
            prisma.budget.findMany({
                where: { userId, isActive: true },
                include: { category: true },
            }),
            prisma.savingsGoal.findMany({
                where: { userId, isActive: true },
            }),
            prisma.recurringPayment.findMany({
                where: { userId, isActive: true },
            }),
        ]);

        // Calculate totals
        const income = transactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);

        // Group by category
        const categoryMap = new Map<string, { name: string; amount: number; type: string }>();
        transactions.forEach((t) => {
            const catName = t.category?.name || "Sin categoría";
            const existing = categoryMap.get(catName) || { name: catName, amount: 0, type: t.type };
            existing.amount += t.amount;
            categoryMap.set(catName, existing);
        });

        const categories = Array.from(categoryMap.values())
            .map((c) => ({
                name: c.name,
                amount: c.amount,
                percentage: c.type === "EXPENSE" ? (c.amount / expenses) * 100 : (c.amount / income) * 100,
                type: c.type as "INCOME" | "EXPENSE",
            }))
            .filter((c) => c.amount > 0);

        // Calculate budget usage
        const budgetsWithUsage = budgets.map((b) => {
            const spent = transactions
                .filter((t) => t.type === "EXPENSE" && t.categoryId === b.categoryId)
                .reduce((sum, t) => sum + t.amount, 0);
            return {
                name: b.name || b.category?.name || "Presupuesto",
                amount: b.amount,
                spent,
                percentage: (spent / b.amount) * 100,
            };
        });

        // Calculate recurring total
        const monthlyRecurring = recurring.reduce((sum, r) => {
            let monthly = r.amount;
            switch (r.frequency) {
                case "DAILY":
                    monthly *= 30;
                    break;
                case "WEEKLY":
                    monthly *= 4;
                    break;
                case "BIWEEKLY":
                    monthly *= 2;
                    break;
                case "QUARTERLY":
                    monthly /= 3;
                    break;
                case "YEARLY":
                    monthly /= 12;
                    break;
            }
            return sum + monthly;
        }, 0);

        // Get previous month for trends
        const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEndOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const prevTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                transactionDate: { gte: prevStartOfMonth, lte: prevEndOfMonth },
            },
        });

        const prevIncome = prevTransactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
        const prevExpenses = prevTransactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);

        const financialData: FinancialData = {
            period: {
                month: now.toLocaleString("es-CL", { month: "long" }),
                year: now.getFullYear(),
            },
            totals: {
                income,
                expenses,
                balance: income - expenses,
            },
            categories,
            accounts: accounts.map((a) => ({
                name: a.name,
                balance: a.currentBalance,
                type: a.type,
            })),
            budgets: budgetsWithUsage,
            goals: goals.map((g) => ({
                name: g.name,
                target: g.targetAmount,
                current: g.currentAmount,
                percentage: (g.currentAmount / g.targetAmount) * 100,
            })),
            trends: {
                incomeChange: prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0,
                expenseChange: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0,
                savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
            },
            recurringExpenses: monthlyRecurring,
        };

        if (action === "question") {
            // Handle specific question
            const questionSchema = z.object({
                question: z.string().min(5).max(500),
            });

            const validation = questionSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json(
                    { error: "Pregunta inválida", details: validation.error.issues },
                    { status: 400 }
                );
            }

            const result = await askFinanceQuestion(validation.data.question, financialData);
            return NextResponse.json(result);
        }

        // Full analysis
        const result = await analyzeFinancesWithAI(financialData);
        return NextResponse.json({
            ...result,
            data: financialData,
        });
    } catch (error) {
        console.error("[AI Analysis] Error:", error);
        return NextResponse.json({ error: "Error al analizar" }, { status: 500 });
    }
}
