import { NextRequest, NextResponse } from "next/server";
import { verifySessionForApi, verifySuperAdminForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
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

/**
 * GET /api/admin/notifications
 * Fetch notifications for the current user
 */
export async function GET(request: NextRequest) {
    // DAL pattern: Verify session
    const session = await verifySessionForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const cursor = searchParams.get("cursor");

    try {
        const filter = buildNotificationFilter(session.user.role, session.user.id);

        const whereClause: Prisma.AdminNotificationWhereInput = {
            ...filter,
            ...(unreadOnly ? { isRead: false } : {}),
        };

        const [notifications, unreadCount, totalCount] = await Promise.all([
            prisma.adminNotification.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take: limit,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
            prisma.adminNotification.count({
                where: {
                    ...filter,
                    isRead: false,
                },
            }),
            prisma.adminNotification.count({
                where: filter,
            }),
        ]);

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
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
    // DAL pattern: Verify session
    const session = await verifySessionForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { notificationId, markAllRead } = body;

        if (markAllRead) {
            // Mark all visible notifications as read
            const filter = buildNotificationFilter(session.user.role, session.user.id);

            await prisma.adminNotification.updateMany({
                where: {
                    ...filter,
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt: new Date(),
                    readBy: session.user.id,
                },
            });

            return NextResponse.json({ success: true, message: "All notifications marked as read" });
        }

        if (notificationId) {
            // Mark single notification as read
            const notification = await prisma.adminNotification.findUnique({
                where: { id: notificationId },
            });

            if (!notification) {
                return NextResponse.json({ error: "Notification not found" }, { status: 404 });
            }

            // Check if user can access this notification
            const filter = buildNotificationFilter(session.user.role, session.user.id);
            const canAccess = await prisma.adminNotification.findFirst({
                where: {
                    id: notificationId,
                    ...filter,
                },
            });

            if (!canAccess) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            await prisma.adminNotification.update({
                where: { id: notificationId },
                data: {
                    isRead: true,
                    readAt: new Date(),
                    readBy: session.user.id,
                },
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Missing notificationId or markAllRead" }, { status: 400 });
    } catch (error) {
        console.error("[Notifications API] Error updating:", error);
        return NextResponse.json(
            { error: "Failed to update notification" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/notifications
 * Delete old/read notifications (cleanup - SUPERADMIN only)
 */
export async function DELETE(request: NextRequest) {
    // DAL pattern: Only SUPERADMIN can delete notifications
    const session = await verifySuperAdminForApi();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const olderThanDays = parseInt(searchParams.get("olderThanDays") || "30", 10);
        const onlyRead = searchParams.get("onlyRead") !== "false";

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await prisma.adminNotification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                ...(onlyRead ? { isRead: true } : {}),
            },
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
        });
    } catch (error) {
        console.error("[Notifications API] Error deleting:", error);
        return NextResponse.json(
            { error: "Failed to delete notifications" },
            { status: 500 }
        );
    }
}
