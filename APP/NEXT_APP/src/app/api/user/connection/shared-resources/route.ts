import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { secureApiEndpoint } from "@/lib/api-security";

/**
 * GET /api/user/connection/shared-resources
 * Returns clients and quotations shared with the current user through connections.
 * Follows OWASP ASVS V4 for access control – only shows resources
 * explicitly shared via SharedClient relation.
 */
export async function GET(request: NextRequest) {
    try {
        const security = await secureApiEndpoint(request, {
            requireAuth: true,
        });

        if (security.error) return security.error;
        const session = security.session!;
        const userId = session.user.id;

        // Fetch clients shared with this user
        const sharedClientRecords = await prisma.sharedClient.findMany({
            where: { sharedWithUserId: userId },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        company: true,
                        slug: true,
                        _count: { select: { quotations: true } },
                        quotations: {
                            where: { isDeleted: false, isVisible: true },
                            select: {
                                id: true,
                                folio: true,
                                projectName: true,
                                clientName: true,
                                status: true,
                                total: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: "desc" },
                            take: 20,
                        },
                    },
                },
            },
        });

        // Look up who shared each client
        const sharedByIds = [...new Set(sharedClientRecords.map((r) => r.sharedByUserId))];
        const sharedByUsers = await prisma.user.findMany({
            where: { id: { in: sharedByIds } },
            select: { id: true, name: true },
        });
        const sharedByMap = new Map(sharedByUsers.map((u) => [u.id, u.name || "Usuario"]));

        const clients = sharedClientRecords.map((record) => ({
            id: record.client.id,
            name: record.client.name,
            company: record.client.company,
            quotationCount: record.client._count.quotations,
            permission: record.permission,
            sharedByName: sharedByMap.get(record.sharedByUserId) || "Usuario",
        }));

        // Flatten quotations from all shared clients
        const quotations = sharedClientRecords.flatMap((record) =>
            record.client.quotations.map((q) => ({
                id: q.id,
                folio: q.folio,
                projectName: q.projectName,
                clientName: q.clientName,
                status: q.status,
                total: q.total,
            }))
        );

        return NextResponse.json({
            clients,
            quotations,
        });
    } catch (error) {
        console.error("Shared resources fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch shared resources" },
            { status: 500 }
        );
    }
}
