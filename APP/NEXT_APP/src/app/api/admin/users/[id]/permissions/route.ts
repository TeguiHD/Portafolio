import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getUserPermissionsForUI, grantPermission, revokePermission, resetPermission } from "@/lib/permission-check";
import { createAuditLog, AuditActions } from "@/lib/audit";

// GET - Get user's permissions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SUPERADMIN can view other users' permissions
        const { id: targetUserId } = await params;
        const canManageOthers = await hasPermission(
            session.user.id,
            session.user.role,
            "users.permissions.edit"
        );

        if (targetUserId !== session.user.id && !canManageOthers) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get target user
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, role: true, name: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get permissions with status
        const permissions = await getUserPermissionsForUI(targetUserId, targetUser.role);

        return NextResponse.json({
            userId: targetUserId,
            userName: targetUser.name,
            role: targetUser.role,
            permissions,
        });
    } catch (error) {
        console.error("[Permissions API] GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch permissions" },
            { status: 500 }
        );
    }
}

// PATCH - Update user permission
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: targetUserId } = await params;

        // Get target user to check their role
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { role: true, name: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // SUPERADMIN permissions CANNOT be modified by anyone
        if (targetUser.role === "SUPERADMIN") {
            return NextResponse.json(
                { error: "Los permisos de SUPERADMIN no pueden ser modificados" },
                { status: 403 }
            );
        }

        // Check if current user can edit permissions
        const isSuperAdmin = session.user.role === "SUPERADMIN";
        const isAdmin = session.user.role === "ADMIN";

        // SUPERADMIN can edit anyone (except other SUPERADMIN)
        // ADMIN can only edit MODERATOR and USER
        const canEdit = isSuperAdmin ||
            (isAdmin && (targetUser.role === "MODERATOR" || targetUser.role === "USER"));

        if (!canEdit) {
            return NextResponse.json(
                { error: "No tienes permiso para modificar los permisos de este usuario" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { permissionCode, action } = body as {
            permissionCode: string;
            action: "grant" | "revoke" | "reset";
        };

        if (!permissionCode || !action) {
            return NextResponse.json(
                { error: "permissionCode and action are required" },
                { status: 400 }
            );
        }

        // Prevent modifying own critical permissions
        if (targetUserId === session.user.id && permissionCode === "users.permissions.edit") {
            return NextResponse.json(
                { error: "Cannot modify your own permission management access" },
                { status: 400 }
            );
        }

        // Apply the action
        switch (action) {
            case "grant":
                await grantPermission(targetUserId, permissionCode);
                await createAuditLog({
                    action: AuditActions.PERMISSION_GRANTED,
                    category: "security",
                    userId: session.user.id,
                    targetId: targetUserId,
                    targetType: "user",
                    metadata: { permissionCode },
                });
                break;
            case "revoke":
                await revokePermission(targetUserId, permissionCode);
                await createAuditLog({
                    action: AuditActions.PERMISSION_REVOKED,
                    category: "security",
                    userId: session.user.id,
                    targetId: targetUserId,
                    targetType: "user",
                    metadata: { permissionCode },
                });
                break;
            case "reset":
                await resetPermission(targetUserId, permissionCode);
                await createAuditLog({
                    action: AuditActions.PERMISSION_RESET,
                    category: "security",
                    userId: session.user.id,
                    targetId: targetUserId,
                    targetType: "user",
                    metadata: { permissionCode },
                });
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid action. Use 'grant', 'revoke', or 'reset'" },
                    { status: 400 }
                );
        }

        // Reuse targetUser from earlier - already has role
        const updatedPermissions = await getUserPermissionsForUI(targetUserId, targetUser.role);

        return NextResponse.json({
            success: true,
            permissions: updatedPermissions,
        });
    } catch (error) {
        console.error("[Permissions API] PATCH error:", error);
        return NextResponse.json(
            { error: "Failed to update permission" },
            { status: 500 }
        );
    }
}
