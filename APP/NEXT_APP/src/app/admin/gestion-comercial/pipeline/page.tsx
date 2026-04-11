import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';
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

    // Serialize dates for client component — only pass fields the client needs
    const serializedDeals = deals.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        stage: d.stage,
        priority: d.priority,
        origin: d.origin,
        estimatedValue: d.estimatedValue,
        closeProbability: d.closeProbability,
        estimatedCloseAt: d.estimatedCloseAt?.toISOString() ?? null,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        client: d.client,
        quotation: d.quotation,
        _count: d._count,
    }));

    return <PipelineBoard initialDeals={serializedDeals} clients={clients} />;
}
