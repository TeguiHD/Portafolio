"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "../context/FinanceContext";

interface MetricsData {
    savingsRate: number;
    monthlyAverage: {
        income: number;
        expenses: number;
    };
    yearlyTotal: {
        income: number;
        expenses: number;
        savings: number;
    };
    streaks: {
        noSpendDays: number;
        loggedDays: number;
        budgetStreak: number;
    };
    comparisons: {
        vsLastMonth: number;
        vsLastYear: number;
        vsBudget: number;
    };
    categoryTrends: {
        increasing: string[];
        decreasing: string[];
    };
    financialHealth: {
        score: number;
        status: "excellent" | "good" | "fair" | "poor";
        factors: { name: string; impact: "positive" | "negative" | "neutral"; value: string }[];
    };
}

export function FinanceMetrics() {
    const { baseCurrency, refreshKey } = useFinance();
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<"overview" | "trends" | "health">("overview");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                setLoading(true);
                const res = await fetch(`/api/finance/metrics?currency=${baseCurrency}`);
                if (res.ok) {
                    const data = await res.json();
                    setMetrics(data.data);
                }
            } catch (error) {
                console.error("Error fetching metrics:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
    }, [baseCurrency, refreshKey]);

    if (loading) {
        return <MetricsSkeleton />;
    }

    if (!metrics) {
        return null;
    }

    const healthColors = {
        excellent: "text-emerald-400 bg-emerald-500/20",
        good: "text-blue-400 bg-blue-500/20",
        fair: "text-yellow-400 bg-yellow-500/20",
        poor: "text-red-400 bg-red-500/20",
    };

    return (
        <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-neutral-800/50 rounded-xl">
                {[
                    { id: "overview", label: "📊 General", icon: "📊" },
                    { id: "trends", label: "📈 Tendencias", icon: "📈" },
                    { id: "health", label: "💚 Salud", icon: "💚" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            selectedTab === tab.id
                                ? "bg-accent-1 text-white"
                                : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {selectedTab === "overview" && (
                    <motion.div
                        key="overview"
                        initial={isMounted ? { opacity: 0, y: 10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-3"
                    >
                        {/* Savings Rate */}
                        <MetricCard
                            icon="💰"
                            label="Tasa de Ahorro"
                            value={`${metrics.savingsRate.toFixed(1)}%`}
                            subtext="del ingreso mensual"
                            color={metrics.savingsRate >= 20 ? "emerald" : metrics.savingsRate >= 10 ? "blue" : "orange"}
                        />

                        {/* Monthly Average */}
                        <MetricCard
                            icon="📅"
                            label="Promedio Mensual"
                            value={formatCurrency(metrics.monthlyAverage.expenses, baseCurrency)}
                            subtext="en gastos"
                            color="purple"
                        />

                        {/* Streak */}
                        <MetricCard
                            icon="🔥"
                            label="Racha de Registro"
                            value={`${metrics.streaks.loggedDays} días`}
                            subtext="registrando gastos"
                            color="orange"
                        />

                        {/* Budget Compliance */}
                        <MetricCard
                            icon="🎯"
                            label="Dentro del Presupuesto"
                            value={`${metrics.streaks.budgetStreak} días`}
                            subtext="consecutivos"
                            color={metrics.streaks.budgetStreak >= 7 ? "emerald" : "yellow"}
                        />

                        {/* Year Total Savings */}
                        <MetricCard
                            icon="📈"
                            label="Ahorro del Año"
                            value={formatCurrency(metrics.yearlyTotal.savings, baseCurrency)}
                            subtext={`de ${formatCurrency(metrics.yearlyTotal.income, baseCurrency)} ingreso`}
                            color="emerald"
                            wide
                        />

                        {/* Comparison vs Last Month */}
                        <MetricCard
                            icon={metrics.comparisons.vsLastMonth <= 0 ? "📉" : "📈"}
                            label="vs. Mes Anterior"
                            value={`${metrics.comparisons.vsLastMonth >= 0 ? "+" : ""}${metrics.comparisons.vsLastMonth.toFixed(1)}%`}
                            subtext="en gastos"
                            color={metrics.comparisons.vsLastMonth <= 0 ? "emerald" : "red"}
                            wide
                        />
                    </motion.div>
                )}

                {selectedTab === "trends" && (
                    <motion.div
                        key="trends"
                        initial={isMounted ? { opacity: 0, y: 10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Increasing Categories */}
                        {metrics.categoryTrends.increasing.length > 0 && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-red-400">📈</span>
                                    <h4 className="text-sm font-medium text-red-400">Categorías en Aumento</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {metrics.categoryTrends.increasing.map((cat) => (
                                        <span
                                            key={cat}
                                            className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm"
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Decreasing Categories */}
                        {metrics.categoryTrends.decreasing.length > 0 && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-emerald-400">📉</span>
                                    <h4 className="text-sm font-medium text-emerald-400">Categorías en Disminución</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {metrics.categoryTrends.decreasing.map((cat) => (
                                        <span
                                            key={cat}
                                            className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm"
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Year Comparison */}
                        <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl">
                            <h4 className="text-sm font-medium text-neutral-300 mb-3">Comparación Anual</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-400">
                                        {formatCurrency(metrics.yearlyTotal.income, baseCurrency)}
                                    </p>
                                    <p className="text-xs text-neutral-500">Ingresos</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-400">
                                        {formatCurrency(metrics.yearlyTotal.expenses, baseCurrency)}
                                    </p>
                                    <p className="text-xs text-neutral-500">Gastos</p>
                                </div>
                                <div className="text-center">
                                    <p className={`text-2xl font-bold ${metrics.yearlyTotal.savings >= 0 ? "text-blue-400" : "text-red-400"}`}>
                                        {formatCurrency(metrics.yearlyTotal.savings, baseCurrency)}
                                    </p>
                                    <p className="text-xs text-neutral-500">Balance</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {selectedTab === "health" && (
                    <motion.div
                        key="health"
                        initial={isMounted ? { opacity: 0, y: 10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Health Score */}
                        <div className={`p-6 rounded-xl ${healthColors[metrics.financialHealth.status]}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-semibold">Salud Financiera</h4>
                                    <p className="text-sm opacity-80 capitalize">{metrics.financialHealth.status}</p>
                                </div>
                                <div className="text-4xl font-bold">
                                    {metrics.financialHealth.score}/100
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${metrics.financialHealth.score}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-current rounded-full"
                                />
                            </div>
                        </div>

                        {/* Factors */}
                        <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl">
                            <h4 className="text-sm font-medium text-neutral-300 mb-3">Factores de Evaluación</h4>
                            <div className="space-y-2">
                                {metrics.financialHealth.factors.map((factor, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-2 border-b border-neutral-700/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                factor.impact === "positive" ? "bg-emerald-400" :
                                                factor.impact === "negative" ? "bg-red-400" : "bg-neutral-400"
                                            }`} />
                                            <span className="text-sm text-neutral-300">{factor.name}</span>
                                        </div>
                                        <span className={`text-sm font-medium ${
                                            factor.impact === "positive" ? "text-emerald-400" :
                                            factor.impact === "negative" ? "text-red-400" : "text-neutral-400"
                                        }`}>
                                            {factor.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    subtext,
    color,
    wide = false,
}: {
    icon: string;
    label: string;
    value: string;
    subtext: string;
    color: "emerald" | "blue" | "purple" | "orange" | "yellow" | "red";
    wide?: boolean;
}) {
    const colors = {
        emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
        orange: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        red: "bg-red-500/10 border-red-500/30 text-red-400",
    };

    return (
        <motion.div
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-xl border ${colors[color]} ${wide ? "col-span-2" : ""}`}
        >
            <div className="flex items-start gap-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400 mb-1">{label}</p>
                    <p className="text-xl font-bold truncate">{value}</p>
                    <p className="text-xs opacity-70 mt-1">{subtext}</p>
                </div>
            </div>
        </motion.div>
    );
}

function MetricsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-neutral-800 rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`h-28 bg-neutral-800 rounded-xl ${i > 4 ? "col-span-2" : ""}`} />
                ))}
            </div>
        </div>
    );
}
