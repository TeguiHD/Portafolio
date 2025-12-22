"use client";

import { motion } from "framer-motion";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";

interface MonthlyProgressProps {
    totalIncome: number;
    totalExpenses: number;
    projectedExpenses: number;
    daysElapsed: number;
    daysRemaining: number;
    dailyAverage: number;
    currency: SupportedCurrency;
    isLoading?: boolean;
}

export function MonthlyProgress({
    totalIncome,
    totalExpenses,
    projectedExpenses,
    daysElapsed,
    daysRemaining,
    dailyAverage,
    currency,
    isLoading = false,
}: MonthlyProgressProps) {
    const totalDays = daysElapsed + daysRemaining;
    const progressPercent = (daysElapsed / totalDays) * 100;
    const netFlow = totalIncome - totalExpenses;
    
    // Calculate spending pace
    const expectedSpendingByNow = (projectedExpenses / totalDays) * daysElapsed;
    const spendingPace = totalExpenses / expectedSpendingByNow;
    
    const getPaceStatus = () => {
        if (spendingPace < 0.9) return { label: "Por debajo", color: "text-emerald-400", bg: "bg-emerald-500/10" };
        if (spendingPace < 1.1) return { label: "En ritmo", color: "text-blue-400", bg: "bg-blue-500/10" };
        if (spendingPace < 1.3) return { label: "Elevado", color: "text-yellow-400", bg: "bg-yellow-500/10" };
        return { label: "Muy alto", color: "text-red-400", bg: "bg-red-500/10" };
    };

    const paceStatus = getPaceStatus();

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-32 bg-neutral-700 rounded" />
                    <div className="h-3 w-full bg-neutral-700 rounded-full" />
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-2">
                                <div className="h-3 w-16 bg-neutral-700 rounded" />
                                <div className="h-6 w-24 bg-neutral-700 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-300">Progreso del Mes</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${paceStatus.bg} ${paceStatus.color}`}>
                    {paceStatus.label}
                </span>
            </div>

            {/* Progress bar */}
            <div className="relative mb-6">
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-accent-1 to-accent-2 rounded-full"
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-neutral-500">
                    <span>Día {daysElapsed}</span>
                    <span>{daysRemaining} días restantes</span>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4">
                {/* Income */}
                <div>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                        Ingresos
                    </div>
                    <div className="text-lg font-semibold text-emerald-400">
                        {formatCurrency(totalIncome, currency)}
                    </div>
                </div>

                {/* Expenses */}
                <div>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                        Gastos
                    </div>
                    <div className="text-lg font-semibold text-red-400">
                        {formatCurrency(totalExpenses, currency)}
                    </div>
                </div>

                {/* Net Flow */}
                <div>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mb-1">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Flujo Neto
                    </div>
                    <div className={`text-lg font-semibold ${netFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {netFlow >= 0 ? "+" : ""}{formatCurrency(netFlow, currency)}
                    </div>
                </div>
            </div>

            {/* Daily average */}
            <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Promedio diario de gasto</span>
                    <span className="font-medium text-neutral-300">
                        {formatCurrency(dailyAverage, currency)}/día
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
