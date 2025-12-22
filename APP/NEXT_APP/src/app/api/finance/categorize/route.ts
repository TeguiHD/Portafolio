import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { categorizeTransaction, batchCategorize } from "@/services/auto-categorization";

// POST /api/finance/categorize
// Auto-categorize a transaction or batch of transactions
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();

        // Single transaction
        if (body.description) {
            const result = await categorizeTransaction(
                {
                    description: body.description,
                    amount: body.amount || 0,
                    type: body.type || "expense",
                    merchantName: body.merchantName,
                },
                userId
            );

            return NextResponse.json({
                success: true,
                data: result,
            });
        }

        // Batch categorization
        if (body.transactions && Array.isArray(body.transactions)) {
            const results = await batchCategorize(body.transactions, userId);

            return NextResponse.json({
                success: true,
                data: results,
            });
        }

        return NextResponse.json(
            { error: "Se requiere description o transactions[]" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error categorizing:", error);
        return NextResponse.json(
            { error: "Error al categorizar transacción" },
            { status: 500 }
        );
    }
}
