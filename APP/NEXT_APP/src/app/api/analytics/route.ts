import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashIdentifier } from "@/lib/security.server";
import { checkRateLimit } from "@/lib/redis";
import { logger } from "@/lib/logger";

// Track page views and CTA clicks (public endpoint, rate-limited)
export async function POST(request: NextRequest) {
    try {
        const ipRaw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";

        // Rate limiting: 30 events/minute per IP (OWASP A04 — unrestricted resource consumption)
        const rateLimit = await checkRateLimit(`analytics:${ipRaw}`, 30, 60);
        if (!rateLimit.allowed) {
            return NextResponse.json({ success: true }); // Silent — don't expose rate limit info
        }

        const body = await request.json();
        const { type, action, path, label, metadata } = body;

        // Validate event type (whitelist)
        if (type !== "pageview" && type !== "cta") {
            return NextResponse.json({ success: true }); // Silent ignore
        }

        const userAgent = request.headers.get("user-agent") || undefined;
        const ip = ipRaw !== "unknown" ? hashIdentifier(ipRaw) : undefined;
        const referrer = request.headers.get("referer") || undefined;

        // Sanitize scalar string inputs — prevent large payload DB writes
        const safePath = typeof path === "string" ? path.slice(0, 500) : "/";
        const safeAction = typeof action === "string"
            ? action.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 100)
            : "unknown";
        const safeLabel = typeof label === "string" ? label.slice(0, 200) : undefined;

        // Sanitize metadata: only scalar values, max 10 keys, no nested objects
        // Prevents prototype pollution and oversized DB writes
        let safeMetadata: Record<string, string | number | boolean> | undefined;
        if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
            safeMetadata = {};
            const entries = Object.entries(metadata as Record<string, unknown>).slice(0, 10);
            for (const [k, v] of entries) {
                const safeKey = String(k).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);
                if (typeof v === "string") safeMetadata[safeKey] = v.slice(0, 200);
                else if (typeof v === "number" || typeof v === "boolean") safeMetadata[safeKey] = v;
            }
        }

        if (type === "pageview") {
            await prisma.pageView.create({
                data: {
                    path: safePath,
                    referrer,
                    userAgent,
                    ip,
                },
            });
        } else if (type === "cta") {
            await prisma.ctaClick.create({
                data: {
                    action: safeAction,
                    label: safeLabel,
                    metadata: safeMetadata,
                    referrer,
                    userAgent,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Analytics tracking error", error);
        return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }
}

// Get analytics data — admin only (OWASP A01: Broken Access Control)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            logger.warn("[Analytics] Unauthorized access attempt");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Analytics is site-wide data — restrict to ADMIN and SUPERADMIN roles
        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90); // cap at 90 days
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - days + 1);

        // Fetch raw data
        const [pageViewsRaw, ctaRaw, referrersRaw, pageViewsByDayRaw, quotationsTotal, recentQuotations, topPagesRaw] = await Promise.all([
            prisma.pageView.findMany({
                where: { createdAt: { gte: startDate } },
                orderBy: { createdAt: "asc" },
                select: { createdAt: true, ip: true, path: true, referrer: true },
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

        const topPages = topPagesRaw.map((page) => ({
            path: page.path || "/",
            visits: page._count,
        }));

        const recentEvents = [
            ...pageViewsRaw.slice(-5).map((p) => {
                const pageName = p.path === "/" ? "Inicio"
                    : p.path?.startsWith("/herramientas") ? "Herramientas"
                    : p.path?.startsWith("/blog") ? "Blog"
                    : p.path?.startsWith("/privacidad") ? "Privacidad"
                    : p.path?.startsWith("/terminos") ? "Términos"
                    : p.path || "Página";
                const source = p.referrer
                    ? (() => { try { return new URL(p.referrer).hostname; } catch { return "enlace externo"; } })()
                    : null;
                return {
                    type: "page_view" as const,
                    message: `Nueva visita en ${pageName}${source ? ` desde ${source}` : ""}`,
                    createdAt: p.createdAt,
                };
            }),
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
