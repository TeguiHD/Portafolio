import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { Role } from "@prisma/client";

// GET /api/finance/export - Export user's financial data
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canAccess = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
        if (!canAccess) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "json";
        const includeAccounts = searchParams.get("accounts") !== "false";
        const includeCategories = searchParams.get("categories") !== "false";
        const includeTransactions = searchParams.get("transactions") !== "false";
        const includeBudgets = searchParams.get("budgets") !== "false";
        const includeGoals = searchParams.get("goals") !== "false";
        const includeRecurring = searchParams.get("recurring") !== "false";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const userId = session.user.id;

        // Build date filter for transactions
        const dateFilter = {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
        };

        // Fetch all requested data
        const [accounts, categories, transactions, budgets, goals, recurring] = await Promise.all([
            includeAccounts
                ? prisma.financeAccount.findMany({
                      where: { userId },
                      include: { currency: { select: { code: true, symbol: true } } },
                  })
                : [],
            includeCategories
                ? prisma.financeCategory.findMany({
                      where: { OR: [{ userId }, { userId: null }] },
                  })
                : [],
            includeTransactions
                ? prisma.transaction.findMany({
                      where: {
                          userId,
                          ...(startDate || endDate ? { transactionDate: dateFilter } : {}),
                      },
                      include: {
                          category: { select: { name: true } },
                          account: { select: { name: true } },
                          currency: { select: { code: true } },
                      },
                      orderBy: { transactionDate: "desc" },
                  })
                : [],
            includeBudgets
                ? prisma.budget.findMany({
                      where: { userId },
                      include: { category: { select: { name: true } } },
                  })
                : [],
            includeGoals
                ? prisma.savingsGoal.findMany({
                      where: { userId },
                  })
                : [],
            includeRecurring
                ? prisma.recurringPayment.findMany({
                      where: { userId },
                      include: {
                          category: { select: { name: true } },
                      },
                  })
                : [],
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            version: "1.0",
            accounts: accounts.map((a) => ({
                name: a.name,
                type: a.type,
                currency: a.currency.code,
                initialBalance: a.initialBalance,
                currentBalance: a.currentBalance,
                color: a.color,
                icon: a.icon,
            })),
            categories: categories
                .filter((c) => c.userId !== null) // Only user's custom categories
                .map((c) => ({
                    name: c.name,
                    icon: c.icon,
                    color: c.color,
                    type: c.type,
                    keywords: c.keywords,
                })),
            transactions: transactions.map((t) => ({
                date: t.transactionDate.toISOString().split("T")[0],
                type: t.type,
                amount: t.amount,
                description: t.description,
                category: t.category?.name,
                account: t.account?.name,
                currency: t.currency?.code,
                merchant: t.merchant,
                notes: t.notes,
            })),
            budgets: budgets.map((b) => ({
                name: b.name,
                amount: b.amount,
                period: b.period,
                category: b.category?.name,
                periodStart: b.periodStart.toISOString().split("T")[0],
                periodEnd: b.periodEnd?.toISOString().split("T")[0],
            })),
            goals: goals.map((g) => ({
                name: g.name,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                deadline: g.deadline?.toISOString().split("T")[0],
                color: g.color,
                icon: g.icon,
            })),
            recurring: recurring.map((r) => ({
                name: r.name,
                amount: r.amount,
                frequency: r.frequency,
                dayOfMonth: r.dayOfMonth,
                category: r.category?.name,
                startDate: r.startDate.toISOString().split("T")[0],
                endDate: r.endDate?.toISOString().split("T")[0],
            })),
        };

        if (format === "csv") {
            // Convert transactions to CSV
            const csv = transactionsToCSV(exportData.transactions);
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="transacciones_${new Date().toISOString().split("T")[0]}.csv"`,
                },
            });
        }

        // JSON format
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="finanzas_${new Date().toISOString().split("T")[0]}.json"`,
            },
        });
    } catch (error) {
        console.error("[Export GET] Error:", error);
        return NextResponse.json({ error: "Error al exportar datos" }, { status: 500 });
    }
}

function transactionsToCSV(
    transactions: {
        date: string;
        type: string;
        amount: number;
        description: string | null;
        category: string | undefined;
        account: string | undefined;
        currency: string | undefined;
        merchant: string | null;
        notes: string | null;
    }[]
): string {
    const headers = ["Fecha", "Tipo", "Monto", "Descripción", "Categoría", "Cuenta", "Moneda", "Comercio", "Notas"];
    const rows = transactions.map((t) => [
        t.date,
        t.type === "INCOME" ? "Ingreso" : t.type === "EXPENSE" ? "Gasto" : "Transferencia",
        t.amount.toString(),
        escapeCSV(t.description || ""),
        escapeCSV(t.category || ""),
        escapeCSV(t.account || ""),
        t.currency || "CLP",
        escapeCSV(t.merchant || ""),
        escapeCSV(t.notes || ""),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
