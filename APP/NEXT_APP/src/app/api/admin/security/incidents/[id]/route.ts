import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';

// PATCH: Update incident (mark as resolved)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Check permission
        const canResolve = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "security.incidents.resolve"
        );

        if (!canResolve) {
            return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json().catch(() => null);
        const { resolved, resolution } = (body ?? {}) as { resolved?: unknown; resolution?: unknown };
        if (resolved !== undefined && typeof resolved !== "boolean") {
            return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
        }
        if (resolution !== undefined && resolution !== null && typeof resolution !== "string") {
            return NextResponse.json({ error: "Notas no válidas" }, { status: 400 });
        }
        // Sin «resolved» se marca resuelto (antes la fecha quedaba vacía en ese caso aunque el incidente quedara resuelto).
        const resuelto = resolved ?? true;

        const existe = await prisma.securityIncident.findUnique({ where: { id }, select: { id: true } });
        if (!existe) {
            return NextResponse.json({ error: "Incidente no encontrado" }, { status: 404 });
        }

        const incident = await prisma.securityIncident.update({
            where: { id },
            data: {
                resolved: resuelto,
                resolvedAt: resuelto ? new Date() : null,
                resolvedBy: resuelto ? session.user.id : null,
                resolution: typeof resolution === "string" ? resolution.trim().slice(0, 2000) || null : null,
            },
        });

        return NextResponse.json({ incident });
    } catch (error) {
        console.error("Error updating security incident:", error);
        return NextResponse.json(
            { error: "No se pudo actualizar el incidente" },
            { status: 500 }
        );
    }
}

// DELETE: Delete an incident (superadmin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Check permission - only users with security.incidents.delete can delete
        const canDelete = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "security.incidents.delete"
        );

        if (!canDelete) {
            return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
        }

        const { id } = await params;

        await prisma.securityIncident.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting security incident:", error);
        return NextResponse.json(
            { error: "No se pudo eliminar el incidente" },
            { status: 500 }
        );
    }
}
