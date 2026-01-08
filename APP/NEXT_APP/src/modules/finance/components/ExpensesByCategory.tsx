"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import type { CategorySummary } from "../types";

interface ExpensesByCategoryProps {
    categories: CategorySummary[];
    currency: SupportedCurrency;
    totalExpenses: number;
    isLoading?: boolean;
}

export function ExpensesByCategory({
    categories,
    currency,
    totalExpenses,
    isLoading = false,
}: ExpensesByCategoryProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sort by amount descending
    const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount);
    const topCategories = sortedCategories.slice(0, 6);

    if (isLoading) {
        return (
            <motion.div
                initial={isMounted ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-40 bg-neutral-700 rounded" />
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-neutral-700 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-24 bg-neutral-700 rounded" />
                                <div className="h-2 w-full bg-neutral-700 rounded-full" />
                            </div>
                            <div className="h-4 w-20 bg-neutral-700 rounded" />
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    }

    if (categories.length === 0) {
        return (
            <motion.div
                initial={isMounted ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
            >
                <h3 className="text-sm font-medium text-neutral-300 mb-4">Gastos por Categoría</h3>
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-neutral-500 text-sm">No hay gastos este mes</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={isMounted ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-300">Gastos por Categoría</h3>
                <span className="text-xs text-neutral-500">
                    {categories.length} categorías
                </span>
            </div>

            <div className="space-y-3">
                {topCategories.map((category, index) => {
                    // Generate a deterministic color based on category name
                    const colors = [
                        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", 
                        "#9966FF", "#FF9F40", "#7CFC00", "#FF6B6B"
                    ];
                    const colorIndex = category.categoryName.charCodeAt(0) % colors.length;
                    const categoryColor = colors[colorIndex];

                    return (
                        <motion.div
                            key={category.categoryId}
                            initial={isMounted ? { opacity: 0, x: -20 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                            className="group"
                        >
                            <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                    style={{ backgroundColor: `${categoryColor}20` }}
                                >
                                    {category.icon || "📊"}
                                </div>

                                {/* Name and progress */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-neutral-300 truncate">
                                            {category.categoryName}
                                        </span>
                                        <span className="text-sm font-medium text-neutral-400 ml-2">
                                            {formatCurrency(category.amount, currency)}
                                        </span>
                                    </div>
                                    
                                    {/* Progress bar */}
                                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${category.percentage}%` }}
                                            transition={{ duration: 0.8, delay: 0.4 + index * 0.05 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: categoryColor }}
                                        />
                                    </div>
                                </div>

                                {/* Percentage */}
                                <span className="text-xs text-neutral-500 w-12 text-right">
                                    {category.percentage.toFixed(1)}%
                                </span>
                            </div>

                            {/* Trend indicator (if available) */}
                            {category.trend !== 0 && (
                                <div className="ml-11 mt-1">
                                    <span
                                        className={`text-xs ${
                                            category.trend > 0 ? "text-red-400" : "text-emerald-400"
                                        }`}
                                    >
                                        {category.trend > 0 ? "↑" : "↓"} {Math.abs(category.trend).toFixed(0)}% vs mes anterior
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {sortedCategories.length > 6 && (
                <button className="w-full mt-4 py-2 text-sm text-neutral-500 hover:text-accent-1 transition-colors">
                    Ver todas las categorías ({sortedCategories.length})
                </button>
            )}
        </motion.div>
    );
}
