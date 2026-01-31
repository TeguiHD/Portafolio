"use client";

import { useState, useEffect, useCallback } from "react";
import { SummaryCards } from "@/modules/finance/components/SummaryCards";
import { CategoryBreakdown } from "@/modules/finance/components/CategoryBreakdown";
import { DailyChart } from "@/modules/finance/components/DailyChart";
import { InsightsCard } from "@/modules/finance/components/InsightsCard";
import { TrendsChart } from "@/modules/finance/components/TrendsChart";
import { formatCurrency } from "@/lib/currency";

type Tab = "monthly" | "trends";

interface ReportData {
    period: { year: number; month: number };
    summary: {
        income: number;
        expenses: number;
        balance: number;
        incomeChange: number;
        expenseChange: number;
        transactionCount: number;
    };
    categoryBreakdown: any[];
    dailyData: any[];
    topMerchants: any[];
    largestExpenses: any[];
    insights: any[];
}

interface TrendsData {
    trendData: any[];
    summary: {
        avgIncome: number;
        avgExpenses: number;
        avgBalance: number;
        avgSavingsRate: number;
    };
    highlights: {
        bestMonth: { label: string; balance: number } | null;
        worstMonth: { label: string; balance: number } | null;
    };
}

export default function ReportsPageClient() {
    const [activeTab, setActiveTab] = useState<Tab>("monthly");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Monthly report state
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    // Trends state
    const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
    const [trendsMonths, setTrendsMonths] = useState(12);

    const fetchMonthlyReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/finance/reports?year=${year}&month=${month}`);
            if (!res.ok) throw new Error("Error al cargar reporte");
            const { data } = await res.json();
            setReportData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    const fetchTrends = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/finance/reports/trends?months=${trendsMonths}`);
            if (!res.ok) throw new Error("Error al cargar tendencias");
            const { data } = await res.json();
            setTrendsData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [trendsMonths]);

    useEffect(() => {
        if (activeTab === "monthly") {
            fetchMonthlyReport();
        } else {
            fetchTrends();
        }
    }, [activeTab, fetchMonthlyReport, fetchTrends]);

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const navigateMonth = (delta: number) => {
        let newMonth = month + delta;
        let newYear = year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        setMonth(newMonth);
        setYear(newYear);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reportes y Análisis</h1>
                    <p className="text-gray-400">Visualiza tus finanzas en detalle</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-800/50 rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab("monthly")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "monthly"
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setActiveTab("trends")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "trends"
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Tendencias
                    </button>
                </div>
            </div>

            {/* Period Selector */}
            {activeTab === "monthly" ? (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-white">
                            {monthNames[month - 1]} {year}
                        </h2>
                    </div>
                    <button
                        onClick={() => navigateMonth(1)}
                        disabled={year === new Date().getFullYear() && month === new Date().getMonth() + 1}
                        className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-white transition-colors
                                 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-400">Últimos</span>
                    <select
                        value={trendsMonths}
                        onChange={(e) => setTrendsMonths(parseInt(e.target.value))}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses</option>
                        <option value={24}>24 meses</option>
                    </select>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-gray-400">Generando reporte...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Monthly Report Content */}
            {!loading && !error && activeTab === "monthly" && reportData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <SummaryCards
                        income={reportData.summary.income}
                        expenses={reportData.summary.expenses}
                        balance={reportData.summary.balance}
                        incomeChange={reportData.summary.incomeChange}
                        expenseChange={reportData.summary.expenseChange}
                        transactionCount={reportData.summary.transactionCount}
                    />

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Category Breakdown */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-xl">📊</span>
                                Gastos por categoría
                            </h3>
                            <CategoryBreakdown
                                categories={reportData.categoryBreakdown}
                                totalExpenses={reportData.summary.expenses}
                            />
                        </div>

                        {/* Insights */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <InsightsCard insights={reportData.insights} />
                        </div>
                    </div>

                    {/* Daily Chart */}
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                        <DailyChart data={reportData.dailyData} month={month} year={year} />
                    </div>

                    {/* Top Merchants & Largest Expenses */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Top Merchants */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-xl">🏪</span>
                                Top comercios
                            </h3>
                            {reportData.topMerchants.length > 0 ? (
                                <div className="space-y-3">
                                    {reportData.topMerchants.slice(0, 5).map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-400">
                                                    {i + 1}
                                                </span>
                                                <span className="text-white">{m.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-white font-medium">{formatCurrency(m.amount)}</span>
                                                <span className="text-xs text-gray-500 ml-2">({m.count}x)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">Sin datos de comercios</p>
                            )}
                        </div>

                        {/* Largest Expenses */}
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-xl">💸</span>
                                Mayores gastos
                            </h3>
                            {reportData.largestExpenses.length > 0 ? (
                                <div className="space-y-3">
                                    {reportData.largestExpenses.map((t: any, _i: number) => (
                                        <div key={t.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{t.category?.icon || "💰"}</span>
                                                <div>
                                                    <p className="text-white text-sm">
                                                        {t.merchant || t.description || t.category?.name || "Gasto"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(t.date).toLocaleDateString("es-CL")}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-red-400 font-medium">{formatCurrency(t.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">Sin gastos registrados</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Trends Content */}
            {!loading && !error && activeTab === "trends" && trendsData && (
                <div className="space-y-6">
                    {/* Highlights */}
                    {(trendsData.highlights.bestMonth || trendsData.highlights.worstMonth) && (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {trendsData.highlights.bestMonth && (
                                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                    <p className="text-sm text-green-400 mb-1">🏆 Mejor mes</p>
                                    <p className="text-lg font-semibold text-white">
                                        {trendsData.highlights.bestMonth.label}
                                    </p>
                                    <p className="text-green-400">
                                        Balance: {formatCurrency(trendsData.highlights.bestMonth.balance)}
                                    </p>
                                </div>
                            )}
                            {trendsData.highlights.worstMonth && (
                                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                    <p className="text-sm text-red-400 mb-1">⚠️ Mes más difícil</p>
                                    <p className="text-lg font-semibold text-white">
                                        {trendsData.highlights.worstMonth.label}
                                    </p>
                                    <p className="text-red-400">
                                        Balance: {formatCurrency(trendsData.highlights.worstMonth.balance)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trends Chart */}
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="text-xl">📈</span>
                            Evolución de ingresos y gastos
                        </h3>
                        <TrendsChart data={trendsData.trendData} summary={trendsData.summary} />
                    </div>
                </div>
            )}
        </div>
    );
}

