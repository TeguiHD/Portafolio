import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GestionComercialDashboard() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.dashboard"
    );
    if (!canView) redirect("/admin");

    // Fetch aggregate stats — defensive to handle stale Prisma client
    let totalDeals = 0, activeDeals = 0, totalContracts = 0, activeContracts = 0, totalClients = 0;
    try {
        [totalDeals, activeDeals, totalContracts, activeContracts, totalClients] = await Promise.all([
            prisma.deal.count({
                where: { userId: session.user.id, isDeleted: false },
            }),
            prisma.deal.count({
                where: {
                    userId: session.user.id,
                    isDeleted: false,
                    stage: { in: ["PROSPECT", "CONTACTED", "PROPOSAL", "NEGOTIATION"] },
                },
            }),
            prisma.contract.count({
                where: { userId: session.user.id, isDeleted: false },
            }),
            prisma.contract.count({
                where: {
                    userId: session.user.id,
                    isDeleted: false,
                    status: "ACTIVE",
                },
            }),
            prisma.quotationClient.count({
                where: { userId: session.user.id },
            }),
        ]);
    } catch (error) {
        console.error("[CRM Dashboard] Error fetching stats:", error);
    }

    const stats = [
        {
            label: "Oportunidades Activas",
            value: activeDeals,
            total: totalDeals,
            icon: "📈",
            color: "from-blue-600/20 to-cyan-500/10",
            hoverColor: "group-hover:opacity-30",
            border: "border-blue-500/20",
        },
        {
            label: "Contratos Activos",
            value: activeContracts,
            total: totalContracts,
            icon: "✍️",
            color: "from-emerald-600/20 to-green-500/10",
            hoverColor: "group-hover:opacity-30",
            border: "border-emerald-500/20",
        },
        {
            label: "Clientes Totales",
            value: totalClients,
            total: null,
            icon: "🤝",
            color: "from-violet-600/20 to-purple-500/10",
            hoverColor: "group-hover:opacity-30",
            border: "border-violet-500/20",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Gestión Comercial
                </h1>
                <p className="text-neutral-400 mt-1">
                    Resumen general de tu actividad comercial
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br ${stat.color} border ${stat.border} backdrop-blur-md group hover:-translate-y-1 transition-all duration-300 shadow-lg`}
                    >
                        <div className={`absolute inset-0 bg-white opacity-0 ${stat.hoverColor} transition-opacity duration-300`} />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-3xl filter drop-shadow-md">{stat.icon}</span>
                            </div>
                            <p className="text-4xl font-extrabold text-white tracking-tight">
                                {stat.value}
                            </p>
                            <p className="text-sm font-medium text-neutral-300 mt-2">
                                {stat.label}
                                {stat.total !== null && (
                                    <span className="text-neutral-500 font-normal">
                                        {" "}
                                        / {stat.total} total
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="p-7 rounded-3xl bg-[#0a0f1c]/80 border border-white/5 backdrop-blur-xl shadow-2xl">
                <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                    <span className="text-accent-1">⚡</span> Acciones Rápidas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Nueva Oportunidad", href: "/admin/gestion-comercial/pipeline", icon: "💎", color: "from-blue-500/10 to-indigo-500/5 text-blue-400" },
                        { label: "Ver Clientes", href: "/admin/gestion-comercial/clientes", icon: "👥", color: "from-purple-500/10 to-fuchsia-500/5 text-purple-400" },
                        { label: "Crear Propuesta", href: "/admin/cotizaciones", icon: "📝", color: "from-emerald-500/10 to-green-500/5 text-emerald-400" },
                        { label: "Registrar Pago", href: "/admin/gestion-comercial/pagos", icon: "💰", color: "from-amber-500/10 to-yellow-500/5 text-amber-400" },
                    ].map((action) => (
                        <a
                            key={action.label}
                            href={action.href}
                            className={`flex flex-col gap-3 p-5 rounded-2xl bg-gradient-to-br ${action.color} border border-white/5 hover:border-white/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg`}
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm">
                                {action.icon}
                            </span>
                            <span className="text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors">
                                {action.label}
                            </span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Coming Soon Modules */}
            <div className="p-7 rounded-3xl bg-[#0a0f1c]/50 border border-white/5 backdrop-blur-xl">
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-neutral-400">🚀</span> Próximos Módulos
                </h2>
                <p className="text-sm text-neutral-400 mb-6">
                    Módulos en fase de planificación y desarrollo progresivo para expandir el CRM
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { name: "Portal del Cliente", desc: "Seguimiento de hitos para clientes, vista pública protegida", status: "Planificado", icon: "🌐" },
                        { name: "Firma Digital", desc: "Aprobación de contratos y términos con respaldo legal", status: "Planificado", icon: "✍️" },
                        { name: "Flujo de Caja", desc: "Dashboard de proyección financiera y cuentas por cobrar", status: "Planificado", icon: "📈" },
                    ].map((mod) => (
                        <div
                            key={mod.name}
                            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group cursor-default"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{mod.icon}</span>
                                    <span className="text-sm font-semibold text-neutral-200">
                                        {mod.name}
                                    </span>
                                </div>
                                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-white/5 text-neutral-400 border border-white/10">
                                    {mod.status}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-500 leading-relaxed font-medium">{mod.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
