import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - List all active currencies
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

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
