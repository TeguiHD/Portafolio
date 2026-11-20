import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, type Role } from '@/generated/prisma/client';
import { categoriaUsable } from "../../_lib/acceso";
import { fechasDelPeriodo } from "../../_lib/presupuestos";

export const dynamic = "force-dynamic";

// Lo mismo que el formulario permite editar (antes la categoría y el período se descartaban en silencio).
const updateBudgetSchema = z.object({
    name: z.string().trim().max(120).optional(),
    categoryId: z.string().min(1).nullable().optional(),
    period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
    amount: z.number().finite().positive().optional(),
    alertAt75: z.boolean().optional(),
    alertAt90: z.boolean().optional(),
    alertAt100: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get single budget with details
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.budgets.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const budget = await prisma.budget.findFirst({
            where: { id, userId: session.user.id },
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
                alerts: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });

        if (!budget) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }

        // Período en curso (las fechas guardadas son las de cuando se creó y quedan viejas).
        const { start, end } = fechasDelPeriodo(budget.period);
        const whereClause: Prisma.TransactionWhereInput = {
            userId: session.user.id,
            type: "EXPENSE",
            isDeleted: false,
            transactionDate: { gte: start, lte: end },
        };

        if (budget.categoryId) {
            whereClause.categoryId = budget.categoryId;
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            select: {
                id: true,
                amount: true,
                description: true,
                merchant: true,
                transactionDate: true,
                category: { select: { name: true, icon: true } },
            },
            orderBy: { transactionDate: "desc" },
            take: 20,
        });

        const spending = await prisma.transaction.aggregate({
            where: whereClause,
            _sum: { amount: true },
            _count: true,
        });

        const currentSpent = spending._sum.amount || 0;
        const percentage = budget.amount > 0 ? (currentSpent / budget.amount) * 100 : 0;

        return NextResponse.json({
            data: {
                ...budget,
                periodStart: start,
                periodEnd: end,
                currentSpent,
                percentage: Math.round(percentage * 100) / 100,
                remaining: Math.max(0, budget.amount - currentSpent),
                transactionCount: spending._count,
                recentTransactions: transactions,
            },
        });
    } catch (error) {
        console.error("Error fetching budget:", error);
        return NextResponse.json({ error: "Error al obtener presupuesto" }, { status: 500 });
    }
}

// PUT - Update budget
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canEdit = await hasPermission(session.user.id, session.user.role as Role, "finance.budgets.manage");
        if (!canEdit) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const data = updateBudgetSchema.parse(await request.json().catch(() => null));

        // Verify budget belongs to user
        const existing = await prisma.budget.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }

        const cambios: Prisma.BudgetUncheckedUpdateInput = {};
        if (data.name !== undefined) cambios.name = data.name || null;
        if (data.amount !== undefined) cambios.amount = data.amount;
        if (data.alertAt75 !== undefined) cambios.alertAt75 = data.alertAt75;
        if (data.alertAt90 !== undefined) cambios.alertAt90 = data.alertAt90;
        if (data.alertAt100 !== undefined) cambios.alertAt100 = data.alertAt100;
        if (data.isActive !== undefined) cambios.isActive = data.isActive;

        const categoryId = data.categoryId !== undefined ? data.categoryId : existing.categoryId;
        const period = data.period ?? existing.period;
        if (categoryId !== existing.categoryId || period !== existing.period) {
            if (categoryId && categoryId !== existing.categoryId) {
                const categoria = await categoriaUsable(session.user.id, categoryId);
                if (!categoria || categoria.type !== "EXPENSE") {
                    return NextResponse.json({ error: "La categoría no es válida" }, { status: 400 });
                }
            }
            // Misma regla que al crear: una categoría y un período por presupuesto, contando los pausados.
            const choca = await prisma.budget.findFirst({
                where: { userId: session.user.id, categoryId, period, NOT: { id } },
                select: { isActive: true },
            });
            if (choca) {
                return NextResponse.json(
                    {
                        error: choca.isActive
                            ? "Ya existe un presupuesto activo para esta categoría y período"
                            : "Ya tienes un presupuesto pausado para esta categoría y período",
                    },
                    { status: 400 }
                );
            }
            cambios.categoryId = categoryId;
            if (period !== existing.period) {
                const { start, end } = fechasDelPeriodo(period);
                cambios.period = period;
                cambios.periodStart = start;
                cambios.periodEnd = end;
            }
        }

        const budget = await prisma.budget.update({
            where: { id },
            data: cambios,
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        return NextResponse.json({ data: budget });
    } catch (error) {
        console.error("Error updating budget:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al actualizar presupuesto" }, { status: 500 });
    }
}

// DELETE - Delete budget
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canDelete = await hasPermission(session.user.id, session.user.role as Role, "finance.budgets.manage");
        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // Verify budget belongs to user
        const existing = await prisma.budget.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }

        // Delete associated alerts first, then budget
        await prisma.$transaction([
            prisma.budgetAlert.deleteMany({ where: { budgetId: id } }),
            prisma.budget.delete({ where: { id } }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting budget:", error);
        return NextResponse.json({ error: "Error al eliminar presupuesto" }, { status: 500 });
    }
}
