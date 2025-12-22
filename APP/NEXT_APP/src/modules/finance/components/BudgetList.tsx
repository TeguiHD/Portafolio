"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

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

interface BudgetListProps {
    budgets: Budget[];
    onDelete?: (id: string) => Promise<void>;
    onToggleActive?: (id: string, isActive: boolean) => Promise<void>;
}

const PERIOD_LABELS: Record<string, string> = {
    WEEKLY: "Semanal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    YEARLY: "Anual",
};

const STATUS_CONFIG = {
    ok: { color: "from-green-500 to-emerald-500", bg: "bg-green-500/10", text: "text-green-400" },
    warning: { color: "from-yellow-500 to-amber-500", bg: "bg-yellow-500/10", text: "text-yellow-400" },
    danger: { color: "from-orange-500 to-red-500", bg: "bg-orange-500/10", text: "text-orange-400" },
    exceeded: { color: "from-red-500 to-red-600", bg: "bg-red-500/10", text: "text-red-400" },
};

export function BudgetList({ budgets, onDelete, onToggleActive }: BudgetListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!onDelete) return;
        if (!confirm("¿Estás seguro de eliminar este presupuesto?")) return;

        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        if (!onToggleActive) return;
        setTogglingId(id);
        try {
            await onToggleActive(id, isActive);
        } finally {
            setTogglingId(null);
        }
    };

    if (budgets.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Sin presupuestos</h3>
                <p className="text-gray-400 mb-6">Crea tu primer presupuesto para controlar tus gastos</p>
                <Link
                    href="/admin/finance/budgets/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500
                             text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear presupuesto
                </Link>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {budgets.map((budget) => {
                const config = STATUS_CONFIG[budget.status];
                const progressWidth = Math.min(100, budget.percentage);

                return (
                    <div
                        key={budget.id}
                        className={`group relative bg-gray-900/50 rounded-2xl border border-gray-800/50 
                                  overflow-hidden hover:border-gray-700/50 transition-all duration-300
                                  ${!budget.isActive ? "opacity-60" : ""}`}
                    >
                        {/* Progress bar background */}
                        <div
                            className={`absolute inset-0 opacity-5 bg-gradient-to-r ${config.color}`}
                            style={{ width: `${progressWidth}%` }}
                        />

                        <div className="relative p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{
                                            backgroundColor: budget.category?.color
                                                ? `${budget.category.color}20`
                                                : "rgba(99, 102, 241, 0.2)",
                                        }}
                                    >
                                        {budget.category?.icon || "📊"}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{budget.name}</h3>
                                        <p className="text-sm text-gray-400">
                                            {budget.category?.name || "Todos los gastos"} •{" "}
                                            {PERIOD_LABELS[budget.period]}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleToggle(budget.id, !budget.isActive)}
                                        disabled={togglingId === budget.id}
                                        className={`p-2 rounded-lg transition-colors ${
                                            budget.isActive
                                                ? "bg-gray-800 text-gray-400 hover:text-yellow-400"
                                                : "bg-green-500/20 text-green-400"
                                        }`}
                                        title={budget.isActive ? "Pausar" : "Activar"}
                                    >
                                        {budget.isActive ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                    <Link
                                        href={`/admin/finance/budgets/${budget.id}/edit`}
                                        className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-blue-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(budget.id)}
                                        disabled={deletingId === budget.id}
                                        className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-red-400 transition-colors
                                                 disabled:opacity-50"
                                    >
                                        {deletingId === budget.id ? (
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-sm font-medium ${config.text}`}>
                                        {formatCurrency(budget.currentSpent)} de {formatCurrency(budget.amount)}
                                    </span>
                                    <span className={`text-sm font-bold ${config.text}`}>
                                        {budget.percentage.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${config.color} transition-all duration-500`}
                                        style={{ width: `${progressWidth}%` }}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                                    {budget.status === "exceeded" ? (
                                        <>
                                            <svg
                                                className={`w-4 h-4 ${config.text}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                />
                                            </svg>
                                            <span className={`text-sm font-medium ${config.text}`}>
                                                Excedido por {formatCurrency(budget.currentSpent - budget.amount)}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className={`w-4 h-4 ${config.text}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                                                />
                                            </svg>
                                            <span className={`text-sm font-medium ${config.text}`}>
                                                Disponible: {formatCurrency(budget.remaining)}
                                            </span>
                                        </>
                                    )}
                                </div>

                                {!budget.isActive && (
                                    <span className="text-xs px-2 py-1 bg-gray-800 text-gray-500 rounded-full">
                                        Pausado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
