"use client";

import { useState } from "react";
import Link from "next/link";
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

interface GoalListProps {
    goals: Goal[];
    onDelete?: (id: string) => Promise<void>;
    onContribute?: (id: string, amount: number) => Promise<void>;
}

export function GoalList({ goals, onDelete, onContribute }: GoalListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [contributingId, setContributingId] = useState<string | null>(null);
    const [contributeAmount, setContributeAmount] = useState("");
    const [showContributeModal, setShowContributeModal] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!onDelete) return;
        if (!confirm("¿Estás seguro de eliminar esta meta?")) return;

        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleContribute = async (id: string) => {
        if (!onContribute || !contributeAmount) return;

        setContributingId(id);
        try {
            await onContribute(id, parseFloat(contributeAmount));
            setShowContributeModal(null);
            setContributeAmount("");
        } finally {
            setContributingId(null);
        }
    };

    if (goals.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Sin metas de ahorro</h3>
                <p className="text-gray-400 mb-6">Crea tu primera meta para empezar a ahorrar</p>
                <Link
                    href="/admin/finance/goals/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500
                             text-white rounded-xl hover:from-purple-500 hover:to-purple-400 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear meta
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {goals.map((goal) => (
                    <div
                        key={goal.id}
                        className={`group relative bg-gray-900/50 rounded-2xl border overflow-hidden 
                                  transition-all duration-300 hover:shadow-lg
                                  ${
                                      goal.completed
                                          ? "border-green-500/30 hover:border-green-500/50"
                                          : goal.isOverdue
                                          ? "border-red-500/30 hover:border-red-500/50"
                                          : "border-gray-800/50 hover:border-gray-700/50"
                                  }`}
                        style={{
                            boxShadow: goal.completed ? `0 0 30px ${goal.color}15` : undefined,
                        }}
                    >
                        {/* Progress background */}
                        <div
                            className="absolute bottom-0 left-0 right-0 opacity-10 transition-all"
                            style={{
                                height: `${goal.percentage}%`,
                                background: `linear-gradient(to top, ${goal.color}, transparent)`,
                            }}
                        />

                        <div className="relative p-5">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ backgroundColor: `${goal.color}20` }}
                                    >
                                        {goal.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white line-clamp-1">{goal.name}</h3>
                                        {goal.deadline && (
                                            <p className={`text-xs ${goal.isOverdue ? "text-red-400" : "text-gray-500"}`}>
                                                {goal.isOverdue
                                                    ? `Vencido hace ${Math.abs(goal.daysLeft!)} días`
                                                    : goal.daysLeft === 0
                                                    ? "Vence hoy"
                                                    : `${goal.daysLeft} días restantes`}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {goal.completed && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                                        ✓ Completada
                                    </span>
                                )}
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">
                                        {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                                    </span>
                                    <span className="text-sm font-bold" style={{ color: goal.color }}>
                                        {goal.percentage.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-500 rounded-full"
                                        style={{ width: `${goal.percentage}%`, backgroundColor: goal.color }}
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            {!goal.completed && goal.requiredMonthly && (
                                <p className="text-xs text-gray-500 mb-4">
                                    Ahorra <span className="text-white">{formatCurrency(goal.requiredMonthly)}/mes</span>{" "}
                                    para alcanzar tu meta
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                {!goal.completed && (
                                    <button
                                        onClick={() => setShowContributeModal(goal.id)}
                                        className="flex-1 px-4 py-2 rounded-xl text-sm font-medium
                                                 transition-all"
                                        style={{
                                            backgroundColor: `${goal.color}20`,
                                            color: goal.color,
                                        }}
                                    >
                                        + Abonar
                                    </button>
                                )}
                                <Link
                                    href={`/admin/finance/goals/${goal.id}/edit`}
                                    className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                </Link>
                                <button
                                    onClick={() => handleDelete(goal.id)}
                                    disabled={deletingId === goal.id}
                                    className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-red-400 
                                             transition-colors disabled:opacity-50"
                                >
                                    {deletingId === goal.id ? (
                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
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
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    </div>
                ))}
            </div>

            {/* Contribute Modal */}
            {showContributeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContributeModal(null)} />
                    <div className="relative bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
                        <h3 className="text-xl font-semibold text-white mb-4">Abonar a la meta</h3>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Monto a abonar</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={contributeAmount}
                                    onChange={(e) => setContributeAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                             text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowContributeModal(null)}
                                className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleContribute(showContributeModal)}
                                disabled={!contributeAmount || contributingId === showContributeModal}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500
                                         text-white rounded-xl disabled:opacity-50"
                            >
                                {contributingId === showContributeModal ? "Guardando..." : "Abonar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
