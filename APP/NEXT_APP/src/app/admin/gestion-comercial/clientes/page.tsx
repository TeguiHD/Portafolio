import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "quotations.view"
    );
    if (!canView) redirect("/admin/gestion-comercial");

    const clients = await prisma.quotationClient.findMany({
        where: { userId: session.user.id },
        include: {
            _count: {
                select: {
                    quotations: true,
                    deals: true,
                    contracts: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Directorio de Clientes
                        <span className="text-sm px-3 py-1 bg-white/10 rounded-full font-medium text-neutral-300 border border-white/10 shadow-sm">
                            {clients.length} registrado{clients.length !== 1 ? "s" : ""}
                        </span>
                    </h1>
                    <p className="text-sm text-neutral-400 mt-2">
                        Visualiza las métricas y actividad de cada cuenta conectada a tus módulos comerciales
                    </p>
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="p-16 rounded-3xl bg-white/5 border border-white/10 text-center shadow-inner">
                    <span className="text-5xl filter grayscale opacity-40 block mb-4">👥</span>
                    <h3 className="text-lg font-semibold text-white mb-2">No se encontraron clientes</h3>
                    <p className="text-neutral-400 text-sm">
                        Los clientes se crean automáticamente desde el módulo de Cotizaciones al generar propuestas comerciales.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {clients.map((client) => (
                        <Link
                            key={client.id}
                            href={`/admin/gestion-comercial/clientes/${client.id}`}
                            className="group p-6 rounded-3xl bg-[#0c1224]/80 border border-white/5 hover:border-accent-1/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 backdrop-blur-md relative overflow-hidden flex flex-col justify-between h-full gap-5"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-1 opacity-0 group-hover:opacity-10 blur-3xl rounded-full transition-opacity pointer-events-none duration-500" />

                            <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-white group-hover:text-accent-1 transition-colors leading-snug line-clamp-2">
                                        {client.name}
                                    </h3>
                                    {client.workType && (
                                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-accent-1/10 text-accent-1 border border-accent-1/20 shadow-sm text-center leading-none">
                                            {client.workType}
                                        </span>
                                    )}
                                </div>
                                {client.contactEmail && (
                                    <p className="text-xs font-medium text-neutral-400 truncate flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <span>📧</span> {client.contactEmail}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5 mt-auto relative z-10">
                                <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-white/5 transition-colors">
                                    <span className="block text-xl font-extrabold text-white mb-0.5">{client._count.quotations}</span>
                                    <span className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500">Propuestas</span>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-white/5 transition-colors">
                                    <span className="block text-xl font-extrabold text-white mb-0.5">{client._count.deals}</span>
                                    <span className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500">Deals</span>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-white/5 transition-colors">
                                    <span className="block text-xl font-extrabold text-white mb-0.5">{client._count.contracts}</span>
                                    <span className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500">Contratos</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
