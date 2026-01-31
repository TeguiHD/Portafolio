import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/finance/onboarding/complete
// Mark finance onboarding as complete and create default categories
export async function POST(_request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;

        // Create default categories if they don't exist
        const existingCategories = await prisma.financeCategory.count({
            where: { userId },
        });

        if (existingCategories === 0) {
            // Create default expense categories
            const defaultExpenseCategories = [
                { name: "Alimentación", icon: "🍔", color: "#F59E0B", type: "EXPENSE" as const },
                { name: "Transporte", icon: "🚌", color: "#3B82F6", type: "EXPENSE" as const },
                { name: "Entretenimiento", icon: "🎬", color: "#8B5CF6", type: "EXPENSE" as const },
                { name: "Salud", icon: "💊", color: "#EF4444", type: "EXPENSE" as const },
                { name: "Educación", icon: "📚", color: "#10B981", type: "EXPENSE" as const },
                { name: "Hogar", icon: "🏠", color: "#6366F1", type: "EXPENSE" as const },
                { name: "Servicios", icon: "⚡", color: "#F97316", type: "EXPENSE" as const },
                { name: "Otros", icon: "📦", color: "#6B7280", type: "EXPENSE" as const },
            ];

            // Create default income categories
            const defaultIncomeCategories = [
                { name: "Salario", icon: "💰", color: "#10B981", type: "INCOME" as const },
                { name: "Freelance", icon: "💻", color: "#3B82F6", type: "INCOME" as const },
                { name: "Inversiones", icon: "📈", color: "#8B5CF6", type: "INCOME" as const },
                { name: "Otros ingresos", icon: "✨", color: "#6B7280", type: "INCOME" as const },
            ];

            await prisma.financeCategory.createMany({
                data: [...defaultExpenseCategories, ...defaultIncomeCategories].map((cat) => ({
                    ...cat,
                    userId,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            message: "Onboarding completado",
        });
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return NextResponse.json(
            { error: "Error al completar onboarding" },
            { status: 500 }
        );
    }
}
