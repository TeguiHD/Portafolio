import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/redis";
import { getDefaultToolBySlug } from "@/lib/tool-registry";
import { resolveToolAccess } from "@/lib/tool-access.server";

function buildToolPayload(tool: {
    id?: string;
    slug: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    category?: string | null;
    config?: unknown;
    isPublic: boolean;
    isActive: boolean;
}) {
    const fallbackTool = getDefaultToolBySlug(tool.slug);

    return {
        id: tool.id || tool.slug,
        slug: tool.slug,
        name: tool.name,
        description: tool.description ?? fallbackTool?.description ?? "",
        icon: tool.icon ?? fallbackTool?.icon ?? "default",
        category: tool.category ?? fallbackTool?.category ?? "utility",
        config: tool.config ?? null,
        isPublic: tool.isPublic,
        isActive: tool.isActive,
    };
}

function buildPublicResponse(
    tool: Parameters<typeof buildToolPayload>[0],
    options?: { source?: string; degradedReason?: string | null }
) {
    return NextResponse.json({
        tool: buildToolPayload(tool),
        allowed: true,
        accessLevel: "public",
        source: options?.source || "database",
        degradedPublicAccess: Boolean(options?.degradedReason),
        degradedReason: options?.degradedReason || null,
    });
}

// Helper to get device type from user agent
function getDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return "mobile";
    if (/tablet|ipad/i.test(userAgent)) return "tablet";
    return "desktop";
}

// Helper to get browser name from user agent
function getBrowserName(userAgent: string): string {
    if (/firefox/i.test(userAgent)) return "Firefox";
    if (/edg/i.test(userAgent)) return "Edge";
    if (/chrome/i.test(userAgent)) return "Chrome";
    if (/safari/i.test(userAgent)) return "Safari";
    if (/opera|opr/i.test(userAgent)) return "Opera";
    return "Other";
}

// Helper to hash IP for privacy
function hashIP(ip: string): string {
    return createHash("sha256").update(ip + "salt-for-privacy").digest("hex").substring(0, 16);
}

// GET: Get tool info by slug (SECURITY HARDENED - fail-closed approach)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    let slug = "";
    let ip = "unknown";

    try {
        ({ slug } = await params);
        const fallbackTool = getDefaultToolBySlug(slug);
        const hasPublicFallback = Boolean(fallbackTool?.isPublic && fallbackTool.isActive);

        // SECURITY: Validate slug format (prevent injection)
        if (!slug || !/^[a-z0-9-]+$/.test(slug) || slug.length > 50) {
            return NextResponse.json({ error: "Invalid tool identifier" }, { status: 400 });
        }

        const headersList = await headers();
        ip = headersList.get("x-forwarded-for") || "unknown";

        let degradedReason: string | null = null;

        try {
            const { allowed } = await checkRateLimit(
                `tool_access:${hashIP(ip)}`,
                30,
                60
            );

            if (!allowed) {
                degradedReason = "rate_limit";
            }
        } catch (rateLimitError) {
            console.warn("Public tool rate-limit check degraded:", rateLimitError);
            degradedReason = "rate_limiter_unavailable";
        }

        // La decisión vive en resolveToolAccess: es la misma que usa el layout
        // de cada herramienta para pintar en el primer render. Aquí solo se
        // combina con el rate-limit y se le da forma HTTP.
        const decision = await resolveToolAccess(slug);
        const reason = degradedReason ?? decision.degradedReason;

        switch (decision.status) {
            case 400:
                return NextResponse.json({ error: "Invalid tool identifier" }, { status: 400 });
            case 404:
                // Log potential probe attempt
                console.warn(`[SECURITY] Tool probe attempt: ${slug} from IP: ${hashIP(ip)}`);
                return NextResponse.json({ error: "Tool not found", allowed: false }, { status: 404 });
            case 410:
                // SECURITY: Disabled tools are completely blocked
                return NextResponse.json({ error: "Tool is currently unavailable", allowed: false }, { status: 410 });
            case 401:
                return NextResponse.json({ error: "Authentication required", allowed: false }, { status: 401 });
            case 403:
                return NextResponse.json({ error: "Insufficient permissions", allowed: false }, { status: 403 });
            case 500:
                return NextResponse.json({ error: "Access verification failed", allowed: false }, { status: 500 });
        }

        if (decision.accessType === "admin_only") {
            return NextResponse.json({
                tool: decision.tool,
                allowed: true,
                accessLevel: "admin",
                degradedPublicAccess: Boolean(reason),
                degradedReason: reason,
            });
        }

        const source =
            decision.source === "registry-failsafe"
                ? decision.source
                : reason
                    ? decision.source.startsWith("registry") ? "registry-degraded" : "database-degraded"
                    : decision.source;

        return buildPublicResponse(decision.tool!, { source, degradedReason: reason });
    } catch (error) {
        console.error("Error fetching tool:", error);

        const fallbackTool = getDefaultToolBySlug(slug);
        if (fallbackTool?.isPublic && fallbackTool.isActive) {
            return buildPublicResponse(
                {
                    ...fallbackTool,
                    config: null,
                },
                {
                    source: "registry-failsafe",
                    degradedReason: "verification_error",
                }
            );
        }

        return NextResponse.json(
            { error: "Access verification failed", allowed: false },
            { status: 500 }
        );
    }
}

// POST: Track tool usage
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const { action, metadata } = body;

        // Validate action
        const validActions = ["view", "use", "generate", "download", "complete", "error", "security_incident"];
        if (!validActions.includes(action)) {
            return NextResponse.json(
                { error: "Invalid action" },
                { status: 400 }
            );
        }

        // Get tool by slug (works even if DB doesn't have the tool yet)
        let tool;
        try {
            tool = await prisma.tool.findUnique({
                where: { slug },
            });
        } catch {
            // Ignore DB errors (e.g. table missing)
        }

        // If tool exists in DB, check permissions
        if (tool) {
            if (!tool.isActive) {
                return NextResponse.json({ error: "Tool disabled" }, { status: 410 });
            }
            if (!tool.isPublic) {
                const session = await auth();
                if (!session?.user) {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                }
            }
        } else {
            // If tool not in DB, we allow tracking for now
            return NextResponse.json({ success: true, tracked: false });
        }

        const headersList = await headers();
        const userAgent = headersList.get("user-agent") || "unknown";
        const ip = headersList.get("x-forwarded-for") || "unknown";

        // Security: Rate Limit (20 requests per minute per IP for tracking)
        // This prevents spamming usage stats
        const { allowed, resetIn } = await checkRateLimit(
            `tool_stats:${hashIP(ip)}`,
            20,
            60
        );

        if (!allowed) {
            return NextResponse.json(
                { error: "Too many requests" },
                { status: 429, headers: { "Retry-After": resetIn.toString() } }
            );
        }

        // Create usage record
        await prisma.toolUsage.create({
            data: {
                toolId: tool.id,
                action,
                metadata: metadata || {},
                ip: hashIP(ip),
                userAgent,
                browser: getBrowserName(userAgent),
                device: getDeviceType(userAgent),
                country: headersList.get("x-vercel-ip-country") || null,
            },
        });

        return NextResponse.json({ success: true, tracked: true });
    } catch (error) {
        console.error("Error tracking tool usage:", error);
        // Don't fail the request if tracking fails
        return NextResponse.json({ success: true, tracked: false });
    }
}
