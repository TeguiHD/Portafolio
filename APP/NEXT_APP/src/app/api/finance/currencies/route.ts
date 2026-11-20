import { NextResponse } from "next/server";
import { accesoFinanzas } from "../_lib/acceso";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - List all active currencies
export async function GET() {
    try {
        const acceso = await accesoFinanzas("finance.view");
        if (!acceso.ok) return acceso.respuesta;

        const currencies = await prisma.currency.findMany({
            where: { isActive: true },
            orderBy: [{ code: "asc" }],
            select: {
                id: true,
                code: true,
                name: true,
                symbol: true,
                decimals: true,
            },
        });

        return NextResponse.json({ data: currencies });
    } catch (error) {
        console.error("Error fetching currencies:", error);
        return NextResponse.json({ error: "Error al obtener monedas" }, { status: 500 });
    }
}
