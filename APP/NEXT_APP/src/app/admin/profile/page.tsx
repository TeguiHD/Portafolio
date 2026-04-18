import { verifyAdminAllowMissingMfa } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { lookupIPs } from "@/lib/vps/geo-ip";
import { ProfilePageClient } from "./client";

export const dynamic = "force-dynamic";

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
    if (result.status === "fulfilled") {
        return result.value;
    }

    console.error(`[Profile Page] Optional data failed: ${label}`, result.reason);
    return fallback;
}

export default async function ProfilePage() {
    const session = await verifyAdminAllowMissingMfa();

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
            createdAt: true,
            lastLoginAt: true,
            sharingCode: true,
            dataExportedAt: true,
            mfaEnabled: true,
        },
    });

    if (!user) return null;

    const [
        quotationCountResult,
        contractCountResult,
        clientCountResult,
        sentConnectionsCountResult,
        receivedConnectionsCountResult,
        activeSessionsResult,
        permissionsResult,
        recentAuditResult,
        totalActivityCountResult,
    ] = await Promise.allSettled([
        prisma.quotation.count({ where: { userId: session.user.id } }),
        prisma.contract.count({ where: { userId: session.user.id } }),
        prisma.quotationClient.count({ where: { userId: session.user.id } }),
        prisma.userConnection.count({
            where: { requesterId: session.user.id, status: "ACCEPTED" },
        }),
        prisma.userConnection.count({
            where: { addresseeId: session.user.id, status: "ACCEPTED" },
        }),
        prisma.userSession.findMany({
            where: {
                userId: session.user.id,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                browser: true,
                device: true,
                os: true,
                ipAddress: true,
                userAgent: true,
                city: true,
                country: true,
                countryCode: true,
                lastActivity: true,
                createdAt: true,
            },
            orderBy: { lastActivity: "desc" },
            take: 20,
        }),
        prisma.userPermission.findMany({
            where: { userId: session.user.id },
            include: { permission: { select: { name: true, description: true } } },
        }),
        prisma.auditLog.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 15,
            select: {
                id: true,
                action: true,
                metadata: true,
                ipAddress: true,
                createdAt: true,
            },
        }),
        prisma.auditLog.count({
            where: { userId: session.user.id },
        }),
    ]);

    const activeSessions = settledValue(activeSessionsResult, [], "active sessions");
    const permissions = settledValue(permissionsResult, [], "permissions");
    const recentAudit = settledValue(recentAuditResult, [], "recent audit");
    const totalActivityCount = settledValue(totalActivityCountResult, 0, "activity count");

    const quotationCount = settledValue(quotationCountResult, 0, "quotation count");
    const contractCount = settledValue(contractCountResult, 0, "contract count");
    const clientCount = settledValue(clientCountResult, 0, "client count");
    const sentConnectionsCount = settledValue(sentConnectionsCountResult, 0, "sent connections count");
    const receivedConnectionsCount = settledValue(receivedConnectionsCountResult, 0, "received connections count");

    const missingSessionGeoIPs = activeSessions
        .filter((sessionItem) => sessionItem.ipAddress && (!sessionItem.city || !sessionItem.country || !sessionItem.countryCode))
        .map((sessionItem) => sessionItem.ipAddress as string);

    const sessionGeoMap = missingSessionGeoIPs.length > 0
        ? await lookupIPs(missingSessionGeoIPs).catch((error) => {
            console.error("[Profile Page] Session GeoIP lookup failed:", error);
            return new Map();
        })
        : new Map();

    const totalConnections = sentConnectionsCount + receivedConnectionsCount;

    return (
        <ProfilePageClient
            user={{
                id: user.id,
                name: user.name,
                email: session.user.email,
                role: user.role,
                avatar: user.avatar,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString() || null,
                sharingCode: user.sharingCode,
                dataExportedAt: user.dataExportedAt?.toISOString() || null,
                mfaEnabled: user.mfaEnabled,
                stats: {
                    quotations: quotationCount,
                    contracts: contractCount,
                    clients: clientCount,
                    connections: totalConnections,
                },
            }}
            sessions={activeSessions.map((s) => {
                const geo = s.ipAddress ? sessionGeoMap.get(s.ipAddress) : undefined;

                return {
                    id: s.id,
                    browser: s.browser,
                    device: s.device,
                    os: s.os,
                    ipAddress: s.ipAddress,
                    userAgent: s.userAgent,
                    city: s.city || (geo?.city && geo.city !== "Unknown" ? geo.city : null),
                    country: s.country || (geo?.country && geo.country !== "Unknown" ? geo.country : null),
                    countryCode: s.countryCode || geo?.countryCode || null,
                    lastActivity: s.lastActivity?.toISOString() || s.createdAt.toISOString(),
                    createdAt: s.createdAt.toISOString(),
                };
            })}
            permissions={permissions.map((p) => ({
                name: p.permission.name,
                description: p.permission.description,
            }))}
            recentActivity={recentAudit.map((a) => ({
                id: a.id,
                action: a.action,
                details: typeof a.metadata === "string" ? a.metadata : JSON.stringify(a.metadata),
                createdAt: a.createdAt.toISOString(),
            }))}
            totalActivityCount={totalActivityCount}
        />
    );
}
