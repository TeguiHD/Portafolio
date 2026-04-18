"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/**
 * Client Detail Page – Visual CRM Dashboard
 * 
 * Provides a comprehensive view of a client's lifecycle:
 * - Overview with key metrics
 * - Visual project flow (milestone timeline per contract)
 * - Quotations, contracts, deals 
 * - Payment tracking
 * - Approval history
 */

// ─── Types ─────────────────────────────────────────────────────────

interface Quotation {
    id: string;
    folio: string;
    projectName: string;
    status: string;
    total: number;
    createdAt: string;
}

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
    isVisibleToClient: boolean;
}

interface Portal {
    id: string;
    slug: string;
    isActive: boolean;
    accessCount: number;
}

interface PaymentPlan {
    id: string;
    totalAmount: number;
    totalInstallments: number;
    status: string;
}

interface Approval {
    id: string;
    type: string;
    status: string;
    signerName: string | null;
    signerRut: string | null;
    signedAt: string | null;
    createdAt: string;
}

interface Contract {
    id: string;
    contractNumber: string;
    title: string;
    description: string | null;
    status: string;
    type: string;
    totalAmount: number;
    startDate: string | null;
    endDate: string | null;
    milestones: Milestone[];
    portals: Portal[];
    paymentPlans: PaymentPlan[];
    approvals: Approval[];
}

interface Deal {
    id: string;
    title: string;
    stage: string;
    priority: string;
    estimatedValue: number | null;
    updatedAt: string;
}

interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    expenseDate: string;
}

interface Client {
    id: string;
    name: string;
    contactEmail: string | null;
    contactPhone: string | null;
    company: string | null;
    rut: string | null;
    workType: string | null;
    address: string | null;
    notes: string | null;
    quotations: Quotation[];
    contracts: Contract[];
    deals: Deal[];
    expenses: Expense[];
}

// ─── Helpers ───────────────────────────────────────────────────────

const formatCLP = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statusColors: Record<string, string> = {
    DRAFT: "bg-neutral-500/20 text-neutral-300 border-neutral-500/30",
    ACTIVE: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    PAUSED: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    COMPLETED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    CANCELLED: "bg-red-500/20 text-red-300 border-red-500/30",
    EXPIRED: "bg-red-500/20 text-red-300 border-red-500/30",
    PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    IN_PROGRESS: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    SIGNED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
    SKIPPED: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
    SENT: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    APPROVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

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

const StatusBadge = ({ status }: { status: string }) => (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusColors[status] || statusColors.DRAFT}`}>
        {status.replace(/_/g, " ")}
    </span>
);

// ─── Tabs ──────────────────────────────────────────────────────────

type Tab = "overview" | "contracts" | "quotations" | "deals" | "expenses";

const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Vista General", icon: "📊" },
    { key: "contracts", label: "Contratos", icon: "📝" },
    { key: "quotations", label: "Propuestas", icon: "📋" },
    { key: "deals", label: "Pipeline", icon: "🎯" },
    { key: "expenses", label: "Gastos", icon: "💰" },
];

// ─── Component ─────────────────────────────────────────────────────

export default function ClientDetailClient({ client }: { client: Client }) {
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    const metrics = useMemo(() => {
        const totalRevenue = client.contracts.reduce((acc, c) => acc + c.totalAmount, 0);
        const totalQuoted = client.quotations.reduce((acc, q) => acc + q.total, 0);
        const totalExpenses = client.expenses.reduce((acc, e) => acc + e.amount, 0);
        const activeContracts = client.contracts.filter((c) => c.status === "ACTIVE").length;
        const signedApprovals = client.contracts.flatMap((c) => c.approvals).filter((a) => a.status === "SIGNED").length;
        const totalMilestones = client.contracts.reduce((acc, c) => acc + c.milestones.length, 0);
        const completedMilestones = client.contracts.reduce(
            (acc, c) => acc + c.milestones.filter((m) => m.status === "COMPLETED").length, 0
        );
        return { totalRevenue, totalQuoted, totalExpenses, activeContracts, signedApprovals, totalMilestones, completedMilestones };
    }, [client]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 justify-between">
                <div className="flex items-start gap-4">
                    <Link
                        href="/admin/gestion-comercial/clientes"
                        className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
                    >
                        ←
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            {client.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-neutral-400">
                            {client.company && <span className="flex items-center gap-1">🏢 {client.company}</span>}
                            {client.rut && <span className="flex items-center gap-1 font-mono text-xs">🪪 {client.rut}</span>}
                            {client.contactEmail && <span className="flex items-center gap-1">📧 {client.contactEmail}</span>}
                            {client.contactPhone && <span className="flex items-center gap-1">📞 {client.contactPhone}</span>}
                        </div>
                    </div>
                </div>
                {client.workType && (
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-accent-1/10 text-accent-1 border border-accent-1/20">
                        {client.workType}
                    </span>
                )}
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: "Facturado", value: formatCLP(metrics.totalRevenue), accent: true },
                    { label: "Cotizado", value: formatCLP(metrics.totalQuoted) },
                    { label: "Gastos", value: formatCLP(metrics.totalExpenses) },
                    { label: "Contratos", value: String(metrics.activeContracts) },
                    { label: "Propuestas", value: String(client.quotations.length) },
                    { label: "Firmas", value: String(metrics.signedApprovals) },
                    { label: "Hitos", value: `${metrics.completedMilestones}/${metrics.totalMilestones}` },
                ].map((m) => (
                    <div
                        key={m.label}
                        className={`p-4 rounded-2xl border transition-colors ${
                            m.accent
                                ? "bg-accent-1/10 border-accent-1/20"
                                : "bg-white/[0.03] border-white/5"
                        }`}
                    >
                        <p className="text-xl font-extrabold text-white">{m.value}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mt-1">{m.label}</p>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1.5 overflow-x-auto bg-white/[0.02] border border-white/5 rounded-xl p-1.5 scrollbar-hide">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                            activeTab === t.key
                                ? "bg-white/10 text-white shadow-lg"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <span className="text-base">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === "overview" && <OverviewTab client={client} />}
                {activeTab === "contracts" && <ContractsTab contracts={client.contracts} />}
                {activeTab === "quotations" && <QuotationsTab quotations={client.quotations} />}
                {activeTab === "deals" && <DealsTab deals={client.deals} />}
                {activeTab === "expenses" && <ExpensesTab expenses={client.expenses} />}
            </div>
        </div>
    );
}

// ─── Overview Tab ──────────────────────────────────────────────────

function OverviewTab({ client }: { client: Client }) {
    const activeContract = client.contracts.find((c) => c.status === "ACTIVE") || client.contracts[0];

    return (
        <div className="space-y-6">
            {/* Active Contract Project Flow */}
            {activeContract ? (
                <ContractProjectFlow contract={activeContract} />
            ) : (
                <div className="p-12 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                    <span className="text-4xl block mb-3 opacity-40">📝</span>
                    <p className="text-neutral-400">No hay contratos activos para este cliente</p>
                </div>
            )}

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Quotations */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        📋 Últimas Propuestas
                    </h3>
                    {client.quotations.length === 0 ? (
                        <p className="text-neutral-500 text-sm">Sin propuestas</p>
                    ) : (
                        <div className="space-y-2">
                            {client.quotations.slice(0, 5).map((q) => (
                                <div key={q.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{q.projectName}</p>
                                        <p className="text-xs text-neutral-500 font-mono">{q.folio}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <StatusBadge status={q.status} />
                                        <p className="text-xs text-neutral-500 mt-1">{formatCLP(q.total)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Approvals */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        ✍️ Firmas y Aprobaciones
                    </h3>
                    {(() => {
                        const allApprovals = client.contracts.flatMap((c) => c.approvals);
                        if (allApprovals.length === 0) return <p className="text-neutral-500 text-sm">Sin aprobaciones</p>;
                        return (
                            <div className="space-y-2">
                                {allApprovals.slice(0, 5).map((a) => (
                                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white">{a.type}</p>
                                            <p className="text-xs text-neutral-500">
                                                {a.signerName ? `Firmado por ${a.signerName}` : "Pendiente de firma"}
                                                {a.signerRut && ` · ${a.signerRut}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <StatusBadge status={a.status} />
                                            <p className="text-xs text-neutral-500 mt-1">{formatDate(a.signedAt || a.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Notes */}
            {client.notes && (
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">📝 Notas</h3>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">{client.notes}</p>
                </div>
            )}
        </div>
    );
}

// ─── Contract Project Flow (Visual Milestone Timeline) ─────────────

function ContractProjectFlow({ contract }: { contract: Contract }) {
    const completedCount = contract.milestones.filter((m) => m.status === "COMPLETED").length;
    const totalCount = contract.milestones.length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1224]/90 to-[#0a0f1d] border border-white/5 space-y-5">
            {/* Contract Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-bold text-white">{contract.title}</h2>
                        <StatusBadge status={contract.status} />
                    </div>
                    <p className="text-xs text-neutral-500 font-mono">{contract.contractNumber}</p>
                    {contract.description && (
                        <p className="text-sm text-neutral-400 mt-1">{contract.description}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xl font-extrabold text-white">{formatCLP(contract.totalAmount)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Progreso del Proyecto</span>
                    <span className="font-bold text-white">{progressPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-1 to-cyan-400 transition-all duration-700 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Milestone Flow – Visual Timeline */}
            {contract.milestones.length > 0 && (
                <div className="relative">
                    {/* Connection line */}
                    <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent-1/40 via-white/10 to-transparent" />

                    <div className="space-y-0">
                        {contract.milestones.map((milestone, idx) => {
                            const isCompleted = milestone.status === "COMPLETED";
                            const isActive = milestone.status === "IN_PROGRESS";
                            const isSkipped = milestone.status === "SKIPPED";
                            const icon = milestone.icon || milestoneIcons[milestone.type] || "📌";

                            return (
                                <div key={milestone.id} className="relative flex items-start gap-4 py-3">
                                    {/* Node */}
                                    <div
                                        className={`relative z-10 shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg border-2 transition-all ${
                                            isCompleted
                                                ? "bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                                                : isActive
                                                ? "bg-cyan-500/20 border-cyan-400/50 shadow-lg shadow-cyan-500/10 animate-pulse"
                                                : isSkipped
                                                ? "bg-neutral-500/10 border-neutral-500/20 opacity-50"
                                                : "bg-white/5 border-white/10"
                                        }`}
                                    >
                                        {isCompleted ? "✓" : icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pb-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4
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
                                            </h4>
                                            {!milestone.isVisibleToClient && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    INTERNO
                                                </span>
                                            )}
                                        </div>
                                        {milestone.description && (
                                            <p className="text-xs text-neutral-500">{milestone.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                                            {milestone.estimatedDate && (
                                                <span>📅 {formatDate(milestone.estimatedDate)}</span>
                                            )}
                                            {milestone.completedAt && (
                                                <span className="text-emerald-400">✓ {formatDate(milestone.completedAt)}</span>
                                            )}
                                            <span className="text-[9px] font-mono opacity-50">#{idx + 1}</span>
                                        </div>
                                    </div>

                                    {/* Status indicator on right */}
                                    <div className="shrink-0 mt-1">
                                        <StatusBadge status={milestone.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Portal & Payment Info Bar */}
            <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5">
                {contract.portals.map((p) => (
                    <div
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
                            p.isActive
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                : "bg-neutral-500/10 border-neutral-500/20 text-neutral-400"
                        }`}
                    >
                        🌐 Portal: {p.slug}
                        <span className="text-[10px] opacity-60">({p.accessCount} visitas)</span>
                    </div>
                ))}
                {contract.paymentPlans.map((pp) => (
                    <div
                        key={pp.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    >
                        💳 {pp.totalInstallments} cuotas · {formatCLP(pp.totalAmount)}
                        <StatusBadge status={pp.status} />
                    </div>
                ))}
                {contract.approvals.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        ✍️ {contract.approvals.filter((a) => a.status === "SIGNED").length}/{contract.approvals.length} firmas
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Contracts Tab ─────────────────────────────────────────────────

function ContractsTab({ contracts }: { contracts: Contract[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (contracts.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-4xl block mb-3 opacity-40">📝</span>
                <p className="text-neutral-400">No hay contratos registrados</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {contracts.map((contract) => (
                <div key={contract.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                    <button
                        onClick={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
                        className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-bold text-white">{contract.title}</h3>
                                <StatusBadge status={contract.status} />
                            </div>
                            <p className="text-xs text-neutral-500 font-mono mt-0.5">{contract.contractNumber} · {contract.type}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-4">
                            <div>
                                <p className="text-lg font-extrabold text-white">{formatCLP(contract.totalAmount)}</p>
                                <p className="text-xs text-neutral-500">{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</p>
                            </div>
                            <span className={`text-neutral-500 transition-transform ${expandedId === contract.id ? "rotate-180" : ""}`}>
                                ▾
                            </span>
                        </div>
                    </button>

                    {expandedId === contract.id && (
                        <div className="border-t border-white/5 p-5">
                            <ContractProjectFlow contract={contract} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Quotations Tab ────────────────────────────────────────────────

function QuotationsTab({ quotations }: { quotations: Quotation[] }) {
    if (quotations.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-4xl block mb-3 opacity-40">📋</span>
                <p className="text-neutral-400">No hay propuestas registradas</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {quotations.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white">{q.projectName}</h3>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">{q.folio} · {formatDate(q.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-bold text-white">{formatCLP(q.total)}</p>
                        <StatusBadge status={q.status} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Deals Tab ─────────────────────────────────────────────────────

const stageLabels: Record<string, string> = {
    PROSPECT: "Prospecto",
    QUALIFIED: "Calificado",
    PROPOSAL: "Propuesta",
    NEGOTIATION: "Negociación",
    WON: "Ganado",
    LOST: "Perdido",
};

const priorityColors: Record<string, string> = {
    LOW: "text-neutral-400",
    MEDIUM: "text-amber-400",
    HIGH: "text-orange-400",
    URGENT: "text-red-400",
};

function DealsTab({ deals }: { deals: Deal[] }) {
    if (deals.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-4xl block mb-3 opacity-40">🎯</span>
                <p className="text-neutral-400">Sin deals en pipeline</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white">{d.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                            <StatusBadge status={d.stage} />
                            <span className={`font-bold ${priorityColors[d.priority] || "text-neutral-400"}`}>{d.priority}</span>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-white">{d.estimatedValue ? formatCLP(d.estimatedValue) : "—"}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{stageLabels[d.stage] || d.stage}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Expenses Tab ──────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
    HOSTING: "Hosting",
    DOMAIN: "Dominio",
    LICENSES: "Licencias",
    THIRD_PARTY: "Terceros",
    TOOLS: "Herramientas",
    OTHER: "Otro",
};

function ExpensesTab({ expenses }: { expenses: Expense[] }) {
    const total = expenses.reduce((acc, e) => acc + e.amount, 0);

    if (expenses.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-4xl block mb-3 opacity-40">💰</span>
                <p className="text-neutral-400">Sin gastos registrados</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-300">Total gastos: <span className="font-bold text-lg">{formatCLP(total)}</span></p>
            </div>
            <div className="space-y-2">
                {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white">{e.description}</h3>
                            <p className="text-xs text-neutral-500 mt-0.5">{categoryLabels[e.category] || e.category} · {formatDate(e.expenseDate)}</p>
                        </div>
                        <p className="text-sm font-bold text-red-300 shrink-0">-{formatCLP(e.amount)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
