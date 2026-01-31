import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/redis";

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
    try {
        const { slug } = await params;

        // SECURITY: Validate slug format (prevent injection)
        if (!slug || !/^[a-z0-9-]+$/.test(slug) || slug.length > 50) {
            return NextResponse.json({ error: "Invalid tool identifier" }, { status: 400 });
        }

        // SECURITY: Rate limiting check
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for") || "unknown";
        const { allowed, resetIn } = await checkRateLimit(
            `tool_access:${hashIP(ip)}`,
            30, // 30 requests per minute
            60
        );

        if (!allowed) {
            return NextResponse.json(
                { error: "Too many requests" },
                { status: 429, headers: { "Retry-After": resetIn.toString() } }
            );
        }

        const tool = await prisma.tool.findUnique({
            where: { slug },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                icon: true,
                category: true,
                config: true,
                isPublic: true,
                isActive: true,
            },
        });

        // SECURITY CRITICAL: If tool is NOT in DB, block access by default
        // Only explicitly registered tools are allowed
        if (!tool) {
            // Log potential probe attempt
            console.warn(`[SECURITY] Tool probe attempt: ${slug} from IP: ${hashIP(ip)}`);
            return NextResponse.json(
                { error: "Tool not found", allowed: false },
                { status: 404 }
            );
        }

        // SECURITY: Disabled tools are completely blocked
        if (!tool.isActive) {
            return NextResponse.json(
                { error: "Tool is currently unavailable", allowed: false },
                { status: 410 }
            );
        }

        // SECURITY: Non-public tools require admin authentication
        if (!tool.isPublic) {
            const session = await auth();

            // No session = unauthorized
            if (!session?.user) {
                return NextResponse.json(
                    { error: "Authentication required", allowed: false },
                    { status: 401 }
                );
            }

            // SECURITY: Verify admin role (not just any logged-in user)
            const userRole = (session.user as { role?: string })?.role;
            if (userRole !== "admin" && userRole !== "ADMIN") {
                // Log potential privilege escalation attempt
                console.warn(`[SECURITY] Unauthorized tool access attempt: ${slug} by user: ${session.user.email}`);
                return NextResponse.json(
                    { error: "Insufficient permissions", allowed: false },
                    { status: 403 }
                );
            }
        }

        // Tool is accessible - return with explicit allowed flag
        return NextResponse.json({
            tool,
            allowed: true,
            accessLevel: tool.isPublic ? "public" : "admin"
        });
    } catch (error) {
        console.error("Error fetching tool:", error);
        // SECURITY: On any error, block access (fail-closed)
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
