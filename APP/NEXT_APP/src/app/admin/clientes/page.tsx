import { requirePagePermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import ClientsPageClient, { type ClienteDirectorio } from "./client";

export const dynamic = "force-dynamic";

/**
 * Directorio de clientes (el único: /admin/gestion-comercial/clientes redirige aquí).
 * Los datos se leen en el servidor con `select` explícito: nada de accessCode (hash de la contraseña del portal)
 * ni notas internas. La búsqueda va en la URL (?q=) para que sirva con cualquier cantidad de clientes.
 */
export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
    const session = await requirePagePermission("quotations.view");
    const { q } = await searchParams;
    const busqueda = (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 100);

    const filas = await prisma.quotationClient.findMany({
        where: {
            userId: session.user.id,
            ...(busqueda
                ? {
                    OR: [
                        { name: { contains: busqueda, mode: "insensitive" as const } },
                        { slug: { contains: busqueda, mode: "insensitive" as const } },
                        { email: { contains: busqueda, mode: "insensitive" as const } },
                        { contactEmail: { contains: busqueda, mode: "insensitive" as const } },
                        { contactName: { contains: busqueda, mode: "insensitive" as const } },
                        { company: { contains: busqueda, mode: "insensitive" as const } },
                    ],
                }
                : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
            id: true, name: true, slug: true, email: true, company: true, rut: true, address: true,
            contactName: true, contactEmail: true, contactPhone: true, contactRole: true, workType: true, userId: true,
            // Solo lo vigente: negocios, contratos y propuestas borrados no cuentan.
            _count: {
                select: {
                    quotations: { where: { isDeleted: false } },
                    deals: { where: { isDeleted: false } },
                    contracts: { where: { isDeleted: false } },
                },
            },
        },
    });

    const clientes: ClienteDirectorio[] = filas.map(({ _count, ...c }) => ({
        ...c,
        propuestas: _count.quotations,
        negocios: _count.deals,
        contratos: _count.contracts,
    }));

    return (
        <ClientsPageClient
            clientes={clientes}
            busqueda={busqueda}
            currentUserId={session.user.id}
            isSuperAdmin={session.user.role === "SUPERADMIN"}
        />
    );
}
