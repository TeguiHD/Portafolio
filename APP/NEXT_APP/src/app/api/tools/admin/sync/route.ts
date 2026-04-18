import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TOOL_SEEDS } from "@/lib/tool-registry";

const ALL_TOOLS = DEFAULT_TOOL_SEEDS;

// POST: Sync tools - inserts any missing tools from the hardcoded list
export async function POST() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const results = {
            created: [] as string[],
            existing: [] as string[],
            errors: [] as string[],
        };

        for (const tool of ALL_TOOLS) {
            try {
                const existing = await prisma.tool.findUnique({
                    where: { slug: tool.slug },
                });

                if (existing) {
                    results.existing.push(tool.slug);
                } else {
                    await prisma.tool.create({ data: tool });
                    results.created.push(tool.slug);
                }
            } catch (error) {
                console.error(`Error syncing tool ${tool.slug}:`, error);
                results.errors.push(tool.slug);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${results.created.length} tools`,
            ...results,
        });
    } catch (error) {
        console.error("Error syncing tools:", error);
        return NextResponse.json({ error: "Error syncing tools" }, { status: 500 });
    }
}
