import { NextResponse } from "next/server";
import { verifyAdminForApi, verifySuperAdminForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { hashPassword, encryptEmail, decryptEmail } from "@/lib/security.server";
import { NotificationHelpers } from "@/lib/notificationService";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET() {
    // DAL pattern: Verify admin access close to data access
    const session = await verifyAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                emailEncrypted: true,
                role: true,
                isActive: true,
                avatar: true,
                createdAt: true,
                _count: {
                    select: {
                        quotations: true,
                        sessions: true,
                    }
                },
                deletionStatus: true,
                deletionScheduledAt: true,
            },
            orderBy: { createdAt: "desc" }
        });

        const safeUsers = users.map(user => ({
            ...user,
            email: user.emailEncrypted ? decryptEmail(user.emailEncrypted) : user.email,
            emailEncrypted: undefined
        }));

        return NextResponse.json({ users: safeUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Error loading users" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // DAL pattern: Verify admin access
    const session = await verifyAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { name, email, password, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Check if user exists (by email hash)
        const { encrypted, hash } = encryptEmail(email);
        const existingUser = await prisma.user.findUnique({ where: { email: hash } });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        // Role hierarchy check: only SUPERADMIN can create high-privilege roles
        const requestedRole = role || "USER";
        const highPrivilegeRoles = ["SUPERADMIN", "ADMIN"];

        if (highPrivilegeRoles.includes(requestedRole) && session.user.role !== "SUPERADMIN") {
            return NextResponse.json(
                { error: "Solo SUPERADMIN puede crear administradores" },
                { status: 403 }
            );
        }

        const newUser = await prisma.user.create({
            data: {
                name,
                email: hash,
                emailEncrypted: encrypted,
                password: hashedPassword,
                role: requestedRole,
                isActive: true
            },
            select: { id: true, name: true, role: true, isActive: true }
        });

        // Create notification for user creation
        await NotificationHelpers.userCreated(
            { id: newUser.id, name: newUser.name, email },
            { id: session.user.id, name: session.user.name }
        );

        // Audit log
        await createAuditLog({
            action: AuditActions.USER_CREATED,
            category: "users",
            userId: session.user.id,
            targetId: newUser.id,
            targetType: "user",
            metadata: { name: newUser.name, role: newUser.role },
        });

        return NextResponse.json({ user: newUser });

    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Error creating user" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    // DAL pattern: Verify admin access
    const session = await verifyAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { userId, role, isActive, password } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        // Prevent changing own role/status
        if (userId === session.user.id) {
            return NextResponse.json({ error: "Cannot modify yourself" }, { status: 400 });
        }

        // Fetch target user to check their role
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // SUPERADMIN is immutable by others
        if (targetUser.role === "SUPERADMIN") {
            return NextResponse.json({ error: "Cannot modify a Super Admin" }, { status: 403 });
        }

        // ... (existing imports)

        // ...

        const data: Prisma.UserUpdateInput = {};

        // Role hierarchy check for role changes
        if (role) {
            const highPrivilegeRoles = ["SUPERADMIN", "ADMIN"];

            // Only SUPERADMIN can promote to high-privilege roles
            if (highPrivilegeRoles.includes(role) && session.user.role !== "SUPERADMIN") {
                return NextResponse.json(
                    { error: "Solo SUPERADMIN puede asignar roles de administrador" },
                    { status: 403 }
                );
            }
            data.role = role;
        }

        if (typeof isActive === "boolean") {
            data.isActive = isActive;
            // If reactivating, also reset deletion status
            if (isActive) {
                data.deletionStatus = "ACTIVE";
                data.deletionScheduledAt = null;
                data.deletedAt = null;
            }
        }
        if (password) {
            data.password = await hashPassword(password);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, name: true, role: true, isActive: true }
        });

        // Create notifications for different changes
        const actor = { id: session.user.id, name: session.user.name };
        const userInfo = { id: targetUser.id, name: targetUser.name };

        if (role && role !== targetUser.role) {
            await NotificationHelpers.userRoleChanged(userInfo, targetUser.role, role, actor);
        }

        if (typeof isActive === "boolean" && isActive !== targetUser.isActive) {
            if (isActive) {
                await NotificationHelpers.userActivated(userInfo, actor);
            } else {
                await NotificationHelpers.userSuspended(userInfo, actor);
            }
        }

        if (password) {
            await NotificationHelpers.passwordChanged(userInfo, actor);
        }

        // Audit logs for all changes
        if (role && role !== targetUser.role) {
            await createAuditLog({
                action: AuditActions.USER_ROLE_CHANGED,
                category: "users",
                userId: session.user.id,
                targetId: userId,
                targetType: "user",
                metadata: { oldRole: targetUser.role, newRole: role },
            });
        }
        if (typeof isActive === "boolean" && isActive !== targetUser.isActive) {
            await createAuditLog({
                action: isActive ? AuditActions.USER_ACTIVATED : AuditActions.USER_SUSPENDED,
                category: "users",
                userId: session.user.id,
                targetId: userId,
                targetType: "user",
            });
        }
        if (password) {
            await createAuditLog({
                action: AuditActions.PASSWORD_CHANGED,
                category: "security",
                userId: session.user.id,
                targetId: userId,
                targetType: "user",
            });
        }

        return NextResponse.json({ user: updatedUser });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Error updating user" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    // DAL pattern: Only SUPERADMIN can delete users
    const session = await verifySuperAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("id");

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === session.user.id) {
            return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        }

        // Fetch target user to check their role
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // SUPERADMIN is immutable
        if (targetUser.role === "SUPERADMIN") {
            return NextResponse.json({ error: "Cannot delete a Super Admin" }, { status: 403 });
        }

        // Create notification before deletion
        await NotificationHelpers.userDeleted(
            { id: targetUser.id, name: targetUser.name },
            { id: session.user.id, name: session.user.name }
        );

        // Audit log before deletion
        await createAuditLog({
            action: AuditActions.USER_DELETED,
            category: "users",
            userId: session.user.id,
            targetId: userId,
            targetType: "user",
            metadata: { deletedUserName: targetUser.name, deletedUserRole: targetUser.role },
        });

        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
    }
}
