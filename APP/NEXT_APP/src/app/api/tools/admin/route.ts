import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminForApi } from "@/lib/auth/dal";
import { sanitizeInput } from "@/lib/security";
import { createAuditLog, AuditActions } from "@/lib/audit";

// Field limits for tools
const TOOL_FIELD_LIMITS = {
    slug: 100,
    name: 150,
    description: 1000,
    icon: 100,
    category: 50,
};

// GET: List all tools (admin only)
export async function GET() {
    try {
        // DAL pattern: Verify admin access
        const session = await verifyAdminForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tools = await prisma.tool.findMany({
            orderBy: { sortOrder: "asc" },
            include: {
                _count: {
                    select: { usages: true },
                },
            },
        });

        // Uso por herramienta y acción en UNA consulta agrupada (antes eran 3 count por herramienta: ~90 consultas contra
        // un pool de 5 conexiones).
        const grupos = await prisma.toolUsage.groupBy({ by: ["toolId", "action"], _count: { _all: true } });
        const cuenta = (toolId: string, acciones: string[]) => grupos.filter((g) => g.toolId === toolId && acciones.includes(g.action)).reduce((s, g) => s + g._count._all, 0);
        const toolsWithStats = await Promise.all(
            tools.map(async (tool) => {
                const [viewCount, useCount, downloadCount] = [cuenta(tool.id, ["view"]), cuenta(tool.id, ["use", "generate"]), cuenta(tool.id, ["download"])];

                return {
                    ...tool,
                    stats: {
                        views: viewCount,
                        uses: useCount,
                        downloads: downloadCount,
                        total: tool._count.usages,
                    },
                };
            })
        );

        return NextResponse.json({ tools: toolsWithStats });
    } catch (error) {
        console.error("Error fetching tools:", error);
        return NextResponse.json(
            { error: "Error fetching tools" },
            { status: 500 }
        );
    }
}

// POST: Create a new tool (admin only)
export async function POST(request: NextRequest) {
    try {
        // DAL pattern: Verify admin access
        const session = await verifyAdminForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { slug, name, description, icon, category, isPublic, config } = body;

        // Validate required fields
        if (!slug || !name) {
            return NextResponse.json(
                { error: "slug and name are required" },
                { status: 400 }
            );
        }

        // SECURITY: Sanitize all string inputs to prevent XSS
        const sanitizedSlug = sanitizeInput(String(slug).trim().slice(0, TOOL_FIELD_LIMITS.slug));
        const sanitizedName = sanitizeInput(String(name).trim().slice(0, TOOL_FIELD_LIMITS.name));
        const sanitizedDescription = description
            ? sanitizeInput(String(description).trim().slice(0, TOOL_FIELD_LIMITS.description))
            : null;
        const sanitizedIcon = icon
            ? sanitizeInput(String(icon).trim().slice(0, TOOL_FIELD_LIMITS.icon))
            : null;
        const sanitizedCategory = category
            ? sanitizeInput(String(category).trim().slice(0, TOOL_FIELD_LIMITS.category))
            : null;

        // Check if slug already exists
        const existing = await prisma.tool.findUnique({
            where: { slug: sanitizedSlug },
        });
        if (existing) {
            return NextResponse.json(
                { error: "A tool with this slug already exists" },
                { status: 409 }
            );
        }

        // Get max sortOrder
        const maxOrder = await prisma.tool.aggregate({
            _max: { sortOrder: true },
        });

        const tool = await prisma.tool.create({
            data: {
                slug: sanitizedSlug,
                name: sanitizedName,
                description: sanitizedDescription,
                icon: sanitizedIcon,
                category: sanitizedCategory,
                isPublic: isPublic ?? false,
                sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
                config,
            },
        });

        // Audit log
        await createAuditLog({
            action: AuditActions.TOOL_CREATED,
            category: "tools",
            userId: session.user.id,
            targetId: tool.id,
            targetType: "tool",
            metadata: { name: tool.name, slug: tool.slug },
        });

        return NextResponse.json({ tool }, { status: 201 });
    } catch (error) {
        console.error("Error creating tool:", error);
        return NextResponse.json(
            { error: "Error creating tool" },
            { status: 500 }
        );
    }
}
