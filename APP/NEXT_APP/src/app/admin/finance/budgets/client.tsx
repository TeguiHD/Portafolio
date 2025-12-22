"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BudgetList } from "@/modules/finance/components/BudgetList";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";

interface Budget {
    id: string;
    name: string;
    amount: number;
    period: string;
    currentSpent: number;
    percentage: number;
    remaining: number;
    status: "ok" | "warning" | "danger" | "exceeded";
    isActive: boolean;
    category?: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    } | null;
}

interface BudgetMeta {
    total: number;
    onTrack: number;
    warning: number;
    exceeded: number;
    totalBudgeted: number;
    totalSpent: number;
}

export default function BudgetsPageClient() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [meta, setMeta] = useState<BudgetMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBudgets = useCallback(async () => {
        try {
            const res = await fetch("/api/finance/budgets");
            if (!res.ok) throw new Error("Error al cargar presupuestos");
            const { data, meta } = await res.json();
            setBudgets(data || []);
            setMeta(meta || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/finance/budgets/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar");
        setBudgets((prev) => prev.filter((b) => b.id !== id));
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        const res = await fetch(`/api/finance/budgets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        });
        if (!res.ok) throw new Error("Error al actualizar");
        const { data } = await res.json();
        setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: data.isActive } : b)));
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-gray-400">Cargando presupuestos...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            fetchBudgets();
                        }}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <FinanceBreadcrumbs />
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Presupuestos</h1>
                    <p className="text-gray-400">Controla tus límites de gasto</p>
                </div>
                <Link
                    href="/admin/finance/budgets/new"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500
                             text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all
                             font-medium shadow-lg shadow-blue-500/25"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo presupuesto
                </Link>
            </div>

            {/* Stats */}
            {meta && budgets.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800/50">
                        <p className="text-sm text-gray-400 mb-1">Total presupuestos</p>
                        <p className="text-2xl font-bold text-white">{meta.total}</p>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                        <p className="text-sm text-green-400 mb-1">En buen estado</p>
                        <p className="text-2xl font-bold text-green-400">{meta.onTrack}</p>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <p className="text-sm text-yellow-400 mb-1">Con advertencia</p>
                        <p className="text-2xl font-bold text-yellow-400">{meta.warning}</p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-sm text-red-400 mb-1">Excedidos</p>
                        <p className="text-2xl font-bold text-red-400">{meta.exceeded}</p>
                    </div>
                </div>
            )}

            {/* Budget List */}
            <BudgetList budgets={budgets} onDelete={handleDelete} onToggleActive={handleToggleActive} />
        </div>
    );
}

