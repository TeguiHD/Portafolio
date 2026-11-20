"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, ExternalLink, TrendingUp, TrendingDown,
    Monitor, Smartphone, Tablet, Globe, Chrome, AlertCircle
} from "lucide-react";
import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

interface ToolData {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    isActive: boolean;
    createdAt: string;
}

interface Stats {
    views: number;
    uses: number;
    downloads: number;
    errors: number;
    conversionRate: number;
    trend: number;
    last7Days: number;
}

interface TimeSeriesPoint {
    date: string;
    views: number;
    uses: number;
    downloads: number;
}

interface DistributionItem {
    device?: string;
    browser?: string;
    country?: string;
    count: number;
}

interface RecentUsage {
    id: string;
    action: string;
    device: string | null;
    browser: string | null;
    country: string | null;
    createdAt: string;
}

interface AnalyticsData {
    tool: ToolData;
    stats: Stats;
    timeSeries: TimeSeriesPoint[];
    deviceStats: DistributionItem[];
    browserStats: DistributionItem[];
    countryStats: DistributionItem[];
    recentUsage: RecentUsage[];
}

// Clases literales (Tailwind no ve las que se arman al vuelo, como `${color}/20`).
const actionLabels: Record<string, { label: string; insignia: string }> = {
    view: { label: "Vista", insignia: "bg-sky-500/10 text-sky-400" },
    use: { label: "Uso", insignia: "bg-violet-500/10 text-violet-400" },
    generate: { label: "Generación", insignia: "bg-violet-500/10 text-violet-400" },
    download: { label: "Descarga", insignia: "bg-emerald-500/10 text-emerald-400" },
    error: { label: "Error", insignia: "bg-red-500/10 text-red-400" },
};

const deviceIcons: Record<string, typeof Monitor> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
    unknown: Globe,
};

const nombreDispositivo: Record<string, string> = {
    desktop: "Escritorio",
    mobile: "Celular",
    tablet: "Tableta",
    unknown: "Desconocido",
};

// Vistas → usos → descargas es un embudo: tres tonos del acento, de suave a fuerte.
const SERIES = [
    { clave: "downloads", nombre: "Descargas", color: "var(--acento)" },
    { clave: "uses", nombre: "Usos", color: "color-mix(in srgb, var(--acento) 62%, transparent)" },
    { clave: "views", nombre: "Vistas", color: "color-mix(in srgb, var(--acento) 30%, transparent)" },
] as const;

const numero = new Intl.NumberFormat("es-CL");
const H2 = "text-[15px] font-semibold text-[var(--mut)]";
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";

export default function ToolAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<7 | 30>(7);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/tools/admin/${params.id}`);
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Herramienta no encontrada");
                    if (res.status === 401) {
                        router.push("/acceso");
                        return;
                    }
                    throw new Error("Error al cargar datos");
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id, router]);

    if (loading) {
        return <EsqueletoSeccion nombre="las estadísticas de la herramienta" cifras={4} filas={5} />;
    }

    if (error || !data) {
        return (
            <div role="alert" className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
                <AlertCircle aria-hidden="true" size={32} className="text-red-400" />
                <h1 className="text-xl font-semibold text-[var(--txt)]">{error || "Error"}</h1>
                <Link href="/admin/herramientas" className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-[var(--acento)] hover:underline ${FOCO}`}>
                    <ArrowLeft aria-hidden="true" size={16} />
                    Volver a herramientas
                </Link>
            </div>
        );
    }

    const { tool, stats, timeSeries, deviceStats, browserStats, countryStats, recentUsage } = data;

    // Filter time series based on selected range
    const filteredTimeSeries = timeSeries.slice(timeRange === 7 ? -7 : 0);
    const maxValue = Math.max(...filteredTimeSeries.map(d => Math.max(d.views, d.uses, d.downloads)), 1);

    // Calculate totals for distribution charts
    const totalDevices = deviceStats.reduce((acc, d) => acc + d.count, 0);
    const totalBrowsers = browserStats.reduce((acc, b) => acc + b.count, 0);

    const suma = (k: "views" | "uses" | "downloads") => filteredTimeSeries.reduce((acc, p) => acc + p[k], 0);
    const resumenGrafico = `Actividad de los últimos ${timeRange} días: ${numero.format(suma("views"))} vistas, ${numero.format(suma("uses"))} usos y ${numero.format(suma("downloads"))} descargas.`;

    const estado = tool.isActive && tool.isPublic
        ? { texto: "Pública", insignia: "bg-emerald-500/10 text-emerald-400" }
        : tool.isActive
            ? { texto: "Solo admin", insignia: "bg-amber-500/10 text-amber-400" }
            : { texto: "Desactivada", insignia: "bg-red-500/10 text-red-400" };

    const sube = stats.trend >= 0;
    const cifras = [
        { etiqueta: "Vistas totales", valor: numero.format(stats.views) },
        { etiqueta: "Usos totales", valor: numero.format(stats.uses) },
        { etiqueta: "Descargas", valor: numero.format(stats.downloads) },
        { etiqueta: "Frente a la semana anterior", valor: `${stats.trend > 0 ? "+" : ""}${stats.trend}%`, tendencia: true },
        { etiqueta: "Tasa de conversión (vistas → usos)", valor: `${stats.conversionRate}%` },
        { etiqueta: "Interacciones, últimos 7 días", valor: numero.format(stats.last7Days) },
    ];

    return (
        <div className="max-w-[1180px] space-y-10">
            {/* Encabezado */}
            <header className="space-y-4">
                <Link
                    href="/admin/herramientas"
                    className={`-ml-1 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm text-[var(--mut)] transition-colors duration-150 motion-reduce:transition-none hover:text-[var(--txt)] ${FOCO}`}
                >
                    <ArrowLeft aria-hidden="true" size={16} />
                    Volver a herramientas
                </Link>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">{tool.name}</h1>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.insignia}`}>
                                {estado.texto}
                            </span>
                        </div>
                        {tool.description && (
                            <p className="mt-1 max-w-[60ch] text-[15px] text-[var(--mut)]">{tool.description}</p>
                        )}
                    </div>
                    <a
                        href={`/herramientas/${tool.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-10 max-sm:min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--linea-2)] px-4 text-sm font-medium text-[var(--txt)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] ${FOCO}`}
                    >
                        <ExternalLink aria-hidden="true" size={16} className="text-[var(--mut)]" />
                        Ver herramienta
                        <span className="sr-only"> (se abre en otra pestaña)</span>
                    </a>
                </div>
            </header>

            {/* Cifras */}
            <dl aria-label="Cifras de la herramienta" className="grid grid-cols-2 border-t border-[var(--linea)] md:grid-cols-3">
                {cifras.map((c) => (
                    <div key={c.etiqueta} className="flex flex-col-reverse border-b border-[var(--linea)] py-4 pr-4 md:[&:not(:nth-child(3n+1))]:border-l md:[&:not(:nth-child(3n+1))]:pl-5">
                        <dt className="text-[13.5px] text-[var(--mut)]">{c.etiqueta}</dt>
                        <dd className="flex items-center gap-2 text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">
                            {c.tendencia && (sube
                                ? <TrendingUp aria-hidden="true" size={18} className="text-[var(--sube)]" />
                                : <TrendingDown aria-hidden="true" size={18} className="text-[var(--baja)]" />)}
                            {c.valor}
                        </dd>
                    </div>
                ))}
            </dl>

            {/* Actividad en el tiempo */}
            <section aria-labelledby="herr-actividad">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="herr-actividad" className={H2}>Actividad en el tiempo</h2>
                    <div className="flex gap-1 rounded-xl border border-[var(--linea-2)] p-1" role="group" aria-label="Rango del gráfico">
                        {([7, 30] as const).map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setTimeRange(d)}
                                aria-pressed={timeRange === d}
                                className={`min-h-9 max-sm:min-h-10 rounded-lg px-3 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${FOCO} ${timeRange === d
                                    ? "bg-[var(--acento)] text-[var(--acento-tinta)]"
                                    : "text-[var(--mut)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)]"
                                    }`}
                            >
                                {d} días
                            </button>
                        ))}
                    </div>
                </div>

                {/* Barras apiladas */}
                <div className="border-t border-[var(--linea)] pt-6">
                    <div role="img" aria-label={resumenGrafico} className="flex h-40 items-end gap-1 sm:h-48">
                        {filteredTimeSeries.map((point, idx) => {
                            const total = point.views + point.uses + point.downloads;
                            const height = maxValue > 0 ? (total / maxValue) * 100 : 0;
                            const alturas = {
                                views: maxValue > 0 ? (point.views / maxValue) * 100 : 0,
                                uses: maxValue > 0 ? (point.uses / maxValue) * 100 : 0,
                                downloads: maxValue > 0 ? (point.downloads / maxValue) * 100 : 0,
                            };

                            return (
                                <div
                                    key={point.date}
                                    className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1"
                                >
                                    <div className="flex w-full flex-col items-center gap-0.5 overflow-hidden rounded-t" style={{ height: `${height}%` }}>
                                        {SERIES.map((s) => alturas[s.clave] > 0 && (
                                            <div
                                                key={s.clave}
                                                className="w-full"
                                                style={{ background: s.color, height: `${(alturas[s.clave] / height) * 100}%`, minHeight: "2px" }}
                                            />
                                        ))}
                                    </div>
                                    <span aria-hidden="true" className="hidden font-mono text-[10px] text-[var(--mut)] sm:block">
                                        {new Date(point.date).getDate()}
                                    </span>

                                    {/* Globo */}
                                    {/* Oculto (no solo transparente) hasta el puntero: así en los extremos no ensancha la página. */}
                                    <div className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] px-2.5 py-1.5 text-xs text-[var(--txt)] shadow-lg group-hover:block ${idx < 2 ? "left-0" : idx >= filteredTimeSeries.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                                        <div className="font-medium">{new Date(point.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</div>
                                        <div className="text-[var(--mut)]">Vistas: <b className="font-semibold tabular-nums text-[var(--txt)]">{point.views}</b></div>
                                        <div className="text-[var(--mut)]">Usos: <b className="font-semibold tabular-nums text-[var(--txt)]">{point.uses}</b></div>
                                        <div className="text-[var(--mut)]">Descargas: <b className="font-semibold tabular-nums text-[var(--txt)]">{point.downloads}</b></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Leyenda */}
                    <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[var(--mut)]">
                        {[...SERIES].reverse().map((s) => (
                            <li key={s.clave} className="flex items-center gap-1.5">
                                <span aria-hidden="true" className="size-3 rounded-sm" style={{ background: s.color }} />
                                {s.nombre}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Distribución */}
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14">
                <section aria-labelledby="herr-dispositivo" className="min-w-0">
                    <h2 id="herr-dispositivo" className={`${H2} mb-2`}>Por dispositivo</h2>
                    {deviceStats.length > 0 ? (
                        <ul className="border-t border-[var(--linea)]">
                            {deviceStats.map((item) => {
                                const percentage = totalDevices > 0 ? (item.count / totalDevices) * 100 : 0;
                                const DeviceIcon = deviceIcons[item.device || "unknown"] || Globe;
                                return (
                                    <li key={item.device} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3">
                                        <DeviceIcon aria-hidden="true" size={16} className="shrink-0 text-[var(--mut)]" />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1.5 flex justify-between gap-3 text-sm">
                                                <span className="truncate text-[var(--txt)]">{nombreDispositivo[item.device ?? "unknown"] ?? item.device ?? "Desconocido"}</span>
                                                <span className="shrink-0 tabular-nums text-[var(--mut)]"><b className="font-semibold text-[var(--txt)]">{numero.format(item.count)}</b> ({percentage.toFixed(0)}%)</span>
                                            </div>
                                            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[var(--linea)]">
                                                <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin datos de dispositivos</p>
                    )}
                </section>

                <section aria-labelledby="herr-navegador" className="min-w-0">
                    <h2 id="herr-navegador" className={`${H2} mb-2`}>Por navegador</h2>
                    {browserStats.length > 0 ? (
                        <ul className="border-t border-[var(--linea)]">
                            {browserStats.slice(0, 5).map((item) => {
                                const percentage = totalBrowsers > 0 ? (item.count / totalBrowsers) * 100 : 0;
                                return (
                                    <li key={item.browser} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3">
                                        <Chrome aria-hidden="true" size={16} className="shrink-0 text-[var(--mut)]" />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1.5 flex justify-between gap-3 text-sm">
                                                <span className="truncate capitalize text-[var(--txt)]">{item.browser || "Desconocido"}</span>
                                                <span className="shrink-0 tabular-nums text-[var(--mut)]"><b className="font-semibold text-[var(--txt)]">{numero.format(item.count)}</b> ({percentage.toFixed(0)}%)</span>
                                            </div>
                                            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[var(--linea)]">
                                                <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin datos de navegadores</p>
                    )}
                </section>
            </div>

            {/* Por país */}
            {countryStats.length > 0 && (
                <section aria-labelledby="herr-pais">
                    <h2 id="herr-pais" className={`${H2} mb-2`}>Por país</h2>
                    <ul className="flex flex-wrap gap-2 border-t border-[var(--linea)] pt-3">
                        {countryStats.map((item) => (
                            <li key={item.country} className="rounded-lg border border-[var(--linea)] px-3 py-1.5 text-sm">
                                <span className="text-[var(--txt)]">{item.country}</span>
                                <span className="ml-2 tabular-nums text-[var(--mut)]">{numero.format(item.count)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Actividad reciente */}
            <section aria-labelledby="herr-reciente">
                <h2 id="herr-reciente" className={`${H2} mb-2`}>Actividad reciente</h2>

                {recentUsage.length > 0 ? (
                    <div className="overflow-x-auto border-t border-[var(--linea)]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--linea)]">
                                    <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Acción</th>
                                    <th scope="col" className="hidden px-3 py-2 text-left text-sm font-medium text-[var(--mut)] sm:table-cell">Dispositivo</th>
                                    <th scope="col" className="hidden px-3 py-2 text-left text-sm font-medium text-[var(--mut)] md:table-cell">Navegador</th>
                                    <th scope="col" className="px-3 py-2 text-right text-sm font-medium text-[var(--mut)]">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsage.map((usage) => {
                                    const actionInfo = actionLabels[usage.action] || { label: usage.action, insignia: "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]" };
                                    return (
                                        <tr key={usage.id} className="border-b border-[var(--linea)]">
                                            <td className="px-3 py-2.5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionInfo.insignia}`}>
                                                    {actionInfo.label}
                                                </span>
                                            </td>
                                            <td className="hidden px-3 py-2.5 text-[var(--mut)] sm:table-cell">
                                                {usage.device ? (nombreDispositivo[usage.device] ?? usage.device) : "-"}
                                            </td>
                                            <td className="hidden px-3 py-2.5 text-[var(--mut)] md:table-cell">
                                                {usage.browser || "-"}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[var(--mut)]">
                                                {new Date(usage.createdAt).toLocaleString("es-CL", {
                                                    day: "numeric",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="border-t border-[var(--linea)] py-8 text-center text-sm text-[var(--mut)]">
                        Aún no hay actividad registrada
                    </p>
                )}
            </section>
        </div>
    );
}
