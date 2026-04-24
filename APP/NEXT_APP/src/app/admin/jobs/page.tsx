import Link from "next/link";
import { requireAnyPermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import {
    Briefcase,
    Clock,
    Target,
    TrendingUp,
    Search,
    GitCompareArrows,
    Kanban,
    ArrowRight,
    Sparkles,
    Activity,
    BarChart3,
} from "lucide-react";
import { SOURCE_LABELS } from "./types";
import { timeAgo, scoreColor } from "./utils";

export const dynamic = "force-dynamic";

type ActivityEntry = {
    kind: "analysis" | "event";
    id: string;
    createdAt: Date;
    title: string;
    subtitle: string;
    badge?: { label: string; className: string } | null;
};

export default async function JobsDashboardPage() {
    const session = await requireAnyPermission([
        "jobs.vacancies.view",
        "jobs.applications.view",
    ]);

    const userId = session.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
        activeVacancies,
        inactiveVacancies,
        pendingApps,
        cvAdaptedApps,
        cvSentApps,
        interviewApps,
        acceptedApps,
        rejectedApps,
        closedApps,
        avgMatchAgg,
        recentAnalyses,
        recentEvents,
        sourceCounts,
        recentAdaptationsCount,
    ] = await Promise.all([
        prisma.jobVacancy.count({ where: { userId, isActive: true } }),
        prisma.jobVacancy.count({ where: { userId, isActive: false } }),
        prisma.jobApplication.count({ where: { userId, status: "PENDING" } }),
        prisma.jobApplication.count({ where: { userId, status: "CV_ADAPTED" } }),
        prisma.jobApplication.count({ where: { userId, status: "CV_SENT" } }),
        prisma.jobApplication.count({ where: { userId, status: "INTERVIEW" } }),
        prisma.jobApplication.count({ where: { userId, status: "ACCEPTED" } }),
        prisma.jobApplication.count({ where: { userId, status: "REJECTED" } }),
        prisma.jobApplication.count({ where: { userId, status: "CLOSED" } }),
        prisma.vacancyAnalysis.aggregate({
            where: { userId },
            _avg: { matchScore: true },
        }),
        prisma.vacancyAnalysis.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                matchScore: true,
                createdAt: true,
                vacancy: { select: { title: true, company: true } },
            },
        }),
        prisma.jobApplicationEvent.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                toStatus: true,
                fromStatus: true,
                createdAt: true,
                application: {
                    select: {
                        vacancy: { select: { title: true, company: true } },
                    },
                },
            },
        }),
        prisma.jobVacancy.groupBy({
            by: ["source"],
            where: { userId, isActive: true },
            _count: { _all: true },
        }),
        prisma.cvVacancyAdaptation.count({
            where: {
                vacancy: { userId },
                createdAt: { gte: sevenDaysAgo },
            },
        }),
    ]);

    const totalApps = pendingApps + cvAdaptedApps + cvSentApps + interviewApps + acceptedApps + rejectedApps + closedApps;
    const interviewOrHigher = interviewApps + acceptedApps;
    const interviewRate = totalApps > 0 ? Math.round((interviewOrHigher / totalApps) * 100) : 0;
    const avgMatch = Math.round(avgMatchAgg._avg.matchScore || 0);
    const avgStyle = scoreColor(avgMatch);
    const maxFunnel = Math.max(cvAdaptedApps + pendingApps, cvSentApps, interviewApps, acceptedApps, rejectedApps + closedApps, 1);

    const activity: ActivityEntry[] = [
        ...recentAnalyses.map((a) => ({
            kind: "analysis" as const,
            id: a.id,
            createdAt: a.createdAt,
            title: `Análisis — ${a.vacancy.title}`,
            subtitle: a.vacancy.company,
            badge: {
                label: `${a.matchScore}%`,
                className: `${scoreColor(a.matchScore).bg} ${scoreColor(a.matchScore).text} ${scoreColor(a.matchScore).border}`,
            },
        })),
        ...recentEvents.map((e) => ({
            kind: "event" as const,
            id: e.id,
            createdAt: e.createdAt,
            title: e.application.vacancy.title,
            subtitle: `${e.application.vacancy.company} · ${e.fromStatus || "—"} → ${e.toStatus}`,
            badge: null,
        })),
    ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 8);

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Vacantes activas"
                    value={activeVacancies}
                    hint={`${inactiveVacancies} archivadas`}
                    accent="cyan"
                />
                <KpiCard
                    icon={<Clock className="w-4 h-4" />}
                    label="En pipeline"
                    value={totalApps}
                    hint={`${pendingApps} pendientes`}
                    accent="blue"
                />
                <KpiCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Tasa entrevista"
                    value={`${interviewRate}%`}
                    hint={`${interviewApps} en entrevista`}
                    accent="amber"
                />
                <KpiCard
                    icon={<Target className="w-4 h-4" />}
                    label="Match promedio"
                    value={`${avgMatch}%`}
                    hint={avgStyle.label}
                    accent="emerald"
                />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <QuickAction
                    href="/admin/jobs/search"
                    icon={<Search className="w-5 h-5" />}
                    title="Buscar vacantes"
                    description="Importa desde LinkedIn, Computrabajo, Laborum y más"
                />
                <QuickAction
                    href="/admin/jobs/analysis"
                    icon={<GitCompareArrows className="w-5 h-5" />}
                    title="Análisis & adaptación"
                    description="Compara vacante vs CV y adapta con IA"
                />
                <QuickAction
                    href="/admin/jobs/pipeline"
                    icon={<Kanban className="w-5 h-5" />}
                    title="Pipeline"
                    description="Gestiona el avance de tus postulaciones"
                />
            </div>

            {/* Funnel + activity feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Conversion funnel — 2/3 */}
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <BarChart3 className="w-4 h-4 text-accent-1" />
                        <h3 className="text-sm font-bold text-white">Embudo de postulaciones</h3>
                    </div>

                    {totalApps === 0 ? (
                        <p className="text-xs text-neutral-500 italic py-4">
                            Sin postulaciones aún. Analiza una vacante para crear tu primera.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <FunnelBar
                                label="CV Adaptados"
                                count={cvAdaptedApps}
                                max={maxFunnel}
                                colorClass="bg-slate-500"
                            />
                            <FunnelBar
                                label="Enviados"
                                count={cvSentApps}
                                max={maxFunnel}
                                colorClass="bg-blue-500"
                            />
                            <FunnelBar
                                label="En Entrevista"
                                count={interviewApps}
                                max={maxFunnel}
                                colorClass="bg-cyan-400"
                            />
                            <FunnelBar
                                label="Aceptados"
                                count={acceptedApps}
                                max={maxFunnel}
                                colorClass="bg-emerald-500"
                            />
                            <div className="pt-3 mt-3 border-t border-white/5">
                                <FunnelBar
                                    label="Rechazados / Cerrados"
                                    count={rejectedApps + closedApps}
                                    max={maxFunnel}
                                    colorClass="bg-red-500/60"
                                    warning
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity feed + source distribution stacked — 1/3 */}
                <div className="space-y-4">
                    {/* Activity */}
                    <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-accent-1" />
                                <h3 className="text-sm font-bold text-white">Actividad reciente</h3>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-500">
                                {recentAdaptationsCount} adapt. (7d)
                            </span>
                        </div>
                        {activity.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic py-2">
                                Sin actividad reciente.
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {activity.map((item) => (
                                    <li
                                        key={`${item.kind}-${item.id}`}
                                        className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                item.kind === "analysis"
                                                    ? "bg-cyan-400"
                                                    : "bg-emerald-400"
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">
                                                {item.title}
                                            </p>
                                            <p className="text-[10px] text-neutral-500 truncate">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                        {item.badge && (
                                            <span
                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${item.badge.className}`}
                                            >
                                                {item.badge.label}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                                            {timeAgo(item.createdAt.toISOString())}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Source distribution */}
                    <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-accent-1" />
                            <h3 className="text-sm font-bold text-white">Fuentes activas</h3>
                        </div>
                        {sourceCounts.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic">Sin vacantes activas.</p>
                        ) : (
                            <ul className="space-y-2">
                                {sourceCounts
                                    .sort((a, b) => b._count._all - a._count._all)
                                    .map((row) => {
                                        const label = SOURCE_LABELS[row.source] || row.source;
                                        const pct =
                                            activeVacancies > 0
                                                ? Math.round(
                                                      (row._count._all / activeVacancies) * 100
                                                  )
                                                : 0;
                                        return (
                                            <li key={row.source} className="space-y-1">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-neutral-300 font-medium truncate">
                                                        {label}
                                                    </span>
                                                    <span className="text-neutral-500 font-mono ml-2 shrink-0">
                                                        {row._count._all} · {pct}%
                                                    </span>
                                                </div>
                                                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-accent-1/70 rounded-full"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FunnelBar({
    label,
    count,
    max,
    colorClass,
    warning = false,
}: {
    label: string;
    count: number;
    max: number;
    colorClass: string;
    warning?: boolean;
}) {
    const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 3 : 0) : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="w-36 text-xs font-medium text-neutral-300 truncate shrink-0">{label}</div>
            <div className="flex-1 h-5 bg-[#05080f] rounded-full overflow-hidden border border-white/5">
                <div
                    className={`h-full ${colorClass} transition-all duration-700 ease-out rounded-full`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div
                className={`w-6 text-right text-xs font-bold tabular-nums shrink-0 ${
                    warning ? "text-red-400" : "text-white"
                }`}
            >
                {count}
            </div>
        </div>
    );
}

function KpiCard({
    icon,
    label,
    value,
    hint,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    hint?: string;
    accent: "cyan" | "blue" | "amber" | "emerald";
}) {
    const borderStyle = {
        cyan: "border-cyan-500/20 from-cyan-500/5",
        blue: "border-blue-500/20 from-blue-500/5",
        amber: "border-amber-500/20 from-amber-500/5",
        emerald: "border-emerald-500/20 from-emerald-500/5",
    }[accent];

    const iconColor = {
        cyan: "text-cyan-300",
        blue: "text-blue-300",
        amber: "text-amber-300",
        emerald: "text-emerald-300",
    }[accent];

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border ${borderStyle} bg-gradient-to-br to-transparent backdrop-blur-xl p-4`}
        >
            <div className={`flex items-center gap-2 mb-2 ${iconColor}`}>
                {icon}
                <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
            {hint && <p className="text-[10px] text-neutral-500 mt-1">{hint}</p>}
        </div>
    );
}

function QuickAction({
    href,
    icon,
    title,
    description,
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="group rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5 hover:border-accent-1/40 hover:bg-[#0a0f1c]/80 transition-all"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-1/10 text-accent-1 flex items-center justify-center group-hover:bg-accent-1/20 transition-colors">
                    {icon}
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-accent-1 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
            <p className="text-xs text-neutral-500">{description}</p>
        </Link>
    );
}
