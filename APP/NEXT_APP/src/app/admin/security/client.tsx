"use client";

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    AlertTriangle, CheckCircle, Clock, RefreshCw,
    Activity, Eye, X, ChevronDown, ChevronLeft, ChevronRight, Search,
    AlertOctagon, Radio, MapPin,
    ShieldCheck, User, MessageSquare,
} from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { toast } from "sonner";
import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

// Types
interface SecurityStats {
    bySeverity: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
    byType: Array<{ type: string; count: number }>;
    unresolvedCount: number;
    hourlyTrend: Array<{ hour: string; count: number }>;
    suspiciousIps: Array<{ ipHash: string; count: number }>;
    recentIncidents: SecurityIncident[];
    range?: string;
    lastUpdated: string;
}

interface SecurityIncident {
    id: string;
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    ipHash: string;
    path: string | null;
    userAgent: string | null;
    userId: string | null;
    details: Record<string, unknown> | null;
    resolved: boolean;
    resolvedAt: string | null;
    resolvedBy: string | null;
    resolution: string | null;
    createdAt: string;
}

interface IncidentsResponse {
    incidents: SecurityIncident[];
    total: number;
    page: number;
    totalPages: number;
}

// Estilos comunes (tokens del tema: valen en claro y oscuro).
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const HOVER = "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]";
const BTN_SEC = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-3 rounded-lg border border-[var(--linea-2)] text-sm text-[var(--txt)] transition-colors ${HOVER} disabled:opacity-50 motion-reduce:transition-none ${FOCO}`;
const BTN_ICONO = `grid place-items-center size-10 max-sm:size-11 shrink-0 rounded-lg text-[var(--mut)] transition-colors hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] disabled:opacity-50 motion-reduce:transition-none ${FOCO}`;
// Los selectores de fecha y las listas nativas siguen el tema (sin esto, en oscuro el calendario sale claro).
const ESQUEMA = "[color-scheme:dark] [:root[data-tema=claro]_&]:[color-scheme:light]";
const CAMPO = `min-h-10 max-sm:min-h-11 px-3 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-sm text-[var(--txt)] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] ${ESQUEMA}`;
const H2 = "text-[15px] font-semibold text-[var(--mut)]";
const INSIGNIA = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

// Constants
const SEVERITY_CONFIG = {
    CRITICAL: { bg: "bg-red-500/10", text: "text-red-400", barra: "bg-red-400", icon: AlertOctagon },
    HIGH: { bg: "bg-amber-500/10", text: "text-amber-400", barra: "bg-amber-400", icon: AlertTriangle },
    MEDIUM: { bg: "bg-yellow-500/10", text: "text-yellow-400", barra: "bg-yellow-400", icon: Eye },
    LOW: { bg: "bg-emerald-500/10", text: "text-emerald-400", barra: "bg-emerald-400", icon: CheckCircle },
};

const SEVERITY_LABELS: Record<string, string> = { CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };
const ACTION_LABELS: Record<string, string> = { blocked: "Bloqueada", rate_limited: "Frenada por límite", honeypot_served: "Trampa servida" };

const TYPE_LABELS: Record<string, string> = {
    honeypot: "Trampa (honeypot)", blocked_url: "URL bloqueada", suspicious_ua: "Navegador sospechoso",
    rate_limit: "Límite de frecuencia", blocked_request: "Petición bloqueada",
    unauthorized_tool_access: "Acceso no autorizado", privilege_escalation: "Escalada de privilegios",
};

const ACTION_COLORS: Record<string, string> = {
    blocked: "bg-red-500/10 text-red-400", rate_limited: "bg-yellow-500/10 text-yellow-400",
    honeypot_served: "bg-purple-500/10 text-purple-400",
};

const TIME_RANGES = [
    { value: "24h", label: "24 h" },
    { value: "7d", label: "7 días" },
    { value: "30d", label: "30 días" },
    { value: "365d", label: "1 año" },
];

// Debounce hook
function useDebounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
}

// Utilities
function formatTimeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("es-CL", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

function formatTrendLabel(dateString: string, range: string): string {
    const date = new Date(dateString);
    if (range === "24h") return date.toLocaleTimeString("es-CL", { hour: "2-digit" }) + "h";
    if (range === "7d") return date.toLocaleDateString("es-CL", { weekday: "short" });
    if (range === "30d") return date.toLocaleDateString("es-CL", { day: "2-digit" });
    return date.toLocaleDateString("es-CL", { month: "short" });
}

// Components
function StatusBadge({ isLive, onToggle, disabled }: { isLive: boolean; onToggle: () => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className={`inline-flex items-center gap-2 min-h-10 max-sm:min-h-11 px-3 rounded-full border text-sm font-medium transition-colors disabled:opacity-50 motion-reduce:transition-none ${FOCO} ${isLive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : `border-[var(--linea-2)] text-[var(--mut)] ${HOVER}`}`}
        >
            {isLive && <span aria-hidden="true" className="size-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />}
            <Radio size={16} aria-hidden="true" />
            {isLive ? "En vivo" : "En pausa"}
        </button>
    );
}

/** Celda de una franja de cifras: separadas por líneas, sin tarjetas (como «Hoy»). */
const CELDA_CIFRA = "flex flex-col-reverse justify-end gap-1 px-3 sm:px-4 py-4 border-[var(--linea)] [&:not(:first-child)]:border-l first:pl-1";

function SeverityCard({ severity, count, total, isActive, onClick }: { severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; count: number; total: number; isActive: boolean; onClick: () => void }) {
    const config = SEVERITY_CONFIG[severity];
    const Icon = config.icon;
    const pct = total > 0 ? (count / total) * 100 : 0;

    return (
        <button
            type="button"
            aria-pressed={isActive}
            onClick={onClick}
            className={`flex flex-col gap-2 px-4 py-4 text-left border-[var(--linea)] max-lg:even:border-l max-lg:[&:nth-child(n+3)]:border-t lg:[&:not(:first-child)]:border-l transition-colors motion-reduce:transition-none ${FOCO} focus-visible:outline-offset-[-2px] ${isActive ? "bg-[color-mix(in_srgb,var(--acento)_9%,transparent)]" : HOVER}`}
        >
            <span className="flex items-center gap-2 text-[13.5px] text-[var(--mut)]">
                <Icon size={16} className={config.text} aria-hidden="true" />
                {SEVERITY_LABELS[severity]}
                {isActive && <span className="ml-auto text-xs font-medium text-[var(--acento)]">Filtrando</span>}
            </span>
            <span className="text-[28px] leading-none font-bold tracking-tight tabular-nums text-[var(--txt)]">{count}</span>
            <span aria-hidden="true" className="h-1.5 rounded-full bg-[var(--linea-2)] overflow-hidden">
                <span className={`block h-full rounded-full ${config.barra}`} style={{ width: `${pct}%` }} />
            </span>
        </button>
    );
}

// Gráfico de tendencia: un clic en un punto muestra su cifra al lado.
function TrendChart({
    data,
    range,
    selectedIndex,
    onPointClick,
    onBackgroundClick
}: {
    data: Array<{ hour: string; count: number }>;
    range: string;
    selectedIndex: number | null;
    onPointClick: (index: number, data: { hour: string; count: number }) => void;
    onBackgroundClick: () => void;
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!data.length) return (
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-[var(--mut)] border-y border-[var(--linea)]">
            <Activity size={18} aria-hidden="true" />
            <p className="text-sm">Sin incidentes en este periodo.</p>
        </div>
    );

    const max = Math.max(...data.map(d => d.count), 1);
    const total = data.reduce((s, d) => s + d.count, 0);
    const avg = total / data.length;

    // Chart dimensions - wide aspect ratio to fill container
    const chartWidth = 1000;
    const chartHeight = 300;
    const padding = { top: 35, right: 30, bottom: 55, left: 65 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Calculate points
    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1 || 1)) * innerWidth,
        y: padding.top + innerHeight - (d.count / max) * innerHeight,
        ...d
    }));

    // Create smooth bezier curve
    const createSmoothPath = () => {
        if (points.length < 2) return `M ${points[0]?.x} ${points[0]?.y}`;
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
        }
        return path;
    };

    const linePath = createSmoothPath();
    const areaPath = `${linePath} L ${points[points.length - 1].x},${padding.top + innerHeight} L ${points[0].x},${padding.top + innerHeight} Z`;

    // Y-axis ticks
    const yTicks = [0, Math.round(max / 2), max];

    // X-axis labels
    const xLabelCount = range === "24h" ? 6 : range === "7d" ? 7 : range === "30d" ? 5 : 6;
    const xLabelStep = Math.max(1, Math.floor(data.length / xLabelCount));

    return (
        <div className="relative">
            <p className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-[var(--mut)]">
                <span>Máx: <span className="font-medium tabular-nums text-[var(--txt)]">{max}</span></span>
                <span>Prom: <span className="font-medium tabular-nums text-[var(--txt)]">{avg.toFixed(1)}</span></span>
                <span>Total: <span className="font-medium tabular-nums text-[var(--txt)]">{total}</span></span>
                {selectedIndex !== null && (
                    <span className={`${INSIGNIA} bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)]`}>
                        Punto seleccionado
                    </span>
                )}
            </p>

            <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-[220px] sm:h-[280px] overflow-visible"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${total} incidentes en el periodo; máximo ${max} por punto y promedio ${avg.toFixed(1)}.`}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={onBackgroundClick}
            >
                {/* Background grid */}
                {yTicks.map((tick, i) => {
                    const y = padding.top + innerHeight - (tick / max) * innerHeight;
                    return (
                        <g key={i}>
                            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} className="stroke-[var(--linea)]" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="14" className="fill-[var(--mut)]">{tick}</text>
                        </g>
                    );
                })}

                {/* Average line */}
                <line x1={padding.left} y1={padding.top + innerHeight - (avg / max) * innerHeight} x2={chartWidth - padding.right} y2={padding.top + innerHeight - (avg / max) * innerHeight} className="stroke-[var(--linea-2)]" strokeDasharray="6,6" vectorEffect="non-scaling-stroke" />

                {/* Area fill */}
                <path d={areaPath} className="fill-[var(--acento)]" fillOpacity={0.1} />

                {/* Main line */}
                <path d={linePath} fill="none" className="stroke-[var(--acento)]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

                {/* Data points */}
                {points.map((p, i) => {
                    const isHovered = hoveredIndex === i;
                    const isSelected = selectedIndex === i;
                    const isRecent = i >= points.length - 3;

                    return (
                        <g key={i}>
                            {/* Hover area */}
                            <rect
                                x={p.x - (innerWidth / data.length) / 2} y={padding.top} width={innerWidth / data.length} height={innerHeight} fill="transparent"
                                style={{ cursor: "pointer" }}
                                onMouseEnter={() => setHoveredIndex(i)}
                                onClick={(e) => { e.stopPropagation(); onPointClick(i, { hour: p.hour, count: p.count }); }}
                            />

                            {/* Vertical line on hover/select */}
                            {(isHovered || isSelected) && (
                                <line x1={p.x} y1={padding.top} x2={p.x} y2={padding.top + innerHeight} className="stroke-[var(--acento)]" strokeOpacity={isSelected ? 0.7 : 0.35} strokeDasharray={isSelected ? "0" : "3,3"} strokeWidth={isSelected ? 2 : 1} vectorEffect="non-scaling-stroke" />
                            )}

                            {/* Point */}
                            <circle
                                cx={p.x} cy={p.y}
                                r={isSelected ? 12 : isHovered ? 10 : isRecent ? 6 : 4}
                                className={`pointer-events-none transition-[r] duration-150 motion-reduce:transition-none ${isSelected ? "fill-[var(--acento)] stroke-[var(--sup)]" : isHovered ? "fill-[var(--sup)] stroke-[var(--acento)]" : isRecent ? "fill-[var(--acento)]" : "fill-[var(--mut)] opacity-50"}`}
                                strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                            />
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {data.filter((_, i) => i % xLabelStep === 0 || i === data.length - 1).map((d, idx) => {
                    const i = idx === Math.ceil(data.length / xLabelStep) ? data.length - 1 : idx * xLabelStep;
                    if (i >= points.length) return null;
                    const p = points[i];
                    return (
                        <text key={idx} x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="13" className="fill-[var(--mut)]">
                            {formatTrendLabel(d.hour, range)}
                        </text>
                    );
                })}
            </svg>

            {/* Globo del punto bajo el cursor */}
            {hoveredIndex !== null && points[hoveredIndex] && (
                <div
                    aria-hidden="true"
                    className="absolute pointer-events-none z-20 px-3 py-2 rounded-lg bg-[var(--sup)] border border-[var(--linea-2)] shadow-lg text-center"
                    style={{
                        left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                        top: "24px",
                        transform: "translateX(-50%)"
                    }}
                >
                    <p className="text-xs text-[var(--mut)]">{formatTrendLabel(points[hoveredIndex].hour, range)}</p>
                    <p className="text-lg font-bold tabular-nums text-[var(--txt)]">{points[hoveredIndex].count}</p>
                    <p className="text-[11px] text-[var(--mut)]">Haz clic para ver la cifra</p>
                </div>
            )}
        </div>
    );
}

function ThreatDistribution({ data }: { data: Array<{ type: string; count: number }> }) {
    const total = data.reduce((s, d) => s + d.count, 0) || 1;
    if (!data.length) return <p className="py-4 text-sm text-[var(--mut)] border-t border-[var(--linea)]">Sin incidentes en este periodo.</p>;
    return (
        <ul className="border-t border-[var(--linea)]">
            {data.slice(0, 4).map((item) => (
                <li key={item.type} className="py-3 border-b border-[var(--linea)]">
                    <div className="flex justify-between gap-3 text-sm mb-1.5">
                        <span className="text-[var(--txt)] min-w-0 truncate">{TYPE_LABELS[item.type] || item.type}</span>
                        <span className="font-medium tabular-nums text-[var(--txt)]">{item.count}</span>
                    </div>
                    <div aria-hidden="true" className="h-1.5 rounded-full bg-[var(--linea-2)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${(item.count / total) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

// Ventana para resolver un incidente (<dialog> nativo).
function ResolutionModal({ incident, onClose, onSubmit }: { incident: SecurityIncident; onClose: () => void; onSubmit: (id: string, resolution: string) => Promise<string | null> }) {
    const [resolution, setResolution] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <DialogoFormulario
            titulo="Resolver incidente"
            descripcion={`${TYPE_LABELS[incident.type] || incident.type} · severidad ${(SEVERITY_LABELS[incident.severity] ?? incident.severity).toLowerCase()}`}
            alCerrar={onClose}
        >
            {(cerrar) => (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (submitting) return;
                        setSubmitting(true);
                        setError(null);
                        // Si falla, la ventana sigue abierta con el motivo (antes se cerraba como si se hubiera resuelto).
                        const fallo = await onSubmit(incident.id, resolution);
                        setSubmitting(false);
                        if (fallo) setError(fallo);
                        else cerrar();
                    }}
                    className="space-y-4"
                >
                    <dl className="grid grid-cols-2 border-y border-[var(--linea)] text-sm">
                        <div className="py-3 pr-3">
                            <dt className="text-xs text-[var(--mut)]">Fecha</dt>
                            <dd className="mt-0.5 text-[var(--txt)]">{formatDateTime(incident.createdAt)}</dd>
                        </div>
                        <div className="py-3 pl-3 border-l border-[var(--linea)] min-w-0">
                            <dt className="text-xs text-[var(--mut)]">Ruta</dt>
                            <dd className="mt-0.5 font-mono text-xs text-[var(--txt)] truncate">{incident.path || "—"}</dd>
                        </div>
                    </dl>
                    <div>
                        <label htmlFor="resolucion-notas" className="flex items-center gap-2 text-sm font-medium text-[var(--txt)] mb-2">
                            <MessageSquare size={16} className="text-[var(--mut)]" aria-hidden="true" />
                            Notas de resolución
                        </label>
                        <textarea
                            id="resolucion-notas"
                            value={resolution}
                            onChange={e => setResolution(e.target.value)}
                            placeholder="Describe cómo se resolvió el incidente"
                            maxLength={2000}
                            className="w-full h-32 px-3 py-2 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-sm text-[var(--txt)] placeholder:text-[var(--mut)] resize-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]"
                        />
                    </div>
                    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button type="button" onClick={cerrar} className={BTN_SEC}>Cancelar</button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg bg-[var(--acento)] text-[var(--acento-tinta)] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${FOCO}`}
                        >
                            {submitting ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCircle size={16} aria-hidden="true" />}
                            Resolver
                        </button>
                    </div>
                </form>
            )}
        </DialogoFormulario>
    );
}

function nivelRiesgo(valor: number): { clase: string; texto: string } {
    if (valor >= 75) return { clase: "text-red-400", texto: "alto" };
    if (valor >= 50) return { clase: "text-yellow-400", texto: "medio" };
    return { clase: "text-emerald-400", texto: "bajo" };
}

// Fila de incidente (más su fila de detalle cuando está abierta).
function IncidentRow({ incident, onResolve, isExpanded, onToggle }: { incident: SecurityIncident; onResolve: (incident: SecurityIncident) => void; isExpanded: boolean; onToggle: () => void }) {
    const config = SEVERITY_CONFIG[incident.severity];
    const Icon = config.icon;
    const details = incident.details || {};
    const riesgo = details.riskScore != null ? nivelRiesgo(Number(details.riskScore)) : null;
    const accion = details.actionTaken ? String(details.actionTaken) : null;

    return (
        <Fragment>
            <tr onClick={onToggle} className={`border-b border-[var(--linea)] cursor-pointer transition-colors motion-reduce:transition-none ${HOVER} ${incident.resolved ? "opacity-60" : ""}`}>
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                        <Icon size={16} className={`shrink-0 ${config.text}`} aria-hidden="true" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`${INSIGNIA} ${config.bg} ${config.text}`}>{SEVERITY_LABELS[incident.severity] ?? incident.severity}</span>
                                {incident.resolved && <span className={`${INSIGNIA} bg-emerald-500/10 text-emerald-400`}><CheckCircle size={12} aria-hidden="true" />Resuelto</span>}
                            </div>
                            <p className="mt-0.5 max-w-[24ch] truncate text-[var(--txt)]">{TYPE_LABELS[incident.type] || incident.type}</p>
                        </div>
                    </div>
                </td>
                <td className="hidden md:table-cell px-3 py-2.5 text-xs text-[var(--mut)] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{details.country ? String(details.country) : "—"}</span>
                </td>
                <td className="px-3 py-2.5">
                    <div className="max-w-[18ch] truncate font-mono text-xs text-[var(--mut)]">{incident.path || "—"}</div>
                </td>
                <td className="hidden lg:table-cell px-3 py-2.5">
                    {accion ? <span className={`${INSIGNIA} ${ACTION_COLORS[accion] || "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]"}`}>{ACTION_LABELS[accion] ?? accion}</span> : null}
                </td>
                <td className="px-3 py-2.5 text-xs text-[var(--mut)] whitespace-nowrap">
                    <span className="hidden sm:inline">{formatDateTime(incident.createdAt)}</span>
                    <span className="sm:hidden">{formatTimeAgo(incident.createdAt)}</span>
                </td>
                <td className="px-2 py-1">
                    <div className="flex items-center justify-end gap-1">
                        {!incident.resolved && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); onResolve(incident); }} className={`${BTN_ICONO} text-emerald-400 hover:text-emerald-400`} aria-label="Resolver" title="Resolver">
                                <CheckCircle size={16} aria-hidden="true" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            className={BTN_ICONO}
                        >
                            <ChevronDown size={16} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="border-b border-[var(--linea)] bg-[var(--fondo-2)]">
                    <td colSpan={6} className="px-4 py-4">
                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                            <div className="min-w-0"><dt className="text-xs text-[var(--mut)]">IP (cifrada)</dt><dd className="font-mono text-xs text-[var(--txt)] truncate">{incident.ipHash.slice(0, 16)}…</dd></div>
                            <div><dt className="text-xs text-[var(--mut)]">Fecha y hora</dt><dd className="text-[var(--txt)]">{formatDateTime(incident.createdAt)}</dd></div>
                            <div><dt className="text-xs text-[var(--mut)]">Riesgo</dt><dd className={riesgo ? riesgo.clase : "text-[var(--mut)]"}>{riesgo ? `${String(details.riskScore)} · ${riesgo.texto}` : "—"}</dd></div>
                            <div className="min-w-0"><dt className="text-xs text-[var(--mut)]">Navegador</dt><dd className="text-[var(--txt)] truncate">{incident.userAgent?.slice(0, 40) || "—"}</dd></div>
                        </dl>
                        {incident.resolved && (
                            <div className="mt-4 pt-4 border-t border-[var(--linea)]">
                                <p className="flex items-center gap-2 text-sm font-medium text-emerald-400"><ShieldCheck size={16} aria-hidden="true" />Resuelto</p>
                                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="flex items-start gap-2"><User size={16} className="mt-0.5 shrink-0 text-[var(--mut)]" aria-hidden="true" /><div><dt className="text-xs text-[var(--mut)]">Por</dt><dd className="text-[var(--txt)]">{incident.resolvedBy ? `${incident.resolvedBy.slice(0, 12)}…` : "—"}</dd></div></div>
                                    <div className="flex items-start gap-2"><Clock size={16} className="mt-0.5 shrink-0 text-[var(--mut)]" aria-hidden="true" /><div><dt className="text-xs text-[var(--mut)]">Fecha</dt><dd className="text-[var(--txt)]">{incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "—"}</dd></div></div>
                                    {incident.resolution && <div className="sm:col-span-3 flex items-start gap-2"><MessageSquare size={16} className="mt-0.5 shrink-0 text-[var(--mut)]" aria-hidden="true" /><div className="min-w-0"><dt className="text-xs text-[var(--mut)]">Notas</dt><dd className="text-[var(--txt)] break-words">{incident.resolution}</dd></div></div>}
                                </dl>
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </Fragment>
    );
}

// Main Component
export default function SecurityDashboardClient() {
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [chartRange, setChartRange] = useState("24h");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
    const [incidentsTotal, setIncidentsTotal] = useState(0);
    const [incidentsPage, setIncidentsPage] = useState(1);
    const [incidentsTotalPages, setIncidentsTotalPages] = useState(1);
    const [incidentsLoading, setIncidentsLoading] = useState(false);

    const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [filterResolved, setFilterResolved] = useState<"all" | "pending" | "resolved">("pending");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [resolvingIncident, setResolvingIncident] = useState<SecurityIncident | null>(null);

    // Chart-to-panel sync state
    const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
    const [selectedPointData, setSelectedPointData] = useState<{ hour: string; count: number } | null>(null);

    const pageSize = 15;

    // Fetch functions
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/security/stats?range=${chartRange}`);
            if (res.ok) { const data = await res.json(); setStats(data); setLastUpdate(new Date()); }
        } catch (err) { console.error("Stats error:", err); }
        finally { setLoading(false); }
    }, [chartRange]);

    const fetchIncidents = useCallback(async () => {
        setIncidentsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(incidentsPage));
            params.set("limit", String(pageSize));
            if (filterSeverity) params.set("severity", filterSeverity);
            if (filterType) params.set("type", filterType);
            if (filterResolved === "pending") params.set("resolved", "false");
            if (filterResolved === "resolved") params.set("resolved", "true");
            if (filterDateFrom) params.set("startDate", filterDateFrom);
            if (filterDateTo) params.set("endDate", filterDateTo);

            const res = await fetch(`/api/admin/security/incidents?${params}`);
            if (res.ok) {
                const data: IncidentsResponse = await res.json();
                setIncidents(data.incidents);
                setIncidentsTotal(data.total);
                setIncidentsTotalPages(data.totalPages);
            }
        } catch (err) { console.error("Incidents error:", err); }
        finally { setIncidentsLoading(false); }
    }, [incidentsPage, filterSeverity, filterType, filterResolved, filterDateFrom, filterDateTo]);

    // Debounced refresh
    const debouncedRefresh = useDebounce(() => {
        setIsRefreshing(true);
        Promise.all([fetchStats(), fetchIncidents()]).finally(() => setIsRefreshing(false));
    }, 500);

    const handleManualRefresh = useCallback(() => {
        if (isRefreshing) return;
        debouncedRefresh();
    }, [isRefreshing, debouncedRefresh]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchIncidents(); }, [fetchIncidents]);
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => { if (document.visibilityState !== "visible") return; fetchStats(); fetchIncidents(); }, 10000); // solo con la pestaña a la vista
        return () => clearInterval(interval);
    }, [isLive, fetchStats, fetchIncidents]);
    useEffect(() => { setIncidentsPage(1); }, [filterSeverity, filterType, filterResolved, filterDateFrom, filterDateTo]);

    /** Devuelve el motivo si falla (la ventana lo muestra), o null si quedó resuelto. */
    const handleResolve = async (id: string, resolution: string): Promise<string | null> => {
        try {
            const res = await fetch(`/api/admin/security/incidents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolved: true, resolution }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null) as { error?: string } | null;
                return data?.error || "No se pudo resolver el incidente";
            }
            toast.success("Incidente resuelto");
            fetchStats();
            fetchIncidents();
            return null;
        } catch (err) {
            console.error("Resolve error:", err);
            return "No se pudo resolver el incidente: revisa la conexión";
        }
    };

    const totalIncidents = useMemo(() => stats ? stats.bySeverity.CRITICAL + stats.bySeverity.HIGH + stats.bySeverity.MEDIUM + stats.bySeverity.LOW : 0, [stats]);
    const blockRate = useMemo(() => {
        if (!stats?.recentIncidents?.length) return 100;
        const blocked = stats.recentIncidents.filter(i => ["blocked", "rate_limited", "honeypot_served"].includes(String(i.details?.actionTaken))).length;
        return Math.round((blocked / stats.recentIncidents.length) * 100);
    }, [stats]);
    const availableTypes = useMemo(() => stats?.byType.map(t => t.type) || [], [stats]);
    const displayedIncidents = useMemo(() => {
        if (!searchQuery) return incidents;
        const q = searchQuery.toLowerCase();
        return incidents.filter(i => i.path?.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.ipHash.includes(q));
    }, [incidents, searchQuery]);

    if (loading) {
        return <EsqueletoSeccion nombre="seguridad" cifras={4} filas={5} />;
    }

    const hayFiltros = Boolean(filterSeverity || filterType || filterResolved !== "pending" || filterDateFrom || filterDateTo || searchQuery);

    return (
        <div className="max-w-[1180px] space-y-10 pb-8">
            {resolvingIncident && <ResolutionModal incident={resolvingIncident} onClose={() => setResolvingIncident(null)} onSubmit={handleResolve} />}

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">Seguridad</h1>
                    <p className="mt-1 text-[15px] text-[var(--mut)]">Incidentes, bloqueos y defensa automática del sitio</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge isLive={isLive} onToggle={() => setIsLive(!isLive)} disabled={isRefreshing} />
                    <button type="button" aria-label="Actualizar" onClick={handleManualRefresh} disabled={isRefreshing} className={`${BTN_ICONO} border border-[var(--linea-2)]`}>
                        <RefreshCw size={16} aria-hidden="true" className={isRefreshing ? "animate-spin motion-reduce:animate-none" : ""} />
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Cifras. Sin la tarjeta «Sistema: Activo»: era un texto fijo, no una medición. */}
                <dl className="grid grid-cols-3 border-y border-[var(--linea)]">
                    <div className={CELDA_CIFRA}>
                        <dt className="text-[13.5px] text-[var(--mut)]">Incidentes ({TIME_RANGES.find(r => r.value === chartRange)?.label ?? chartRange})</dt>
                        <dd className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{totalIncidents}</dd>
                    </div>
                    <div className={CELDA_CIFRA}>
                        <dt className="text-[13.5px] text-[var(--mut)]">Frenados entre los recientes</dt>
                        <dd className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{blockRate}%</dd>
                    </div>
                    <div className={CELDA_CIFRA}>
                        <dt className="text-[13.5px] text-[var(--mut)]">Sin resolver</dt>
                        <dd className={`text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums ${stats?.unresolvedCount ? "text-red-400" : "text-[var(--txt)]"}`}>{stats?.unresolvedCount || 0}</dd>
                    </div>
                </dl>

                {/* Severidad: cada una filtra el historial */}
                <section aria-labelledby="severidad-t">
                    <h2 id="severidad-t" className={`${H2} mb-2`}>Por severidad <span className="font-normal">· toca una para filtrar el historial</span></h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-[var(--linea)]">
                        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(sev => (
                            <SeverityCard key={sev} severity={sev} count={stats?.bySeverity[sev] || 0} total={totalIncidents} isActive={filterSeverity === sev} onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)} />
                        ))}
                    </div>
                </section>
            </div>

            {/* Tendencia y tipos */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-10 lg:gap-14 items-start">
                <section aria-labelledby="tendencia-t" className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h2 id="tendencia-t" className={H2}>Incidentes en el tiempo</h2>
                        <div role="group" aria-label="Periodo" className="inline-flex rounded-lg border border-[var(--linea-2)] p-0.5">
                            {TIME_RANGES.map(r => (
                                <button
                                    key={r.value}
                                    type="button"
                                    aria-pressed={chartRange === r.value}
                                    onClick={() => { setChartRange(r.value); setSelectedPointIndex(null); setSelectedPointData(null); }}
                                    className={`min-h-9 max-sm:min-h-11 px-3 rounded-md text-xs transition-colors motion-reduce:transition-none ${FOCO} ${chartRange === r.value ? "bg-[color-mix(in_srgb,var(--acento)_15%,transparent)] text-[var(--txt)] font-semibold" : "text-[var(--mut)] font-medium hover:text-[var(--txt)]"}`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <TrendChart
                        data={stats?.hourlyTrend || []}
                        range={chartRange}
                        selectedIndex={selectedPointIndex}
                        onPointClick={(idx, data) => { setSelectedPointIndex(idx); setSelectedPointData(data); }}
                        onBackgroundClick={() => { setSelectedPointIndex(null); setSelectedPointData(null); }}
                    />
                </section>
                <section aria-labelledby="tipos-t" className="min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <h2 id="tipos-t" className={H2}>Tipos de amenaza</h2>
                        {selectedPointData && (
                            <span className={`${INSIGNIA} bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)]`}>
                                {formatTrendLabel(selectedPointData.hour, chartRange)}
                            </span>
                        )}
                    </div>
                    <div aria-live="polite">
                        {selectedPointData ? (
                            <div className="border-y border-[var(--linea)] py-5">
                                <p className="text-[28px] leading-none font-bold tracking-tight tabular-nums text-[var(--txt)]">{selectedPointData.count}</p>
                                <p className="mt-2 text-sm text-[var(--mut)]">incidentes en este período</p>
                                <p className="mt-3 text-xs text-[var(--mut)]">Haz clic fuera del punto para ver el total.</p>
                            </div>
                        ) : (
                            <ThreatDistribution data={stats?.byType || []} />
                        )}
                    </div>
                </section>
            </div>

            {/* Historial */}
            <section aria-labelledby="historial-t" className="space-y-3">
                <h2 id="historial-t" className={`${H2} flex items-baseline gap-2`}>Historial <span className="font-mono text-xs font-medium tabular-nums">{incidentsTotal}</span></h2>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-52">
                        <label htmlFor="seg-buscar" className="sr-only">Buscar en incidentes</label>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)] pointer-events-none" aria-hidden="true" />
                        <input id="seg-buscar" type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ruta, tipo o IP cifrada" className={`${CAMPO} w-full pl-9`} />
                    </div>
                    <label htmlFor="seg-severidad" className="sr-only">Severidad</label>
                    <select id="seg-severidad" value={filterSeverity || ""} onChange={e => setFilterSeverity(e.target.value || null)} className={`${CAMPO} max-sm:flex-1`}>
                        <option value="">Toda severidad</option>
                        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                    </select>
                    <label htmlFor="seg-tipo" className="sr-only">Tipo</label>
                    <select id="seg-tipo" value={filterType || ""} onChange={e => setFilterType(e.target.value || null)} className={`${CAMPO} max-sm:flex-1 max-w-full`}>
                        <option value="">Todo tipo</option>
                        {availableTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                    </select>
                    <label htmlFor="seg-estado" className="sr-only">Estado</label>
                    <select id="seg-estado" value={filterResolved} onChange={e => setFilterResolved(e.target.value as "all" | "pending" | "resolved")} className={`${CAMPO} max-sm:flex-1`}>
                        <option value="pending">Pendientes</option>
                        <option value="all">Todos</option>
                        <option value="resolved">Resueltos</option>
                    </select>
                    <div className="flex items-center gap-2 max-sm:w-full">
                        <label htmlFor="seg-desde" className="text-sm text-[var(--mut)]">Desde</label>
                        <input id="seg-desde" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={`${CAMPO} min-w-0 max-sm:flex-1`} />
                        <label htmlFor="seg-hasta" className="text-sm text-[var(--mut)]">hasta</label>
                        <input id="seg-hasta" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={`${CAMPO} min-w-0 max-sm:flex-1`} />
                    </div>
                    {hayFiltros && (
                        <button type="button" onClick={() => { setFilterSeverity(null); setFilterType(null); setFilterResolved("pending"); setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); }} className={BTN_SEC}>
                            <X size={16} aria-hidden="true" /> Limpiar
                        </button>
                    )}
                </div>

                <div className="relative">
                    {incidentsLoading && (
                        <div role="status" className="absolute inset-0 z-10 grid place-items-center bg-[color-mix(in_srgb,var(--fondo)_60%,transparent)]">
                            <RefreshCw size={18} className="text-[var(--acento)] animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            <span className="sr-only">Cargando incidentes…</span>
                        </div>
                    )}
                    <div tabIndex={0} role="region" aria-labelledby="historial-t" className={`max-h-[500px] overflow-auto border-t border-[var(--linea)] ${FOCO} focus-visible:outline-offset-0`}>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-[1] bg-[var(--fondo)]">
                                <tr className="border-b border-[var(--linea)]">
                                    <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Severidad y tipo</th>
                                    <th scope="col" className="hidden md:table-cell px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Ubicación</th>
                                    <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Ruta</th>
                                    <th scope="col" className="hidden lg:table-cell px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Acción</th>
                                    <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Fecha</th>
                                    <th scope="col" className="px-3 py-2 text-right text-sm font-medium text-[var(--mut)]"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedIncidents.length > 0 ? displayedIncidents.map(inc => (
                                    <IncidentRow key={inc.id} incident={inc} onResolve={setResolvingIncident} isExpanded={expandedId === inc.id} onToggle={() => setExpandedId(expandedId === inc.id ? null : inc.id)} />
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-[var(--mut)]">
                                            <ShieldCheck size={18} className="block mx-auto mb-2 text-emerald-400" aria-hidden="true" />
                                            {filterResolved === "pending" ? "Sin incidentes pendientes" : "Sin incidentes"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {incidentsTotalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-sm text-[var(--mut)] tabular-nums">{Math.min((incidentsPage - 1) * pageSize + 1, incidentsTotal)}–{Math.min(incidentsPage * pageSize, incidentsTotal)} de {incidentsTotal}</span>
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={incidentsPage <= 1} onClick={() => setIncidentsPage(p => p - 1)} className={BTN_SEC}><ChevronLeft size={16} aria-hidden="true" />Anterior</button>
                            <span className="text-sm text-[var(--mut)] tabular-nums">{incidentsPage}/{incidentsTotalPages}</span>
                            <button type="button" disabled={incidentsPage >= incidentsTotalPages} onClick={() => setIncidentsPage(p => p + 1)} className={BTN_SEC}>Siguiente<ChevronRight size={16} aria-hidden="true" /></button>
                        </div>
                    </div>
                )}

                <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 text-xs text-[var(--mut)]">
                    <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden="true" /> Actualizado: {lastUpdate?.toLocaleTimeString("es-CL") || "—"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{isLive ? "Se actualiza cada 10 s" : "Actualización en pausa"}</span>
                </p>
            </section>

            <PendingActionsPanel />
        </div>
    );
}

// ── Defensa automática ──────────────────────────────────────

interface ThreatPendingAction {
    id: string;
    actionType: string;
    ipHash: string | null;
    userId: string | null;
    score: number;
    context: Record<string, unknown>;
    status: string;
    createdAt: string;
    expiresAt: string;
}

interface ThreatMetrics {
    blocks: number;
    mfaStepups: number;
    cooldowns: number;
}

function PendingActionsPanel() {
    const [pending, setPending] = useState<ThreatPendingAction[]>([]);
    const [metrics, setMetrics] = useState<ThreatMetrics>({ blocks: 0, mfaStepups: 0, cooldowns: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/security/autonomous-defense?view=pending').then(r => r.json()),
            fetch('/api/admin/security/autonomous-defense?view=metrics').then(r => r.json()),
        ]).then(([pendingData, metricsData]) => {
            setPending((pendingData as { pending: ThreatPendingAction[] }).pending ?? []);
            setMetrics((metricsData as { today: ThreatMetrics }).today ?? { blocks: 0, mfaStepups: 0, cooldowns: 0 });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function handleReview(id: string, action: 'approved' | 'rejected') {
        await fetch('/api/admin/security/autonomous-defense', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action }),
        });
        setPending(prev => prev.filter(p => p.id !== id));
    }

    return (
        <section aria-labelledby="defensa-t" className="space-y-4">
            <h2 id="defensa-t" className={H2}>Defensa automática de hoy</h2>

            {loading ? (
                <p role="status" className="py-4 text-sm text-[var(--mut)] border-t border-[var(--linea)]">Cargando la defensa automática…</p>
            ) : (
                <>
                    <dl className="grid grid-cols-3 border-y border-[var(--linea)]">
                        <div className={CELDA_CIFRA}>
                            <dt className="text-[13.5px] text-[var(--mut)]">IP bloqueadas</dt>
                            <dd className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{metrics.blocks}</dd>
                        </div>
                        <div className={CELDA_CIFRA}>
                            <dt className="text-[13.5px] text-[var(--mut)]">Verificaciones extra en dos pasos</dt>
                            <dd className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{metrics.mfaStepups}</dd>
                        </div>
                        <div className={CELDA_CIFRA}>
                            <dt className="text-[13.5px] text-[var(--mut)]">Esperas forzadas</dt>
                            <dd className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[var(--txt)]">{metrics.cooldowns}</dd>
                        </div>
                    </dl>

                    {pending.length > 0 ? (
                        <div>
                            <h3 className="flex items-center gap-2 mb-2 text-sm font-semibold text-red-400">
                                <AlertTriangle size={16} aria-hidden="true" />
                                Esperan tu aprobación ({pending.length})
                            </h3>
                            <ul className="border-t border-[var(--linea)]">
                                {pending.map(item => (
                                    <li key={item.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-3 px-1 border-b border-[var(--linea)]">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--txt)]">{item.actionType}</p>
                                            <p className="mt-1 text-xs text-[var(--mut)]">
                                                Puntaje: {item.score}/100 · IP: {item.ipHash?.slice(0, 8) ?? '—'} · {new Date(item.createdAt).toLocaleString('es-CL')}
                                            </p>
                                            {item.context && (
                                                <p className="mt-1 font-mono text-xs text-[var(--mut)] break-all">
                                                    {JSON.stringify(item.context).slice(0, 120)}…
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleReview(item.id, 'approved')}
                                                className={`inline-flex items-center justify-center min-h-10 max-sm:min-h-11 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold transition-opacity hover:opacity-90 max-sm:flex-1 ${FOCO}`}
                                            >
                                                Aprobar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReview(item.id, 'rejected')}
                                                className={`${BTN_SEC} max-sm:flex-1`}
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="flex items-center gap-2 text-sm text-emerald-400">
                            <CheckCircle size={16} aria-hidden="true" />
                            Nada espera tu aprobación
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
