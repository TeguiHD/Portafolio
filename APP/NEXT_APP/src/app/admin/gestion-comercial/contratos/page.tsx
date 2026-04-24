import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import { ContractsList } from "./contracts-list";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
    const session = await requirePagePermission("crm.contracts.view");

    const [contracts, clients] = await Promise.all([
        prisma.contract.findMany({
            where: { userId: session.user.id, isDeleted: false },
            include: {
                client: { select: { id: true, name: true, workType: true } },
                _count: { select: { deals: true, approvals: true, milestones: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.quotationClient.findMany({
            where: { userId: session.user.id, isActive: true },
            select: { id: true, name: true, workType: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const serialized = contracts.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        startDate: c.startDate?.toISOString() || null,
        endDate: c.endDate?.toISOString() || null,
        htmlContent: c.htmlContent || null,
    }));

    return <ContractsList initialContracts={serialized} clients={clients} />;
}
