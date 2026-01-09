import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";

// Only SUPERADMIN can access contact messages
const REQUIRED_PERMISSION = "contact.manage";

export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // 2. Permission check - SUPERADMIN only
        const userRole = (session.user.role || "USER") as Role;
        const canAccess = await hasPermission(session.user.id, userRole, REQUIRED_PERMISSION);
        if (!canAccess && userRole !== "SUPERADMIN") {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // 3. Parse query params
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
        const status = searchParams.get("status");
        const priority = searchParams.get("priority");
        const search = searchParams.get("search");
        const showSpam = searchParams.get("showSpam") === "true";

        // 4. Build where clause
        const where: Record<string, unknown> = {};

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (!showSpam) {
            where.isSpam = false;
        }

        if (search) {
            where.OR = [
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { message: { contains: search, mode: "insensitive" } },
            ];
        }

        // 5. Fetch messages with pagination
        const [messages, total] = await Promise.all([
            prisma.contactMessage.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    message: true,
                    status: true,
                    priority: true,
                    isSpam: true,
                    spamScore: true,
                    createdAt: true,
                    respondedAt: true,
                },
            }),
            prisma.contactMessage.count({ where }),
        ]);

        // 6. Get unread count
        const unreadCount = await prisma.contactMessage.count({
            where: { status: "UNREAD", isSpam: false },
        });

        return NextResponse.json({
            messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            unreadCount,
        });

    } catch (error) {
        console.error("[Admin Contact] List error:", error);
        return NextResponse.json(
            { error: "Error al cargar mensajes" },
            { status: 500 }
        );
    }
}
