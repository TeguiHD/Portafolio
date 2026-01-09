"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, AlertTriangle, CheckCircle, Clock, RefreshCw,
    TrendingUp, Activity, Eye, XCircle, Download,
    Globe, Zap, Target, ChevronDown, Search,
    AlertOctagon, Radio, MapPin, Cpu, Lock,
    ShieldCheck, Calendar, User, MessageSquare, X
} from "lucide-react";

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

// Constants
const SEVERITY_CONFIG = {
    CRITICAL: { color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/40", text: "text-red-400", icon: AlertOctagon },
    HIGH: { color: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/40", text: "text-orange-400", icon: AlertTriangle },
    MEDIUM: { color: "#eab308", bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-400", icon: Eye },
    LOW: { color: "#22c55e", bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-400", icon: CheckCircle },
};

const TYPE_LABELS: Record<string, string> = {
    honeypot: "Honeypot", blocked_url: "URL Bloqueada", suspicious_ua: "User-Agent Sospechoso",
    rate_limit: "Rate Limit", blocked_request: "Request Bloqueada",
    unauthorized_tool_access: "Acceso No Autorizado", privilege_escalation: "Escalación Privilegios",
};

const ACTION_COLORS: Record<string, string> = {
    blocked: "bg-red-500/20 text-red-300", rate_limited: "bg-yellow-500/20 text-yellow-300",
    honeypot_served: "bg-purple-500/20 text-purple-300",
};

const TIME_RANGES = [
    { value: "24h", label: "24h" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "365d", label: "1y" },
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
        <button onClick={onToggle} disabled={disabled} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${isLive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50" : "bg-neutral-800 text-neutral-400 border border-neutral-700"}`}>
            {isLive && <motion.span className="w-2 h-2 rounded-full bg-emerald-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
            <Radio size={12} />
            {isLive ? "LIVE" : "PAUSED"}
        </button>
    );
}

function KPICard({ title, value, icon: Icon, color = "accent" }: { title: string; value: string | number; icon: React.ElementType; color?: string }) {
    const colors: Record<string, string> = { accent: "text-accent-1 bg-accent-1/10", green: "text-emerald-400 bg-emerald-500/10", red: "text-red-400 bg-red-500/10", yellow: "text-yellow-400 bg-yellow-500/10" };
    return (
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors[color]}`}><Icon size={18} /></div>
                <div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-neutral-500">{title}</p></div>
            </div>
        </div>
    );
}

function SeverityCard({ severity, count, total, isActive, onClick }: { severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; count: number; total: number; isActive: boolean; onClick: () => void }) {
    const config = SEVERITY_CONFIG[severity];
    const Icon = config.icon;
    const pct = total > 0 ? (count / total) * 100 : 0;

    return (
        <motion.button onClick={onClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`relative p-4 rounded-xl border overflow-hidden transition-all ${isActive ? config.border : "border-neutral-800 hover:border-neutral-700"}`} style={{ background: isActive ? `linear-gradient(135deg, ${config.color}15, ${config.color}05)` : "rgba(0,0,0,0.3)" }}>
            {severity === "CRITICAL" && count > 0 && <motion.div className="absolute inset-0 bg-red-500/5" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} />}
            <div className="relative flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${config.bg}`}><Icon size={22} className={config.text} /></div>
                <div className="flex-1 text-left">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{count}</span>
                        <span className="text-[10px] text-neutral-500 uppercase">{severity}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: config.color }} />
                    </div>
                </div>
            </div>
        </motion.button>
    );
}

// PROFESSIONAL TREND CHART with click-to-select
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
        <div className="h-[200px] flex items-center justify-center text-neutral-600">
            <Activity size={32} className="opacity-20" />
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
        <div className="relative pt-6" style={{ overflow: "visible" }}>
            {/* Stats overlay */}
            <div className="absolute top-0 right-0 flex items-center gap-3 text-[10px] text-neutral-500 z-10">
                <span>Máx: <span className="text-orange-400 font-medium">{max}</span></span>
                <span>Prom: <span className="text-neutral-300 font-medium">{avg.toFixed(1)}</span></span>
                <span>Total: <span className="text-neutral-300 font-medium">{total}</span></span>
                {selectedIndex !== null && (
                    <span className="px-2 py-0.5 rounded bg-accent-1/20 text-accent-1 font-medium">
                        📍 Punto seleccionado
                    </span>
                )}
            </div>

            <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full"
                style={{ height: "280px", overflow: "visible" }}
                preserveAspectRatio="none"
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={onBackgroundClick}
            >
                <defs>
                    <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="rgb(249, 115, 22)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgb(234, 179, 8)" />
                        <stop offset="50%" stopColor="rgb(249, 115, 22)" />
                        <stop offset="100%" stopColor="rgb(239, 68, 68)" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Background grid */}
                {yTicks.map((tick, i) => {
                    const y = padding.top + innerHeight - (tick / max) * innerHeight;
                    return (
                        <g key={i}>
                            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="14" fill="rgba(255,255,255,0.4)">{tick}</text>
                        </g>
                    );
                })}

                {/* Average line */}
                <line x1={padding.left} y1={padding.top + innerHeight - (avg / max) * innerHeight} x2={chartWidth - padding.right} y2={padding.top + innerHeight - (avg / max) * innerHeight} stroke="rgba(255,255,255,0.15)" strokeDasharray="6,6" />

                {/* Area fill */}
                <motion.path d={areaPath} fill="url(#trendAreaGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />

                {/* Main line */}
                <motion.path d={linePath} fill="none" stroke="url(#trendLineGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />

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
                                <line x1={p.x} y1={padding.top} x2={p.x} y2={padding.top + innerHeight} stroke={isSelected ? "rgba(249, 115, 22, 0.6)" : "rgba(249, 115, 22, 0.3)"} strokeDasharray={isSelected ? "0" : "3,3"} strokeWidth={isSelected ? 2 : 1} />
                            )}

                            {/* Point */}
                            <circle
                                cx={p.x} cy={p.y}
                                r={isSelected ? 12 : isHovered ? 10 : isRecent ? 6 : 4}
                                fill={isSelected ? "rgb(249, 115, 22)" : isHovered ? "#fff" : isRecent ? "rgb(249, 115, 22)" : "rgba(255,255,255,0.3)"}
                                stroke={isSelected ? "#fff" : isHovered ? "rgb(249, 115, 22)" : "transparent"}
                                strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                                style={{ cursor: "pointer", transition: "all 0.15s ease" }}
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
                        <text key={idx} x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.4)">
                            {formatTrendLabel(d.hour, range)}
                        </text>
                    );
                })}
            </svg>

            {/* HTML Tooltip */}
            {hoveredIndex !== null && points[hoveredIndex] && (
                <div
                    className="absolute pointer-events-none z-20 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 shadow-xl text-center"
                    style={{
                        left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                        bottom: "calc(100% - 50px)",
                        transform: "translateX(-50%)"
                    }}
                >
                    <p className="text-[10px] text-neutral-400">{formatTrendLabel(points[hoveredIndex].hour, range)}</p>
                    <p className="text-lg font-bold text-white">{points[hoveredIndex].count}</p>
                    <p className="text-[9px] text-neutral-500">Click para filtrar</p>
                </div>
            )}
        </div>
    );
}

function ThreatDistribution({ data }: { data: Array<{ type: string; count: number }> }) {
    const total = data.reduce((s, d) => s + d.count, 0) || 1;
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
    return (
        <div className="space-y-2">
            {data.slice(0, 4).map((item, i) => (
                <div key={item.type}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="text-neutral-400">{TYPE_LABELS[item.type] || item.type}</span><span className="text-white font-medium">{item.count}</span></div>
                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / total) * 100}%` }} transition={{ delay: i * 0.1 }} className="h-full rounded-full" style={{ background: colors[i] }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Resolution Modal
function ResolutionModal({ incident, onClose, onSubmit }: { incident: SecurityIncident; onClose: () => void; onSubmit: (id: string, resolution: string) => Promise<void> }) {
    const [resolution, setResolution] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const config = SEVERITY_CONFIG[incident.severity];

    const handleSubmit = async () => {
        setSubmitting(true);
        await onSubmit(incident.id, resolution);
        setSubmitting(false);
        onClose();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bg}`}><ShieldCheck size={20} className="text-emerald-400" /></div>
                            <div><h3 className="text-lg font-semibold text-white">Resolver Incidente</h3><p className="text-xs text-neutral-500">{TYPE_LABELS[incident.type] || incident.type} · {incident.severity}</p></div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-white"><X size={18} /></button>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-neutral-800/50"><p className="text-[10px] text-neutral-500 uppercase mb-1">Fecha</p><p className="text-neutral-300">{formatDateTime(incident.createdAt)}</p></div>
                        <div className="p-3 rounded-lg bg-neutral-800/50"><p className="text-[10px] text-neutral-500 uppercase mb-1">Ruta</p><p className="text-neutral-300 font-mono text-xs truncate">{incident.path || "—"}</p></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2"><MessageSquare size={14} className="inline mr-2" />Notas de Resolución</label>
                        <textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe cómo se resolvió el incidente..." className="w-full h-32 px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 resize-none" />
                    </div>
                </div>
                <div className="p-5 border-t border-neutral-800 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-sm">Cancelar</button>
                    <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50">
                        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Resolver
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Incident Row
function IncidentRow({ incident, onResolve, isExpanded, onToggle }: { incident: SecurityIncident; onResolve: (incident: SecurityIncident) => void; isExpanded: boolean; onToggle: () => void }) {
    const config = SEVERITY_CONFIG[incident.severity];
    const Icon = config.icon;
    const details = incident.details || {};

    return (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`border-b border-neutral-800/50 ${incident.resolved ? "opacity-60" : ""}`}>
            <div className="grid grid-cols-12 gap-2 p-3 hover:bg-white/[0.02] cursor-pointer items-center text-sm" onClick={onToggle}>
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${config.bg}`}><Icon size={14} className={config.text} /></div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>{incident.severity}</span>
                            {incident.resolved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">✓</span>}
                        </div>
                        <p className="text-xs text-white truncate mt-0.5">{TYPE_LABELS[incident.type] || incident.type}</p>
                    </div>
                </div>
                <div className="col-span-2 hidden md:flex items-center gap-1 text-neutral-400 text-xs"><MapPin size={10} /> {details.country ? String(details.country) : "—"}</div>
                <div className="col-span-3 sm:col-span-2 text-xs font-mono text-neutral-500 truncate">{incident.path || "—"}</div>
                <div className="col-span-2 hidden lg:block">
                    {details.actionTaken ? <span className={`text-[10px] px-1.5 py-0.5 rounded ${ACTION_COLORS[String(details.actionTaken)] || "bg-neutral-700"}`}>{String(details.actionTaken).toUpperCase()}</span> : null}
                </div>
                <div className="col-span-3 sm:col-span-2 text-xs text-neutral-500">
                    <span className="hidden sm:inline">{formatDateTime(incident.createdAt)}</span>
                    <span className="sm:hidden">{formatTimeAgo(incident.createdAt)}</span>
                </div>
                <div className="col-span-1 flex justify-end gap-1">
                    {!incident.resolved && <button onClick={(e) => { e.stopPropagation(); onResolve(incident); }} className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Resolver"><CheckCircle size={12} /></button>}
                    <ChevronDown size={12} className={`text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-neutral-900/50">
                        <div className="p-4 space-y-4 border-t border-neutral-800/50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div><p className="text-neutral-500 text-[10px]">IP Hash</p><p className="font-mono text-neutral-300">{incident.ipHash.slice(0, 16)}...</p></div>
                                <div><p className="text-neutral-500 text-[10px]">Timestamp</p><p className="text-neutral-300">{formatDateTime(incident.createdAt)}</p></div>
                                <div><p className="text-neutral-500 text-[10px]">Risk Score</p><p className={Number(details.riskScore) >= 75 ? "text-red-400" : Number(details.riskScore) >= 50 ? "text-yellow-400" : "text-emerald-400"}>⚡ {details.riskScore != null ? String(details.riskScore) : "—"}</p></div>
                                <div><p className="text-neutral-500 text-[10px]">User Agent</p><p className="text-neutral-300 truncate">{incident.userAgent?.slice(0, 40) || "—"}</p></div>
                            </div>
                            {incident.resolved && (
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2"><ShieldCheck size={14} className="text-emerald-400" /><span className="text-xs font-medium text-emerald-400">RESUELTO</span></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="flex items-center gap-2"><User size={12} className="text-neutral-500" /><div><p className="text-neutral-500 text-[10px]">Por</p><p className="text-neutral-300">{incident.resolvedBy?.slice(0, 12) || "—"}...</p></div></div>
                                        <div className="flex items-center gap-2"><Clock size={12} className="text-neutral-500" /><div><p className="text-neutral-500 text-[10px]">Fecha</p><p className="text-neutral-300">{incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "—"}</p></div></div>
                                        {incident.resolution && <div className="sm:col-span-3 flex items-start gap-2"><MessageSquare size={12} className="text-neutral-500 mt-0.5" /><div><p className="text-neutral-500 text-[10px]">Notas</p><p className="text-neutral-300">{incident.resolution}</p></div></div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
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
        const interval = setInterval(() => { fetchStats(); fetchIncidents(); }, 10000); // Changed to 10s
        return () => clearInterval(interval);
    }, [isLive, fetchStats, fetchIncidents]);
    useEffect(() => { setIncidentsPage(1); }, [filterSeverity, filterType, filterResolved, filterDateFrom, filterDateTo]);

    const handleResolve = async (id: string, resolution: string) => {
        try {
            await fetch(`/api/admin/security/incidents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolved: true, resolution }),
            });
            fetchStats();
            fetchIncidents();
        } catch (err) { console.error("Resolve error:", err); }
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
        return <div className="flex items-center justify-center h-96"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={32} className="text-accent-1" /></motion.div></div>;
    }

    return (
        <div className="space-y-6 pb-8">
            <AnimatePresence>{resolvingIncident && <ResolutionModal incident={resolvingIncident} onClose={() => setResolvingIncident(null)} onSubmit={handleResolve} />}</AnimatePresence>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-1/20 to-accent-1/5 border border-accent-1/30"><Shield size={28} className="text-accent-1" /></div>
                    <div><h1 className="text-2xl font-bold text-white">Centro de Seguridad</h1><p className="text-sm text-neutral-500">Monitoreo empresarial en tiempo real</p></div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge isLive={isLive} onToggle={() => setIsLive(!isLive)} disabled={isRefreshing} />
                    <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 transition-all">
                        <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    </button>
                    <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-sm"><Download size={14} /> Exportar</button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard title="Amenazas 24h" value={totalIncidents} icon={Target} color="yellow" />
                <KPICard title="Bloqueo Efectivo" value={`${blockRate}%`} icon={ShieldCheck} color="green" />
                <KPICard title="Sin Resolver" value={stats?.unresolvedCount || 0} icon={Clock} color={stats?.unresolvedCount ? "red" : "green"} />
                <KPICard title="Sistema" value="Activo" icon={Lock} color="accent" />
            </div>

            {/* Severity */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(sev => (
                    <SeverityCard key={sev} severity={sev} count={stats?.bySeverity[sev] || 0} total={totalIncidents} isActive={filterSeverity === sev} onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)} />
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingUp size={16} className="text-orange-400" /> Tendencia de Incidentes</h3>
                        <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-0.5">
                            {TIME_RANGES.map(r => (
                                <button key={r.value} onClick={() => { setChartRange(r.value); setSelectedPointIndex(null); setSelectedPointData(null); }} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${chartRange === r.value ? "bg-accent-1/20 text-accent-1" : "text-neutral-400 hover:text-white"}`}>{r.label}</button>
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
                </div>
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Cpu size={16} className="text-purple-400" /> Tipos de Amenazas</h3>
                        {selectedPointData && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-accent-1/20 text-accent-1">
                                📍 {formatTrendLabel(selectedPointData.hour, chartRange)}
                            </span>
                        )}
                    </div>
                    {selectedPointData ? (
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-accent-1/10 border border-accent-1/30 text-center">
                                <p className="text-3xl font-bold text-accent-1">{selectedPointData.count}</p>
                                <p className="text-xs text-neutral-400 mt-1">incidentes en este período</p>
                            </div>
                            <p className="text-[10px] text-neutral-500 text-center">Click fuera del punto para ver global</p>
                        </div>
                    ) : (
                        <ThreatDistribution data={stats?.byType || []} />
                    )}
                </div>
            </div>

            {/* Incidents */}
            <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
                <div className="p-4 border-b border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Globe size={16} className="text-blue-400" /> Historial <span className="text-xs font-normal text-neutral-500">({incidentsTotal})</span></h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1/50 w-32" />
                        </div>
                        <select value={filterSeverity || ""} onChange={e => setFilterSeverity(e.target.value || null)} className="px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 focus:outline-none">
                            <option value="">Severidad</option>
                            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterType || ""} onChange={e => setFilterType(e.target.value || null)} className="px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 focus:outline-none">
                            <option value="">Tipo</option>
                            {availableTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                        </select>
                        <select value={filterResolved} onChange={e => setFilterResolved(e.target.value as "all" | "pending" | "resolved")} className="px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 focus:outline-none">
                            <option value="pending">⚠️ Pendientes</option>
                            <option value="all">Todos</option>
                            <option value="resolved">✓ Resueltos</option>
                        </select>
                        <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-neutral-500 hidden sm:block" />
                            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 focus:outline-none w-28" />
                            <span className="text-neutral-600 text-xs">→</span>
                            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="px-2 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 focus:outline-none w-28" />
                        </div>
                        {(filterSeverity || filterType || filterResolved !== "pending" || filterDateFrom || filterDateTo || searchQuery) && (
                            <button onClick={() => { setFilterSeverity(null); setFilterType(null); setFilterResolved("pending"); setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); }} className="px-2 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white flex items-center gap-1"><XCircle size={12} /> Reset</button>
                        )}
                    </div>
                </div>

                <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-950/50 border-b border-neutral-800/50 text-[10px] text-neutral-500 uppercase">
                    <div className="col-span-3">Severidad / Tipo</div>
                    <div className="col-span-2 hidden md:block">Ubicación</div>
                    <div className="col-span-2">Ruta</div>
                    <div className="col-span-2 hidden lg:block">Acción</div>
                    <div className="col-span-2">Fecha</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="max-h-[500px] overflow-y-auto relative">
                    {incidentsLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><RefreshCw size={24} className="text-accent-1 animate-spin" /></div>}
                    <AnimatePresence mode="popLayout">
                        {displayedIncidents.length > 0 ? displayedIncidents.map(inc => (
                            <IncidentRow key={inc.id} incident={inc} onResolve={setResolvingIncident} isExpanded={expandedId === inc.id} onToggle={() => setExpandedId(expandedId === inc.id ? null : inc.id)} />
                        )) : (
                            <div className="p-12 text-center"><ShieldCheck size={40} className="mx-auto mb-3 text-emerald-500/30" /><p className="text-neutral-500">{filterResolved === "pending" ? "✓ Sin incidentes pendientes" : "Sin incidentes"}</p></div>
                        )}
                    </AnimatePresence>
                </div>

                {incidentsTotalPages > 1 && (
                    <div className="p-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs text-neutral-500">{Math.min((incidentsPage - 1) * pageSize + 1, incidentsTotal)}-{Math.min(incidentsPage * pageSize, incidentsTotal)} de {incidentsTotal}</span>
                        <div className="flex items-center gap-2">
                            <button disabled={incidentsPage <= 1} onClick={() => setIncidentsPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-40 text-xs">← Ant</button>
                            <span className="text-xs text-neutral-400">{incidentsPage}/{incidentsTotalPages}</span>
                            <button disabled={incidentsPage >= incidentsTotalPages} onClick={() => setIncidentsPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-40 text-xs">Sig →</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] text-neutral-600">
                <span className="flex items-center gap-1"><Clock size={10} /> {lastUpdate?.toLocaleTimeString("es-CL") || "—"}</span>
                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                <span className="flex items-center gap-1"><Zap size={10} /> Auto: 10s</span>
            </div>
        </div>
    );
}
