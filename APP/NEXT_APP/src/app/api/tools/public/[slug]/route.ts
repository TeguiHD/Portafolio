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

// GET: Get tool info by slug (auth required if tool is not public)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

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

        if (!tool) {
            // If tool is not in DB yet, allow access so default tools keep working
            return NextResponse.json({ tool: null, allowed: true, isPublic: true, isActive: true });
        }

        if (!tool.isActive) {
            return NextResponse.json({ error: "Tool disabled" }, { status: 410 });
        }

        if (!tool.isPublic) {
            const session = await auth();
            if (!session?.user) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        return NextResponse.json({ tool });
    } catch (error) {
        console.error("Error fetching tool:", error);
        return NextResponse.json(
            { error: "Error fetching tool" },
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
