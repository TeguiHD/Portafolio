/**
 * API: User Activity (Paginated Audit Logs)
 * GET /api/user/activity?page=1&limit=15
 * 
 * Security: Requires authenticated session
 * Compliance: NIST SP 800-53 AU-3 (Audit event review)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 15;

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
        const skip = (page - 1) * limit;

        const [activities, totalCount] = await Promise.all([
            prisma.auditLog.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    action: true,
                    metadata: true,
                    ipAddress: true,
                    createdAt: true,
                },
            }),
            prisma.auditLog.count({
                where: { userId: session.user.id },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: activities.map((a) => ({
                id: a.id,
                action: a.action,
                details: typeof a.metadata === "string" ? a.metadata : JSON.stringify(a.metadata),
                createdAt: a.createdAt.toISOString(),
            })),
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + limit < totalCount,
            },
        });
    } catch (error) {
        console.error("[Activity API] Error:", error);
        return NextResponse.json(
            { error: "Error al obtener actividad" },
            { status: 500 }
        );
    }
}
