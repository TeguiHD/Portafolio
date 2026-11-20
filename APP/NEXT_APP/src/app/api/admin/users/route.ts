import { NextResponse } from "next/server";
import { verifySessionForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { hashPassword, encryptEmail, decryptEmail } from "@/lib/security.server";
import { NotificationHelpers } from "@/lib/notificationService";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { resetRateLimit } from "@/lib/redis";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { Prisma, type Role } from '@/generated/prisma/client';

const ROLES: Role[] = ["SUPERADMIN", "ADMIN", "MODERATOR", "USER"];
const RANGO: Record<Role, number> = { USER: 0, MODERATOR: 1, ADMIN: 2, SUPERADMIN: 3 };

/**
 * Quién pide y qué puede, leído de la base (no del token): activo, con verificación en dos pasos y sus permisos
 * finos (rol + excepciones). Antes bastaba con ser ADMIN; ahora quitarle `users.edit` a un admin sí lo frena.
 */
async function actorConPermisos() {
    const session = await verifySessionForApi();
    if (!session?.user?.id) return null;
    const actor = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, role: true, isActive: true, mfaEnabled: true },
    });
    if (!actor?.isActive || actor.mfaEnabled !== true) return null;
    const permisos = await getUserEffectivePermissions(actor.id, actor.role);
    return {
        user: actor,
        puede: (codigo: string) => actor.role === "SUPERADMIN" || permisos.has(codigo),
        /** Fuera del superadmin, solo se actúa sobre (o se asigna) un rol por debajo del propio. */
        manda: (rol: Role) => actor.role === "SUPERADMIN" || RANGO[rol] < RANGO[actor.role],
    };
}

const sinPermiso = () => NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 });

export async function GET() {
    const session = await actorConPermisos();
    if (!session?.puede("users.view")) return sinPermiso();

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                emailEncrypted: true,
                role: true,
                isActive: true,
                mfaEnabled: true,
                avatar: true,
                createdAt: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                _count: {
                    select: {
                        quotations: true,
                        sessions: true,
                    }
                },
                deletionStatus: true,
                deletionScheduledAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });

        const safeUsers = users.map(user => ({
            ...user,
            email: user.emailEncrypted ? decryptEmail(user.emailEncrypted) : user.email,
            emailEncrypted: undefined
        }));

        return NextResponse.json({ users: safeUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "No se pudieron cargar los usuarios" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await actorConPermisos();
    if (!session?.puede("users.create")) return sinPermiso();

    try {
        const { name, email, password, role } = await request.json();

        if (typeof email !== "string" || !email.includes("@") || typeof password !== "string") {
            return NextResponse.json({ error: "Faltan el correo o la clave" }, { status: 400 });
        }
        if (password.length < 12) {
            return NextResponse.json({ error: "La clave debe tener al menos 12 caracteres" }, { status: 400 });
        }
        if (name !== undefined && name !== null && typeof name !== "string") {
            return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
        }

        // Check if user exists (by email hash)
        const { encrypted, hash } = encryptEmail(email);
        const existingUser = await prisma.user.findUnique({ where: { email: hash } });

        if (existingUser) {
            return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 400 });
        }

        const requestedRole: Role = role || "USER";
        if (!ROLES.includes(requestedRole)) {
            return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
        }
        // Jerarquía: nadie crea a alguien de su mismo rango o superior (salvo el superadmin).
        if (!session.manda(requestedRole)) {
            return NextResponse.json({ error: "No puedes crear usuarios con ese rol" }, { status: 403 });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                name,
                email: hash,
                emailEncrypted: encrypted,
                password: hashedPassword,
                // La clave la eligió otra persona: que la cambie al entrar.
                mustChangePassword: true,
                role: requestedRole,
                isActive: true,
                mfaEnabled: false,
                mfaRecoveryCodes: [],
            },
            select: { id: true, name: true, role: true, isActive: true, mfaEnabled: true }
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
        return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await actorConPermisos();
    if (!session) return sinPermiso();

    try {
        const { userId, role, isActive, password, unlockLoginBlock } = await request.json();

        if (typeof userId !== "string" || !userId) {
            return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });
        }

        // Cada cambio pide su propio permiso fino.
        if (role !== undefined && !session.puede("users.role.edit")) return sinPermiso();
        if (typeof isActive === "boolean" && !session.puede("users.suspend")) return sinPermiso();
        if (password !== undefined && !session.puede("users.edit")) return sinPermiso();
        if (unlockLoginBlock && session.user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Solo el superadministrador puede quitar el bloqueo por intentos" }, { status: 403 });
        }
        if (role === undefined && typeof isActive !== "boolean" && password === undefined && !unlockLoginBlock) {
            return NextResponse.json({ error: "No hay cambios que aplicar" }, { status: 400 });
        }

        // Prevent changing own role/status
        if (userId === session.user.id) {
            return NextResponse.json({ error: "No puedes modificar tu propia cuenta desde aquí" }, { status: 400 });
        }

        // Fetch target user to check their role
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        // SUPERADMIN is immutable by others
        if (targetUser.role === "SUPERADMIN") {
            return NextResponse.json({ error: "No se puede modificar a un superadministrador" }, { status: 403 });
        }
        // Nadie cambia la clave, el rol ni el estado de alguien de su mismo rango o superior (toma de cuenta).
        if (!session.manda(targetUser.role)) {
            return NextResponse.json({ error: "No puedes modificar a un usuario de tu mismo rango o superior" }, { status: 403 });
        }
        if (role !== undefined && !ROLES.includes(role)) {
            return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
        }
        if (password !== undefined && (typeof password !== "string" || password.length < 12)) {
            return NextResponse.json({ error: "La clave debe tener al menos 12 caracteres" }, { status: 400 });
        }

        const data: Prisma.UserUpdateInput = {};

        if (unlockLoginBlock) {
            data.failedLoginAttempts = 0;
            data.lockedUntil = null;
        }

        // Jerarquía también para el rol nuevo: solo roles por debajo del propio (el superadmin, cualquiera).
        if (role) {
            if (!session.manda(role)) {
                return NextResponse.json(
                    { error: "No puedes asignar un rol igual o superior al tuyo" },
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
            // La clave la eligió otra persona: que la cambie al entrar.
            data.mustChangePassword = true;
            data.passwordChangedAt = new Date();
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, name: true, role: true, isActive: true }
        });

        // Clave, rol o suspensión nuevos: las sesiones abiertas de esa persona dejan de valer.
        if (password || (role && role !== targetUser.role) || isActive === false) {
            await prisma.userSession.updateMany({
                where: { userId, isActive: true },
                data: { isActive: false, revokedAt: new Date(), revokeReason: "cambio_por_admin" },
            });
        }

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

        if (unlockLoginBlock) {
            await resetRateLimit(targetUser.email).catch((error) => {
                console.error("Error resetting login rate limit:", error);
            });
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

        if (unlockLoginBlock) {
            await createAuditLog({
                action: AuditActions.ACCOUNT_UNLOCKED,
                category: "security",
                userId: session.user.id,
                targetId: userId,
                targetType: "user",
                metadata: {
                    previousFailedLoginAttempts: targetUser.failedLoginAttempts,
                    previousLockedUntil: targetUser.lockedUntil?.toISOString() ?? null,
                },
            });
        }

        return NextResponse.json({ user: updatedUser });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "No se pudo actualizar el usuario" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    // users.delete viene solo con SUPERADMIN; si se le concede a otro rol, igual respeta la jerarquía.
    const session = await actorConPermisos();
    if (!session?.puede("users.delete")) return sinPermiso();

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("id");

        if (!userId) {
            return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === session.user.id) {
            return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
        }

        // Fetch target user to check their role
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        // SUPERADMIN is immutable
        if (targetUser.role === "SUPERADMIN") {
            return NextResponse.json({ error: "No se puede eliminar a un superadministrador" }, { status: 403 });
        }
        if (!session.manda(targetUser.role)) {
            return NextResponse.json({ error: "No puedes eliminar a un usuario de tu mismo rango o superior" }, { status: 403 });
        }

        // Primero se borra y después se avisa: si el borrado falla, la auditoría no dice que se eliminó.
        try {
            await prisma.user.delete({ where: { id: userId } });
        } catch (error) {
            if ((error as { code?: string })?.code === "P2003") {
                return NextResponse.json({
                    error: "Tiene datos a su nombre (propuestas, clientes, movimientos…). Suspéndelo, transfiere sus datos o usa «Ciclo de vida de la cuenta».",
                }, { status: 409 });
            }
            throw error;
        }

        await NotificationHelpers.userDeleted(
            { id: targetUser.id, name: targetUser.name },
            { id: session.user.id, name: session.user.name }
        );

        await createAuditLog({
            action: AuditActions.USER_DELETED,
            category: "users",
            userId: session.user.id,
            targetId: userId,
            targetType: "user",
            metadata: { deletedUserName: targetUser.name, deletedUserRole: targetUser.role },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "No se pudo eliminar el usuario" }, { status: 500 });
    }
}
