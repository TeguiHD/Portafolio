"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    Wrench, Eye, Zap, Download, Globe, Lock, XCircle,
    ExternalLink, RefreshCw, ChevronDown, BarChart3
} from "lucide-react";
import { ToolsPageSkeleton } from "@/components/ui/Skeleton";

interface Tool {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    category: string | null;
    isPublic: boolean;
    isActive: boolean;
    stats: {
        views: number;
        uses: number;
        downloads: number;
        total: number;
    };
}

type VisibilityStatus = "public" | "private" | "disabled";

const getVisibility = (tool: Tool): VisibilityStatus => {
    if (!tool.isActive) return "disabled";
    return tool.isPublic ? "public" : "private";
};

const visibilityConfig = {
    public: {
        label: "Pública",
        icon: Globe,
        color: "text-green-400",
        bg: "bg-green-500/10 border-green-500/30",
        dot: "bg-green-500"
    },
    private: {
        label: "Solo admin",
        icon: Lock,
        color: "text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/30",
        dot: "bg-yellow-500"
    },
    disabled: {
        label: "Desactivada",
        icon: XCircle,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
        dot: "bg-red-500"
    },
};

export default function ToolsPageClient() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [expandedTool, setExpandedTool] = useState<string | null>(null);

    const fetchTools = async () => {
        try {
            const res = await fetch("/api/tools/admin");
            if (res.ok) {
                const data = await res.json();
                setTools(data.tools || []);
            }
        } catch (error) {
            console.error("Error fetching tools:", error);
        } finally {
            setLoading(false);
        }
    };

    const syncTools = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/tools/admin/sync", { method: "POST" });
            if (res.ok) {
                await fetchTools();
            }
        } catch (error) {
            console.error("Error syncing tools:", error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchTools();
    }, []);

    const updateToolVisibility = async (tool: Tool, newStatus: VisibilityStatus) => {
        setUpdating(tool.id);
        try {
            let updates = {};
            switch (newStatus) {
                case "public":
                    updates = { isActive: true, isPublic: true };
                    break;
                case "private":
                    updates = { isActive: true, isPublic: false };
                    break;
                case "disabled":
                    updates = { isActive: false, isPublic: false };
                    break;
            }

            const res = await fetch(`/api/tools/admin/${tool.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                setTools((prev) =>
                    prev.map((t) => t.id === tool.id ? { ...t, ...updates } : t)
                );
            }
        } catch (error) {
            console.error("Error updating tool:", error);
        } finally {
            setUpdating(null);
        }
    };

    // Stats totals
    const totalViews = tools.reduce((acc, t) => acc + t.stats.views, 0);
    const totalUses = tools.reduce((acc, t) => acc + t.stats.uses, 0);
    const publicCount = tools.filter(t => t.isPublic).length;

    if (loading) {
        return <ToolsPageSkeleton />;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            <Wrench className="text-accent-1" size={24} />
                            Herramientas
                        </h1>
                        <p className="text-sm text-neutral-400 mt-1">
                            Gestiona las herramientas de tu portafolio
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {tools.length < 5 && (
                            <button
                                onClick={syncTools}
                                disabled={syncing}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                                <span className="hidden sm:inline">Sincronizar</span>
                            </button>
                        )}
                        <Link
                            href="/herramientas"
                            target="_blank"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-1/10 border border-accent-1/30 text-accent-1 hover:bg-accent-1/20 transition-colors text-sm"
                        >
                            <ExternalLink size={16} />
                            <span className="hidden sm:inline">Ver públicas</span>
                        </Link>
                    </div>
                </div>

                {/* Compact Stats Bar */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-accent-1/10">
                            <Wrench size={14} className="text-accent-1" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{tools.length}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Total</p>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-green-500/10">
                            <Globe size={14} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{publicCount}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Públicas</p>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <Eye size={14} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{totalViews.toLocaleString()}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Vistas</p>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10">
                            <Zap size={14} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{totalUses.toLocaleString()}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Usos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tools List */}
            {tools.length === 0 ? (
                <div className="rounded-2xl border border-white/10 p-8 sm:p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Wrench size={32} className="text-neutral-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No hay herramientas</h3>
                    <p className="text-neutral-400 text-sm max-w-sm mx-auto mb-4">
                        Ejecuta la sincronización o añade herramientas manualmente a la base de datos.
                    </p>
                    <button
                        onClick={syncTools}
                        disabled={syncing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-1 text-white hover:bg-accent-1/90 transition-colors text-sm font-medium"
                    >
                        <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                        Sincronizar ahora
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {tools.map((tool, idx) => {
                        const visibility = getVisibility(tool);
                        const config = visibilityConfig[visibility];
                        const isExpanded = expandedTool === tool.id;

                        return (
                            <motion.div
                                key={tool.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="rounded-xl border border-white/10 bg-white/[0.01] overflow-hidden"
                            >
                                {/* Main Row */}
                                <div className="p-4 flex items-center gap-3 sm:gap-4">
                                    {/* Icon */}
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-accent-1/20 to-accent-2/10 border border-accent-1/20 flex items-center justify-center shrink-0">
                                        <Wrench size={20} className="text-accent-1" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-white truncate">{tool.name}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.bg} ${config.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                                            /{tool.slug}
                                        </p>
                                    </div>

                                    {/* Stats - Desktop */}
                                    <div className="hidden md:flex items-center gap-4 text-center">
                                        <div className="px-3">
                                            <p className="text-sm font-semibold text-white">{tool.stats.views}</p>
                                            <p className="text-[10px] text-neutral-500">vistas</p>
                                        </div>
                                        <div className="px-3">
                                            <p className="text-sm font-semibold text-white">{tool.stats.uses}</p>
                                            <p className="text-[10px] text-neutral-500">usos</p>
                                        </div>
                                        <div className="px-3">
                                            <p className="text-sm font-semibold text-white">{tool.stats.downloads}</p>
                                            <p className="text-[10px] text-neutral-500">descargas</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        {/* Visibility Selector */}
                                        <div className="relative">
                                            <select
                                                value={visibility}
                                                onChange={(e) => updateToolVisibility(tool, e.target.value as VisibilityStatus)}
                                                disabled={updating === tool.id}
                                                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white cursor-pointer focus:outline-none focus:border-accent-1/50 disabled:opacity-50"
                                            >
                                                <option value="public" className="bg-[#1a1f2e]">🌐 Pública</option>
                                                <option value="private" className="bg-[#1a1f2e]">🔐 Admin</option>
                                                <option value="disabled" className="bg-[#1a1f2e]">⛔ Off</option>
                                            </select>
                                            {updating === tool.id && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        {/* View Tool Link */}
                                        <a
                                            href={`/herramientas/${tool.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                            title="Ver herramienta"
                                        >
                                            <ExternalLink size={16} />
                                        </a>

                                        {/* Analytics Link - Desktop */}
                                        <Link
                                            href={`/admin/herramientas/${tool.id}`}
                                            className="hidden md:flex p-2 rounded-lg text-neutral-400 hover:text-accent-1 hover:bg-accent-1/10 transition-colors"
                                            title="Ver analytics detallado"
                                        >
                                            <BarChart3 size={16} />
                                        </Link>

                                        {/* Expand Button - All viewports */}
                                        <button
                                            onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                            title={isExpanded ? "Colapsar" : "Ver más detalles"}
                                        >
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content - All viewports */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-white/5 overflow-hidden"
                                        >
                                            <div className="p-4 space-y-3">
                                                {tool.description && (
                                                    <p className="text-sm text-neutral-400">{tool.description}</p>
                                                )}

                                                {/* Stats Grid - 4 columns on mobile, hide on desktop since stats are inline */}
                                                <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-white/[0.02] md:hidden">
                                                    <div className="text-center">
                                                        <Eye size={14} className="mx-auto text-blue-400 mb-1" />
                                                        <p className="text-sm font-semibold text-white">{tool.stats.views}</p>
                                                        <p className="text-[10px] text-neutral-500">vistas</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <Zap size={14} className="mx-auto text-purple-400 mb-1" />
                                                        <p className="text-sm font-semibold text-white">{tool.stats.uses}</p>
                                                        <p className="text-[10px] text-neutral-500">usos</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <Download size={14} className="mx-auto text-green-400 mb-1" />
                                                        <p className="text-sm font-semibold text-white">{tool.stats.downloads}</p>
                                                        <p className="text-[10px] text-neutral-500">descargas</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <BarChart3 size={14} className="mx-auto text-accent-1 mb-1" />
                                                        <p className="text-sm font-semibold text-white">
                                                            {tool.stats.views > 0 ? ((tool.stats.uses / tool.stats.views) * 100).toFixed(0) : 0}%
                                                        </p>
                                                        <p className="text-[10px] text-neutral-500">conversión</p>
                                                    </div>
                                                </div>

                                                {/* Conversion rate for desktop (stats already shown inline) */}
                                                <div className="hidden md:flex items-center gap-4 p-3 rounded-lg bg-white/[0.02]">
                                                    <div className="flex items-center gap-2">
                                                        <BarChart3 size={16} className="text-accent-1" />
                                                        <span className="text-sm text-neutral-400">Tasa de conversión:</span>
                                                        <span className="text-sm font-semibold text-white">
                                                            {tool.stats.views > 0 ? ((tool.stats.uses / tool.stats.views) * 100).toFixed(1) : 0}%
                                                        </span>
                                                    </div>
                                                    <div className="text-neutral-500">•</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-neutral-400">Total interacciones:</span>
                                                        <span className="text-sm font-semibold text-white">{tool.stats.total}</span>
                                                    </div>
                                                </div>

                                                <Link
                                                    href={`/admin/herramientas/${tool.id}`}
                                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-accent-1/10 border border-accent-1/20 text-accent-1 hover:bg-accent-1/20 text-sm font-medium transition-colors"
                                                >
                                                    <BarChart3 size={14} />
                                                    Ver analytics detallado
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
