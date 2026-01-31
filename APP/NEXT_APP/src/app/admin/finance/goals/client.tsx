"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GoalList } from "@/modules/finance/components/GoalList";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { formatCurrency } from "@/lib/currency";

interface Goal {
    id: string;
    name: string;
    icon: string;
    color: string;
    targetAmount: number;
    currentAmount: number;
    percentage: number;
    remaining: number;
    daysLeft: number | null;
    requiredDaily: number | null;
    requiredMonthly: number | null;
    isOverdue: boolean;
    completed: boolean;
    deadline: string | null;
}

interface GoalMeta {
    total: number;
    active: number;
    completed: number;
    totalTarget: number;
    totalSaved: number;
    overallProgress: number;
}

export default function GoalsPageClient() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [meta, setMeta] = useState<GoalMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);

    const fetchGoals = useCallback(async () => {
        try {
            const res = await fetch(`/api/finance/goals?includeCompleted=${showCompleted}`);
            if (!res.ok) throw new Error("Error al cargar metas");
            const { data, meta } = await res.json();
            setGoals(data || []);
            setMeta(meta || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [showCompleted]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/finance/goals/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar");
        setGoals((prev) => prev.filter((g) => g.id !== id));
    };

    const handleContribute = async (id: string, amount: number) => {
        const res = await fetch(`/api/finance/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        if (!res.ok) throw new Error("Error al contribuir");
        const { data: _data, meta: contributeMeta } = await res.json();

        // Show celebration if milestone reached
        if (contributeMeta?.achievedMilestones?.length > 0) {
            const milestone = contributeMeta.achievedMilestones[contributeMeta.achievedMilestones.length - 1];
            if (milestone === 100) {
                alert("🎉 ¡Felicidades! ¡Has completado tu meta!");
            } else {
                alert(`🎯 ¡Genial! Has alcanzado el ${milestone}% de tu meta.`);
            }
        }

        // Refresh to get updated data
        fetchGoals();
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-gray-400">Cargando metas de ahorro...</p>
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
                            fetchGoals();
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
                    <h1 className="text-2xl font-bold text-white">Metas de Ahorro</h1>
                    <p className="text-gray-400">Visualiza y alcanza tus objetivos financieros</p>
                </div>
                <Link
                    href="/admin/finance/goals/new"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-500
                             text-white rounded-xl hover:from-purple-500 hover:to-purple-400 transition-all
                             font-medium shadow-lg shadow-purple-500/25"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva meta
                </Link>
            </div>

            {/* Stats */}
            {meta && (meta.active > 0 || meta.completed > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800/50">
                        <p className="text-sm text-gray-400 mb-1">Metas activas</p>
                        <p className="text-2xl font-bold text-white">{meta.active}</p>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                        <p className="text-sm text-green-400 mb-1">Completadas</p>
                        <p className="text-2xl font-bold text-green-400">{meta.completed}</p>
                    </div>
                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <p className="text-sm text-purple-400 mb-1">Total ahorrado</p>
                        <p className="text-xl font-bold text-purple-400">{formatCurrency(meta.totalSaved)}</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <p className="text-sm text-blue-400 mb-1">Progreso global</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-blue-400">{meta.overallProgress}%</p>
                            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${meta.overallProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter */}
            {(meta?.completed || 0) > 0 && (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => {
                                setShowCompleted(e.target.checked);
                                setLoading(true);
                            }}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500"
                        />
                        <span className="text-sm text-gray-400">Mostrar metas completadas</span>
                    </label>
                </div>
            )}

            {/* Goal List */}
            <GoalList goals={goals} onDelete={handleDelete} onContribute={handleContribute} />
        </div>
    );
}

