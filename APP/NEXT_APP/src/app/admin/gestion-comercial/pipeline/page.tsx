import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { PipelineBoard } from "./pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ nueva?: string | string[] }> }) {
    const session = await requirePagePermission("crm.pipeline.view");
    const { nueva } = await searchParams;

    const [deals, clients, puedeContratos] = await Promise.all([
        prisma.deal.findMany({
            where: {
                userId: session.user.id,
                isDeleted: false,
            },
            // Solo lo que el tablero y el formulario usan.
            select: {
                id: true, title: true, description: true, stage: true, priority: true, origin: true,
                estimatedValue: true, closeProbability: true, estimatedCloseAt: true, notes: true, createdAt: true, updatedAt: true,
                client: { select: { id: true, name: true, workType: true } },
                quotation: { select: { id: true, projectName: true, total: true, status: true } },
                _count: { select: { activities: true } },
            },
            orderBy: { updatedAt: "desc" },
        }),
        prisma.quotationClient.findMany({
            where: { userId: session.user.id, isActive: true },
            select: { id: true, name: true, workType: true },
            orderBy: { name: "asc" },
        }),
        hasPermission(session.user.id, session.user.role, "crm.contracts.manage"),
    ]);

    // Fechas a texto para el componente de cliente.
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

    return <PipelineBoard initialDeals={serializedDeals} clients={clients} abrirNueva={nueva === "1"} puedeContratos={puedeContratos} />;
}
