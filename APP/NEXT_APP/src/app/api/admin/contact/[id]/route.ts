import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { createAuditLog } from "@/lib/audit";
import type { Role } from '@/generated/prisma/client';
import { mensajeLegible, textoContacto } from "@/modules/admin/texto-contacto";

const REQUIRED_PERMISSION = "contact.manage";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // 1. Authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // 2. Permission check
        const userRole = (session.user.role || "USER") as Role;
        const canAccess = await hasPermission(session.user.id, userRole, REQUIRED_PERMISSION);
        if (!canAccess && userRole !== "SUPERADMIN") {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // 3. Get message
        const message = await prisma.contactMessage.findUnique({
            where: { id },
        });

        if (!message) {
            return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
        }

        // 4. Mark as read if unread
        if (message.status === "UNREAD") {
            await prisma.contactMessage.update({
                where: { id },
                data: { status: "READ" },
            });
        }

        return NextResponse.json(mensajeLegible(message));

    } catch (error) {
        console.error("[Admin Contact] Get error:", error);
        return NextResponse.json(
            { error: "Error al cargar mensaje" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // 1. Authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // 2. Permission check
        const userRole = (session.user.role || "USER") as Role;
        const canAccess = await hasPermission(session.user.id, userRole, REQUIRED_PERMISSION);
        if (!canAccess && userRole !== "SUPERADMIN") {
            return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
        }

        // 3. Get existing message
        const existing = await prisma.contactMessage.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
        }

        // 4. Parse body
        const body = await request.json();
        const { status, priority, response, isSpam } = body;

        // 5. Build update data
        const updateData: Record<string, unknown> = {};

        if (status && ["UNREAD", "READ", "RESPONDED", "ARCHIVED", "SPAM"].includes(status)) {
            updateData.status = status;
        }

        if (priority && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) {
            updateData.priority = priority;
        }

        if (typeof isSpam === "boolean") {
            updateData.isSpam = isSpam;
            if (isSpam) {
                updateData.status = "SPAM";
            } else if (existing.status === "SPAM") {
                // «No es spam»: vuelve a la bandeja como leído (antes quedaba con estado Spam para siempre).
                updateData.status = "READ";
            }
        }

        if (response !== undefined) {
            if (response !== null && typeof response !== "string") {
                return NextResponse.json({ error: "Respuesta no válida" }, { status: 400 });
            }
            // Texto tal cual (React escapa al mostrar); antes se guardaba escapado y se veía «&#x2F;» en la respuesta.
            updateData.response = response ? response.trim().slice(0, 5000) : null;
            if (response) {
                updateData.status = "RESPONDED";
                updateData.respondedBy = session.user.id;
                updateData.respondedAt = new Date();
            }
        }

        // 6. Update message
        const updated = await prisma.contactMessage.update({
            where: { id },
            data: updateData,
        });

        // 7. Audit log
        await createAuditLog({
            action: response ? "contact.responded" : "contact.updated",
            category: "system",
            userId: session.user.id,
            targetId: id,
            targetType: "contact",
            metadata: {
                changes: Object.keys(updateData),
                email: textoContacto(existing.email),
            },
        });

        return NextResponse.json(mensajeLegible(updated));

    } catch (error) {
        console.error("[Admin Contact] Update error:", error);
        return NextResponse.json(
            { error: "Error al actualizar mensaje" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // 1. Authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // 2. Permission check - SUPERADMIN only for delete
        if (session.user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Solo SUPERADMIN puede eliminar" }, { status: 403 });
        }

        // 3. Get message for audit
        const message = await prisma.contactMessage.findUnique({
            where: { id },
            select: { email: true },
        });

        if (!message) {
            return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
        }

        // 4. Delete
        await prisma.contactMessage.delete({
            where: { id },
        });

        // 5. Audit log
        await createAuditLog({
            action: "contact.deleted",
            category: "system",
            userId: session.user.id,
            targetId: id,
            targetType: "contact",
            metadata: { email: textoContacto(message.email) },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Admin Contact] Delete error:", error);
        return NextResponse.json(
            { error: "Error al eliminar mensaje" },
            { status: 500 }
        );
    }
}
