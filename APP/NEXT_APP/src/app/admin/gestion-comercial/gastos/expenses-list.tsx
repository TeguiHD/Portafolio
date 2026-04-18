"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExpenseCategory, ExpenseFrequency } from '@/generated/prisma/client';
import { createExpenseAction, deleteExpenseAction } from "./actions";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ExpenseData {
    id: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    isRecurring: boolean;
    frequency: ExpenseFrequency;
    expenseDate: string;
    notes: string | null;
    receiptUrl: string | null;
    client: { id: string; name: string };
    contract: { id: string; title: string; contractNumber: string } | null;
}

interface ClientOption {
    id: string;
    name: string;
    workType: string | null;
}

interface ContractOption {
    id: string;
    title: string;
    contractNumber: string;
    clientId: string;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
    HOSTING: { label: "Hosting", icon: "🖥️", color: "text-blue-400" },
    DOMAIN: { label: "Dominio", icon: "🌐", color: "text-cyan-400" },
    LICENSES: { label: "Licencias", icon: "📜", color: "text-purple-400" },
    THIRD_PARTY: { label: "Terceros", icon: "🤝", color: "text-amber-400" },
    TOOLS: { label: "Herramientas", icon: "🔧", color: "text-emerald-400" },
    OTHER: { label: "Otro", icon: "📦", color: "text-neutral-400" },
};

const FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
    ONE_TIME: "Único",
    MONTHLY: "Mensual",
    YEARLY: "Anual",
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

// ============================================================================
// SEARCHABLE SELECT (Reusable dark-themed dropdown)
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
                        {/* Search */}
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

                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {/* Deselect */}
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
// CREATE EXPENSE MODAL
// ============================================================================

function CreateExpenseModal({
    clients, contracts, onClose, onCreated,
}: {
    clients: ClientOption[];
    contracts: ContractOption[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        clientId: "", contractId: "", category: "OTHER" as ExpenseCategory,
        description: "", amount: "", isRecurring: false,
        frequency: "ONE_TIME" as ExpenseFrequency, expenseDate: new Date().toISOString().split("T")[0], notes: "",
    });

    const filteredContracts = contracts.filter(c => c.clientId === form.clientId);

    const clientOptions = clients.map(c => ({
        id: c.id,
        label: c.name,
        sublabel: c.workType || undefined,
    }));

    const contractOptions = filteredContracts.map(c => ({
        id: c.id,
        label: c.contractNumber,
        sublabel: c.title,
    }));

    const categoryOptions = (Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, typeof CATEGORY_CONFIG[ExpenseCategory]][]).map(([k, v]) => ({
        id: k,
        label: `${v.icon} ${v.label}`,
    }));

    // Format amount with thousand separators for display
    const displayAmount = form.amount
        ? Number(form.amount.replace(/\./g, "")).toLocaleString("es-CL")
        : "";

    const handleAmountChange = (raw: string) => {
        // Strip non-digits, store raw number
        const cleaned = raw.replace(/[^0-9]/g, "");
        setForm(f => ({ ...f, amount: cleaned }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientId || !form.description.trim() || !form.amount) {
            setError("Cliente, descripción y monto son requeridos");
            return;
        }
        startTransition(async () => {
            const result = await createExpenseAction({
                clientId: form.clientId,
                contractId: form.contractId || undefined,
                category: form.category,
                description: form.description,
                amount: parseInt(form.amount.replace(/\./g, "")) || 0,
                isRecurring: form.isRecurring,
                frequency: form.frequency,
                expenseDate: form.expenseDate,
                notes: form.notes || undefined,
            });
            if (result.success) { onCreated(); onClose(); }
            else setError(result.error || "Error desconocido");
        });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0c1224] border border-white/10 p-4 sm:p-6 shadow-2xl scrollbar-hide">
                <h2 className="text-lg font-semibold text-white mb-4">Registrar Gasto</h2>
                {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <SearchableSelect
                            label="Cliente *"
                            value={form.clientId}
                            onChange={(id) => setForm(f => ({ ...f, clientId: id, contractId: "" }))}
                            options={clientOptions}
                            placeholder="Seleccionar cliente..."
                            emptyText="No se encontraron clientes"
                            searchPlaceholder="Buscar cliente..."
                        />
                        <SearchableSelect
                            label="Contrato (opcional)"
                            value={form.contractId}
                            onChange={(id) => setForm(f => ({ ...f, contractId: id }))}
                            options={contractOptions}
                            placeholder="Sin contrato"
                            emptyText="Sin contratos para este cliente"
                            disabled={!form.clientId}
                            searchPlaceholder="Buscar contrato..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-400 mb-1.5">Descripción *</label>
                        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            maxLength={500} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-accent-1/50 focus:outline-none" placeholder="Ej: Hosting anual..." autoFocus />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <SearchableSelect
                            label="Categoría"
                            value={form.category}
                            onChange={(id) => setForm(f => ({ ...f, category: (id || "OTHER") as ExpenseCategory }))}
                            options={categoryOptions}
                            placeholder="Categoría"
                            emptyText="Sin categorías"
                            searchPlaceholder="Buscar..."
                        />
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Monto (CLP) *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
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
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Fecha</label>
                            <input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:outline-none transition-colors" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                            <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="rounded bg-white/5 border-white/20 accent-emerald-500" />
                            Gasto recurrente
                        </label>
                        {form.isRecurring && (
                            <div className="flex gap-1">
                                {(Object.entries(FREQUENCY_LABELS).filter(([k]) => k !== "ONE_TIME") as [ExpenseFrequency, string][]).map(([k, v]) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, frequency: k }))}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${form.frequency === k
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                            : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10 text-sm transition-colors">Cancelar</button>
                        <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 text-sm font-semibold disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                            {isPending ? "Registrando..." : "Registrar Gasto"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// EXPENSES LIST
// ============================================================================

export function ExpensesList({
    initialExpenses, clients, contracts,
}: {
    initialExpenses: ExpenseData[];
    clients: ClientOption[];
    contracts: ContractOption[];
}) {
    const [expenses, setExpenses] = useState(initialExpenses);
    const [showCreate, setShowCreate] = useState(false);
    const [catFilter, setCatFilter] = useState<ExpenseCategory | "ALL">("ALL");
    const [isPending, startTransition] = useTransition();

    const filtered = catFilter === "ALL" ? expenses : expenses.filter(e => e.category === catFilter);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const recurringTotal = expenses.filter(e => e.isRecurring).reduce((s, e) => s + e.amount, 0);

    // Group by category for summary
    const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {});

    const handleDelete = (expenseId: string) => {
        if (!confirm("¿Eliminar este gasto?")) return;
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        startTransition(async () => {
            const result = await deleteExpenseAction(expenseId);
            if (!result.success) setExpenses(initialExpenses);
        });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Control de Gastos
                        <span className="text-sm px-3 py-1 bg-white/10 rounded-full font-medium text-neutral-300 border border-white/10 shadow-sm">
                            {expenses.length} registro{expenses.length !== 1 ? "s" : ""}
                        </span>
                    </h1>
                    <p className="text-sm text-neutral-400 mt-2">Gestiona y analiza los costos de tu negocio operacionales y por cliente</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5">
                    <span className="text-lg leading-none group-hover:scale-110 transition-transform duration-300">+</span> Registrar Gasto
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-red-600/20 to-rose-500/10 border border-red-500/20 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">Total Gastos</p>
                    <p className="text-3xl font-extrabold text-white">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-amber-600/20 to-orange-500/10 border border-amber-500/20 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">Recurrentes / mes</p>
                    <p className="text-3xl font-extrabold text-amber-400">{formatCurrency(recurringTotal)}</p>
                </div>
                <div className="relative overflow-hidden p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Resumen por Categoría</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(byCategory).map(([cat, total]) => {
                            const cfg = CATEGORY_CONFIG[cat as ExpenseCategory];
                            return (
                                <span key={cat} className={`text-xs font-medium px-2.5 py-1 rounded-md ${cfg.color} bg-white/5 border border-white/5 shadow-sm`}>
                                    {cfg.icon} {formatCurrency(total)}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
                <span className="text-sm font-medium text-neutral-500 mr-2">Filtrar:</span>
                <button onClick={() => setCatFilter("ALL")} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${catFilter === "ALL" ? "bg-accent-1 text-black shadow-[0_0_15px_rgba(var(--accent-1),0.4)] hover:-translate-y-0.5" : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5"}`}>
                    Todos
                </button>
                {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, typeof CATEGORY_CONFIG[ExpenseCategory]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setCatFilter(key)} className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${catFilter === key ? "bg-white/10 text-white border border-white/20 shadow-md hover:-translate-y-0.5" : "bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5"}`}>
                        <span className="text-base leading-none">{cfg.icon}</span> {cfg.label}
                    </button>
                ))}
            </div>

            {/* Expense cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {filtered.map(expense => {
                        const cfg = CATEGORY_CONFIG[expense.category];
                        return (
                            <motion.div key={expense.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="group p-5 rounded-3xl bg-[#0c1224]/80 border border-white/5 hover:border-white/20 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 backdrop-blur-md relative overflow-hidden flex flex-col justify-between h-full gap-4">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full group-hover:bg-white/10 transition-colors pointer-events-none" />

                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 shrink-0 shadow-inner">
                                        {cfg.icon}
                                    </div>
                                    <div className="min-w-0 pr-2 pb-1">
                                        <h3 className="text-[15px] font-bold text-white leading-snug group-hover:text-amber-100 transition-colors line-clamp-2">{expense.description}</h3>
                                        <p className="text-[11px] text-neutral-500 mt-1 truncate font-medium">
                                            {expense.client.name} <span className="mx-1 opacity-50">•</span> {formatDate(expense.expenseDate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 relative z-10 pt-3 border-t border-white/5">
                                    {(expense.isRecurring || expense.contract) && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {expense.isRecurring && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">🔄 {FREQUENCY_LABELS[expense.frequency]}</span>}
                                            {expense.contract && <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 max-w-[120px] truncate" title={expense.contract.contractNumber}>{expense.contract.contractNumber}</span>}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-auto pt-1">
                                        <span className="text-xl font-extrabold text-red-400 tracking-tight">-{formatCurrency(expense.amount)}</span>
                                        <button onClick={() => handleDelete(expense.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all" aria-label="Eliminar gasto">Eliminar</button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filtered.length === 0 && (
                <div className="p-16 rounded-3xl bg-white/5 border border-white/10 text-center shadow-inner">
                    <span className="text-5xl filter grayscale opacity-40 block mb-4">💸</span>
                    <h3 className="text-lg font-semibold text-white mb-2">No se encontraron gastos</h3>
                    <p className="text-neutral-400 text-sm">Registra un nuevo gasto para comenzar a llevar el control.</p>
                </div>
            )}

            {isPending && <div className="fixed bottom-4 right-4 px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm border border-accent-1/30 animate-pulse">Guardando...</div>}

            <AnimatePresence>
                {showCreate && <CreateExpenseModal clients={clients} contracts={contracts} onClose={() => setShowCreate(false)} onCreated={() => window.location.reload()} />}
            </AnimatePresence>
        </div>
    );
}
