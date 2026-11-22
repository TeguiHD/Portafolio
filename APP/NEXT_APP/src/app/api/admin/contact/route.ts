import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';
import { escapadoViejo, mensajeLegible } from "@/modules/admin/texto-contacto";

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
        const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
        const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20") || 20), 100);
        const status = searchParams.get("status");
        const priority = searchParams.get("priority");
        const search = searchParams.get("search")?.trim().slice(0, 200);
        const showSpam = searchParams.get("showSpam") === "true";

        // 4. Build where clause
        const where: Record<string, unknown> = {};

        if (status && ["UNREAD", "READ", "RESPONDED", "ARCHIVED", "SPAM"].includes(status)) {
            where.status = status;
        }

        if (priority && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) {
            where.priority = priority;
        }

        if (!showSpam) {
            where.isSpam = false;
        }

        if (search) {
            // Los mensajes viejos están guardados escapados («https:&#x2F;&#x2F;…»): se busca también esa forma.
            const formas = Array.from(new Set([search, escapadoViejo(search)]));
            where.OR = formas.flatMap((texto) => [
                { email: { contains: texto, mode: "insensitive" } },
                { name: { contains: texto, mode: "insensitive" } },
                { message: { contains: texto, mode: "insensitive" } },
            ]);
        }

        // 5. Fetch messages + counts en paralelo (3 → 1 ronda de I/O)
        const [messages, total, unreadCount] = await Promise.all([
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
                    spamReason: true,
                    origen: true,
                    createdAt: true,
                    respondedAt: true,
                    // Sin esto, al abrir un mensaje ya respondido la respuesta guardada no aparecía.
                    response: true,
                },
            }),
            prisma.contactMessage.count({ where }),
            prisma.contactMessage.count({ where: { status: "UNREAD", isSpam: false } }),
        ]);

        return NextResponse.json({
            messages: messages.map(mensajeLegible),
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
