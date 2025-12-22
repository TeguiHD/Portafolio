import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role, BudgetPeriod } from "@prisma/client";

export const dynamic = "force-dynamic";

const createBudgetSchema = z.object({
    name: z.string().optional(),
    categoryId: z.string().nullable().optional(),
    amount: z.number().positive("El monto debe ser positivo"),
    period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
    alertAt75: z.boolean().default(true),
    alertAt90: z.boolean().default(true),
    alertAt100: z.boolean().default(true),
});

// Helper: Calculate period dates
function getPeriodDates(period: BudgetPeriod): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
        case "WEEKLY":
            const dayOfWeek = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case "MONTHLY":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case "QUARTERLY":
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
            break;
        case "YEARLY":
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
    }

    return { start, end };
}

// GET - List user budgets with current spending
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.budgets.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") !== "false";

        const budgets = await prisma.budget.findMany({
            where: {
                userId: session.user.id,
                ...(activeOnly && { isActive: true }),
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
                alerts: {
                    where: { status: "ACTIVE" },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        });

        // Calculate current spending for each budget
        const budgetsWithSpending = await Promise.all(
            budgets.map(async (budget) => {
                const { start, end } = getPeriodDates(budget.period);
                
                const whereClause: any = {
                    userId: session.user.id,
                    type: "EXPENSE",
                    isDeleted: false,
                    transactionDate: { gte: start, lte: end },
                };

                // If category-specific budget, filter by category
                if (budget.categoryId) {
                    whereClause.categoryId = budget.categoryId;
                }

                const spending = await prisma.transaction.aggregate({
                    where: whereClause,
                    _sum: { amount: true },
                });

                const currentSpent = spending._sum.amount || 0;
                const percentage = budget.amount > 0 ? (currentSpent / budget.amount) * 100 : 0;

                // Determine status
                let status: "ok" | "warning" | "danger" | "exceeded" = "ok";
                if (percentage >= 100) status = "exceeded";
                else if (percentage >= 90) status = "danger";
                else if (percentage >= 75) status = "warning";

                return {
                    ...budget,
                    currentSpent,
                    percentage: Math.round(percentage * 100) / 100,
                    remaining: Math.max(0, budget.amount - currentSpent),
                    status,
                    periodStart: start,
                    periodEnd: end,
                };
            })
        );

        return NextResponse.json({ data: budgetsWithSpending });
    } catch (error) {
        console.error("Error fetching budgets:", error);
        return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
    }
}

// POST - Create new budget
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canCreate = await hasPermission(session.user.id, session.user.role as Role, "finance.budgets.manage");
        if (!canCreate) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = createBudgetSchema.parse(body);

        // Check for existing budget with same category and period
        const existing = await prisma.budget.findFirst({
            where: {
                userId: session.user.id,
                categoryId: data.categoryId || null,
                period: data.period,
                isActive: true,
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Ya existe un presupuesto activo para esta categoría y período" },
                { status: 400 }
            );
        }

        const { start, end } = getPeriodDates(data.period);

        const budget = await prisma.budget.create({
            data: {
                userId: session.user.id,
                name: data.name,
                categoryId: data.categoryId || null,
                amount: data.amount,
                period: data.period,
                alertAt75: data.alertAt75,
                alertAt90: data.alertAt90,
                alertAt100: data.alertAt100,
                periodStart: start,
                periodEnd: end,
            },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        return NextResponse.json({ data: budget }, { status: 201 });
    } catch (error) {
        console.error("Error creating budget:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
    }
}
