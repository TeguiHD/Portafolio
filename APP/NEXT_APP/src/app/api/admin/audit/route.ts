import { NextRequest, NextResponse } from "next/server";
import { verifySessionForApi } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import { getAuditLogs, AuditCategory } from "@/lib/audit";

/**
 * GET /api/admin/audit
 * Fetch audit logs with pagination and filters
 * Requires: audit.view permission (SUPERADMIN by default)
 */
export async function GET(request: NextRequest) {
    try {
        // DAL pattern: Verify session close to data access
        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission
        const canView = await hasPermission(
            session.user.id,
            session.user.role,
            "audit.view"
        );

        if (!canView) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
        const category = searchParams.get("category") as AuditCategory | null;
        const action = searchParams.get("action") || undefined;
        const userId = searchParams.get("userId") || undefined;
        const startDate = searchParams.get("startDate")
            ? new Date(searchParams.get("startDate")!)
            : undefined;
        const endDate = searchParams.get("endDate")
            ? new Date(searchParams.get("endDate")!)
            : undefined;

        const result = await getAuditLogs({
            page,
            limit,
            category: category || undefined,
            action,
            userId,
            startDate,
            endDate,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Audit API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}
