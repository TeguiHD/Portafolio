import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SecuritySeverity } from "@prisma/client";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";

// GET: List security incidents with filters
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission
        const canView = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "security.incidents.view"
        );

        if (!canView) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const severity = searchParams.get("severity") as SecuritySeverity | null;
        const type = searchParams.get("type");
        const resolved = searchParams.get("resolved");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Build where clause
        const where: Record<string, unknown> = {};

        if (severity) where.severity = severity;
        if (type) where.type = type;
        if (resolved !== null && resolved !== "") {
            where.resolved = resolved === "true";
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
            if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate + "T23:59:59");
        }

        // Get incidents
        const [incidents, total] = await Promise.all([
            prisma.securityIncident.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.securityIncident.count({ where }),
        ]);

        return NextResponse.json({
            incidents,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Error fetching security incidents:", error);
        return NextResponse.json(
            { error: "Error fetching incidents" },
            { status: 500 }
        );
    }
}

// POST: Create a new security incident (internal use)
export async function POST(request: NextRequest) {
    try {
        // This endpoint is for internal use - verify with internal secret
        const authHeader = request.headers.get("x-internal-secret");
        const internalSecret = process.env.ENCRYPTION_KEY;

        // Allow if internal secret matches OR if called from server context
        if (authHeader !== internalSecret) {
            // Check if admin session exists as fallback
            const session = await auth();
            const userRole = (session?.user as { role?: string })?.role;

            if (!session?.user || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        const body = await request.json();
        const { type, severity, ipHash, path, userAgent, userId, details } = body;

        // Validate required fields
        if (!type || !ipHash) {
            return NextResponse.json(
                { error: "Missing required fields: type, ipHash" },
                { status: 400 }
            );
        }

        // Create incident
        const incident = await prisma.securityIncident.create({
            data: {
                type,
                severity: severity || "MEDIUM",
                ipHash,
                path,
                userAgent,
                userId,
                details,
            },
        });

        return NextResponse.json({ incident }, { status: 201 });
    } catch (error) {
        console.error("Error creating security incident:", error);
        return NextResponse.json(
            { error: "Error creating incident" },
            { status: 500 }
        );
    }
}
