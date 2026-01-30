import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/spy-users
 * Returns list of users with their client and quotation counts
 * SUPERADMIN ONLY
 */
export async function GET() {
    try {
        const session = await auth();

        // Strict SUPERADMIN check
        if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
            return NextResponse.json(
                { error: "No autorizado - Solo SUPERADMIN" },
                { status: 403 }
            );
        }

        // Get all users except the current one, with counts
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                id: { not: session.user.id }, // Exclude self
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                _count: {
                    select: {
                        quotationClients: true,
                        quotations: true,
                    },
                },
            },
            orderBy: [
                { role: "asc" },
                { name: "asc" },
            ],
        });

        // Map to expected format
        const formattedUsers = users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            clientCount: user._count.quotationClients,
            quotationCount: user._count.quotations,
        }));

        // Log audit event
        await prisma.auditLog.create({
            data: {
                action: "SPY_MODE_USER_LIST_VIEW",
                category: "quotations",
                userId: session.user.id,
                metadata: {
                    userCount: formattedUsers.length,
                },
            },
        });

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error("Error in spy-users API:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
