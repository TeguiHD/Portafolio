"use client";

import { motion } from "framer-motion";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";

interface BalanceCardProps {
    balance: number;
    balanceChange: number;
    balanceChangePercent: number;
    currency: SupportedCurrency;
    isLoading?: boolean;
}

export function BalanceCard({
    balance,
    balanceChange,
    balanceChangePercent,
    currency,
    isLoading = false,
}: BalanceCardProps) {
    const isPositive = balanceChange >= 0;
    
    // Dynamic color based on balance status
    const getBalanceColor = () => {
        if (balance < 0) return "text-red-400";
        if (balance < 100000) return "text-yellow-400"; // Low balance warning
        return "text-emerald-400";
    };

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700/50 p-6"
            >
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-24 bg-neutral-700 rounded" />
                    <div className="h-10 w-48 bg-neutral-700 rounded" />
                    <div className="h-4 w-32 bg-neutral-700 rounded" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700/50"
        >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-1/5 to-accent-2/5" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-1/10 rounded-full blur-3xl" />
            
            <div className="relative p-6">
                {/* Label */}
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-sm font-medium text-neutral-400">Balance Disponible</span>
                </div>

                {/* Main Balance */}
                <motion.div
                    key={balance}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-3xl md:text-4xl font-bold ${getBalanceColor()} mb-3`}
                >
                    {formatCurrency(balance, currency)}
                </motion.div>

                {/* Change indicator */}
                <div className="flex items-center gap-2">
                    <span
                        className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
                            isPositive
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                        }`}
                    >
                        {isPositive ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                        )}
                        {balanceChangePercent.toFixed(1)}%
                    </span>
                    <span className="text-sm text-neutral-500">
                        {isPositive ? "+" : ""}{formatCurrency(balanceChange, currency)} vs mes anterior
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
