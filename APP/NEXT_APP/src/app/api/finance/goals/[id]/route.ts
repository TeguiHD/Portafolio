import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, type Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateGoalSchema = z.object({
    name: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    targetAmount: z.number().positive().optional(),
    currentAmount: z.number().min(0).optional(),
    deadline: z.string().datetime().nullable().optional(),
    milestone25: z.boolean().optional(),
    milestone50: z.boolean().optional(),
    milestone75: z.boolean().optional(),
});

const contributeSchema = z.object({
    amount: z.number(),
    note: z.string().optional(),
});

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get single goal with details
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.goals.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const goal = await prisma.savingsGoal.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
        }

        // Calculate progress
        const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
        const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

        let requiredDaily = null;
        let requiredMonthly = null;
        if (daysLeft && daysLeft > 0 && remaining > 0) {
            requiredDaily = remaining / daysLeft;
            requiredMonthly = remaining / (daysLeft / 30);
        }

        // Get milestone notifications
        const milestones = [];
        if (percentage >= 25 && !goal.milestone25) milestones.push(25);
        if (percentage >= 50 && !goal.milestone50) milestones.push(50);
        if (percentage >= 75 && !goal.milestone75) milestones.push(75);

        return NextResponse.json({
            data: {
                ...goal,
                percentage: Math.min(100, Math.round(percentage * 100) / 100),
                remaining,
                daysLeft,
                requiredDaily: requiredDaily ? Math.round(requiredDaily * 100) / 100 : null,
                requiredMonthly: requiredMonthly ? Math.round(requiredMonthly * 100) / 100 : null,
                isOverdue: daysLeft !== null && daysLeft < 0 && !goal.completed,
                pendingMilestones: milestones,
            },
        });
    } catch (error) {
        console.error("Error fetching goal:", error);
        return NextResponse.json({ error: "Error al obtener meta" }, { status: 500 });
    }
}

// PUT - Update goal
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canEdit = await hasPermission(session.user.id, session.user.role as Role, "finance.goals.manage");
        if (!canEdit) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = updateGoalSchema.parse(body);

        // Verify goal belongs to user
        const existing = await prisma.savingsGoal.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
        }

        // Check if becomes completed
        const newCurrentAmount = data.currentAmount ?? existing.currentAmount;
        const newTargetAmount = data.targetAmount ?? existing.targetAmount;
        const completed = newCurrentAmount >= newTargetAmount;

        const goal = await prisma.savingsGoal.update({
            where: { id },
            data: {
                ...data,
                deadline: data.deadline !== undefined ? (data.deadline ? new Date(data.deadline) : null) : undefined,
                completed,
            },
        });

        return NextResponse.json({ data: goal });
    } catch (error) {
        console.error("Error updating goal:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al actualizar meta" }, { status: 500 });
    }
}

// PATCH - Add/subtract contribution to goal
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canEdit = await hasPermission(session.user.id, session.user.role as Role, "finance.goals.manage");
        if (!canEdit) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const { amount, note: _note } = contributeSchema.parse(body);

        // Verify goal belongs to user
        const existing = await prisma.savingsGoal.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
        }

        const newAmount = Math.max(0, existing.currentAmount + amount);
        const completed = newAmount >= existing.targetAmount;

        // Check for milestone achievements
        const oldPercentage = (existing.currentAmount / existing.targetAmount) * 100;
        const newPercentage = (newAmount / existing.targetAmount) * 100;

        const updates: Prisma.SavingsGoalUpdateInput = { currentAmount: newAmount, completed };

        // Mark milestones as achieved
        if (oldPercentage < 25 && newPercentage >= 25) updates.milestone25 = true;
        if (oldPercentage < 50 && newPercentage >= 50) updates.milestone50 = true;
        if (oldPercentage < 75 && newPercentage >= 75) updates.milestone75 = true;

        const goal = await prisma.savingsGoal.update({
            where: { id },
            data: updates,
        });

        // Determine which milestones were just reached
        const achievedMilestones = [];
        if (oldPercentage < 25 && newPercentage >= 25) achievedMilestones.push(25);
        if (oldPercentage < 50 && newPercentage >= 50) achievedMilestones.push(50);
        if (oldPercentage < 75 && newPercentage >= 75) achievedMilestones.push(75);
        if (!existing.completed && completed) achievedMilestones.push(100);

        return NextResponse.json({
            data: goal,
            meta: {
                previousAmount: existing.currentAmount,
                contribution: amount,
                newAmount,
                achievedMilestones,
                justCompleted: !existing.completed && completed,
            },
        });
    } catch (error) {
        console.error("Error contributing to goal:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al contribuir a la meta" }, { status: 500 });
    }
}

// DELETE - Delete goal
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const canDelete = await hasPermission(session.user.id, session.user.role as Role, "finance.goals.manage");
        if (!canDelete) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // Verify goal belongs to user
        const existing = await prisma.savingsGoal.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });
        }

        await prisma.savingsGoal.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting goal:", error);
        return NextResponse.json({ error: "Error al eliminar meta" }, { status: 500 });
    }
}
