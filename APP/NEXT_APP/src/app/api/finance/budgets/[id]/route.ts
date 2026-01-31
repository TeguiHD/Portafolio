import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateBudgetSchema = z.object({
    name: z.string().optional(),
    amount: z.number().positive().optional(),
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

        // Get transactions for this budget's period and category
        const whereClause: any = {
            userId: session.user.id,
            type: "EXPENSE",
            isDeleted: false,
            transactionDate: { gte: budget.periodStart, lte: budget.periodEnd },
        };

        if (budget.categoryId) {
            whereClause.categoryId = budget.categoryId;
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
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

        const body = await request.json();
        const data = updateBudgetSchema.parse(body);

        // Verify budget belongs to user
        const existing = await prisma.budget.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
        }

        const budget = await prisma.budget.update({
            where: { id },
            data,
            include: {
                category: { select: { id: true, name: true, icon: true, color: true } },
            },
        });

        return NextResponse.json({ data: budget });
    } catch (error) {
        console.error("Error updating budget:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
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
