import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PipelineBoard } from "./pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.pipeline.view"
    );
    if (!canView) redirect("/admin/gestion-comercial");

    // Fetch deals and clients in parallel
    const [deals, clients] = await Promise.all([
        prisma.deal.findMany({
            where: {
                userId: session.user.id,
                isDeleted: false,
            },
            include: {
                client: {
                    select: { id: true, name: true, slug: true, workType: true },
                },
                quotation: {
                    select: { id: true, projectName: true, total: true, status: true },
                },
                _count: {
                    select: { activities: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        }),
        prisma.quotationClient.findMany({
            where: { userId: session.user.id, isActive: true },
            select: { id: true, name: true, workType: true },
            orderBy: { name: "asc" },
        }),
    ]);

    // Serialize dates for client component
    const serializedDeals = deals.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        estimatedCloseAt: d.estimatedCloseAt?.toISOString() || null,
    }));

    return <PipelineBoard initialDeals={serializedDeals} clients={clients} />;
}
