import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";

// PATCH: Update incident (mark as resolved)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission
        const canResolve = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "security.incidents.resolve"
        );

        if (!canResolve) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { resolved, resolution } = body;

        // Update incident
        const incident = await prisma.securityIncident.update({
            where: { id },
            data: {
                resolved: resolved ?? true,
                resolvedAt: resolved ? new Date() : null,
                resolvedBy: session.user.id,
                resolution,
            },
        });

        return NextResponse.json({ incident });
    } catch (error) {
        console.error("Error updating security incident:", error);
        return NextResponse.json(
            { error: "Error updating incident" },
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission - only users with security.incidents.delete can delete
        const canDelete = await hasPermission(
            session.user.id,
            session.user.role as Role,
            "security.incidents.delete"
        );

        if (!canDelete) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        await prisma.securityIncident.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting security incident:", error);
        return NextResponse.json(
            { error: "Error deleting incident" },
            { status: 500 }
        );
    }
}
