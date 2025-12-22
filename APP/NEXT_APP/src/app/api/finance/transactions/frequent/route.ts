import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/finance/transactions/frequent
// Returns frequently used transactions for quick-add feature
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;

        // Get transactions from last 90 days grouped by description/category/amount
        const frequentTransactions = await prisma.$queryRaw<
            Array<{
                description: string;
                amount: number;
                type: string;
                categoryId: string;
                categoryName: string;
                categoryIcon: string | null;
                accountId: string;
                accountName: string;
                frequency: bigint;
                lastUsed: Date;
            }>
        >`
            SELECT 
                t."description",
                CAST(t."amount" AS FLOAT) as amount,
                t."type",
                t."categoryId",
                c."name" as "categoryName",
                c."icon" as "categoryIcon",
                t."accountId",
                a."name" as "accountName",
                COUNT(*) as frequency,
                MAX(t."transactionDate") as "lastUsed"
            FROM "Transaction" t
            LEFT JOIN "FinanceCategory" c ON t."categoryId" = c."id"
            LEFT JOIN "FinanceAccount" a ON t."accountId" = a."id"
            WHERE t."userId" = ${userId}
              AND t."transactionDate" > NOW() - INTERVAL '90 days'
              AND t."isDeleted" = false
            GROUP BY 
                t."description", 
                t."amount", 
                t."type", 
                t."categoryId", 
                c."name", 
                c."icon",
                t."accountId", 
                a."name"
            HAVING COUNT(*) >= 2
            ORDER BY COUNT(*) DESC, MAX(t."transactionDate") DESC
            LIMIT 10
        `;

        // Format response
        const formatted = frequentTransactions.map((t, index) => ({
            id: `freq-${index}`,
            description: t.description,
            amount: t.amount,
            type: t.type as "income" | "expense",
            categoryId: t.categoryId,
            categoryName: t.categoryName,
            categoryIcon: t.categoryIcon,
            accountId: t.accountId,
            accountName: t.accountName,
            frequency: Number(t.frequency),
            lastUsed: t.lastUsed.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data: formatted,
        });
    } catch (error) {
        console.error("Error fetching frequent transactions:", error);
        return NextResponse.json(
            { error: "Error al obtener transacciones frecuentes" },
            { status: 500 }
        );
    }
}
