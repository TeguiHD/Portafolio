import { NextRequest, NextResponse } from "next/server";
import { verifySessionForApi, verifySuperAdminForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { Role, Prisma, type NotificationType } from '@/generated/prisma/client';
import { getRoleHierarchy } from "@/lib/notificationService";

/**
 * Build filter for notifications based on user role
 * - SUPERADMIN sees all notifications
 * - Other roles see notifications targeted to their role or below
 * - Users always see notifications targeted specifically to them
 */
function buildNotificationFilter(userRole: Role, userId: string): Prisma.AdminNotificationWhereInput {
    const visibleRoles = getRoleHierarchy(userRole);
    const now = new Date();

    const baseFilter: Prisma.AdminNotificationWhereInput = {
        // Only show non-expired or never-expiring notifications
        OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
        ],
    };

    if (userRole === "SUPERADMIN") {
        // SUPERADMIN sees everything
        return baseFilter;
    }

    // Other roles see filtered notifications
    return {
        ...baseFilter,
        AND: [
            {
                OR: [
                    // Notifications targeted to their role or subordinate roles
                    { targetRole: { in: visibleRoles } },
                    // Notifications specifically for this user
                    { targetUserId: userId },
                ],
            },
        ],
    };
}

const PRIORIDADES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type Prioridad = (typeof PRIORIDADES)[number];

/** Familias del filtro «Tipo» de la página de notificaciones. */
const CATEGORIAS: Record<string, NotificationType[]> = {
    USER: ["USER_CREATED", "USER_ROLE_CHANGED", "USER_SUSPENDED", "USER_ACTIVATED", "USER_DELETED"],
    SECURITY: ["PASSWORD_CHANGED", "LOGIN_RATE_LIMITED", "CONCURRENT_SESSION_DETECTED", "SESSION_FROM_NEW_LOCATION", "SESSION_REVOKED"],
    QUOTATION: ["QUOTATION_CREATED", "QUOTATION_STATUS_CHANGED"],
    TOOL: ["TOOL_STATUS_CHANGED", "TOOL_USAGE_SPIKE"],
    SYSTEM: ["SYSTEM_ERROR", "SYSTEM_MAINTENANCE"],
};

/** «Leída» es de cada persona: hay una fila en AdminNotificationRead por cada quien la leyó. */
const sinLeerPor = (userId: string): Prisma.AdminNotificationWhereInput => ({ reads: { none: { userId } } });
const leidaPor = (userId: string): Prisma.AdminNotificationWhereInput => ({ reads: { some: { userId } } });

/**
 * Solo lo que muestran la campana y la página (sin las columnas globales isRead/readBy, targetUserId ni expiresAt).
 * `reads` trae a lo más la lectura de quien consulta; `conLectura` la convierte en el `isRead` que espera la vista.
 */
const campos = (userId: string) => ({
    id: true, type: true, priority: true, title: true, message: true, metadata: true,
    createdAt: true, actorName: true,
    reads: { where: { userId }, select: { userId: true }, take: 1 },
} satisfies Prisma.AdminNotificationSelect);

function conLectura<T extends { reads: unknown[] }>(filas: T[]): (Omit<T, "reads"> & { isRead: boolean })[] {
    return filas.map(({ reads, ...resto }) => ({ ...resto, isRead: reads.length > 0 }));
}

/** Medianoche de hoy en Chile, como instante UTC. */
function inicioDelDiaEnChile(ahora = new Date()): Date {
    const desfase = (fecha: Date) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Santiago", hourCycle: "h23",
            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
        }).formatToParts(fecha).map((x) => [x.type, x.value]));
        return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(fecha.getTime() / 1000) * 1000;
    };
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora).split("-").map(Number);
    const medianoche = Date.UTC(p[0], p[1] - 1, p[2]);
    // Se recalcula el desfase en la propia medianoche por si hubo cambio de hora entre ella y ahora.
    return new Date(medianoche - desfase(new Date(medianoche - desfase(ahora))));
}

/**
 * GET /api/admin/notifications
 * - Campana: `?limit=20` (cursor opcional) o `?countOnly=1`.
 * - Página: `?page=N&limit=15` con filtros `q`, `priority`, `status` (read|unread) y `category`; devuelve el total
 *   filtrado real y las cifras de arriba (todas, sin leer, críticas sin leer y de hoy), contadas en la base.
 */
export async function GET(request: NextRequest) {
    const session = await verifySessionForApi();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limiteLeido = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(Number.isFinite(limiteLeido) ? limiteLeido : 20, 1), 50);
    const cursor = searchParams.get("cursor");

    try {
        const yo = session.user.id;
        const filter = buildNotificationFilter(session.user.role, yo);
        const noLeida = sinLeerPor(yo);

        // El contador de la campana solo necesita una consulta.
        if (searchParams.get("countOnly") === "1") {
            const unreadCount = await prisma.adminNotification.count({ where: { AND: [filter, noLeida] } });
            return NextResponse.json({ unreadCount });
        }

        // Filtros (los mismos para la campana y para la página).
        const extra: Prisma.AdminNotificationWhereInput[] = [];
        const estado = searchParams.get("status");
        if (searchParams.get("unread") === "true" || estado === "unread") extra.push(noLeida);
        else if (estado === "read") extra.push(leidaPor(yo));
        const prioridad = searchParams.get("priority");
        if (prioridad && (PRIORIDADES as readonly string[]).includes(prioridad)) extra.push({ priority: prioridad as Prioridad });
        const categoria = searchParams.get("category");
        if (categoria && CATEGORIAS[categoria]) extra.push({ type: { in: CATEGORIAS[categoria] } });
        const q = (searchParams.get("q") || "").trim().slice(0, 100);
        if (q) {
            extra.push({
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { message: { contains: q, mode: "insensitive" } },
                    { actorName: { contains: q, mode: "insensitive" } },
                ],
            });
        }
        const whereClause: Prisma.AdminNotificationWhereInput = { AND: [filter, ...extra] };

        const paginaLeida = Number.parseInt(searchParams.get("page") || "", 10);
        if (Number.isFinite(paginaLeida)) {
            const page = Math.max(paginaLeida, 1);
            // Cuatro conexiones a la vez (el pool de Prisma tiene 5): sin leer y críticas salen de un groupBy por
            // prioridad; total y de hoy van juntos en una transacción (una sola conexión).
            const [filas, filteredCount, sinLeer, [totalCount, todayCount]] = await Promise.all([
                prisma.adminNotification.findMany({
                    where: whereClause,
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    skip: (page - 1) * limit,
                    take: limit,
                    select: campos(yo),
                }),
                prisma.adminNotification.count({ where: whereClause }),
                prisma.adminNotification.groupBy({ by: ["priority"], where: { AND: [filter, noLeida] }, _count: { _all: true } }),
                prisma.$transaction([
                    prisma.adminNotification.count({ where: filter }),
                    prisma.adminNotification.count({ where: { AND: [filter, { createdAt: { gte: inicioDelDiaEnChile() } }] } }),
                ]),
            ]);
            let unreadCount = 0, criticalUnread = 0;
            for (const g of sinLeer) {
                unreadCount += g._count._all;
                if (g.priority === "CRITICAL") criticalUnread += g._count._all;
            }
            return NextResponse.json({
                notifications: conLectura(filas),
                page,
                pageSize: limit,
                filteredCount,
                totalPages: Math.max(1, Math.ceil(filteredCount / limit)),
                totalCount,
                unreadCount,
                criticalUnread,
                todayCount,
            });
        }

        const [filas, unreadCount, totalCount] = await Promise.all([
            prisma.adminNotification.findMany({
                where: whereClause,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: limit,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: campos(yo),
            }),
            prisma.adminNotification.count({ where: { AND: [filter, noLeida] } }),
            prisma.adminNotification.count({ where: filter }),
        ]);
        const notifications = conLectura(filas);

        const nextCursor = notifications.length === limit
            ? notifications[notifications.length - 1]?.id
            : null;

        return NextResponse.json({
            notifications,
            unreadCount,
            totalCount,
            nextCursor,
        });
    } catch (error) {
        console.error("[Notifications API] Error fetching:", error);
        return NextResponse.json(
            { error: "No se pudieron cargar las notificaciones" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/notifications
 * Marca como leídas para quien llama: una (`notificationId`), varias (`notificationIds`, hasta 100) o todas las
 * visibles (`markAllRead`). Cada lectura es una fila (notificación, usuario): no cambia lo que ven los demás.
 */
export async function PATCH(request: NextRequest) {
    const session = await verifySessionForApi();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body: unknown = await request.json();
        const { notificationId, notificationIds, markAllRead } = (body && typeof body === "object" ? body : {}) as {
            notificationId?: unknown; notificationIds?: unknown; markAllRead?: unknown;
        };
        const yo = session.user.id;
        const filter = buildNotificationFilter(session.user.role, yo);
        const marcar = (filas: { id: string }[]) => prisma.adminNotificationRead.createMany({
            data: filas.map(({ id }) => ({ notificationId: id, userId: yo })),
            skipDuplicates: true,
        });

        if (markAllRead === true) {
            // Por tandas de 500 (tope de 40 vueltas): cada tanda deja de salir como «sin leer» en la siguiente.
            const TANDA = 500;
            let updated = 0;
            for (let vuelta = 0; vuelta < 40; vuelta++) {
                const pendientes = await prisma.adminNotification.findMany({
                    where: { AND: [filter, sinLeerPor(yo)] },
                    select: { id: true },
                    orderBy: { createdAt: "desc" },
                    take: TANDA,
                });
                if (pendientes.length === 0) break;
                const { count } = await marcar(pendientes);
                updated += count;
                if (pendientes.length < TANDA || count === 0) break;
            }
            return NextResponse.json({ success: true, updated });
        }

        const ids = Array.isArray(notificationIds)
            ? notificationIds.filter((id): id is string => typeof id === "string" && id.length <= 64).slice(0, 100)
            : typeof notificationId === "string" && notificationId.length <= 64 ? [notificationId] : [];

        if (ids.length === 0) {
            return NextResponse.json({ error: "Falta notificationId, notificationIds o markAllRead" }, { status: 400 });
        }

        // Solo se marcan las que este usuario puede ver; las demás se ignoran. Si ya estaba leída, no se duplica.
        const visibles = await prisma.adminNotification.findMany({
            where: { AND: [filter, { id: { in: ids } }] },
            select: { id: true },
        });
        if (visibles.length === 0 && typeof notificationId === "string") {
            return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
        }
        if (visibles.length > 0) await marcar(visibles);
        return NextResponse.json({ success: true, updated: visibles.length });
    } catch (error) {
        console.error("[Notifications API] Error updating:", error);
        return NextResponse.json(
            { error: "No se pudo actualizar la notificación" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/notifications
 * Delete old/read notifications (cleanup - SUPERADMIN only)
 * Con `onlyRead` (por defecto) borra las que alguien leyó: con lectura por persona o marcadas con la columna global vieja.
 */
export async function DELETE(request: NextRequest) {
    // DAL pattern: Only SUPERADMIN can delete notifications
    const session = await verifySuperAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const diasLeidos = Number.parseInt(searchParams.get("olderThanDays") || "30", 10);
        const olderThanDays = Math.min(Math.max(Number.isFinite(diasLeidos) ? diasLeidos : 30, 1), 3650);
        const onlyRead = searchParams.get("onlyRead") !== "false";

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await prisma.adminNotification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                ...(onlyRead ? { OR: [{ reads: { some: {} } }, { isRead: true }] } : {}),
            },
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
        });
    } catch (error) {
        console.error("[Notifications API] Error deleting:", error);
        return NextResponse.json(
            { error: "No se pudieron borrar las notificaciones" },
            { status: 500 }
        );
    }
}
