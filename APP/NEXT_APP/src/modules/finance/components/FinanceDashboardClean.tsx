"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "../context/FinanceContext";
import { BatchReceiptScanner } from "./BatchReceiptScanner";
import { FinanceOnboarding } from "./FinanceOnboarding";
import { OfflineIndicator } from "./PWAComponents";
import type { OCRData } from "./OCRResultDisplay";

// Types
interface DashboardData {
    balance: {
        available: number;
        change: number;
        changePercent: number;
    };
    monthProgress: {
        spent: number;
        budget: number;
        dayOfMonth: number;
        daysInMonth: number;
        status: "under" | "on-track" | "over";
    };
    recentTransactions: Transaction[];
    topCategories: CategorySpend[];
    pendingReminders: number;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    categoryIcon: string;
    date: string;
}

interface CategorySpend {
    id: string;
    name: string;
    amount: number;
    icon: string;
    color: string;
}

interface FinanceDashboardCleanProps {
    userId: string;
}

export function FinanceDashboardClean({ userId: _userId }: FinanceDashboardCleanProps) {
    const { baseCurrency, refreshKey } = useFinance();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showFabMenu, setShowFabMenu] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Track client-side mount to prevent SSR animation mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/finance/dashboard/v2?currency=${baseCurrency}`);
            if (res.ok) {
                const result = await res.json();
                setData(result.data);
                if (result.needsOnboarding) {
                    setShowOnboarding(true);
                }
            }
        } catch (error) {
            console.error("Error fetching dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, [baseCurrency]);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshKey]);

    // Handle batch scan complete
    const handleBatchScanComplete = (results: { data: OCRData; imageData: string }[]) => {
        setShowScanner(false);
        if (results.length === 0) return;

        if (results.length === 1) {
            const ocrData = results[0].data;
            const params = new URLSearchParams({
                amount: ocrData.financials?.total?.toString() || ocrData.amount?.value?.toString() || "",
                description: ocrData.merchant?.value?.name || "",
                merchant: ocrData.merchant?.value?.name || "",
                categoryId: ocrData.suggestedCategory?.categoryId || "",
                date: ocrData.emissionDate?.value || ocrData.date?.value || "",
                rut: ocrData.merchant?.value?.rut || "",
                documentNumber: ocrData.documentNumber?.value || "",
                documentType: ocrData.documentType || "",
                subtotal: ocrData.financials?.subtotal?.toString() || "",
                tax: ocrData.financials?.tax?.toString() || "",
                source: "ocr",
            });
            window.location.href = `/admin/finance/transactions/new?${params}`;
        } else {
            sessionStorage.setItem("batchOCRResults", JSON.stringify(results));
            window.location.href = "/admin/finance/transactions/batch";
        }
    };

    // Loading
    if (loading && !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-40 bg-neutral-800/50 rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-neutral-800/50 rounded-xl" />
                    <div className="h-24 bg-neutral-800/50 rounded-xl" />
                </div>
                <div className="h-64 bg-neutral-800/50 rounded-2xl" />
            </div>
        );
    }

    // Onboarding
    if (showOnboarding) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-full max-w-lg">
                    <FinanceOnboarding onComplete={() => { setShowOnboarding(false); fetchData(); }} />
                </div>
            </div>
        );
    }

    // Scanner
    if (showScanner) {
        return (
            <BatchReceiptScanner
                onComplete={handleBatchScanComplete}
                onCancel={() => setShowScanner(false)}
            />
        );
    }

    if (!data) return null;

    const spentPercent = data.monthProgress.budget > 0
        ? Math.min((data.monthProgress.spent / data.monthProgress.budget) * 100, 100)
        : 0;

    return (
        <div className="pb-24 max-w-4xl mx-auto">
            <OfflineIndicator />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Finanzas</h1>
                <p className="text-neutral-500 text-sm">
                    {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                </p>
            </div>

            {/* Balance Card */}
            <motion.div
                initial={isMounted ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 mb-6 border border-neutral-700/50"
            >
                <p className="text-neutral-400 text-sm mb-1">Balance disponible</p>
                <div className="flex items-baseline gap-3">
                    <span className="text-3xl md:text-4xl font-bold text-white">
                        {formatCurrency(data.balance.available, baseCurrency)}
                    </span>
                    {data.balance.change !== 0 && (
                        <span className={`text-sm px-2 py-0.5 rounded-full ${data.balance.change >= 0
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                            {data.balance.change >= 0 ? "+" : ""}{data.balance.changePercent.toFixed(1)}%
                        </span>
                    )}
                </div>

                {/* Month Progress */}
                <div className="mt-6 pt-4 border-t border-neutral-700/50">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-400">Gastos del mes</span>
                        <span className="text-white">
                            {formatCurrency(data.monthProgress.spent)}
                            <span className="text-neutral-500"> / {formatCurrency(data.monthProgress.budget)}</span>
                        </span>
                    </div>
                    <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${spentPercent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${data.monthProgress.status === "under" ? "bg-emerald-500" :
                                    data.monthProgress.status === "on-track" ? "bg-amber-500" :
                                        "bg-red-500"
                                }`}
                        />
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                        Día {data.monthProgress.dayOfMonth} de {data.monthProgress.daysInMonth}
                    </p>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.a
                    href="/admin/finance/categories"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📊</span>
                        <span className="text-sm text-neutral-400">Top categoría</span>
                    </div>
                    {data.topCategories[0] ? (
                        <>
                            <p className="text-white font-medium truncate">{data.topCategories[0].name}</p>
                            <p className="text-neutral-500 text-sm">{formatCurrency(data.topCategories[0].amount)}</p>
                        </>
                    ) : (
                        <p className="text-neutral-500 text-sm">Sin gastos</p>
                    )}
                </motion.a>

                <motion.a
                    href="/admin/finance/reminders"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔔</span>
                        <span className="text-sm text-neutral-400">Recordatorios</span>
                    </div>
                    <p className="text-white font-medium">
                        {data.pendingReminders || 0} pendiente{data.pendingReminders !== 1 ? "s" : ""}
                    </p>
                    <p className="text-neutral-500 text-sm">este mes</p>
                </motion.a>
            </div>

            {/* Recent Transactions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h2 className="font-medium text-white">Últimos movimientos</h2>
                    <a
                        href="/admin/finance/transactions"
                        className="text-sm text-blue-400 hover:text-blue-300"
                    >
                        Ver todo
                    </a>
                </div>

                {data.recentTransactions.length > 0 ? (
                    <div className="divide-y divide-neutral-800/50">
                        {data.recentTransactions.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-neutral-800/30 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-lg">
                                    {tx.categoryIcon || "💰"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white truncate">{tx.description}</p>
                                    <p className="text-xs text-neutral-500">
                                        {new Date(tx.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                    </p>
                                </div>
                                <span className={`font-medium ${tx.type === "expense" ? "text-red-400" : "text-emerald-400"
                                    }`}>
                                    {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📝</span>
                        </div>
                        <p className="text-neutral-400 mb-2">Sin transacciones aún</p>
                        <button
                            onClick={() => setShowFabMenu(true)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                            Registrar primera transacción →
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Quick Links */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 grid grid-cols-3 gap-3"
            >
                <a
                    href="/admin/finance/accounts"
                    className="flex flex-col items-center gap-2 p-4 bg-neutral-900/30 border border-neutral-800/50 rounded-xl hover:bg-neutral-800/30 transition-colors text-center"
                >
                    <span className="text-2xl">🏦</span>
                    <span className="text-xs text-neutral-400">Cuentas</span>
                </a>
                <a
                    href="/admin/finance/budgets"
                    className="flex flex-col items-center gap-2 p-4 bg-neutral-900/30 border border-neutral-800/50 rounded-xl hover:bg-neutral-800/30 transition-colors text-center"
                >
                    <span className="text-2xl">📋</span>
                    <span className="text-xs text-neutral-400">Presupuestos</span>
                </a>
                <a
                    href="/admin/finance/goals"
                    className="flex flex-col items-center gap-2 p-4 bg-neutral-900/30 border border-neutral-800/50 rounded-xl hover:bg-neutral-800/30 transition-colors text-center"
                >
                    <span className="text-2xl">🎯</span>
                    <span className="text-xs text-neutral-400">Metas</span>
                </a>
            </motion.div>

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {showFabMenu && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                                onClick={() => setShowFabMenu(false)}
                            />

                            <motion.button
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: 0.05 }}
                                onClick={() => {
                                    setShowFabMenu(false);
                                    setShowScanner(true);
                                }}
                                className="relative z-40 flex items-center gap-3 px-4 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-500 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-medium">Escanear boleta</span>
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                onClick={() => {
                                    setShowFabMenu(false);
                                    window.location.href = "/admin/finance/transactions/new";
                                }}
                                className="relative z-40 flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-500 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="font-medium">Ingreso manual</span>
                            </motion.button>
                        </>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className={`relative z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${showFabMenu
                            ? "bg-neutral-700"
                            : "bg-blue-600 hover:bg-blue-500"
                        }`}
                >
                    <svg
                        className={`w-6 h-6 text-white transition-transform ${showFabMenu ? "rotate-45" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </motion.button>
            </div>
        </div>
    );
}
