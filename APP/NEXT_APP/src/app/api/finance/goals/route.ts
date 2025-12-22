import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const createGoalSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    icon: z.string().optional(),
    color: z.string().optional(),
    targetAmount: z.number().positive("El monto objetivo debe ser positivo"),
    currentAmount: z.number().min(0).default(0),
    deadline: z.string().datetime().optional(),
    milestone25: z.boolean().default(false),
    milestone50: z.boolean().default(false),
    milestone75: z.boolean().default(false),
    accountId: z.string().optional(), // Account to link for auto-tracking
});

// GET - List savings goals
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canView = await hasPermission(session.user.id, session.user.role as Role, "finance.goals.view");
        if (!canView) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const includeCompleted = searchParams.get("includeCompleted") === "true";

        const whereClause: any = { userId: session.user.id };
        if (!includeCompleted) {
            whereClause.completed = false;
        }

        const goals = await prisma.savingsGoal.findMany({
            where: whereClause,
            orderBy: [{ completed: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
        });

        // Calculate progress for each goal
        const goalsWithProgress = goals.map((goal) => {
            const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

            // Calculate required daily/monthly saving if deadline exists
            let requiredDaily = null;
            let requiredMonthly = null;
            if (daysLeft && daysLeft > 0 && remaining > 0) {
                requiredDaily = remaining / daysLeft;
                requiredMonthly = remaining / (daysLeft / 30);
            }

            return {
                ...goal,
                percentage: Math.min(100, Math.round(percentage * 100) / 100),
                remaining,
                daysLeft,
                requiredDaily: requiredDaily ? Math.round(requiredDaily * 100) / 100 : null,
                requiredMonthly: requiredMonthly ? Math.round(requiredMonthly * 100) / 100 : null,
                isOverdue: daysLeft !== null && daysLeft < 0 && !goal.completed,
            };
        });

        // Summary stats
        const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
        const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
        const activeGoals = goals.filter((g) => !g.completed).length;
        const completedGoals = goals.filter((g) => g.completed).length;

        return NextResponse.json({
            data: goalsWithProgress,
            meta: {
                total: goals.length,
                active: activeGoals,
                completed: completedGoals,
                totalTarget,
                totalSaved,
                overallProgress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
            },
        });
    } catch (error) {
        console.error("Error fetching goals:", error);
        return NextResponse.json({ error: "Error al obtener metas" }, { status: 500 });
    }
}

// POST - Create savings goal
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const canCreate = await hasPermission(session.user.id, session.user.role as Role, "finance.goals.manage");
        if (!canCreate) {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        const body = await request.json();
        const data = createGoalSchema.parse(body);

        // Check if completed based on initial amount
        const completed = data.currentAmount >= data.targetAmount;

        const goal = await prisma.savingsGoal.create({
            data: {
                userId: session.user.id,
                name: data.name,
                icon: data.icon || "🎯",
                color: data.color || "#3B82F6",
                targetAmount: data.targetAmount,
                currentAmount: data.currentAmount,
                deadline: data.deadline ? new Date(data.deadline) : null,
                milestone25: data.milestone25,
                milestone50: data.milestone50,
                milestone75: data.milestone75,
                completed,
            },
        });

        return NextResponse.json({ data: goal }, { status: 201 });
    } catch (error) {
        console.error("Error creating goal:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Error al crear meta" }, { status: 500 });
    }
}
