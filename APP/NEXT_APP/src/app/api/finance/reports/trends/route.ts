import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - Yearly trends and comparison
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
        const months = parseInt(searchParams.get("months") || "12"); // Last N months

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months + 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                isDeleted: false,
                transactionDate: { gte: startDate, lte: endDate },
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
            orderBy: { transactionDate: "asc" },
        });

        // Group by month
        const monthlyData = new Map<string, { income: number; expenses: number; balance: number; count: number }>();

        // Initialize all months
        const current = new Date(startDate);
        while (current <= endDate) {
            const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
            monthlyData.set(key, { income: 0, expenses: 0, balance: 0, count: 0 });
            current.setMonth(current.getMonth() + 1);
        }

        // Aggregate transactions
        transactions.forEach((t) => {
            const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, "0")}`;
            const month = monthlyData.get(key);
            if (month) {
                if (t.type === "INCOME") {
                    month.income += t.amount;
                } else {
                    month.expenses += t.amount;
                }
                month.balance = month.income - month.expenses;
                month.count += 1;
            }
        });

        // Convert to array with month names
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const trendData = Array.from(monthlyData.entries()).map(([key, data]) => {
            const [y, m] = key.split("-").map(Number);
            return {
                key,
                year: y,
                month: m,
                monthName: monthNames[m - 1],
                label: `${monthNames[m - 1]} ${y}`,
                ...data,
            };
        });

        // Category trends over time
        const categoryTrends = new Map<string, Map<string, number>>();
        transactions
            .filter((t) => t.type === "EXPENSE")
            .forEach((t) => {
                const monthKey = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, "0")}`;
                const catId = t.categoryId || "uncategorized";

                if (!categoryTrends.has(catId)) {
                    categoryTrends.set(catId, new Map());
                }
                const catMonth = categoryTrends.get(catId)!;
                catMonth.set(monthKey, (catMonth.get(monthKey) || 0) + t.amount);
            });

        // Get category info
        const categoryIds = Array.from(categoryTrends.keys()).filter((id) => id !== "uncategorized");
        const categories = await prisma.financeCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, icon: true, color: true },
        });

        const categoryMap = new Map(categories.map((c: { id: string; name: string; icon: string; color: string | null }) => [c.id, c]));

        // Format category trends
        const categoryTrendData = Array.from(categoryTrends.entries())
            .map(([catId, monthData]) => {
                const category =
                    categoryMap.get(catId) || { id: "uncategorized", name: "Sin categoría", icon: "❓", color: "#6B7280" };
                const data = Array.from(monthlyData.keys()).map((monthKey) => ({
                    month: monthKey,
                    amount: monthData.get(monthKey) || 0,
                }));
                const total = data.reduce((sum, d) => sum + d.amount, 0);
                return { category, data, total };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 8); // Top 8 categories

        // Calculate averages and totals
        const totalIncome = trendData.reduce((sum, m) => sum + m.income, 0);
        const totalExpenses = trendData.reduce((sum, m) => sum + m.expenses, 0);
        const avgIncome = totalIncome / trendData.length;
        const avgExpenses = totalExpenses / trendData.length;
        const avgBalance = avgIncome - avgExpenses;

        // Find best and worst months
        const sortedByBalance = [...trendData].sort((a, b) => b.balance - a.balance);
        const bestMonth = sortedByBalance[0];
        const worstMonth = sortedByBalance[sortedByBalance.length - 1];

        // Savings rate trend
        const savingsRateTrend = trendData.map((m) => ({
            month: m.key,
            label: m.label,
            rate: m.income > 0 ? Math.round(((m.income - m.expenses) / m.income) * 100) : 0,
        }));

        // Year-over-year comparison (if we have data)
        const currentYearData = trendData.filter((m) => m.year === year);
        const prevYearData = trendData.filter((m) => m.year === year - 1);

        let yoyComparison = null;
        if (prevYearData.length > 0 && currentYearData.length > 0) {
            const currentTotal = currentYearData.reduce((sum, m) => sum + m.expenses, 0);
            const prevTotal = prevYearData.reduce((sum, m) => sum + m.expenses, 0);
            yoyComparison = {
                currentYear: year,
                currentTotal,
                prevYear: year - 1,
                prevTotal,
                change: prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0,
            };
        }

        return NextResponse.json({
            data: {
                period: { startDate, endDate, months },
                trendData,
                categoryTrends: categoryTrendData,
                savingsRateTrend,
                summary: {
                    totalIncome,
                    totalExpenses,
                    totalBalance: totalIncome - totalExpenses,
                    avgIncome: Math.round(avgIncome),
                    avgExpenses: Math.round(avgExpenses),
                    avgBalance: Math.round(avgBalance),
                    avgSavingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
                },
                highlights: {
                    bestMonth: bestMonth
                        ? { label: bestMonth.label, balance: bestMonth.balance }
                        : null,
                    worstMonth: worstMonth
                        ? { label: worstMonth.label, balance: worstMonth.balance }
                        : null,
                },
                yoyComparison,
            },
        });
    } catch (error) {
        console.error("Error generating trends:", error);
        return NextResponse.json({ error: "Error al generar tendencias" }, { status: 500 });
    }
}
