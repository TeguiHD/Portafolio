"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BalanceCard } from "./BalanceCard";
import { MonthlyProgress } from "./MonthlyProgress";
import { AlertBanner } from "./AlertBanner";
import { ExpensesByCategory } from "./ExpensesByCategory";
import { RecentTransactions } from "./RecentTransactions";
import { BudgetOverview } from "./BudgetOverview";
import { useFinance } from "../context/FinanceContext";
import type { FinanceDashboardData } from "../types";

interface FinanceDashboardProps {
    userId: string;
}

export function FinanceDashboard({ userId: _userId }: FinanceDashboardProps) {
    const { baseCurrency, dateRange, refreshKey, setIsLoading } = useFinance();
    const [data, setData] = useState<FinanceDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true);
                setIsLoading(true);
                setError(null);

                const params = new URLSearchParams({
                    currency: baseCurrency,
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString(),
                });

                const response = await fetch(`/api/finance/dashboard?${params}`);

                if (!response.ok) {
                    throw new Error("Error al cargar datos del dashboard");
                }

                const result = await response.json();
                setData(result.data);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
                setIsLoading(false);
            }
        }

        fetchDashboardData();
    }, [baseCurrency, dateRange, refreshKey, setIsLoading]);

    const handleViewAllTransactions = () => {
        window.location.href = "/admin/finance/transactions";
    };

    const handleAddTransaction = () => {
        window.location.href = "/admin/finance/transactions/new";
    };

    // Show skeleton while loading
    if (loading || !data) {
        return (
            <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-neutral-800 rounded mt-2 animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-neutral-800 rounded-xl animate-pulse" />
                </div>

                {/* Main grid skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <BalanceCard
                            balance={0}
                            balanceChange={0}
                            balanceChangePercent={0}
                            currency={baseCurrency}
                            isLoading={true}
                        />
                        <MonthlyProgress
                            totalIncome={0}
                            totalExpenses={0}
                            projectedExpenses={0}
                            daysElapsed={0}
                            daysRemaining={0}
                            dailyAverage={0}
                            currency={baseCurrency}
                            isLoading={true}
                        />
                    </div>
                    <div className="space-y-6">
                        <ExpensesByCategory
                            categories={[]}
                            currency={baseCurrency}
                            totalExpenses={0}
                            isLoading={true}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-medium text-red-400 mb-1">Error al cargar datos</h3>
                <p className="text-neutral-400 text-sm mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white"
                    >
                        💰 Finanzas Personales
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-neutral-400 text-sm mt-1"
                    >
                        Resumen de {dateRange.start.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
                    </motion.p>
                </div>

                {/* Quick actions */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2"
                >
                    <button
                        onClick={handleAddTransaction}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-1 hover:bg-accent-1/90 text-white rounded-xl transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Registrar</span>
                    </button>
                </motion.div>
            </div>

            {/* Alerts */}
            {data.alerts.length > 0 && (
                <AlertBanner alerts={data.alerts} maxVisible={2} />
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Main stats */}
                <div className="lg:col-span-2 space-y-6">
                    <BalanceCard
                        balance={data.summary.totalBalance}
                        balanceChange={data.summary.balanceChange}
                        balanceChangePercent={data.summary.balanceChangePercent}
                        currency={baseCurrency}
                    />

                    <MonthlyProgress
                        totalIncome={data.summary.totalIncome}
                        totalExpenses={data.summary.totalExpenses}
                        projectedExpenses={data.summary.projectedExpenses}
                        daysElapsed={data.summary.daysElapsed}
                        daysRemaining={data.summary.daysRemaining}
                        dailyAverage={data.summary.dailyAverage}
                        currency={baseCurrency}
                    />

                    <RecentTransactions
                        transactions={data.recentTransactions}
                        currency={baseCurrency}
                        onViewAll={handleViewAllTransactions}
                    />
                </div>

                {/* Right column - Categories & Budgets */}
                <div className="space-y-6">
                    <ExpensesByCategory
                        categories={data.expensesByCategory}
                        currency={baseCurrency}
                        totalExpenses={data.summary.totalExpenses}
                    />

                    <BudgetOverview
                        budgets={data.budgets}
                        currency={baseCurrency}
                    />
                </div>
            </div>
        </div>
    );
}
