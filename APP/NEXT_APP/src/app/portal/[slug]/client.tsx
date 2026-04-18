"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Client-Facing Project Portal
 * 
 * Public page where clients see their project progress by milestones.
 * Accessible via /portal/[slug] with optional access code.
 * 
 * Features:
 * - Progress bar with animated fill
 * - Visual milestone timeline
 * - Contract info summary
 * - Responsive design for mobile
 */

interface Milestone {
    id: string;
    title: string;
    description: string | null;
    status: string;
    type: string;
    icon: string | null;
    sortOrder: number;
    estimatedDate: string | null;
    completedAt: string | null;
}

interface PortalData {
    portal: {
        title: string;
        description: string | null;
        client: { name: string; company: string | null };
        contract: {
            title: string;
            contractNumber: string;
            status: string;
            totalAmount: number;
            startDate: string | null;
            endDate: string | null;
            type: string;
        } | null;
    };
    milestones: Milestone[];
    progress: {
        total: number;
        completed: number;
        percentage: number;
        currentMilestone: string | null;
    };
}

const milestoneIcons: Record<string, string> = {
    QUOTATION: "📋",
    PAYMENT: "💳",
    CONTRACT: "📝",
    WORK: "⚙️",
    HOSTING: "🌐",
    REVIEW: "🔍",
    DELIVERY: "🚀",
    CUSTOM: "📌",
};

const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : null;

export default function PortalClient({ slug }: { slug: string }) {
    const [data, setData] = useState<PortalData | null>(null);
    const [requiresCode, setRequiresCode] = useState(false);
    const [portalPreview, setPortalPreview] = useState<{ portalTitle: string; clientName: string } | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [codeLoading, setCodeLoading] = useState(false);

    const fetchPortal = useCallback(async (accessCode?: string) => {
        try {
            const url = `/api/portal?slug=${encodeURIComponent(slug)}${accessCode ? `&code=${encodeURIComponent(accessCode)}` : ""}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.requiresCode) {
                setRequiresCode(true);
                setPortalPreview(json);
                return;
            }

            if (!res.ok) {
                setError(json.error || "Error al cargar el portal");
                return;
            }

            setData(json);
            setRequiresCode(false);
            setError(null);
        } catch {
            setError("Error de conexión");
        } finally {
            setLoading(false);
            setCodeLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchPortal();
    }, [fetchPortal]);

    const handleCodeSubmit = () => {
        if (!code.trim()) return;
        setCodeLoading(true);
        setError(null);
        fetchPortal(code.trim());
    };

    // ─── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15]">
                <div className="w-8 h-8 border-t-2 border-accent-1 border-solid rounded-full animate-spin" />
            </div>
        );
    }

    // ─── Error ─────────────────────────────────────────────────────
    if (error && !requiresCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15] p-6">
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#0c1224] border border-red-500/20 text-center">
                    <span className="text-5xl block mb-4">⚠️</span>
                    <h1 className="text-xl font-bold text-white mb-2">Error</h1>
                    <p className="text-neutral-400">{error}</p>
                </div>
            </div>
        );
    }

    // ─── Code Required ─────────────────────────────────────────────
    if (requiresCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050a15] p-6">
                <div className="max-w-md w-full p-8 rounded-3xl bg-[#0c1224] border border-white/10 space-y-6">
                    <div className="text-center space-y-2">
                        <span className="text-4xl block">🔒</span>
                        <h1 className="text-xl font-bold text-white">
                            {portalPreview?.portalTitle || "Portal del Proyecto"}
                        </h1>
                        <p className="text-sm text-neutral-400">
                            Hola {portalPreview?.clientName || ""}. Ingresa tu código de acceso para ver el estado de tu proyecto.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                            placeholder="Código de acceso"
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center tracking-[0.3em] font-mono placeholder:text-neutral-600 placeholder:tracking-normal focus:border-accent-1/50 focus:outline-none transition-colors"
                        />

                        {error && (
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        )}

                        <button
                            onClick={handleCodeSubmit}
                            disabled={codeLoading || !code.trim()}
                            className="w-full py-3 rounded-xl bg-accent-1 text-white font-bold text-sm transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {codeLoading ? "Verificando..." : "Acceder"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Portal View ───────────────────────────────────────────────
    if (!data) return null;

    const { portal, milestones, progress } = data;

    return (
        <div className="min-h-screen bg-[#050a15] py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">{portal.title}</h1>
                    <p className="text-sm text-neutral-400">
                        {portal.client.name}
                        {portal.client.company && ` · ${portal.client.company}`}
                    </p>
                    {portal.description && (
                        <p className="text-sm text-neutral-300 max-w-lg mx-auto">{portal.description}</p>
                    )}
                </div>

                {/* Progress Card */}
                <div className="p-6 rounded-2xl bg-[#0c1224] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-400">Progreso General</p>
                            <p className="text-3xl font-extrabold text-white">{progress.percentage}%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-neutral-400">{progress.completed} de {progress.total} hitos</p>
                            {progress.currentMilestone && (
                                <p className="text-xs text-cyan-400 mt-1">⚡ En curso: {progress.currentMilestone}</p>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-accent-1 via-cyan-400 to-emerald-400 transition-all duration-1000 ease-out"
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>
                </div>

                {/* Contract Info */}
                {portal.contract && (
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">
                                    {portal.contract.type === "PROJECT"
                                        ? "Proyecto"
                                        : portal.contract.type === "RETAINER"
                                        ? "Mensualidad"
                                        : portal.contract.type === "MAINTENANCE"
                                        ? "Mantenimiento"
                                        : "Consultoría"}
                                </p>
                                <h2 className="text-base font-bold text-white">{portal.contract.title}</h2>
                                <p className="text-xs text-neutral-500 font-mono mt-0.5">{portal.contract.contractNumber}</p>
                            </div>
                            <div className="text-right shrink-0">
                                {portal.contract.startDate && (
                                    <p className="text-xs text-neutral-500">
                                        {formatDate(portal.contract.startDate)}
                                        {portal.contract.endDate && ` → ${formatDate(portal.contract.endDate)}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Milestone Timeline */}
                <div className="p-6 rounded-2xl bg-[#0c1224] border border-white/10">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Hitos del Proyecto</h2>

                    <div className="relative">
                        {/* Connection line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent-1/40 via-white/10 to-transparent" />

                        <div className="space-y-1">
                            {milestones.map((milestone) => {
                                const isCompleted = milestone.status === "COMPLETED";
                                const isActive = milestone.status === "IN_PROGRESS";
                                const isSkipped = milestone.status === "SKIPPED";
                                const icon = milestone.icon || milestoneIcons[milestone.type] || "📌";

                                return (
                                    <div
                                        key={milestone.id}
                                        className={`relative flex items-start gap-4 py-4 px-3 rounded-xl transition-colors ${
                                            isActive ? "bg-cyan-500/5 border border-cyan-500/10" : ""
                                        }`}
                                    >
                                        {/* Node */}
                                        <div
                                            className={`relative z-10 shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg border-2 transition-all ${
                                                isCompleted
                                                    ? "bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                                                    : isActive
                                                    ? "bg-cyan-500/20 border-cyan-400/50 shadow-lg shadow-cyan-500/10"
                                                    : isSkipped
                                                    ? "bg-neutral-500/10 border-neutral-500/20 opacity-40"
                                                    : "bg-white/5 border-white/10"
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <span className="text-emerald-400 font-bold">✓</span>
                                            ) : (
                                                icon
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 py-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3
                                                    className={`text-sm font-bold ${
                                                        isCompleted
                                                            ? "text-emerald-300"
                                                            : isActive
                                                            ? "text-cyan-300"
                                                            : isSkipped
                                                            ? "text-neutral-500 line-through"
                                                            : "text-white"
                                                    }`}
                                                >
                                                    {milestone.title}
                                                </h3>
                                                <span
                                                    className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                                        isCompleted
                                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                                            : isActive
                                                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                                            : isSkipped
                                                            ? "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
                                                            : "bg-white/5 text-neutral-400 border-white/10"
                                                    }`}
                                                >
                                                    {isCompleted ? "Completado" : isActive ? "En Curso" : isSkipped ? "Omitido" : "Pendiente"}
                                                </span>
                                            </div>

                                            {milestone.description && (
                                                <p className="text-xs text-neutral-500 mt-1">{milestone.description}</p>
                                            )}

                                            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                                                {milestone.estimatedDate && (
                                                    <span>📅 Estimado: {formatDate(milestone.estimatedDate)}</span>
                                                )}
                                                {milestone.completedAt && (
                                                    <span className="text-emerald-400">
                                                        ✓ Completado: {formatDate(milestone.completedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center pb-8 space-y-1">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
                        Portal de seguimiento · Actualización en tiempo real
                    </p>
                    <p className="text-[10px] text-neutral-600">
                        Última actualización: {new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                </div>
            </div>
        </div>
    );
}
