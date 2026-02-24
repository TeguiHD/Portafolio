"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DealStage, DealPriority, DealOrigin } from "@prisma/client";
import {
    createDealAction,
    moveDealStageAction,
    deleteDealAction,
    addDealActivityAction,
} from "./actions";

// ============================================================================
// TYPES
// ============================================================================

interface DealClient {
    id: string;
    name: string;
    slug: string;
    workType: string | null;
}

interface DealQuotation {
    id: string;
    projectName: string;
    total: number;
    status: string;
}

interface Deal {
    id: string;
    title: string;
    description: string | null;
    stage: DealStage;
    priority: DealPriority;
    origin: DealOrigin;
    estimatedValue: number;
    closeProbability: number;
    estimatedCloseAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    client: DealClient;
    quotation: DealQuotation | null;
    _count: { activities: number };
}

interface ClientOption {
    id: string;
    name: string;
    workType: string | null;
}

interface PipelineBoardProps {
    initialDeals: Deal[];
    clients: ClientOption[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGES: { key: DealStage; label: string; color: string; bg: string; border: string }[] = [
    { key: "PROSPECT", label: "Prospecto", color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/30" },
    { key: "CONTACTED", label: "Contactado", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    { key: "PROPOSAL", label: "Propuesta", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    { key: "NEGOTIATION", label: "Negociación", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { key: "WON", label: "Ganado", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { key: "LOST", label: "Perdido", color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/30" },
];

const PRIORITIES: Record<DealPriority, { label: string; color: string }> = {
    LOW: { label: "Baja", color: "text-neutral-400" },
    MEDIUM: { label: "Media", color: "text-blue-400" },
    HIGH: { label: "Alta", color: "text-amber-400" },
    URGENT: { label: "Urgente", color: "text-red-400" },
};

const ORIGINS: Record<DealOrigin, string> = {
    REFERRAL: "Referido",
    WEB: "Web",
    SOCIAL_MEDIA: "Redes Sociales",
    DIRECT: "Directo",
    OTHER: "Otro",
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
    }).format(amount);
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

// ============================================================================
// DEAL CARD
// ============================================================================

function DealCard({
    deal,
    onMove,
    onDelete,
    onAddActivity,
}: {
    deal: Deal;
    onMove: (dealId: string, stage: DealStage) => void;
    onDelete: (dealId: string) => void;
    onAddActivity: (dealId: string) => void;
}) {
    const [showActions, setShowActions] = useState(false);
    const priority = PRIORITIES[deal.priority];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative p-4 rounded-2xl bg-[#111827]/80 hover:bg-[#1f2937]/90 border border-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 backdrop-blur-md"
            onClick={() => setShowActions(!showActions)}
        >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            {/* Header */}
            <div className="flex items-start justify-between mb-3 relative z-10">
                <h4 className="text-[15px] font-semibold text-white leading-snug line-clamp-2 flex-1 pr-2 group-hover:text-accent-1 transition-colors">
                    {deal.title}
                </h4>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${priority.color} bg-white/5 border border-white/10 shrink-0 shadow-sm`}>
                    {priority.label}
                </span>
            </div>

            {/* Client */}
            <p className="text-xs text-neutral-400 mb-3 truncate flex items-center gap-1.5 relative z-10">
                <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" />
                </svg>
                {deal.client.name}
                {deal.client.workType && (
                    <span className="text-neutral-500 font-medium"> · {deal.client.workType}</span>
                )}
            </p>

            {/* Value & Probability */}
            <div className="flex items-center justify-between mt-3 mb-2 relative z-10">
                <span className="text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                    {formatCurrency(deal.estimatedValue)}
                </span>
                <span className="text-xs font-semibold text-neutral-400">
                    {deal.closeProbability}% prob.
                </span>
            </div>

            {/* Probability bar */}
            <div className="w-full h-1.5 rounded-full bg-white/5 mb-3 overflow-hidden relative z-10">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent-1 relative"
                    style={{ width: `${deal.closeProbability}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
                <span>{ORIGINS[deal.origin]}</span>
                <span>{timeAgo(deal.updatedAt)}</span>
            </div>

            {/* Actions (expandable) */}
            <AnimatePresence>
                {showActions && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                            {/* Move buttons */}
                            <div className="flex flex-wrap gap-1">
                                {STAGES.filter(s => s.key !== deal.stage).map(stage => (
                                    <button
                                        key={stage.key}
                                        onClick={(e) => { e.stopPropagation(); onMove(deal.id, stage.key); }}
                                        className={`text-[10px] px-2 py-1 rounded-lg ${stage.bg} ${stage.border} border ${stage.color} hover:opacity-80 transition-opacity`}
                                    >
                                        → {stage.label}
                                    </button>
                                ))}
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddActivity(deal.id); }}
                                    className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-accent-1/10 text-accent-1 border border-accent-1/20 hover:bg-accent-1/20 transition-colors"
                                >
                                    + Nota
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }}
                                    className="text-[10px] px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================================================
// CLIENT SELECTOR (Custom dark-themed searchable dropdown)
// ============================================================================

function ClientSelector({
    clients,
    value,
    onChange,
}: {
    clients: ClientOption[];
    value: string;
    onChange: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = clients.find(c => c.id === value);
    const filtered = search
        ? clients.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.workType && c.workType.toLowerCase().includes(search.toLowerCase()))
        )
        : clients;

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <label className="block text-xs text-neutral-400 mb-1.5">Cliente *</label>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border text-left text-sm transition-all flex items-center justify-between ${open
                    ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                    : "border-white/10 hover:border-white/20"
                    }`}
            >
                <span className={selected ? "text-white" : "text-neutral-500"}>
                    {selected
                        ? `${selected.name}${selected.workType ? ` · ${selected.workType}` : ""}`
                        : "Seleccionar cliente..."}
                </span>
                <svg
                    className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 mt-1.5 w-full rounded-xl bg-[#0e1527] border border-white/10 shadow-2xl overflow-hidden"
                    >
                        {/* Search */}
                        <div className="p-2 border-b border-white/5">
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar cliente..."
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500/40"
                            />
                        </div>

                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {/* Deselect option */}
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!value
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                                    }`}
                            >
                                Seleccionar cliente...
                            </button>

                            {filtered.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${value === c.id
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <span className="truncate">
                                        {c.name}
                                        {c.workType && (
                                            <span className="text-neutral-500 ml-1.5 text-xs">({c.workType})</span>
                                        )}
                                    </span>
                                    {value === c.id && (
                                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            ))}

                            {filtered.length === 0 && (
                                <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                                    No se encontraron clientes
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// CREATE DEAL MODAL
// ============================================================================

function CreateDealModal({
    clients,
    onClose,
    onCreated,
}: {
    clients: ClientOption[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        title: "",
        clientId: "",
        description: "",
        priority: "MEDIUM" as DealPriority,
        origin: "DIRECT" as DealOrigin,
        estimatedValue: "",
        closeProbability: "50",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.clientId) {
            setError("Título y cliente son requeridos");
            return;
        }
        startTransition(async () => {
            const result = await createDealAction({
                title: form.title,
                clientId: form.clientId,
                description: form.description || undefined,
                priority: form.priority,
                origin: form.origin,
                estimatedValue: parseInt(form.estimatedValue) || 0,
                closeProbability: parseInt(form.closeProbability) || 50,
            });
            if (result.success) {
                onCreated();
                onClose();
            } else {
                setError(result.error || "Error desconocido");
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0c1224] border border-white/10 p-4 sm:p-6 shadow-2xl scrollbar-hide"
            >
                <h2 className="text-lg font-semibold text-white mb-4">
                    Nueva Oportunidad
                </h2>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1.5">Título *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            maxLength={200}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none transition-colors"
                            placeholder="Ej: Sitio web para empresa X"
                            autoFocus
                        />
                    </div>

                    {/* Client - Custom Dropdown */}
                    <ClientSelector
                        clients={clients}
                        value={form.clientId}
                        onChange={(id) => setForm(f => ({ ...f, clientId: id }))}
                    />

                    {/* Priority + Origin */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Prioridad</label>
                            <div className="flex flex-wrap gap-1">
                                {(Object.entries(PRIORITIES) as [DealPriority, { label: string; color: string }][]).map(([key, val]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, priority: key }))}
                                        className={`flex-1 min-w-[60px] text-xs font-semibold px-2 py-2 rounded-lg border transition-all ${form.priority === key
                                            ? `bg-white/10 border-white/20 ${val.color}`
                                            : "bg-white/5 border-white/5 text-neutral-500 hover:text-neutral-300 hover:bg-white/10"
                                            }`}
                                    >
                                        {val.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Origen</label>
                            <div className="flex flex-wrap gap-1">
                                {(Object.entries(ORIGINS) as [DealOrigin, string][]).map(([key, val]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, origin: key }))}
                                        className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${form.origin === key
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                            : "bg-white/5 border-white/5 text-neutral-500 hover:text-neutral-300 hover:bg-white/10"
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Row: Value + Probability */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Valor estimado (CLP)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={form.estimatedValue ? Number(form.estimatedValue.replace(/\./g, "")).toLocaleString("es-CL") : ""}
                                    onChange={e => {
                                        const cleaned = e.target.value.replace(/[^0-9]/g, "");
                                        setForm(f => ({ ...f, estimatedValue: cleaned }));
                                    }}
                                    className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Probabilidad (%)</label>
                            <input
                                type="number"
                                value={form.closeProbability}
                                onChange={e => setForm(f => ({ ...f, closeProbability: e.target.value }))}
                                min="0"
                                max="100"
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1.5">Descripción</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            maxLength={2000}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none transition-colors resize-none"
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10 text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 text-sm font-semibold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                        >
                            {isPending ? "Creando..." : "Crear Oportunidad"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// ACTIVITY MODAL
// ============================================================================

function ActivityModal({
    dealId,
    onClose,
    onAdded,
}: {
    dealId: string;
    onClose: () => void;
    onAdded: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [type, setType] = useState("note");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const types = [
        { key: "note", label: "📝 Nota", },
        { key: "call", label: "📞 Llamada" },
        { key: "email", label: "📧 Email" },
        { key: "meeting", label: "🤝 Reunión" },
        { key: "task", label: "✅ Tarea" },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
            const result = await addDealActivityAction(dealId, {
                type,
                title,
                description: description || undefined,
            });
            if (result.success) {
                onAdded();
                onClose();
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-[#0c1224] border border-white/10 p-6 shadow-2xl"
            >
                <h2 className="text-lg font-semibold text-white mb-4">
                    Agregar Actividad
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type selector */}
                    <div className="flex flex-wrap gap-2">
                        {types.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setType(t.key)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${type === t.key
                                    ? "bg-accent-1/20 border-accent-1/30 text-accent-1"
                                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={200}
                        placeholder="Título de la actividad..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none transition-colors"
                        autoFocus
                    />

                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder="Detalles (opcional)..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none transition-colors resize-none"
                    />

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10 text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !title.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-accent-1/20 text-accent-1 hover:bg-accent-1/30 border border-accent-1/30 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// PIPELINE BOARD (Main Component)
// ============================================================================

export function PipelineBoard({ initialDeals, clients }: PipelineBoardProps) {
    const [deals, setDeals] = useState<Deal[]>(initialDeals);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activityDealId, setActivityDealId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const refreshDeals = useCallback(() => {
        // Force a full page refresh to get updated data from server
        window.location.reload();
    }, []);

    const handleMoveDeal = useCallback((dealId: string, newStage: DealStage) => {
        // Optimistic update
        setDeals(prev =>
            prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d)
        );

        startTransition(async () => {
            const result = await moveDealStageAction(dealId, newStage);
            if (!result.success) {
                // Revert on failure
                setDeals(initialDeals);
            }
        });
    }, [initialDeals, startTransition]);

    const handleDeleteDeal = useCallback((dealId: string) => {
        if (!confirm("¿Eliminar esta oportunidad?")) return;

        // Optimistic remove
        setDeals(prev => prev.filter(d => d.id !== dealId));

        startTransition(async () => {
            const result = await deleteDealAction(dealId);
            if (!result.success) {
                setDeals(initialDeals);
            }
        });
    }, [initialDeals, startTransition]);

    // Group deals by stage
    const dealsByStage = STAGES.reduce<Record<DealStage, Deal[]>>((acc, stage) => {
        acc[stage.key] = deals.filter(d => d.stage === stage.key);
        return acc;
    }, {} as Record<DealStage, Deal[]>);

    // Pipeline metrics
    const totalValue = deals.reduce((sum, d) => sum + d.estimatedValue, 0);
    const weightedValue = deals.reduce((sum, d) => sum + (d.estimatedValue * d.closeProbability / 100), 0);
    const activeDeals = deals.filter(d => !["WON", "LOST"].includes(d.stage)).length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Pipeline CRM
                        <span className="text-sm px-3 py-1 bg-white/10 rounded-full font-medium text-neutral-300 border border-white/10 shadow-sm">
                            {deals.length} oportunidad{deals.length !== 1 ? "es" : ""}
                        </span>
                    </h1>
                    <p className="text-sm text-neutral-400 mt-2">
                        Gestiona el flujo de ventas arrastrando oportunidades entre etapas
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
                >
                    <span className="text-lg leading-none group-hover:rotate-90 transition-transform duration-300">+</span>
                    Nueva Oportunidad
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">Pipeline Total</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(totalValue)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">Valor Ponderado</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(weightedValue)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">Activas</p>
                    <p className="text-lg font-bold text-white">{activeDeals}</p>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="grid grid-cols-6 gap-4 min-w-[1200px]">
                    {STAGES.map(stage => {
                        const stageDeals = dealsByStage[stage.key];
                        const stageValue = stageDeals.reduce((s, d) => s + d.estimatedValue, 0);

                        return (
                            <div
                                key={stage.key}
                                className={`rounded-3xl border ${stage.border} bg-white/[0.02] flex flex-col overflow-hidden backdrop-blur-md shadow-lg`}
                            >
                                {/* Column header */}
                                <div className={`p-4 ${stage.bg} border-b ${stage.border}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h3 className={`text-sm font-bold uppercase tracking-wide ${stage.color}`}>
                                            {stage.label}
                                        </h3>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/20 ${stage.color}`}>
                                            {stageDeals.length}
                                        </span>
                                    </div>
                                    <div className="h-1 w-8 rounded-full bg-white/20 mb-2" />
                                </div>

                                {/* Stage value */}
                                {stageDeals.length > 0 && (
                                    <div className="px-4 pt-3 pb-1">
                                        <p className="text-[11px] font-medium text-neutral-500 bg-black/20 px-2 py-1 rounded inline-block">
                                            Total: {formatCurrency(stageValue)}
                                        </p>
                                    </div>
                                )}

                                {/* Cards Container */}
                                <div className="flex-1 p-3 space-y-3 min-h-[400px]">
                                    <AnimatePresence mode="popLayout">
                                        {stageDeals.map(deal => (
                                            <DealCard
                                                key={deal.id}
                                                deal={deal}
                                                onMove={handleMoveDeal}
                                                onDelete={handleDeleteDeal}
                                                onAddActivity={setActivityDealId}
                                            />
                                        ))}
                                    </AnimatePresence>

                                    {stageDeals.length === 0 && (
                                        <div className="flex items-center justify-center h-24 text-neutral-600 text-xs">
                                            Sin oportunidades
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Loading indicator */}
            {isPending && (
                <div className="fixed bottom-4 right-4 px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm border border-accent-1/30 animate-pulse">
                    Guardando...
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateDealModal
                        clients={clients}
                        onClose={() => setShowCreateModal(false)}
                        onCreated={refreshDeals}
                    />
                )}
                {activityDealId && (
                    <ActivityModal
                        dealId={activityDealId}
                        onClose={() => setActivityDealId(null)}
                        onAdded={refreshDeals}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
