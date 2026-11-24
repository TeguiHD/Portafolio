import Link from "next/link";
import { requireAnyPermission } from "@/lib/page-security";
import { prisma } from "@/lib/prisma";
import { Search, GitCompareArrows, ListChecks, ArrowRight } from "lucide-react";
import { SOURCE_LABELS, STATUS_LABELS } from "./types";
import { timeAgo, scoreColor } from "./utils";
import { FILA_HOVER, TITULO } from "./estilos";

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

    // Un groupBy por tabla en vez de un count por estado: 7 consultas en total y no 14 contra un pool de 5 conexiones.
    const [
        vacanciesByActive,
        appsByStatus,
        avgMatchAgg,
        recentAnalyses,
        recentEvents,
        sourceCounts,
        recentAdaptationsCount,
    ] = await Promise.all([
        prisma.jobVacancy.groupBy({
            by: ["isActive"],
            where: { userId },
            _count: { _all: true },
        }),
        prisma.jobApplication.groupBy({
            by: ["status"],
            where: { userId },
            _count: { _all: true },
        }),
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

    const activeVacancies = vacanciesByActive.find((r) => r.isActive)?._count._all ?? 0;
    const inactiveVacancies = vacanciesByActive.find((r) => !r.isActive)?._count._all ?? 0;
    const porEstado = (status: (typeof appsByStatus)[number]["status"]) => appsByStatus.find((r) => r.status === status)?._count._all ?? 0;
    const pendingApps = porEstado("PENDING");
    const cvAdaptedApps = porEstado("CV_ADAPTED");
    const cvSentApps = porEstado("CV_SENT");
    const interviewApps = porEstado("INTERVIEW");
    const acceptedApps = porEstado("ACCEPTED");
    const rejectedApps = porEstado("REJECTED");
    const closedApps = porEstado("CLOSED");

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
            title: `Análisis: ${a.vacancy.title}`,
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
            subtitle: `${e.application.vacancy.company}: ${e.fromStatus ? STATUS_LABELS[e.fromStatus] : "—"} → ${STATUS_LABELS[e.toStatus]}`,
            badge: null,
        })),
    ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 8);

    const cifras: Array<{ label: string; value: string | number; hint: string }> = [
        { label: "Vacantes activas", value: activeVacancies, hint: `${inactiveVacancies} archivadas` },
        { label: "Postulaciones", value: totalApps, hint: `${pendingApps} pendientes` },
        { label: "Llegan a entrevista", value: `${interviewRate}%`, hint: `${interviewApps} en entrevista` },
        { label: "Coincidencia promedio", value: `${avgMatch}%`, hint: `Ajuste ${avgStyle.label.toLowerCase()}` },
    ];

    const fuentes = [...sourceCounts].sort((a, b) => b._count._all - a._count._all);

    return (
        <div className="space-y-12">
            <dl aria-label="Resumen de postulaciones" className="grid grid-cols-2 border-y border-[var(--linea)] md:grid-cols-4">
                {cifras.map((c, i) => (
                    <div
                        key={c.label}
                        className={`flex flex-col gap-1 border-[var(--linea)] py-4 ${i % 2 === 1 ? "border-l pl-4" : "pl-0.5 pr-4"} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l md:pl-4" : ""}`}
                    >
                        <dt className="order-2 text-sm text-[var(--mut)]">{c.label}</dt>
                        <dd className="order-1 m-0 text-[30px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-[var(--txt)]">
                            {c.value}
                        </dd>
                        <dd className="order-3 m-0 font-mono text-xs text-[var(--mut)]">{c.hint}</dd>
                    </div>
                ))}
            </dl>

            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)] lg:gap-14">
                <div className="space-y-12">
                    <section aria-labelledby="embudo-titulo">
                        <h2 id="embudo-titulo" className={`${TITULO} mb-3`}>Embudo de postulaciones</h2>
                        {totalApps === 0 ? (
                            <p className="border-t border-[var(--linea)] py-4 text-[var(--mut)]">
                                Aún no hay postulaciones. Analiza una vacante para crear la primera.
                            </p>
                        ) : (
                            <dl className="grid gap-3.5 border-t border-[var(--linea)] pt-4">
                                <FunnelBar label="CV adaptados" count={cvAdaptedApps} max={maxFunnel} />
                                <FunnelBar label="Enviados" count={cvSentApps} max={maxFunnel} />
                                <FunnelBar label="En entrevista" count={interviewApps} max={maxFunnel} />
                                <FunnelBar label="Aceptados" count={acceptedApps} max={maxFunnel} />
                                <FunnelBar label="Rechazados o cerrados" count={rejectedApps + closedApps} max={maxFunnel} warning />
                            </dl>
                        )}
                    </section>

                    <section aria-labelledby="atajos-titulo">
                        <h2 id="atajos-titulo" className={`${TITULO} mb-2`}>Siguiente paso</h2>
                        <ul className="border-t border-[var(--linea)]">
                            <QuickAction
                                href="/admin/jobs/search"
                                icon={<Search className="size-[18px]" aria-hidden="true" />}
                                title="Buscar vacantes"
                                description="Importa desde LinkedIn, Computrabajo, Laborum y otros portales."
                            />
                            <QuickAction
                                href="/admin/jobs/analysis"
                                icon={<GitCompareArrows className="size-[18px]" aria-hidden="true" />}
                                title="Análisis y adaptación"
                                description="Compara una vacante con tu CV y adáptalo con IA."
                            />
                            <QuickAction
                                href="/admin/jobs/pipeline"
                                icon={<ListChecks className="size-[18px]" aria-hidden="true" />}
                                title="Seguimiento"
                                description="Avanza el estado de cada postulación."
                            />
                        </ul>
                    </section>
                </div>

                <div className="space-y-12">
                    <section aria-labelledby="actividad-titulo">
                        <h2 id="actividad-titulo" className={`${TITULO} mb-2 flex flex-wrap items-baseline justify-between gap-x-3`}>
                            Actividad reciente
                            <small className="font-mono text-xs font-medium">
                                {recentAdaptationsCount} {recentAdaptationsCount === 1 ? "adaptación" : "adaptaciones"} en 7 días
                            </small>
                        </h2>
                        {activity.length === 0 ? (
                            <p className="border-t border-[var(--linea)] py-4 text-[var(--mut)]">Sin actividad reciente.</p>
                        ) : (
                            <ul className="border-t border-[var(--linea)]">
                                {activity.map((item) => (
                                    <li
                                        key={`${item.kind}-${item.id}`}
                                        className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-[var(--linea)] px-0.5 py-3"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`row-span-2 size-2 rounded-full ${item.kind === "analysis" ? "bg-[var(--acento)]" : "bg-[var(--mut)]"}`}
                                        />
                                        <p className="m-0 truncate text-sm font-semibold text-[var(--txt)]">
                                            {item.kind === "event" && <span className="sr-only">Cambio de estado: </span>}
                                            {item.title}
                                        </p>
                                        <span className="row-span-2 flex flex-col items-end gap-1">
                                            {item.badge && (
                                                <span className={`rounded-md border px-1.5 py-0.5 font-mono text-xs ${item.badge.className}`}>
                                                    {item.badge.label}
                                                </span>
                                            )}
                                            <time dateTime={item.createdAt.toISOString()} className="whitespace-nowrap font-mono text-xs text-[var(--mut)]">
                                                {timeAgo(item.createdAt.toISOString())}
                                            </time>
                                        </span>
                                        <p className="col-start-2 m-0 truncate text-xs text-[var(--mut)]">{item.subtitle}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="fuentes-titulo">
                        <h2 id="fuentes-titulo" className={`${TITULO} mb-3`}>Fuentes de las vacantes activas</h2>
                        {fuentes.length === 0 ? (
                            <p className="border-t border-[var(--linea)] py-4 text-[var(--mut)]">Sin vacantes activas.</p>
                        ) : (
                            <dl className="grid gap-3 border-t border-[var(--linea)] pt-4">
                                {fuentes.map((row) => {
                                    const label = SOURCE_LABELS[row.source] || row.source;
                                    const pct = activeVacancies > 0 ? Math.round((row._count._all / activeVacancies) * 100) : 0;
                                    return (
                                        <div key={row.source} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm">
                                            <dt className="truncate text-[var(--txt)]">{label}</dt>
                                            <dd className="m-0 font-mono text-xs tabular-nums text-[var(--mut)]">
                                                {row._count._all} ({pct}%)
                                            </dd>
                                            <dd aria-hidden="true" className="col-span-2 m-0 h-1.5 overflow-hidden rounded-full bg-[var(--linea-2)]">
                                                <span className="block h-full rounded-full bg-[var(--acento)]" style={{ width: `${pct}%` }} />
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function FunnelBar({
    label,
    count,
    max,
    warning = false,
}: {
    label: string;
    count: number;
    max: number;
    warning?: boolean;
}) {
    const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 3 : 0) : 0;
    return (
        <div className="grid grid-cols-[minmax(7rem,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
            <dt className="truncate text-[var(--mut)]">{label}</dt>
            <dd aria-hidden="true" className="m-0 h-1.5 overflow-hidden rounded-full bg-[var(--linea-2)]">
                <span
                    className={`block h-full rounded-full ${warning ? "bg-red-400" : "bg-[var(--acento)]"}`}
                    style={{ width: `${pct}%` }}
                />
            </dd>
            <dd className={`m-0 text-right font-mono text-[13px] font-semibold tabular-nums ${warning ? "text-red-400" : "text-[var(--txt)]"}`}>
                {count}
            </dd>
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
        <li>
            <Link
                href={href}
                className={`group grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-[var(--linea)] px-1 py-4 text-[var(--txt)] ${FILA_HOVER} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]`}
            >
                <span className="row-span-2 text-[var(--mut)]">{icon}</span>
                <span className="font-semibold">{title}</span>
                <ArrowRight className="row-span-2 size-4 text-[var(--mut)] transition-colors duration-150 group-hover:text-[var(--acento)]" aria-hidden="true" />
                <span className="col-start-2 text-sm text-[var(--mut)]">{description}</span>
            </Link>
        </li>
    );
}
