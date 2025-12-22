"use client";

import { motion } from "framer-motion";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import type { BudgetStatus } from "../types";

interface BudgetOverviewProps {
    budgets: BudgetStatus[];
    currency: SupportedCurrency;
    isLoading?: boolean;
}

const statusConfig = {
    ok: { color: "bg-emerald-500", text: "text-emerald-400", label: "En control" },
    warning: { color: "bg-yellow-500", text: "text-yellow-400", label: "Atención" },
    exceeded: { color: "bg-red-500", text: "text-red-400", label: "Excedido" },
};

export function BudgetOverview({
    budgets,
    currency,
    isLoading = false,
}: BudgetOverviewProps) {
    // Sort by percentage descending (most critical first)
    const sortedBudgets = [...budgets].sort((a, b) => b.percentage - a.percentage);

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-32 bg-neutral-700 rounded" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between">
                                <div className="h-3 w-24 bg-neutral-700 rounded" />
                                <div className="h-3 w-16 bg-neutral-700 rounded" />
                            </div>
                            <div className="h-2 w-full bg-neutral-700 rounded-full" />
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    }

    if (budgets.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
            >
                <h3 className="text-sm font-medium text-neutral-300 mb-4">Presupuestos</h3>
                <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-neutral-500 text-sm mb-2">Sin presupuestos configurados</p>
                    <button className="text-sm text-accent-1 hover:text-accent-2 transition-colors">
                        Crear presupuesto
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-300">Presupuestos</h3>
                <span className="text-xs text-neutral-500">
                    {budgets.filter(b => b.status === "exceeded").length} excedidos
                </span>
            </div>

            <div className="space-y-4">
                {sortedBudgets.slice(0, 4).map((budget, index) => {
                    const config = statusConfig[budget.status];
                    const progressWidth = Math.min(budget.percentage, 100);

                    return (
                        <motion.div
                            key={budget.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{budget.categoryIcon || "📊"}</span>
                                    <span className="text-sm font-medium text-neutral-300">
                                        {budget.categoryName}
                                    </span>
                                </div>
                                <span className={`text-xs font-medium ${config.text}`}>
                                    {budget.percentage.toFixed(0)}%
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressWidth}%` }}
                                    transition={{ duration: 0.8, delay: 0.4 + index * 0.05 }}
                                    className={`absolute inset-y-0 left-0 ${config.color} rounded-full`}
                                />
                                {/* 100% marker */}
                                {budget.percentage > 100 && (
                                    <div className="absolute inset-y-0 left-full w-0.5 bg-red-500 -translate-x-0.5" />
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex items-center justify-between mt-1 text-xs text-neutral-500">
                                <span>
                                    {formatCurrency(budget.spentAmount, currency)} / {formatCurrency(budget.budgetAmount, currency)}
                                </span>
                                {budget.remainingAmount > 0 ? (
                                    <span className="text-emerald-400">
                                        {formatCurrency(budget.remainingAmount, currency)} disponible
                                    </span>
                                ) : (
                                    <span className="text-red-400">
                                        {formatCurrency(Math.abs(budget.remainingAmount), currency)} excedido
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {sortedBudgets.length > 4 && (
                <button className="w-full mt-4 py-2 text-sm text-neutral-500 hover:text-accent-1 transition-colors">
                    Ver todos ({sortedBudgets.length})
                </button>
            )}
        </motion.div>
    );
}
