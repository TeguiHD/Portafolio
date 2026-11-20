import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import { ContractsList, type BorradorContrato } from "./contracts-list";

export const dynamic = "force-dynamic";

export default async function ContratosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const session = await requirePagePermission("crm.contracts.view");
    const params = await searchParams;
    const leer = (k: string) => { const v = params[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };

    const [contracts, clients] = await Promise.all([
        prisma.contract.findMany({
            where: { userId: session.user.id, isDeleted: false },
            // Sin terms ni htmlContent (hasta 100 KB por contrato): la lista no los muestra; «Editar» los pide aparte.
            select: {
                id: true, contractNumber: true, title: true, description: true, status: true, type: true, totalAmount: true,
                startDate: true, endDate: true, autoRenew: true, renewalAlertDays: true, createdAt: true,
                client: { select: { id: true, name: true, workType: true } },
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
    }));

    // «Crear contrato» desde una oportunidad ganada: ?nuevo=1&cliente=…&titulo=…&valor=… (solo con permiso de crear).
    const puedeCrear = leer("nuevo") === "1" && await hasPermission(session.user.id, session.user.role, "crm.contracts.manage");
    const clienteBorrador = leer("cliente");
    const borrador: BorradorContrato | null = puedeCrear
        ? {
            clientId: clients.some((c) => c.id === clienteBorrador) ? clienteBorrador : "",
            title: leer("titulo").slice(0, 200),
            totalAmount: leer("valor").replace(/\D/g, "").slice(0, 13),
        }
        : null;

    return <ContractsList initialContracts={serialized} clients={clients} borrador={borrador} />;
}
