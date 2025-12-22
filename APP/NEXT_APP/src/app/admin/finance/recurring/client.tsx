"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { RecurringList } from "@/modules/finance/components";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";

interface RecurringPayment {
    id: string;
    name: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: string;
    nextDueDate: string | null;
    daysUntilDue: number | null;
    status: "upcoming" | "due_soon" | "overdue" | "inactive";
    isActive: boolean;
    autoCreate: boolean;
    category?: { id: string; name: string; icon: string | null; color: string | null } | null;
    account?: { id: string; name: string; icon: string | null } | null;
}

interface Meta {
    total: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    dueSoon: number;
    overdue: number;
}

export default function RecurringPaymentsPageClient() {
    const [payments, setPayments] = useState<RecurringPayment[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");

    const fetchPayments = useCallback(async () => {
        try {
            const res = await fetch("/api/finance/recurring");
            const data = await res.json();
            setPayments(data.data || []);
            setMeta(data.meta || null);
        } catch (error) {
            console.error("Error fetching recurring payments:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleMarkPaid = async (id: string) => {
        const res = await fetch(`/api/finance/recurring/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_paid" }),
        });
        if (res.ok) fetchPayments();
    };

    const handleSkip = async (id: string) => {
        const res = await fetch(`/api/finance/recurring/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "skip" }),
        });
        if (res.ok) fetchPayments();
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        const res = await fetch(`/api/finance/recurring/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        });
        if (res.ok) fetchPayments();
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/finance/recurring/${id}`, { method: "DELETE" });
        if (res.ok) fetchPayments();
    };

    const filteredPayments = payments.filter((p) => {
        if (filter === "active" && !p.isActive) return false;
        if (filter === "inactive" && p.isActive) return false;
        if (typeFilter !== "all" && p.type !== typeFilter) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <FinanceBreadcrumbs />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Pagos Recurrentes</h1>
                    <p className="text-gray-400 mt-1">Gestiona tus gastos e ingresos fijos</p>
                </div>
                <Link
                    href="/admin/finance/recurring/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500
                             text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Pago Recurrente
                </Link>
            </div>

            {/* Summary Cards */}
            {meta && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                        <p className="text-sm text-gray-400 mb-1">Total Pagos</p>
                        <p className="text-2xl font-bold text-white">{meta.total}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                        <p className="text-sm text-gray-400 mb-1">Ingresos Mensuales</p>
                        <p className="text-2xl font-bold text-green-400">+{formatCurrency(meta.monthlyIncome)}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                        <p className="text-sm text-gray-400 mb-1">Gastos Mensuales</p>
                        <p className="text-2xl font-bold text-red-400">-{formatCurrency(meta.monthlyExpenses)}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                        <p className="text-sm text-gray-400 mb-1">Por Vencer</p>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-yellow-400">{meta.dueSoon}</span>
                            {meta.overdue > 0 && (
                                <span className="text-sm px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                                    {meta.overdue} vencidos
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-900/50 rounded-xl p-1">
                    {(["all", "active", "inactive"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                                      ${filter === f
                                          ? "bg-blue-600 text-white"
                                          : "text-gray-400 hover:text-white"
                                      }`}
                        >
                            {f === "all" ? "Todos" : f === "active" ? "Activos" : "Pausados"}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-gray-900/50 rounded-xl p-1">
                    {(["all", "EXPENSE", "INCOME"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                                      ${typeFilter === t
                                          ? t === "EXPENSE"
                                              ? "bg-red-500/20 text-red-400"
                                              : t === "INCOME"
                                              ? "bg-green-500/20 text-green-400"
                                              : "bg-blue-600 text-white"
                                          : "text-gray-400 hover:text-white"
                                      }`}
                        >
                            {t === "all" ? "Todos" : t === "EXPENSE" ? "Gastos" : "Ingresos"}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <RecurringList
                payments={filteredPayments}
                onMarkPaid={handleMarkPaid}
                onSkip={handleSkip}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
            />
        </div>
    );
}

