"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Shield, Search, Calendar, Filter, ChevronLeft, ChevronRight,
    User, LogIn, LogOut, UserPlus, UserMinus, Key, Lock, Unlock,
    Settings, AlertTriangle, RefreshCw, DollarSign, Wallet, Target,
    Receipt, Plus, Edit, Trash2
} from "lucide-react";
import { AuditPageSkeleton } from "@/components/ui/Skeleton";

interface AuditLog {
    id: string;
    action: string;
    category: string;
    userId: string | null;
    user: { id: string; name: string | null; email: string } | null;
    targetId: string | null;
    targetType: string | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
}

const actionIcons: Record<string, React.ReactNode> = {
    "login.success": <LogIn size={16} className="text-green-400" />,
    "login.failed": <AlertTriangle size={16} className="text-red-400" />,
    "logout": <LogOut size={16} className="text-neutral-400" />,
    "account.locked": <Lock size={16} className="text-red-400" />,
    "account.unlocked": <Unlock size={16} className="text-green-400" />,
    "user.created": <UserPlus size={16} className="text-blue-400" />,
    "user.deleted": <UserMinus size={16} className="text-red-400" />,
    "user.role.changed": <Settings size={16} className="text-yellow-400" />,
    "password.changed": <Key size={16} className="text-purple-400" />,
    "permission.granted": <Shield size={16} className="text-green-400" />,
    "permission.revoked": <Shield size={16} className="text-red-400" />,
    // Finance actions
    "transaction.created": <Plus size={16} className="text-green-400" />,
    "transaction.updated": <Edit size={16} className="text-yellow-400" />,
    "transaction.deleted": <Trash2 size={16} className="text-red-400" />,
    "finance.account.created": <Wallet size={16} className="text-blue-400" />,
    "finance.account.updated": <Wallet size={16} className="text-yellow-400" />,
    "finance.account.deleted": <Wallet size={16} className="text-red-400" />,
    "budget.created": <Target size={16} className="text-blue-400" />,
    "budget.exceeded": <AlertTriangle size={16} className="text-orange-400" />,
    "goal.completed": <Target size={16} className="text-green-400" />,
    "ocr.processed": <Receipt size={16} className="text-purple-400" />,
    "ocr.failed": <Receipt size={16} className="text-red-400" />,
    // Security actions
    "session.concurrent": <AlertTriangle size={16} className="text-orange-400" />,
    "session.revoked": <Lock size={16} className="text-red-400" />,
};

const categoryColors: Record<string, string> = {
    auth: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    users: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    security: "bg-red-500/20 text-red-400 border-red-500/30",
    tools: "bg-green-500/20 text-green-400 border-green-500/30",
    quotations: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    finance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    system: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const categoryLabels: Record<string, string> = {
    auth: "Autenticación",
    users: "Usuarios",
    security: "Seguridad",
    tools: "Herramientas",
    quotations: "Cotizaciones",
    finance: "Finanzas",
    system: "Sistema",
};

export default function AuditPageClient() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const hasActiveFilters = Boolean(categoryFilter || searchQuery || startDate || endDate);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("limit", "30");
            if (categoryFilter) params.set("category", categoryFilter);
            if (searchQuery) params.set("action", searchQuery);
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const res = await fetch(`/api/admin/audit?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setLogs(data.logs || []);
            setTotalPages(data.totalPages || 1);
            setTotal(data.total || 0);
        } catch {
            setError("Error cargando registros de auditoría");
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [page, categoryFilter, searchQuery, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatAction = (action: string) => {
        return action.replace(/\./g, " › ").replace(/_/g, " ");
    };

    // Only show full skeleton on initial load
    if (initialLoading) {
        return <AuditPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-accent-1" />
                        Registro de Auditoría
                    </h1>
                    <p className="text-sm text-neutral-400 mt-1">
                        Historial de eventos de seguridad y acciones del sistema
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm text-neutral-400">{total} registros</span>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                 COMPACT FILTER BAR - Optimized for space
                 ═══════════════════════════════════════════════════════════════════ */}
            <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3 space-y-3">
                {/* Row 1: Search + Categories + Clear */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:border-accent-1/50 outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Category Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-hide">
                        <button
                            onClick={() => setCategoryFilter("")}
                            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${!categoryFilter
                                ? "bg-accent-1 text-white"
                                : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            Todas
                        </button>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setCategoryFilter(categoryFilter === key ? "" : key)}
                                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${categoryFilter === key
                                    ? `${categoryColors[key]}`
                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${categoryFilter === key ? "bg-current" : "bg-neutral-600"}`} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Date Range (collapsible on mobile) */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-neutral-500 shrink-0" />
                        {[
                            { label: "Hoy", days: 0 },
                            { label: "7d", days: 7 },
                            { label: "30d", days: 30 },
                        ].map((preset) => {
                            const today = new Date();
                            const presetStart = new Date(today);
                            presetStart.setDate(today.getDate() - preset.days);
                            const presetStartStr = presetStart.toISOString().split("T")[0];
                            const todayStr = today.toISOString().split("T")[0];
                            const isActive = startDate === presetStartStr && endDate === todayStr;
                            return (
                                <button
                                    key={preset.label}
                                    onClick={() => {
                                        setStartDate(presetStartStr);
                                        setEndDate(todayStr);
                                    }}
                                    className={`px-2 py-1 rounded text-xs transition-all ${isActive
                                        ? "bg-purple-500/30 text-purple-300"
                                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Separator */}
                    <div className="w-px h-4 bg-white/10 hidden sm:block" />

                    {/* Custom Dates */}
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-28 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-accent-1/50 [color-scheme:dark]"
                        />
                        <span className="text-neutral-600 text-xs">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-28 px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-accent-1/50 [color-scheme:dark]"
                        />
                    </div>

                    {/* Loading indicator */}
                    {loading && (
                        <div className="ml-auto">
                            <div className="w-4 h-4 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Clear button - subtle, inline */}
                    {hasActiveFilters && !loading && (
                        <button
                            onClick={() => {
                                setStartDate("");
                                setEndDate("");
                                setCategoryFilter("");
                                setSearchQuery("");
                            }}
                            className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="hidden sm:inline">Limpiar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                    {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">Acción</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">Categoría</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">Usuario</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-neutral-500">
                                        No se encontraron registros
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, idx) => (
                                    <motion.tr
                                        key={log.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className="hover:bg-white/[0.02]"
                                    >
                                        <td className="px-4 py-3 text-sm text-neutral-400 whitespace-nowrap">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {actionIcons[log.action] || <Settings size={16} className="text-neutral-500" />}
                                                <span className="text-sm text-white capitalize">
                                                    {formatAction(log.action)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${categoryColors[log.category] || categoryColors.system}`}>
                                                {categoryLabels[log.category] || log.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.user ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-accent-1/20 flex items-center justify-center">
                                                        <User size={12} className="text-accent-1" />
                                                    </div>
                                                    <span className="text-sm text-white">
                                                        {log.user.name || "Sin nombre"}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-neutral-500">Sistema</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-500">
                                            {log.targetType && (
                                                <span className="text-neutral-400">
                                                    {log.targetType}: {log.targetId?.slice(0, 8)}...
                                                </span>
                                            )}
                                            {log.ipAddress && (
                                                <span className="ml-2 text-neutral-600">
                                                    IP: {log.ipAddress}
                                                </span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 py-2 text-sm text-neutral-400">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
