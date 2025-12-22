import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sanitizeInput } from "@/lib/security";
import { createAuditLog, AuditActions } from "@/lib/audit";

// Field limits for tools
const TOOL_FIELD_LIMITS = {
    name: 150,
    description: 1000,
    icon: 100,
    category: 50,
};

// GET: Get tool with detailed analytics
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user || !["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const tool = await prisma.tool.findUnique({
            where: { id },
        });

        if (!tool) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }

        // Get usage stats
        const [viewCount, useCount, downloadCount, errorCount] = await Promise.all([
            prisma.toolUsage.count({
                where: { toolId: id, action: "view" },
            }),
            prisma.toolUsage.count({
                where: { toolId: id, action: { in: ["use", "generate"] } },
            }),
            prisma.toolUsage.count({
                where: { toolId: id, action: "download" },
            }),
            prisma.toolUsage.count({
                where: { toolId: id, action: "error" },
            }),
        ]);

        // Get recent usage
        const recentUsage = await prisma.toolUsage.findMany({
            where: { toolId: id },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                action: true,
                device: true,
                browser: true,
                country: true,
                createdAt: true,
            },
        });

        // Get time-series data for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const usageByDay = await prisma.toolUsage.findMany({
            where: {
                toolId: id,
                createdAt: { gte: thirtyDaysAgo },
            },
            select: {
                action: true,
                createdAt: true,
            },
        });

        // Process into daily counts
        const dailyData: Record<string, { views: number; uses: number; downloads: number }> = {};
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split("T")[0];
            dailyData[key] = { views: 0, uses: 0, downloads: 0 };
        }

        for (const usage of usageByDay) {
            const dateKey = usage.createdAt.toISOString().split("T")[0];
            if (dailyData[dateKey]) {
                if (usage.action === "view") dailyData[dateKey].views++;
                else if (usage.action === "use" || usage.action === "generate") dailyData[dateKey].uses++;
                else if (usage.action === "download") dailyData[dateKey].downloads++;
            }
        }

        // Convert to sorted array
        const timeSeries = Object.entries(dailyData)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Get device distribution
        const deviceStats = await prisma.toolUsage.groupBy({
            by: ["device"],
            where: { toolId: id, device: { not: null } },
            _count: true,
        });

        // Get browser distribution
        const browserStats = await prisma.toolUsage.groupBy({
            by: ["browser"],
            where: { toolId: id, browser: { not: null } },
            _count: true,
        });

        // Get country distribution (top 10)
        const countryStats = await prisma.toolUsage.groupBy({
            by: ["country"],
            where: { toolId: id, country: { not: null } },
            _count: true,
            orderBy: { _count: { country: "desc" } },
            take: 10,
        });

        // Calculate conversion rate
        const conversionRate = viewCount > 0 ? ((useCount / viewCount) * 100).toFixed(1) : "0";

        // Get stats for last 7 days vs previous 7 days (for trend)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const [last7Days, prev7Days] = await Promise.all([
            prisma.toolUsage.count({
                where: { toolId: id, createdAt: { gte: sevenDaysAgo } },
            }),
            prisma.toolUsage.count({
                where: { toolId: id, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            }),
        ]);

        const trend = prev7Days > 0 ? Math.round(((last7Days - prev7Days) / prev7Days) * 100) : 0;

        return NextResponse.json({
            tool,
            stats: {
                views: viewCount,
                uses: useCount,
                downloads: downloadCount,
                errors: errorCount,
                conversionRate: parseFloat(conversionRate),
                trend,
                last7Days,
            },
            timeSeries,
            deviceStats: deviceStats.map((d) => ({ device: d.device || "unknown", count: d._count })),
            browserStats: browserStats.map((b) => ({ browser: b.browser || "unknown", count: b._count })),
            countryStats: countryStats.map((c) => ({ country: c.country || "unknown", count: c._count })),
            recentUsage,
        });
    } catch (error) {
        console.error("Error fetching tool:", error);
        return NextResponse.json(
            { error: "Error fetching tool" },
            { status: 500 }
        );
    }
}

// PATCH: Update tool
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user || !["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, description, icon, category, isPublic, isActive, sortOrder, config } = body;

        // SECURITY: Sanitize string inputs to prevent XSS
        const sanitizedData: Record<string, unknown> = {};

        if (name !== undefined) {
            sanitizedData.name = sanitizeInput(String(name).trim().slice(0, TOOL_FIELD_LIMITS.name));
        }
        if (description !== undefined) {
            sanitizedData.description = description
                ? sanitizeInput(String(description).trim().slice(0, TOOL_FIELD_LIMITS.description))
                : null;
        }
        if (icon !== undefined) {
            sanitizedData.icon = icon
                ? sanitizeInput(String(icon).trim().slice(0, TOOL_FIELD_LIMITS.icon))
                : null;
        }
        if (category !== undefined) {
            sanitizedData.category = category
                ? sanitizeInput(String(category).trim().slice(0, TOOL_FIELD_LIMITS.category))
                : null;
        }
        if (isPublic !== undefined) sanitizedData.isPublic = Boolean(isPublic);
        if (isActive !== undefined) sanitizedData.isActive = Boolean(isActive);
        if (sortOrder !== undefined) sanitizedData.sortOrder = Number(sortOrder) || 0;
        if (config !== undefined) sanitizedData.config = config;

        const tool = await prisma.tool.update({
            where: { id },
            data: sanitizedData,
        });

        // Audit log for updates
        await createAuditLog({
            action: AuditActions.TOOL_UPDATED,
            category: "tools",
            userId: session.user.id,
            targetId: tool.id,
            targetType: "tool",
            metadata: { name: tool.name, changes: Object.keys(sanitizedData) },
        });

        return NextResponse.json({ tool });
    } catch (error) {
        console.error("Error updating tool:", error);
        return NextResponse.json(
            { error: "Error updating tool" },
            { status: 500 }
        );
    }
}

// DELETE: Delete tool
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Get tool info before deletion for audit
        const tool = await prisma.tool.findUnique({ where: { id } });

        await prisma.tool.delete({
            where: { id },
        });

        // Audit log
        if (tool) {
            await createAuditLog({
                action: AuditActions.TOOL_DELETED,
                category: "tools",
                userId: session.user.id,
                targetId: id,
                targetType: "tool",
                metadata: { name: tool.name, slug: tool.slug },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting tool:", error);
        return NextResponse.json(
            { error: "Error deleting tool" },
            { status: 500 }
        );
    }
}
