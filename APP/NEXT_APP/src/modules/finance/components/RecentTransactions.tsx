"use client";

import { motion } from "framer-motion";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import type { RecentTransaction } from "../types";

interface RecentTransactionsProps {
    transactions: RecentTransaction[];
    currency: SupportedCurrency;
    isLoading?: boolean;
    onViewAll?: () => void;
}

export function RecentTransactions({
    transactions,
    currency,
    isLoading = false,
    onViewAll,
}: RecentTransactionsProps) {
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-40 bg-neutral-700 rounded" />
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 bg-neutral-700 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-32 bg-neutral-700 rounded" />
                                <div className="h-2 w-20 bg-neutral-700 rounded" />
                            </div>
                            <div className="h-4 w-20 bg-neutral-700 rounded" />
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    }

    const formatDate = (dateStr: string) => {
        const now = new Date();
        const transDate = new Date(dateStr);
        const diffDays = Math.floor((now.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Hoy";
        if (diffDays === 1) return "Ayer";
        if (diffDays < 7) return `Hace ${diffDays} días`;
        
        return transDate.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
    };

    // Generate consistent color from category name
    const getCategoryColor = (name: string | null) => {
        if (!name) return "#666666";
        const colors = [
            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", 
            "#9966FF", "#FF9F40", "#7CFC00", "#FF6B6B"
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-300">Transacciones Recientes</h3>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-xs text-accent-1 hover:text-accent-2 transition-colors"
                    >
                        Ver todas
                    </button>
                )}
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <p className="text-neutral-500 text-sm">No hay transacciones recientes</p>
                    <button className="mt-3 text-sm text-accent-1 hover:text-accent-2 transition-colors">
                        Registrar primera transacción
                    </button>
                </div>
            ) : (
                <div className="space-y-1">
                    {transactions.map((transaction, index) => (
                        <motion.div
                            key={transaction.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.05 }}
                            className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                            {/* Category icon */}
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                style={{ 
                                    backgroundColor: `${getCategoryColor(transaction.categoryName)}20`
                                }}
                            >
                                {transaction.categoryIcon || (
                                    transaction.type === "INCOME" ? "💰" : "💸"
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-neutral-200 truncate">
                                        {transaction.description || transaction.categoryName || "Sin descripción"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                    <span>{transaction.accountName}</span>
                                    <span>•</span>
                                    <span>{formatDate(transaction.date)}</span>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right shrink-0">
                                <span
                                    className={`text-sm font-semibold ${
                                        transaction.type === "INCOME"
                                            ? "text-emerald-400"
                                            : transaction.type === "EXPENSE"
                                            ? "text-red-400"
                                            : "text-blue-400"
                                    }`}
                                >
                                    {transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "-" : ""}
                                    {formatCurrency(transaction.amount, currency as SupportedCurrency)}
                                </span>
                            </div>

                            {/* Hover arrow */}
                            <svg
                                className="w-4 h-4 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
