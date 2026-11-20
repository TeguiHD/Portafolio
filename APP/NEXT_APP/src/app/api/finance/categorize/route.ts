import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { categorizeTransaction, batchCategorize } from "@/services/auto-categorization";
import { accesoFinanzas } from "../_lib/acceso";

const movimientoSchema = z.object({
    description: z.string().trim().min(1).max(500),
    amount: z.number().finite().default(0),
    type: z.enum(["income", "expense"]).default("expense"),
    merchantName: z.string().max(200).optional(),
});

// Uno solo o un lote acotado (cada uno consulta la base).
const cuerpoSchema = z.union([
    movimientoSchema,
    z.object({ transactions: z.array(movimientoSchema).min(1).max(100) }),
]);

// POST /api/finance/categorize
// Auto-categorize a transaction or batch of transactions
export async function POST(request: NextRequest) {
    try {
        const acceso = await accesoFinanzas("finance.view");
        if (!acceso.ok) return acceso.respuesta;

        const cuerpo = cuerpoSchema.safeParse(await request.json().catch(() => null));
        if (!cuerpo.success) {
            return NextResponse.json({ error: "Se requiere description o transactions[]" }, { status: 400 });
        }

        if ("transactions" in cuerpo.data) {
            const results = await batchCategorize(cuerpo.data.transactions, acceso.userId);
            return NextResponse.json({ success: true, data: results });
        }

        const result = await categorizeTransaction(cuerpo.data, acceso.userId);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("Error categorizing:", error);
        return NextResponse.json(
            { error: "Error al categorizar transacción" },
            { status: 500 }
        );
    }
}
