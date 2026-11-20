import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from '@/generated/prisma/client';
import { categoriaUsable } from "../_lib/acceso";
import { fechasDelPeriodo } from "../_lib/presupuestos";

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

        // Por defecto solo activos; con includeInactive=true (o active=false) también los pausados, para poder reactivarlos.
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("includeInactive") !== "true" && searchParams.get("active") !== "false";

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
                const { start, end } = fechasDelPeriodo(budget.period);

                const whereClause: {
                    userId: string;
                    type: "EXPENSE";
                    isDeleted: boolean;
                    transactionDate: { gte: Date; lte: Date };
                    categoryId?: string;
                } = {
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

        const data = createBudgetSchema.parse(await request.json().catch(() => null));

        if (data.categoryId) {
            const categoria = await categoriaUsable(session.user.id, data.categoryId);
            if (!categoria || categoria.type !== "EXPENSE") {
                return NextResponse.json({ error: "La categoría no es válida" }, { status: 400 });
            }
        }

        // La base no admite dos presupuestos con la misma categoría y período, aunque uno esté pausado.
        const existing = await prisma.budget.findFirst({
            where: {
                userId: session.user.id,
                categoryId: data.categoryId || null,
                period: data.period,
            },
            select: { isActive: true },
        });

        if (existing) {
            return NextResponse.json(
                {
                    error: existing.isActive
                        ? "Ya existe un presupuesto activo para esta categoría y período"
                        : "Ya tienes un presupuesto pausado para esta categoría y período: reactívalo en «Pausados»",
                },
                { status: 400 }
            );
        }

        const { start, end } = fechasDelPeriodo(data.period);

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
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
    }
}
