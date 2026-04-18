"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContractStatus, ContractType } from '@/generated/prisma/client';
import { createContractAction, updateContractAction, deleteContractAction } from "./actions";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ContractClient {
    id: string;
    name: string;
    workType: string | null;
}

interface ContractData {
    id: string;
    contractNumber: string;
    title: string;
    description: string | null;
    status: ContractStatus;
    type: ContractType;
    totalAmount: number;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
    terms: string | null;
    htmlContent: string | null;
    createdAt: string;
    client: ContractClient;
    _count: { deals: number; approvals: number; milestones: number };
}

interface ClientOption {
    id: string;
    name: string;
    workType: string | null;
}

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; bg: string; border: string }> = {
    DRAFT: { label: "Borrador", color: "text-neutral-300", bg: "bg-neutral-500/10", border: "border-neutral-500/20" },
    ACTIVE: { label: "Activo", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    PAUSED: { label: "Pausado", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    COMPLETED: { label: "Completado", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    CANCELLED: { label: "Cancelado", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    EXPIRED: { label: "Vencido", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
};

const TYPE_LABELS: Record<ContractType, string> = {
    PROJECT: "Proyecto",
    RETAINER: "Retainer",
    MAINTENANCE: "Mantenimiento",
    CONSULTING: "Consultoría",
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

// ============================================================================
// SEARCHABLE SELECT (Dark-themed reusable dropdown)
// ============================================================================

function SearchableSelect({
    label,
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    emptyText = "Sin resultados",
    disabled = false,
    searchPlaceholder = "Buscar...",
}: {
    label: string;
    value: string;
    onChange: (id: string) => void;
    options: { id: string; label: string; sublabel?: string }[];
    placeholder?: string;
    emptyText?: string;
    disabled?: boolean;
    searchPlaceholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = options.find(o => o.id === value);
    const filtered = search
        ? options.filter(o =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
        )
        : options;

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
            <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border text-left text-sm transition-all flex items-center justify-between gap-2 ${disabled
                    ? "border-white/5 opacity-50 cursor-not-allowed"
                    : open
                        ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                        : "border-white/10 hover:border-white/20"
                    }`}
            >
                <span className={`truncate ${selected ? "text-white" : "text-neutral-500"}`}>
                    {selected
                        ? selected.sublabel
                            ? `${selected.label} · ${selected.sublabel}`
                            : selected.label
                        : placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
                        <div className="p-2 border-b border-white/5">
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500/40"
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!value
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                                    }`}
                            >
                                {placeholder}
                            </button>
                            {filtered.map(o => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => { onChange(o.id); setOpen(false); setSearch(""); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${value === o.id
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <span className="truncate">
                                        {o.label}
                                        {o.sublabel && (
                                            <span className="text-neutral-500 ml-1.5 text-xs">({o.sublabel})</span>
                                        )}
                                    </span>
                                    {value === o.id && (
                                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <div className="px-4 py-3 text-sm text-neutral-500 text-center">{emptyText}</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// HTML PREVIEW (Sandboxed iframe for contract code preview)
// ============================================================================

function HtmlPreview({ html, onClose }: { html: string; onClose: () => void }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
            }
        }
    }, [html]);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-4xl h-[80vh] rounded-2xl bg-white overflow-hidden shadow-2xl flex flex-col"
            >
                <div className="flex items-center justify-between px-4 py-3 bg-[#0c1224] border-b border-white/10">
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Vista Previa del Contrato
                    </span>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 transition-colors"
                    >
                        ✕ Cerrar
                    </button>
                </div>
                <iframe
                    ref={iframeRef}
                    sandbox="allow-same-origin"
                    className="flex-1 w-full bg-white"
                    title="Vista previa del contrato"
                />
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// CREATE CONTRACT MODAL (Enhanced)
// ============================================================================

function CreateContractModal({
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
    const [editorMode, setEditorMode] = useState<"manual" | "code">("manual");
    const [showPreview, setShowPreview] = useState(false);
    const [form, setForm] = useState({
        title: "", clientId: "", description: "",
        type: "PROJECT" as ContractType,
        totalAmount: "", startDate: "", endDate: "",
        terms: "", htmlContent: "", autoRenew: false,
    });

    const clientOptions = clients.map(c => ({
        id: c.id,
        label: c.name,
        sublabel: c.workType || undefined,
    }));

    // Formatted currency display with thousand separators
    const displayAmount = form.totalAmount
        ? Number(form.totalAmount.replace(/\./g, "")).toLocaleString("es-CL")
        : "";

    const handleAmountChange = (raw: string) => {
        const cleaned = raw.replace(/[^0-9]/g, "");
        setForm(f => ({ ...f, totalAmount: cleaned }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.clientId) {
            setError("Título y cliente son requeridos");
            return;
        }
        startTransition(async () => {
            const result = await createContractAction({
                title: form.title,
                clientId: form.clientId,
                description: form.description || undefined,
                type: form.type,
                totalAmount: parseInt(form.totalAmount.replace(/\./g, "")) || 0,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
                terms: editorMode === "manual" ? (form.terms || undefined) : undefined,
                htmlContent: editorMode === "code" ? (form.htmlContent || undefined) : undefined,
                autoRenew: form.autoRenew,
            });
            if (result.success) { onCreated(); onClose(); }
            else setError(result.error || "Error desconocido");
        });
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0c1224] border border-white/10 p-4 sm:p-6 shadow-2xl scrollbar-hide"
                >
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-accent-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Nuevo Contrato
                    </h2>
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Título *</label>
                            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                maxLength={200} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none transition-colors" placeholder="Ej: Contrato desarrollo web" autoFocus />
                        </div>

                        {/* Client (Searchable) */}
                        <SearchableSelect
                            label="Cliente *"
                            value={form.clientId}
                            onChange={(id) => setForm(f => ({ ...f, clientId: id }))}
                            options={clientOptions}
                            placeholder="Seleccionar cliente..."
                            emptyText="No se encontraron clientes"
                            searchPlaceholder="Buscar cliente..."
                        />

                        {/* Contract Type (Button Group) */}
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Tipo de Contrato</label>
                            <div className="flex flex-wrap gap-1">
                                {(Object.entries(TYPE_LABELS) as [ContractType, string][]).map(([key, val]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, type: key }))}
                                        className={`flex-1 min-w-[70px] text-xs font-semibold px-2 py-2 rounded-lg border transition-all ${form.type === key
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                            : "bg-white/5 border-white/5 text-neutral-500 hover:text-neutral-300 hover:bg-white/10"
                                            }`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount with $ prefix and thousand separators */}
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Valor Total (CLP)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-medium">$</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayAmount}
                                    onChange={e => handleAmountChange(e.target.value)}
                                    className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1.5">Fecha Inicio</label>
                                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1.5">Fecha Fin</label>
                                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors" />
                            </div>
                        </div>

                        {/* Terms / Clauses Editor (Toggle: Manual vs Code) */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs text-neutral-400">Términos / Cláusulas</label>
                                <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setEditorMode("manual")}
                                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${editorMode === "manual"
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-neutral-500 hover:text-neutral-300"
                                            }`}
                                    >
                                        ✏️ Manual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditorMode("code")}
                                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${editorMode === "code"
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-neutral-500 hover:text-neutral-300"
                                            }`}
                                    >
                                        {"</>"} Código HTML
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {editorMode === "manual" ? (
                                    <motion.div key="manual" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                                        <textarea
                                            value={form.terms}
                                            onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                                            rows={5}
                                            maxLength={10000}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none resize-none transition-colors"
                                            placeholder="Escribe las cláusulas del contrato aquí...&#10;&#10;1. Primera cláusula...&#10;2. Segunda cláusula..."
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div key="code" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-2">
                                        <textarea
                                            value={form.htmlContent}
                                            onChange={e => setForm(f => ({ ...f, htmlContent: e.target.value }))}
                                            rows={8}
                                            maxLength={102400}
                                            className="w-full px-4 py-2.5 rounded-xl bg-[#0a0e1a] border border-white/10 text-emerald-300 text-xs font-mono focus:border-emerald-500/50 focus:outline-none resize-none transition-colors leading-relaxed"
                                            placeholder="<!DOCTYPE html>&#10;<html lang='es'>&#10;<head>&#10;  <style>&#10;    /* estilos del contrato */&#10;  </style>&#10;</head>&#10;<body>&#10;  <!-- contenido del contrato -->&#10;</body>&#10;</html>"
                                            spellCheck={false}
                                        />
                                        {form.htmlContent.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPreview(true)}
                                                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Vista Previa
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Auto-renew */}
                        <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                            <input type="checkbox" checked={form.autoRenew} onChange={e => setForm(f => ({ ...f, autoRenew: e.target.checked }))}
                                className="rounded bg-white/5 border-white/20 accent-emerald-500" />
                            Renovación automática
                        </label>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10 text-sm transition-colors">Cancelar</button>
                            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 text-sm font-semibold disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                                {isPending ? "Creando..." : "Crear Contrato"}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>

            {/* HTML Preview Modal */}
            <AnimatePresence>
                {showPreview && form.htmlContent.trim() && (
                    <HtmlPreview html={form.htmlContent} onClose={() => setShowPreview(false)} />
                )}
            </AnimatePresence>
        </>
    );
}

// ============================================================================
// CLIENT GROUP (Collapsible group header for contracts by client)
// ============================================================================

function ClientContractGroup({
    clientName,
    clientWorkType,
    contracts,
    totalValue,
    onStatusChange,
    onDelete,
}: {
    clientName: string;
    clientWorkType: string | null;
    contracts: ContractData[];
    totalValue: number;
    onStatusChange: (contractId: string, newStatus: ContractStatus) => void;
    onDelete: (contractId: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="space-y-3">
            {/* Group Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shadow-inner">
                        {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-white group-hover:text-accent-1 transition-colors">{clientName}</h3>
                        <p className="text-[11px] text-neutral-500">
                            {clientWorkType && <span>{clientWorkType} · </span>}
                            {contracts.length} contrato{contracts.length !== 1 ? "s" : ""}
                            <span className="mx-1.5 text-neutral-600">•</span>
                            {formatCurrency(totalValue)}
                        </p>
                    </div>
                </div>
                <svg
                    className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Contract Cards */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pl-4 border-l-2 border-white/5 ml-4">
                            {contracts.map(contract => {
                                const statusCfg = STATUS_CONFIG[contract.status];
                                return (
                                    <motion.div
                                        key={contract.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="group p-5 rounded-2xl bg-[#0c1224]/80 border border-white/5 hover:border-white/20 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between h-full gap-4"
                                    >
                                        <div className={`absolute top-0 right-0 w-28 h-28 ${statusCfg.bg} blur-3xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none`} />

                                        <div className="relative z-10">
                                            {/* Badges */}
                                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                <span className="text-[10px] font-mono text-neutral-400 font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 tracking-widest">{contract.contractNumber}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}`}>{statusCfg.label}</span>
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/10 text-neutral-300">{TYPE_LABELS[contract.type]}</span>
                                            </div>

                                            {/* Title */}
                                            <h4 className="text-[15px] font-bold text-white group-hover:text-accent-1 transition-colors leading-snug line-clamp-2 mb-1.5">{contract.title}</h4>

                                            {/* Date range */}
                                            <p className="text-[11px] text-neutral-500 font-medium">
                                                {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                                            </p>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-extrabold text-white tracking-tight">{formatCurrency(contract.totalAmount)}</span>
                                                {contract.autoRenew && (
                                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">🔄 Auto</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <select
                                                    value={contract.status}
                                                    onChange={e => onStatusChange(contract.id, e.target.value as ContractStatus)}
                                                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent-1 hover:bg-white/10 transition-colors cursor-pointer appearance-none pr-6"
                                                    style={{
                                                        backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="none" stroke="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>\')',
                                                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.3rem center', backgroundSize: '0.8em',
                                                    }}
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-black/90">{v.label}</option>)}
                                                </select>
                                                <button
                                                    onClick={() => onDelete(contract.id)}
                                                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    aria-label="Eliminar contrato"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// CONTRACTS LIST (Main Component)
// ============================================================================

export function ContractsList({
    initialContracts,
    clients,
}: {
    initialContracts: ContractData[];
    clients: ClientOption[];
}) {
    const [contracts, setContracts] = useState(initialContracts);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState<ContractStatus | "ALL">("ALL");
    const [isPending, startTransition] = useTransition();

    const filtered = filter === "ALL" ? contracts : contracts.filter(c => c.status === filter);

    const totalValue = contracts.reduce((s, c) => s + c.totalAmount, 0);
    const activeCount = contracts.filter(c => c.status === "ACTIVE").length;

    // Group filtered contracts by client
    const groupedByClient = filtered.reduce<Record<string, { clientName: string; clientWorkType: string | null; contracts: ContractData[]; totalValue: number }>>((acc, c) => {
        const key = c.client.id;
        if (!acc[key]) {
            acc[key] = { clientName: c.client.name, clientWorkType: c.client.workType, contracts: [], totalValue: 0 };
        }
        acc[key].contracts.push(c);
        acc[key].totalValue += c.totalAmount;
        return acc;
    }, {});

    // Sort groups by total value descending
    const sortedGroups = Object.entries(groupedByClient).sort(([, a], [, b]) => b.totalValue - a.totalValue);

    const handleStatusChange = useCallback((contractId: string, newStatus: ContractStatus) => {
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: newStatus } : c));
        startTransition(async () => {
            const result = await updateContractAction(contractId, { status: newStatus });
            if (!result.success) setContracts(initialContracts);
        });
    }, [initialContracts]);

    const handleDelete = useCallback((contractId: string) => {
        if (!confirm("¿Eliminar este contrato?")) return;
        setContracts(prev => prev.filter(c => c.id !== contractId));
        startTransition(async () => {
            const result = await deleteContractAction(contractId);
            if (!result.success) setContracts(initialContracts);
        });
    }, [initialContracts]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Contratos
                        <span className="text-sm px-3 py-1 bg-white/10 rounded-full font-medium text-neutral-300 border border-white/10 shadow-sm">
                            {contracts.length} registro{contracts.length !== 1 ? "s" : ""}
                        </span>
                    </h1>
                    <p className="text-sm text-neutral-400 mt-2">Administra los acuerdos comerciales, renovaciones y el estado de cada proyecto</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
                >
                    <span className="text-lg leading-none group-hover:rotate-90 transition-transform duration-300">+</span>
                    Nuevo Contrato
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">Valor Total Contratos</p>
                    <p className="text-3xl font-extrabold text-white">{formatCurrency(totalValue)}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-emerald-600/20 to-green-500/10 border border-emerald-500/20 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">Contratos Activos</p>
                    <p className="text-3xl font-extrabold text-emerald-400">{activeCount}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Total Registrados</p>
                    <p className="text-3xl font-extrabold text-white">{contracts.length}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
                <span className="text-sm font-medium text-neutral-500 mr-2">Filtrar por Etapa:</span>
                <button onClick={() => setFilter("ALL")} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${filter === "ALL" ? "bg-accent-1 text-black shadow-[0_0_15px_rgba(var(--accent-1),0.4)] hover:-translate-y-0.5" : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5"}`}>
                    Todos <span className="ml-1 opacity-70">({contracts.length})</span>
                </button>
                {(Object.entries(STATUS_CONFIG) as [ContractStatus, typeof STATUS_CONFIG[ContractStatus]][]).map(([key, cfg]) => {
                    const count = contracts.filter(c => c.status === key).length;
                    if (count === 0) return null;
                    return (
                        <button key={key} onClick={() => setFilter(key)} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${filter === key ? `${cfg.bg} text-white border ${cfg.border} shadow-md hover:-translate-y-0.5` : "bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5"}`}>
                            {cfg.label} <span className="ml-0.5 opacity-70 border-l border-current pl-1.5">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Contract Groups by Client */}
            <div className="space-y-6">
                {sortedGroups.map(([clientId, group]) => (
                    <ClientContractGroup
                        key={clientId}
                        clientName={group.clientName}
                        clientWorkType={group.clientWorkType}
                        contracts={group.contracts}
                        totalValue={group.totalValue}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
                <div className="p-16 rounded-3xl bg-white/5 border border-white/10 text-center shadow-inner">
                    <svg className="w-16 h-16 mx-auto mb-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-white mb-2">No se encontraron contratos</h3>
                    <p className="text-neutral-400 text-sm">Prueba ajustando los filtros o crea un contrato nuevo.</p>
                </div>
            )}

            {isPending && <div className="fixed bottom-4 right-4 px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm border border-accent-1/30 animate-pulse">Guardando...</div>}

            <AnimatePresence>
                {showCreate && <CreateContractModal clients={clients} onClose={() => setShowCreate(false)} onCreated={() => window.location.reload()} />}
            </AnimatePresence>
        </div>
    );
}
