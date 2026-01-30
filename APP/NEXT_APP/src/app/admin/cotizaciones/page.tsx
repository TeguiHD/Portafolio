import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/page-security";
import { auth } from "@/lib/auth";
import QuotationsView from "./quotations-view";

export const dynamic = "force-dynamic";

/**
 * Get clients based on user permissions and spy mode
 */
async function getClients(
    userId: string,
    isSuperAdmin: boolean,
    spyUserId?: string | null
) {
    // Determine which user's clients to fetch
    let targetUserId = userId;

    // If superadmin is spying on another user
    if (isSuperAdmin && spyUserId) {
        targetUserId = spyUserId;
    }

    const where = isSuperAdmin && !spyUserId
        ? {} // Superadmin sees all clients (no spy mode)
        : { userId: targetUserId }; // Filter by specific user

    return prisma.quotationClient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { quotations: true } },
            user: isSuperAdmin
                ? { select: { name: true, email: true } }
                : undefined
        }
    });
}

export default async function QuotationsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    await requirePagePermission("quotations.view");

    const session = await auth();
    if (!session?.user?.id) {
        return <div className="text-red-400">No autorizado</div>;
    }

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const { spyUserId } = await searchParams;

    // Validate spy mode - only superadmins can use it
    const validSpyUserId = isSuperAdmin && typeof spyUserId === "string" ? spyUserId : null;

    // Log spy mode usage for audit
    if (validSpyUserId) {
        await prisma.auditLog.create({
            data: {
                action: "SPY_MODE_VIEW_CLIENTS",
                category: "quotations",
                userId: session.user.id,
                targetId: validSpyUserId,
                targetType: "User",
                metadata: {
                    spyTargetId: validSpyUserId,
                },
            },
        });
    }

    const clients = await getClients(session.user.id, isSuperAdmin, validSpyUserId);

    return (
        <QuotationsView
            clients={clients}
            isSuperAdmin={isSuperAdmin}
        />
    );
}
