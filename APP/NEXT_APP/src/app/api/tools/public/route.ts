import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List all public active tools
export async function GET() {
    try {
        const tools = await prisma.tool.findMany({
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
            },
        });

        return NextResponse.json({ tools });
    } catch (error) {
        console.error("Error fetching public tools:", error);
        return NextResponse.json(
            { error: "Error fetching tools" },
            { status: 500 }
        );
    }
}
