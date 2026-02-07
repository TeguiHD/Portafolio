import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAuditLog, AuditActions, AuditCategory } from "@/lib/audit";

const PUBLIC_ALLOWED_ACTIONS = new Set<string>([AuditActions.LOGIN_FAILED]);
const MAX_METADATA_SIZE = 2_000;

/**
 * POST /api/audit/event
 * Records an audit event from the client side
 * Used for login/logout events that can't be logged server-side in Edge runtime
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const body = await request.json();
        const { action, category, metadata } = body;

        // Validate action
        const validActions = Object.values(AuditActions);
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Validate category
        const validCategories: AuditCategory[] = ["auth", "users", "security", "tools", "quotations", "system"];
        if (!validCategories.includes(category)) {
            return NextResponse.json({ error: "Invalid category" }, { status: 400 });
        }

        // Security: prevent unauthenticated forging of privileged audit events
        if (!session?.user?.id) {
            if (category !== "auth" || !PUBLIC_ALLOWED_ACTIONS.has(action)) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        // Guard against oversized metadata payloads (log flooding / storage abuse)
        if (metadata !== undefined) {
            const metadataSize = JSON.stringify(metadata).length;
            if (metadataSize > MAX_METADATA_SIZE) {
                return NextResponse.json({ error: "Metadata too large" }, { status: 400 });
            }
        }

        // Get client info
        const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";
        const userAgent = request.headers.get("user-agent") || undefined;

        await createAuditLog({
            action,
            category,
            userId: session?.user?.id || null,
            metadata: (metadata && typeof metadata === "object") ? metadata : {},
            ipAddress,
            userAgent,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Audit Event API] Error:", error);
        return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
    }
}
