import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/finance/onboarding/status
// Check if user has completed finance onboarding
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;

        // Check if user has at least one account
        const accountCount = await prisma.financeAccount.count({
            where: { userId },
        });

        // Check if user has any transactions
        const transactionCount = await prisma.transaction.count({
            where: { userId },
            take: 1,
        });

        // User has completed onboarding if they have at least one account
        const onboardingCompleted = accountCount > 0;

        return NextResponse.json({
            success: true,
            completed: onboardingCompleted,
            hasAccounts: accountCount > 0,
            hasTransactions: transactionCount > 0,
            accountCount,
        });
    } catch (error) {
        console.error("Error checking onboarding status:", error);
        return NextResponse.json(
            { error: "Error al verificar estado de onboarding" },
            { status: 500 }
        );
    }
}
