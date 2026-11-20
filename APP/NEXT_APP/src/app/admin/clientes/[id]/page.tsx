import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import ClientDetailClient, { type FichaCliente, type CifrasCliente } from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

/**
 * Ficha del cliente (la única: /admin/gestion-comercial/clientes/[id] redirige aquí).
 * `select` explícito: nada de accessCode ni del HTML de propuestas o contratos. Lo borrado no aparece ni cuenta.
 */
export default async function ClientDetailPage({ params }: PageProps) {
    const { id } = await params;
    const session = await requirePagePermission("quotations.view");
    const userId = session.user.id;

    const client = await prisma.quotationClient.findFirst({
        where: { id, userId },
        select: {
            id: true, name: true, slug: true, email: true, company: true, rut: true, address: true,
            contactName: true, contactEmail: true, contactPhone: true, contactRole: true, workType: true,
            // Se muestran en la ficha.
            notes: true,
            _count: {
                select: {
                    quotations: { where: { isDeleted: false } },
                    deals: { where: { isDeleted: false } },
                    contracts: { where: { isDeleted: false } },
                },
            },
            quotations: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 20,
                select: { id: true, folio: true, projectName: true, status: true, total: true, totalPaid: true, createdAt: true },
            },
            contracts: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 20,
                select: {
                    id: true, contractNumber: true, title: true, description: true, status: true, type: true,
                    totalAmount: true, startDate: true, endDate: true,
                    milestones: {
                        orderBy: { sortOrder: "asc" },
                        select: {
                            id: true, title: true, description: true, status: true, type: true, icon: true,
                            estimatedDate: true, completedAt: true, isVisibleToClient: true,
                        },
                    },
                    paymentPlans: { select: { id: true, totalAmount: true, totalInstallments: true, status: true } },
                    approvals: {
                        orderBy: { createdAt: "desc" },
                        select: { id: true, type: true, status: true, signerName: true, signerRut: true, signedAt: true, createdAt: true },
                    },
                },
            },
            deals: {
                where: { isDeleted: false },
                orderBy: { updatedAt: "desc" },
                take: 10,
                select: { id: true, title: true, stage: true, priority: true, estimatedValue: true, updatedAt: true },
            },
            expenses: {
                where: { isDeleted: false },
                orderBy: { expenseDate: "desc" },
                take: 20,
                select: { id: true, description: true, amount: true, category: true, expenseDate: true },
            },
        },
    });

    if (!client) notFound();

    // Sumas sobre todo lo vigente (las listas de arriba traen solo lo más reciente).
    const [propuestas, contratos, gastos, activos] = await Promise.all([
        prisma.quotation.aggregate({ where: { clientId: id, userId, isDeleted: false }, _sum: { total: true, totalPaid: true } }),
        prisma.contract.aggregate({ where: { clientId: id, userId, isDeleted: false, status: { notIn: ["CANCELLED", "DRAFT"] } }, _sum: { totalAmount: true } }),
        prisma.clientExpense.aggregate({ where: { clientId: id, userId, isDeleted: false }, _sum: { amount: true } }),
        prisma.contract.count({ where: { clientId: id, userId, isDeleted: false, status: "ACTIVE" } }),
    ]);

    const cifras: CifrasCliente = {
        enContratos: contratos._sum.totalAmount ?? 0,
        cotizado: propuestas._sum.total ?? 0,
        cobrado: propuestas._sum.totalPaid ?? 0,
        gastos: gastos._sum.amount ?? 0,
        contratosActivos: activos,
        propuestas: client._count.quotations,
        negocios: client._count.deals,
        contratos: client._count.contracts,
    };

    // Fechas a texto para el componente de cliente.
    const ficha = JSON.parse(JSON.stringify(client)) as FichaCliente;

    return <ClientDetailClient client={ficha} cifras={cifras} />;
}
