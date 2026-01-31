"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    ArrowLeft, Eye, Zap, Download, ExternalLink, TrendingUp, TrendingDown,
    Monitor, Smartphone, Tablet, Globe, Chrome, AlertCircle, Clock, Activity
} from "lucide-react";

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

const actionLabels: Record<string, { label: string; color: string }> = {
    view: { label: "Vista", color: "bg-blue-500" },
    use: { label: "Uso", color: "bg-purple-500" },
    generate: { label: "Generación", color: "bg-purple-500" },
    download: { label: "Descarga", color: "bg-green-500" },
    error: { label: "Error", color: "bg-red-500" },
};

const deviceIcons: Record<string, typeof Monitor> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
    unknown: Globe,
};

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
                        router.push("/login");
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
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">{error || "Error"}</h2>
                <Link href="/admin/herramientas" className="text-accent-1 hover:underline">
                    ← Volver a herramientas
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

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/admin/herramientas"
                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm w-fit"
                >
                    <ArrowLeft size={16} />
                    Volver a herramientas
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">{tool.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tool.isActive && tool.isPublic ? "bg-green-500/20 text-green-400" :
                                tool.isActive ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-red-500/20 text-red-400"
                                }`}>
                                {tool.isActive && tool.isPublic ? "Pública" : tool.isActive ? "Solo admin" : "Desactivada"}
                            </span>
                        </div>
                        {tool.description && (
                            <p className="text-sm text-neutral-400 mt-1">{tool.description}</p>
                        )}
                    </div>
                    <a
                        href={`/tools/${tool.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-1/10 border border-accent-1/30 text-accent-1 hover:bg-accent-1/20 transition-colors text-sm"
                    >
                        <ExternalLink size={16} />
                        Ver herramienta
                    </a>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Eye size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.views.toLocaleString()}</p>
                            <p className="text-xs text-neutral-500">Vistas totales</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Zap size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.uses.toLocaleString()}</p>
                            <p className="text-xs text-neutral-500">Usos totales</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Download size={20} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.downloads.toLocaleString()}</p>
                            <p className="text-xs text-neutral-500">Descargas</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stats.trend >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                            {stats.trend >= 0 ? (
                                <TrendingUp size={20} className="text-green-400" />
                            ) : (
                                <TrendingDown size={20} className="text-red-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {stats.trend > 0 ? "+" : ""}{stats.trend}%
                            </p>
                            <p className="text-xs text-neutral-500">vs semana anterior</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Conversion Rate & Last 7 Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-400">Tasa de conversión</p>
                            <p className="text-3xl font-bold text-white">{stats.conversionRate}%</p>
                            <p className="text-xs text-neutral-500 mt-1">Vistas → Usos</p>
                        </div>
                        <Activity size={32} className="text-accent-1/50" />
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-400">Últimos 7 días</p>
                            <p className="text-3xl font-bold text-white">{stats.last7Days.toLocaleString()}</p>
                            <p className="text-xs text-neutral-500 mt-1">Interacciones totales</p>
                        </div>
                        <Clock size={32} className="text-accent-1/50" />
                    </div>
                </div>
            </div>

            {/* Time Series Chart */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 sm:p-6 rounded-xl bg-white/[0.02] border border-white/10"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Actividad en el tiempo</h2>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        <button
                            onClick={() => setTimeRange(7)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${timeRange === 7 ? "bg-accent-1 text-white" : "text-neutral-400 hover:text-white"
                                }`}
                        >
                            7 días
                        </button>
                        <button
                            onClick={() => setTimeRange(30)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${timeRange === 30 ? "bg-accent-1 text-white" : "text-neutral-400 hover:text-white"
                                }`}
                        >
                            30 días
                        </button>
                    </div>
                </div>

                {/* Mini Bar Chart */}
                <div className="flex items-end gap-1 h-40 sm:h-48">
                    {filteredTimeSeries.map((point, _i) => {
                        const total = point.views + point.uses + point.downloads;
                        const height = maxValue > 0 ? (total / maxValue) * 100 : 0;
                        const viewsHeight = maxValue > 0 ? (point.views / maxValue) * 100 : 0;
                        const usesHeight = maxValue > 0 ? (point.uses / maxValue) * 100 : 0;
                        const downloadsHeight = maxValue > 0 ? (point.downloads / maxValue) * 100 : 0;

                        return (
                            <div
                                key={point.date}
                                className="flex-1 flex flex-col items-center gap-1 group relative"
                            >
                                <div className="w-full flex flex-col gap-0.5 items-center" style={{ height: `${height}%` }}>
                                    {downloadsHeight > 0 && (
                                        <div
                                            className="w-full bg-green-500/80 rounded-t"
                                            style={{ height: `${(downloadsHeight / height) * 100}%`, minHeight: downloadsHeight > 0 ? "2px" : 0 }}
                                        />
                                    )}
                                    {usesHeight > 0 && (
                                        <div
                                            className="w-full bg-purple-500/80"
                                            style={{ height: `${(usesHeight / height) * 100}%`, minHeight: usesHeight > 0 ? "2px" : 0 }}
                                        />
                                    )}
                                    {viewsHeight > 0 && (
                                        <div
                                            className="w-full bg-blue-500/80 rounded-b"
                                            style={{ height: `${(viewsHeight / height) * 100}%`, minHeight: viewsHeight > 0 ? "2px" : 0 }}
                                        />
                                    )}
                                </div>
                                <span className="text-[9px] text-neutral-500 hidden sm:block">
                                    {new Date(point.date).getDate()}
                                </span>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-neutral-800 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    <div className="font-medium">{new Date(point.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</div>
                                    <div className="text-blue-400">Vistas: {point.views}</div>
                                    <div className="text-purple-400">Usos: {point.uses}</div>
                                    <div className="text-green-400">Descargas: {point.downloads}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-blue-500/80" />
                        <span className="text-neutral-400">Vistas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-purple-500/80" />
                        <span className="text-neutral-400">Usos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-green-500/80" />
                        <span className="text-neutral-400">Descargas</span>
                    </div>
                </div>
            </motion.div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Device Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="p-4 sm:p-6 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <h3 className="text-base font-semibold text-white mb-4">Por dispositivo</h3>
                    <div className="space-y-3">
                        {deviceStats.length > 0 ? deviceStats.map((item) => {
                            const percentage = totalDevices > 0 ? (item.count / totalDevices) * 100 : 0;
                            const DeviceIcon = deviceIcons[item.device || "unknown"] || Globe;
                            return (
                                <div key={item.device} className="flex items-center gap-3">
                                    <DeviceIcon size={16} className="text-neutral-400 shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-neutral-300 capitalize">{item.device || "Desconocido"}</span>
                                            <span className="text-neutral-500">{item.count} ({percentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent-1 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-neutral-500 text-sm">Sin datos de dispositivos</p>
                        )}
                    </div>
                </motion.div>

                {/* Browser Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 sm:p-6 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <h3 className="text-base font-semibold text-white mb-4">Por navegador</h3>
                    <div className="space-y-3">
                        {browserStats.length > 0 ? browserStats.slice(0, 5).map((item) => {
                            const percentage = totalBrowsers > 0 ? (item.count / totalBrowsers) * 100 : 0;
                            return (
                                <div key={item.browser} className="flex items-center gap-3">
                                    <Chrome size={16} className="text-neutral-400 shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-neutral-300 capitalize">{item.browser || "Desconocido"}</span>
                                            <span className="text-neutral-500">{item.count} ({percentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-neutral-500 text-sm">Sin datos de navegadores</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Country Stats */}
            {countryStats.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="p-4 sm:p-6 rounded-xl bg-white/[0.02] border border-white/10"
                >
                    <h3 className="text-base font-semibold text-white mb-4">Por país</h3>
                    <div className="flex flex-wrap gap-2">
                        {countryStats.map((item) => (
                            <div
                                key={item.country}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm"
                            >
                                <span className="text-neutral-300">{item.country}</span>
                                <span className="text-neutral-500 ml-2">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recent Activity Table */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-4 sm:p-6 rounded-xl bg-white/[0.02] border border-white/10"
            >
                <h3 className="text-base font-semibold text-white mb-4">Actividad reciente</h3>

                {recentUsage.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-neutral-500 border-b border-white/5">
                                    <th className="pb-2 font-medium">Acción</th>
                                    <th className="pb-2 font-medium hidden sm:table-cell">Dispositivo</th>
                                    <th className="pb-2 font-medium hidden md:table-cell">Navegador</th>
                                    <th className="pb-2 font-medium text-right">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsage.map((usage) => {
                                    const actionInfo = actionLabels[usage.action] || { label: usage.action, color: "bg-gray-500" };
                                    return (
                                        <tr key={usage.id} className="border-b border-white/5 last:border-0">
                                            <td className="py-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}/20`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${actionInfo.color}`} />
                                                    {actionInfo.label}
                                                </span>
                                            </td>
                                            <td className="py-2 text-neutral-400 capitalize hidden sm:table-cell">
                                                {usage.device || "-"}
                                            </td>
                                            <td className="py-2 text-neutral-400 hidden md:table-cell">
                                                {usage.browser || "-"}
                                            </td>
                                            <td className="py-2 text-neutral-500 text-right">
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
                    <p className="text-neutral-500 text-sm text-center py-8">
                        Aún no hay actividad registrada
                    </p>
                )}
            </motion.div>
        </div>
    );
}
