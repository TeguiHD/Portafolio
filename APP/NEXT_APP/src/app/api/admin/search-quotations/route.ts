import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const session = await auth();

    // Only superadmin can use this endpoint
    if (session?.user?.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Search clients
        const clients = await prisma.quotationClient.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { slug: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { user: { name: { contains: query, mode: "insensitive" } } },
                    { user: { email: { contains: query, mode: "insensitive" } } },
                ]
            },
            include: {
                user: { select: { name: true, email: true } }
            },
            take: 5,
        });

        // Search quotations
        const quotations = await prisma.quotation.findMany({
            where: {
                OR: [
                    { folio: { contains: query, mode: "insensitive" } },
                    { projectName: { contains: query, mode: "insensitive" } },
                    { clientName: { contains: query, mode: "insensitive" } },
                ]
            },
            include: {
                client: true,
                user: { select: { name: true, email: true } }
            },
            take: 5,
        });

        const results = [
            ...clients.map((c) => ({
                type: "client" as const,
                id: c.id,
                name: c.name,
                subtitle: `Usuario: ${c.user?.name || c.user?.email || "Desconocido"} • /${c.slug}`,
                link: `/admin/cotizaciones/${c.id}`,
            })),
            ...quotations.map((q) => ({
                type: "quotation" as const,
                id: q.id,
                name: `#${q.folio} - ${q.projectName}`,
                subtitle: `Cliente: ${q.clientName} • Usuario: ${q.user?.name || q.user?.email || "Desconocido"}`,
                link: q.clientId ? `/admin/cotizaciones/${q.clientId}` : `/admin/quotations/${q.id}`,
            })),
        ];

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json({ error: "Error de búsqueda" }, { status: 500 });
    }
}
