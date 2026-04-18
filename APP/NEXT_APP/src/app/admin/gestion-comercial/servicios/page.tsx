import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(d: Date | null): string {
    if (!d) return "—";
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-neutral-500/10 text-neutral-300",
    ACTIVE: "bg-emerald-500/10 text-emerald-400",
    PAUSED: "bg-amber-500/10 text-amber-400",
    COMPLETED: "bg-blue-500/10 text-blue-400",
    CANCELLED: "bg-red-500/10 text-red-400",
    EXPIRED: "bg-orange-500/10 text-orange-400",
};

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Borrador", ACTIVE: "Activo", PAUSED: "Pausado",
    COMPLETED: "Completado", CANCELLED: "Cancelado", EXPIRED: "Vencido",
};

const TYPE_LABELS: Record<string, string> = {
    PROJECT: "Proyecto", RETAINER: "Retainer", MAINTENANCE: "Mantenimiento", CONSULTING: "Consultoría",
};

export default async function ServiciosPage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.contracts.view"
    );
    if (!canView) redirect("/admin");

    // Fetch contracts, clients with CRM data, and recent payments in parallel
    const [contracts, clients, recentPayments] = await Promise.all([
        prisma.contract.findMany({
            where: { userId: session.user.id, isDeleted: false },
            include: {
                client: { select: { id: true, name: true, workType: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.quotationClient.findMany({
            where: { userId: session.user.id, isActive: true },
            select: {
                id: true, name: true, company: true, workType: true,
                contactName: true, contactEmail: true, contactPhone: true,
                _count: { select: { quotations: true } },
            },
            orderBy: { name: "asc" },
        }),
        prisma.quotationPayment.findMany({
            where: { quotation: { userId: session.user.id } },
            include: {
                quotation: {
                    select: { projectName: true, client: { select: { name: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
    ]);

    const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
    const totalContractValue = contracts.reduce((s, c) => s + c.totalAmount, 0);
    const totalPayments = recentPayments.reduce((s, p) => s + p.amount, 0);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    Servicios
                </h1>
                <p className="text-sm text-neutral-400 mt-2">
                    Contratos, clientes y pagos en una vista unificada
                </p>
            </div>

            {/* Quick metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-emerald-600/20 to-green-500/10 border border-emerald-500/20 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80 mb-2">Contratos Activos</p>
                    <p className="text-3xl font-extrabold text-white">{activeContracts.length}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Valor Total Contratos</p>
                    <p className="text-3xl font-extrabold text-emerald-400">{formatCurrency(totalContractValue)}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Clientes Activos</p>
                    <p className="text-3xl font-extrabold text-white">{clients.length}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Pagos Recientes</p>
                    <p className="text-3xl font-extrabold text-accent-1">{formatCurrency(totalPayments)}</p>
                </div>
            </div>

            {/* Two-column layout: Contracts + Clients */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Contracts */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="text-accent-1">📄</span> Contratos Activos
                        </h2>
                        <Link href="/admin/gestion-comercial/contratos"
                            className="text-sm font-medium text-accent-1 hover:text-accent-2 transition-colors flex items-center gap-1">
                            Ver todos <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>

                    {contracts.length === 0 ? (
                        <div className="p-10 rounded-3xl bg-white/5 border border-white/10 text-center shadow-inner">
                            <div className="text-4xl mb-3 filter grayscale opacity-50">📋</div>
                            <p className="text-neutral-400 text-sm font-medium">No hay contratos activos</p>
                            <Link href="/admin/gestion-comercial/contratos"
                                className="inline-flex mt-4 items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-1/10 text-accent-1 hover:bg-accent-1/20 border border-accent-1/20 text-sm font-semibold transition-all hover:scale-[1.02]">
                                <span>+</span> Crear Contrato
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {contracts.slice(0, 8).map((contract) => (
                                <Link key={contract.id} href="/admin/gestion-comercial/contratos"
                                    className="group p-5 rounded-2xl bg-[#111827]/60 border border-white/5 hover:bg-[#1f2937]/80 hover:border-white/20 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-mono tracking-wider font-semibold text-neutral-400 bg-black/30 px-2 py-1 rounded-md">{contract.contractNumber}</span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wide px-2.5 py-1 rounded-full ${STATUS_COLORS[contract.status]} shadow-sm`}>
                                                {STATUS_LABELS[contract.status] || contract.status}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">{TYPE_LABELS[contract.type] || contract.type}</span>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-white leading-snug group-hover:text-accent-1 transition-colors">{contract.title}</h3>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-inner">
                                                {contract.client.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-neutral-300">{contract.client.name}</span>
                                        </div>
                                        <span className="text-[15px] font-extrabold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">{formatCurrency(contract.totalAmount)}</span>
                                    </div>
                                    {(contract.startDate || contract.endDate) && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-[11px] font-medium text-neutral-400">
                                                {formatDate(contract.startDate)} <span className="text-neutral-600 mx-1">→</span> {formatDate(contract.endDate)}
                                            </p>
                                            {contract.autoRenew && <span title="Renovación Automática" className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] ml-auto">🔄 Auto</span>}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Clients */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="text-blue-400">👥</span> Directorio de Clientes
                        </h2>
                        <Link href="/admin/gestion-comercial/clientes"
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                            Ver todos <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>

                    {clients.length === 0 ? (
                        <div className="p-10 rounded-3xl bg-white/5 border border-white/10 text-center shadow-inner">
                            <div className="text-4xl mb-3 filter grayscale opacity-50">👥</div>
                            <p className="text-neutral-400 text-sm font-medium">No hay clientes registrados</p>
                            <Link href="/admin/cotizaciones"
                                className="inline-flex mt-4 items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-sm font-semibold transition-all hover:scale-[1.02]">
                                Ir a Propuestas
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {clients.slice(0, 8).map((client) => (
                                <Link key={client.id} href={`/admin/gestion-comercial/clientes`}
                                    className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-white">{client.name.charAt(0)}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[15px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">{client.name}</h3>
                                            <p className="text-xs text-neutral-400 truncate mt-0.5">
                                                {client.company || "Independiente"}
                                                {client.workType && <span className="text-neutral-500 font-medium"> · {client.workType}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-[11px] font-bold text-neutral-300 bg-white/5 px-2 py-1 rounded-md mb-1 border border-white/5">
                                            {client._count.quotations} DOC{client._count.quotations !== 1 ? "S" : ""}
                                        </span>
                                        {(client.contactEmail || client.contactPhone) && (
                                            <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[120px]">
                                                {client.contactPhone || client.contactEmail}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent payments */}
            <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <span className="text-emerald-400">💰</span> Pagos Recientes
                    </h2>
                    <Link href="/admin/gestion-comercial/pagos"
                        className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                        Ver historial <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>

                {recentPayments.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-white/5 border border-white/10 text-center shadow-inner">
                        <span className="text-4xl filter grayscale opacity-50 block mb-3">💳</span>
                        <p className="text-neutral-400 text-sm font-medium">Aún no hay pagos registrados</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {recentPayments.map((p) => (
                            <Link key={p.id} href="/admin/gestion-comercial/pagos"
                                className="group p-4 rounded-2xl bg-[#0a0f1c]/80 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col justify-between gap-3 h-full relative overflow-hidden cursor-pointer"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full group-hover:bg-emerald-500/20 transition-colors" />

                                <div>
                                    <div className="flex items-start justify-between mb-1 relative z-10">
                                        <p className="text-sm font-bold text-white truncate pr-4 group-hover:text-emerald-400 transition-colors">{p.quotation.projectName || "Proyecto General"}</p>
                                    </div>
                                    <p className="text-xs text-neutral-400 font-medium relative z-10">{p.quotation.client?.name}</p>
                                </div>

                                <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/5">
                                    <p className="text-[11px] font-semibold text-neutral-500">
                                        {new Date(p.paidAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                                    </p>
                                    <span className="text-lg font-extrabold text-emerald-400 tracking-tight">+{formatCurrency(p.amount)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
