import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashIdentifier } from "@/lib/security.server";

// Track page views and CTA clicks (public)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, action, path, label, metadata } = body;

        const userAgent = request.headers.get("user-agent") || undefined;
        const ipRaw = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || undefined;
        const ip = ipRaw ? hashIdentifier(ipRaw) : undefined;
        const referrer = request.headers.get("referer") || undefined;

        if (type === "pageview") {
            await prisma.pageView.create({
                data: {
                    path: path || "/",
                    referrer,
                    userAgent,
                    ip,
                },
            });
        } else if (type === "cta") {
            await prisma.ctaClick.create({
                data: {
                    action: action || "unknown",
                    label,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
                    referrer,
                    userAgent,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Analytics tracking error:", error);
        return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }
}

// Get analytics data (auth required)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.log("[Analytics] No session or user ID found");
            return NextResponse.json({ error: "Unauthorized", details: "No valid session" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get("days") || "7", 10);
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - days + 1);

        // Fetch raw data
        const [pageViewsRaw, ctaRaw, referrersRaw, pageViewsByDayRaw, quotationsTotal, recentQuotations, topPagesRaw] = await Promise.all([
            prisma.pageView.findMany({
                where: { createdAt: { gte: startDate } },
                orderBy: { createdAt: "asc" },
                select: { createdAt: true, ip: true },
            }),
            prisma.ctaClick.findMany({
                where: { createdAt: { gte: startDate } },
                orderBy: { createdAt: "asc" },
                select: { action: true, createdAt: true, label: true },
            }),
            prisma.pageView.groupBy({
                by: ["referrer"],
                where: { createdAt: { gte: startDate }, referrer: { not: null } },
                _count: true,
                orderBy: { _count: { referrer: "desc" } },
                take: 5,
            }),
            prisma.pageView.findMany({
                where: { createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
            prisma.quotation.count({ where: { userId: session.user.id } }),
            prisma.quotation.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
            prisma.pageView.groupBy({
                by: ["path"],
                where: { createdAt: { gte: startDate } },
                _count: true,
                orderBy: { _count: { path: "desc" } },
                take: 10,
            }),
        ]);

        // Aggregations
        const pageViews = pageViewsRaw.length;
        const uniqueVisitors = new Set(pageViewsRaw.map((p) => p.ip || "unknown")).size;

        const ctaClicks = ctaRaw.reduce<Record<string, number>>((acc, click) => {
            const key = click.action || "unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        // Page views per day (last N days, fill zeros)
        const dayBuckets = Array.from({ length: days }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            d.setHours(0, 0, 0, 0);
            return d;
        });

        const pvByDayCount = pageViewsByDayRaw.reduce<Record<string, number>>((acc, item) => {
            const key = item.createdAt.toISOString().slice(0, 10);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const pageViewsByDay = dayBuckets.map((dateObj) => {
            const key = dateObj.toISOString().slice(0, 10);
            return {
                date: key,
                label: dateObj.toLocaleDateString("es-CL", { weekday: "short" }),
                views: pvByDayCount[key] || 0,
            };
        });

        const topReferrers = referrersRaw.map((ref) => ({
            source: ref.referrer || "Directo",
            visits: ref._count,
        }));

        // Top pages by visits
        const topPages = topPagesRaw.map((page) => ({
            path: page.path || "/",
            visits: page._count,
        }));

        const recentEvents = [
            ...pageViewsRaw.slice(-5).map((p) => ({
                type: "page_view" as const,
                message: `Nueva visita (${p.ip || "IP desconocida"})`,
                createdAt: p.createdAt,
            })),
            ...ctaRaw.slice(-5).map((c) => ({
                type: "cta" as const,
                message: `CTA: ${c.action}${c.label ? ` (${c.label})` : ""}`,
                createdAt: c.createdAt,
            })),
            ...recentQuotations.map((q) => ({
                type: "quotation" as const,
                message: `Cotización ${q.folio || q.id} (${q.status})`,
                createdAt: q.createdAt,
            })),
        ]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 10);

        return NextResponse.json({
            pageViews,
            uniqueVisitors,
            pageViewsByDay,
            ctaClicks,
            topReferrers,
            topPages,
            quotationsTotal,
            recentEvents,
        });
    } catch (error) {
        console.error("Analytics fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
