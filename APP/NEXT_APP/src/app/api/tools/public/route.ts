import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergePublicToolCatalog } from "@/lib/tool-registry";

// GET: List all public active tools
export async function GET() {
    try {
        const dbTools = await prisma.tool.findMany({
            where: {
                isPublic: true,
                isActive: true,
            },
            orderBy: {
                sortOrder: "asc",
            },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                icon: true,
                category: true,
                sortOrder: true,
            },
        });

        return NextResponse.json({
            tools: mergePublicToolCatalog(dbTools),
            source: "database",
            degradedPublicAccess: false,
        });
    } catch (error) {
        console.error("Error fetching public tools:", error);

        return NextResponse.json({
            tools: mergePublicToolCatalog(),
            source: "registry-fallback",
            degradedPublicAccess: true,
            degradedReason: "database_unavailable",
        });
    }
}
