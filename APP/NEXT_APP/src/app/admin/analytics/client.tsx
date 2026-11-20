"use client";

import { useMemo, useState, useRef } from "react";
import { ReferrerIcon, getReferrerDisplayName } from "@/components/admin/ReferrerIcons";
import type { DatosVisitas } from "./datos";

type DateRangeOption = {
    label: string;
    detalle: string;
    days: number;
};

const dateRangeOptions: DateRangeOption[] = [
    { label: "Hoy", detalle: "hoy", days: 1 },
    { label: "7 días", detalle: "últimos 7 días", days: 7 },
    { label: "30 días", detalle: "últimos 30 días", days: 30 },
    { label: "90 días", detalle: "últimos 90 días", days: 90 },
];

// Nombres legibles de las rutas públicas (el panel, el portal y /api no se cuentan).
const pathDisplayNames: Record<string, string> = {
    "/": "Inicio",
    "/herramientas": "Herramientas",
    "/blog": "Blog",
    "/privacidad": "Privacidad",
    "/terminos": "Términos",
};

function getPathDisplayName(path: string): string {
    if (pathDisplayNames[path]) return pathDisplayNames[path];

    for (const prefijo of ["/herramientas/", "/blog/"]) {
        if (path.startsWith(prefijo)) {
            const nombre = path.slice(prefijo.length).replace(/-/g, " ");
            const seccion = prefijo === "/blog/" ? "Blog: " : "";
            return seccion + nombre.charAt(0).toUpperCase() + nombre.slice(1);
        }
    }

    return path;
}

// El mismo formato que «Hoy»: así la cifra de 30 días se lee igual en las dos pantallas.
const numero = new Intl.NumberFormat("es-CL");

const H2 = "text-[15px] font-semibold text-[var(--mut)]";
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";

function Cargando() {
    return (
        <div role="status" className="flex h-36 items-center justify-center border-t border-[var(--linea)]">
            <span className="sr-only">Cargando…</span>
            <div aria-hidden="true" className="size-6 rounded-full border-2 border-[var(--acento)] border-t-transparent animate-spin motion-reduce:animate-none" />
        </div>
    );
}

/** Globo con la cifra de un día (se ve al pasar el puntero o al tocar un punto o una barra). */
function Globo({ valor, etiqueta }: { valor: number; etiqueta: string }) {
    return (
        <div className="rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] px-3 py-1.5 text-center shadow-lg">
            <p className="text-base font-bold tabular-nums text-[var(--txt)]">{numero.format(valor)}</p>
            <p className="text-[11px] text-[var(--mut)]">{etiqueta}</p>
        </div>
    );
}

export default function AnalyticsPageClient({ inicial }: { inicial: DatosVisitas }) {
    const [data, setData] = useState<DatosVisitas>(inicial);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDays, setSelectedDays] = useState(inicial.days);
    const [chartType, setChartType] = useState<"area" | "bar">("area");

    const areaChartRef = useRef<HTMLDivElement>(null);

    // Chart hover/click states (for tooltips - works on mobile with click)
    const [hoveredPoint, setHoveredPoint] = useState<{ index: number; views: number; label: string } | null>(null);
    const [pointPositions, setPointPositions] = useState<{ x: number; y: number }[]>([]);
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    // Si se cambia de rango varias veces seguidas, solo vale la última respuesta.
    const pedidoRef = useRef(0);

    const loadData = async (days: number) => {
        const pedido = ++pedidoRef.current;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/analytics?days=${days}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: DatosVisitas = await res.json();
            if (pedido !== pedidoRef.current) return;
            setData(json);
        } catch {
            if (pedido !== pedidoRef.current) return;
            setError("No se pudieron cargar las visitas de ese rango. Vuelve a intentarlo.");
            setSelectedDays(data.days);
        } finally {
            if (pedido === pedidoRef.current) setLoading(false);
        }
    };

    // El rango inicial ya viene del servidor: solo se pide a la API cuando cambia.
    const handleDateRangeChange = (days: number) => {
        if (days === selectedDays) return;
        setSelectedDays(days);
        void loadData(days);
    };

    const maxViews = useMemo(() => {
        if (!data?.pageViewsByDay?.length) return 0;
        return Math.max(...data.pageViewsByDay.map((d) => d.views));
    }, [data]);

    const ctaEntries = useMemo(() => {
        if (!data?.ctaClicks) return [] as { action: string; clicks: number; percentage: number }[];
        const total = Object.values(data.ctaClicks).reduce((acc, n) => acc + n, 0) || 1;
        return Object.entries(data.ctaClicks)
            .sort((a, b) => b[1] - a[1])
            .map(([action, clicks]) => ({
                action,
                clicks,
                percentage: Math.round((clicks / total) * 100),
            }));
    }, [data]);

    const referrers = useMemo(() => {
        if (!data?.topReferrers) return [];
        return data.topReferrers.map((ref) => ({
            source: ref.source,
            displayName: getReferrerDisplayName(ref.source || "Directo"),
            visits: ref.visits,
        }));
    }, [data]);

    const topPages = useMemo(() => {
        if (!data?.topPages) return [];
        // Porcentaje sobre todas las visitas del rango, no solo sobre las diez páginas de la lista.
        const totalViews = data.pageViews || 1;
        return data.topPages.map((page) => ({
            path: page.path,
            displayName: getPathDisplayName(page.path),
            visits: page.visits,
            percentage: Math.round((page.visits / totalViews) * 100),
        }));
    }, [data]);

    const overviewStats = [
        { label: "Visitas", value: data.pageViews },
        { label: "Visitantes (IP distintas)", value: data.uniqueVisitors },
        { label: "Clics en botones", value: ctaEntries.reduce((acc, c) => acc + c.clicks, 0) },
        { label: "Páginas distintas", value: data.uniquePages },
        ...(data.quotations !== null ? [{ label: "Propuestas enviadas", value: data.quotations }] : []),
    ];

    // Lo que se muestra es siempre el rango de los datos cargados, no el botón recién pulsado.
    const shownOption = dateRangeOptions.find(opt => opt.days === data.days);
    const rangoTexto = shownOption?.detalle ?? `últimos ${data.days} días`;
    const resumenGrafico = `${numero.format(data.pageViews)} visitas en ${rangoTexto}; el día con más tuvo ${numero.format(maxViews)}.`;

    return (
        <div className="max-w-[1180px] space-y-10">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">Visitas</h1>
                    <p className="mt-1 max-w-[60ch] text-[15px] text-[var(--mut)]">
                        Sitio público, {rangoTexto} (días en hora de Chile). No cuenta el panel, el portal ni el acceso.
                    </p>
                </div>

                {/* Selector de rango */}
                <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-[var(--linea-2)] p-1" role="group" aria-label="Rango de fechas">
                    {dateRangeOptions.map((option) => (
                        <button
                            key={option.days}
                            type="button"
                            aria-pressed={selectedDays === option.days}
                            onClick={() => handleDateRangeChange(option.days)}
                            className={`min-h-10 max-sm:min-h-11 rounded-lg px-3 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${FOCO} ${selectedDays === option.days
                                ? "bg-[var(--acento)] text-[var(--acento-tinta)]"
                                : "text-[var(--mut)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)]"
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </header>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            {/* Cifras del rango */}
            <dl
                aria-label={`Cifras de ${rangoTexto}`}
                aria-live="polite"
                aria-busy={loading}
                className={`grid grid-cols-2 border-t border-[var(--linea)] ${overviewStats.length > 4 ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"}`}
            >
                {overviewStats.map((stat) => (
                    <div key={stat.label} className="flex flex-col-reverse border-b border-[var(--linea)] py-4 pr-4 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-5">
                        <dt className="text-[13.5px] text-[var(--mut)]">{stat.label}</dt>
                        <dd className="text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{loading ? "…" : numero.format(stat.value)}</dd>
                    </div>
                ))}
            </dl>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)] lg:gap-14">
                {/* Visitas por día */}
                <section aria-labelledby="visitas-dia" className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h2 id="visitas-dia" className={`${H2} flex items-baseline gap-2`}>
                            Visitas por día
                            {!loading && <small className="font-mono text-[12.5px] font-medium">máx. {numero.format(maxViews)}</small>}
                        </h2>

                        {/* Tipo de gráfico */}
                        <div className="flex gap-1" role="group" aria-label="Tipo de gráfico">
                            <button
                                type="button"
                                onClick={() => setChartType("area")}
                                className={`grid size-10 max-sm:size-11 place-items-center rounded-lg transition-colors duration-150 motion-reduce:transition-none ${FOCO} ${chartType === "area" ? "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--acento)]" : "text-[var(--mut)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)]"}`}
                                title="Área"
                                aria-label="Gráfico de área"
                                aria-pressed={chartType === "area"}
                            >
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M2 17L7 12L12 15L17 8L22 12V20H2V17Z" fill="currentColor" fillOpacity="0.3" />
                                    <path d="M2 17L7 12L12 15L17 8L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartType("bar")}
                                className={`grid size-10 max-sm:size-11 place-items-center rounded-lg transition-colors duration-150 motion-reduce:transition-none ${FOCO} ${chartType === "bar" ? "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--acento)]" : "text-[var(--mut)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)]"}`}
                                title="Barras"
                                aria-label="Gráfico de barras"
                                aria-pressed={chartType === "bar"}
                            >
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <rect x="4" y="14" width="4" height="6" rx="1" fill="currentColor" />
                                    <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" />
                                    <rect x="16" y="11" width="4" height="9" rx="1" fill="currentColor" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <Cargando />
                    ) : chartType === "bar" ? (
                        /* Barras con eje */
                        <div className="relative border-t border-[var(--linea)] pt-4" onClick={() => setSelectedBarIndex(null)}>
                            {/* Eje Y */}
                            <div aria-hidden="true" className="absolute left-0 top-4 bottom-12 flex w-8 flex-col justify-between font-mono text-[10px] text-[var(--mut)]">
                                <span>{maxViews}</span>
                                <span>{Math.round(maxViews * 0.75)}</span>
                                <span>{Math.round(maxViews * 0.5)}</span>
                                <span>{Math.round(maxViews * 0.25)}</span>
                                <span>0</span>
                            </div>

                            <div className="relative ml-9">
                                {/* Contenedor que se desliza de lado (dentro de su caja; la página no) */}
                                <div
                                    className={`overflow-x-auto overflow-y-visible pb-2 rounded-md ${FOCO}`}
                                    style={{ scrollbarWidth: "thin" }}
                                    tabIndex={data.days > 14 ? 0 : undefined}
                                    role={data.days > 14 ? "region" : undefined}
                                    aria-label={data.days > 14 ? "Barras por día (se desliza de lado)" : undefined}
                                >
                                    <div
                                        role="img"
                                        aria-label={resumenGrafico}
                                        className="flex items-end gap-1 pt-14"
                                        style={{
                                            minWidth: data.days > 14 ? `${data.days * 36}px` : "auto",
                                            height: "180px",
                                            paddingRight: data.days > 14 ? "20px" : "0",
                                        }}
                                    >
                                        {(data?.pageViewsByDay || []).map((day, idx) => {
                                            const barHeight = maxViews ? Math.max((day.views / maxViews) * 100, 5) : 5;
                                            const isSelected = selectedBarIndex === idx;
                                            return (
                                                <div
                                                    key={day.date}
                                                    className={`relative flex h-full min-w-[28px] max-w-[45px] flex-1 flex-col items-center ${isSelected ? "" : "group/bar"}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBarIndex(isSelected ? null : idx);
                                                    }}
                                                >
                                                    {/* Globo */}
                                                    <div
                                                        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none ${isSelected ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100"}`}
                                                        style={{ bottom: "calc(100% + 8px)", zIndex: 50 }}
                                                    >
                                                        <Globo valor={day.views} etiqueta={day.label} />
                                                    </div>

                                                    <div className="flex w-full flex-1 flex-col items-center justify-end">
                                                        <div
                                                            className={`relative w-full cursor-pointer rounded-t bg-[var(--acento)] transition-opacity duration-150 motion-reduce:transition-none ${isSelected ? "opacity-100" : "opacity-75 group-hover/bar:opacity-100"}`}
                                                            style={{ minHeight: "8px", height: `${barHeight}%` }}
                                                        >
                                                            {barHeight > 20 && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="text-[10px] sm:text-xs font-bold tabular-nums text-[var(--acento-tinta)]">
                                                                        {day.views}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Eje X */}
                                                    <span className={`mt-1.5 whitespace-nowrap font-mono text-[9px] sm:text-[10px] transition-colors duration-150 motion-reduce:transition-none ${isSelected ? "text-[var(--acento)]" : "text-[var(--mut)] group-hover/bar:text-[var(--txt)]"}`}>
                                                        {data.days > 30 ? day.date.slice(8) : day.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Línea del eje X */}
                                <div aria-hidden="true" className="absolute left-0 right-0 bottom-7 h-px bg-[var(--linea-2)]" />
                            </div>

                            {data.days > 14 && (
                                <p className="mt-1 text-center text-xs text-[var(--mut)]">Desliza para ver más días</p>
                            )}
                        </div>
                    ) : (
                        /* Área */
                        <div className="relative border-t border-[var(--linea)] pt-4" onClick={() => setHoveredPoint(null)}>
                            <div className="relative h-40 sm:h-48" ref={areaChartRef}>
                                {(() => {
                                    const chartData = data?.pageViewsByDay || [];
                                    if (chartData.length === 0) return <p className="text-sm text-[var(--mut)]">Sin datos</p>;

                                    const width = 400;
                                    const height = 150;
                                    const padding = { top: 20, right: 15, bottom: 5, left: 15 };
                                    const chartWidth = width - padding.left - padding.right;
                                    const chartHeight = height - padding.top - padding.bottom;

                                    const max = maxViews || 1;
                                    const points = chartData.map((d, i) => ({
                                        x: padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth,
                                        y: padding.top + chartHeight - (d.views / max) * chartHeight,
                                        views: d.views,
                                        label: d.label,
                                    }));

                                    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                                    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

                                    const handlePointInteraction = (i: number, p: typeof points[0], e: React.MouseEvent<SVGCircleElement>) => {
                                        e.stopPropagation();
                                        if (hoveredPoint?.index === i) {
                                            setHoveredPoint(null);
                                            return;
                                        }

                                        // Posición real del punto dentro del contenedor, para poner el globo encima.
                                        const circle = e.currentTarget;
                                        const container = areaChartRef.current;
                                        if (container) {
                                            const containerRect = container.getBoundingClientRect();
                                            const circleRect = circle.getBoundingClientRect();
                                            const relativeX = circleRect.left - containerRect.left + circleRect.width / 2;
                                            const relativeY = circleRect.top - containerRect.top;
                                            // El globo no se sale de la caja en los extremos (en celular ensancharía la página).
                                            const x = Math.min(Math.max(relativeX, 48), Math.max(containerRect.width - 48, 48));
                                            setPointPositions([{ x, y: relativeY }]);
                                        }

                                        setHoveredPoint({ index: i, views: p.views, label: p.label });
                                    };

                                    return (
                                        <>
                                            <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={resumenGrafico}>
                                                {/* Líneas guía */}
                                                {[0, 25, 50, 75, 100].map(pct => (
                                                    <line
                                                        key={pct}
                                                        x1={padding.left}
                                                        y1={padding.top + chartHeight * (1 - pct / 100)}
                                                        x2={width - padding.right}
                                                        y2={padding.top + chartHeight * (1 - pct / 100)}
                                                        style={{ stroke: "var(--linea)" }}
                                                        strokeWidth="1"
                                                        strokeDasharray="4,4"
                                                    />
                                                ))}

                                                {/* Relleno */}
                                                <path d={areaPath} style={{ fill: "var(--acento)" }} fillOpacity="0.12" />

                                                {/* Línea */}
                                                <path
                                                    d={linePath}
                                                    fill="none"
                                                    style={{ stroke: "var(--acento)" }}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />

                                                {/* Puntos (se tocan o se señalan para ver la cifra) */}
                                                {points.map((p, i) => (
                                                    <circle
                                                        key={i}
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={hoveredPoint?.index === i ? "7" : "5"}
                                                        style={{ fill: hoveredPoint?.index === i ? "var(--acento)" : "var(--sup)", stroke: "var(--acento)" }}
                                                        strokeWidth="2"
                                                        className="cursor-pointer"
                                                        onMouseEnter={(e) => handlePointInteraction(i, p, e)}
                                                        onMouseLeave={() => setHoveredPoint(null)}
                                                        onClick={(e) => handlePointInteraction(i, p, e)}
                                                    />
                                                ))}
                                            </svg>

                                            {hoveredPoint !== null && pointPositions.length > 0 && (
                                                <div
                                                    className="pointer-events-none absolute"
                                                    style={{
                                                        left: `${pointPositions[0].x}px`,
                                                        top: `${pointPositions[0].y}px`,
                                                        transform: "translate(-50%, calc(-100% - 10px))",
                                                        zIndex: 50,
                                                    }}
                                                >
                                                    <Globo valor={hoveredPoint.views} etiqueta={hoveredPoint.label} />
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Etiquetas del eje X */}
                            <div aria-hidden="true" className="mt-1 flex justify-between px-2">
                                {(() => {
                                    const chartData = data?.pageViewsByDay || [];
                                    const step = Math.max(1, Math.ceil(chartData.length / 7));
                                    return chartData
                                        .filter((_, i) => i % step === 0 || i === chartData.length - 1)
                                        .map((day, i) => (
                                            <span key={i} className="font-mono text-[11px] sm:text-xs text-[var(--mut)]">
                                                {data.days > 14 ? day.date.slice(8) : day.label}
                                            </span>
                                        ));
                                })()}
                            </div>
                        </div>
                    )}
                </section>

                {/* Páginas más visitadas */}
                <section aria-labelledby="visitas-paginas" className="min-w-0">
                    <h2 id="visitas-paginas" className={`${H2} mb-2`}>Páginas más visitadas</h2>
                    {loading ? (
                        <Cargando />
                    ) : topPages.length === 0 ? (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin datos de páginas en el periodo.</p>
                    ) : (
                        <ul className="border-t border-[var(--linea)]">
                            {topPages.slice(0, 6).map((page) => (
                                <li key={page.path} className="border-b border-[var(--linea)] px-1 py-3">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--txt)]" title={page.path}>{page.displayName}</span>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--txt)]">
                                            {numero.format(page.visits)} <span className="font-normal text-[var(--mut)]">({page.percentage}%)</span>
                                        </span>
                                    </div>
                                    <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--linea)]">
                                        <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${page.percentage}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
                {/* Clics en botones */}
                <section aria-labelledby="visitas-clics" className="min-w-0">
                    <h2 id="visitas-clics" className={`${H2} mb-2`}>Clics en botones</h2>
                    {loading ? (
                        <Cargando />
                    ) : ctaEntries.length === 0 ? (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin clics registrados en el periodo.</p>
                    ) : (
                        <ul className="border-t border-[var(--linea)]">
                            {ctaEntries.map((cta) => (
                                <li key={cta.action} className="border-b border-[var(--linea)] px-1 py-3">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--txt)]">{cta.action}</span>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--txt)]">
                                            {numero.format(cta.clicks)} <span className="font-normal text-[var(--mut)]">({cta.percentage}%)</span>
                                        </span>
                                    </div>
                                    <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--linea)]">
                                        <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${cta.percentage}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Fuentes de tráfico */}
                <section aria-labelledby="visitas-fuentes" className="min-w-0">
                    <h2 id="visitas-fuentes" className={`${H2} mb-2`}>Fuentes de tráfico</h2>
                    {loading ? (
                        <Cargando />
                    ) : referrers.length === 0 ? (
                        <p className="border-t border-[var(--linea)] py-4 text-sm text-[var(--mut)]">Sin fuentes registradas en el periodo.</p>
                    ) : (
                        <ul className="border-t border-[var(--linea)]">
                            {referrers.map((ref, idx) => (
                                <li key={`${ref.source}-${idx}`} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3">
                                    <ReferrerIcon source={ref.source} />
                                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--txt)]" title={ref.source ?? undefined}>{ref.displayName}</span>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--txt)]">{numero.format(ref.visits)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
