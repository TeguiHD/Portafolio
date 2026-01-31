"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "../context/FinanceContext";
import { BatchReceiptScanner } from "./BatchReceiptScanner";
import { FinanceOnboarding } from "./FinanceOnboarding";
import { PWAInstallBanner, OfflineIndicator } from "./PWAComponents";
import { FinanceMetrics } from "./FinanceMetrics";
import { FinanceTips } from "./FinanceTips";
import { FinanceReminders } from "./FinanceReminders";
import { ProductCatalog } from "./ProductCatalog";
import type { OCRData } from "./OCRResultDisplay";

// Page header component
function PageHeader() {
    return (
        <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                💰 Finanzas
            </h1>
            <p className="text-neutral-400 text-sm">
                Gestiona tus gastos e ingresos de forma inteligente
            </p>
        </div>
    );
}

// Types
interface DashboardData {
    balance: {
        available: number;
        total: number;
        change: number;
        changePercent: number;
    };
    monthProgress: {
        spent: number;
        projected: number;
        budget: number;
        dayOfMonth: number;
        daysInMonth: number;
        dailyAverage: number;
        status: "under" | "on-track" | "over";
    };
    alerts: SmartAlert[];
    insights: Insight[];
    goals: Goal[];
    topCategories: CategorySpend[];
    recentTransactions: Transaction[];
    quickActions: QuickAction[];
}

interface SmartAlert {
    id: string;
    type: "warning" | "info" | "success" | "danger";
    title: string;
    message: string;
    action?: { label: string; href: string };
    dismissable: boolean;
}

interface Insight {
    id: string;
    type: "spending_pattern" | "saving_opportunity" | "anomaly" | "achievement";
    title: string;
    description: string;
    impact?: number;
    icon: string;
}

interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    icon: string;
    color: string;
}

interface CategorySpend {
    id: string;
    name: string;
    amount: number;
    percentage: number;
    change: number;
    icon: string;
    color: string;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    category: string;
    categoryIcon: string;
    date: string;
    merchant?: string;
}

interface QuickAction {
    id: string;
    label: string;
    amount: number;
    icon: string;
    category: string;
    frequency: number;
}

interface FinanceDashboardV2Props {
    userId: string;
}

export function FinanceDashboardV2({ userId: _userId }: FinanceDashboardV2Props) {
    const { baseCurrency, refreshKey } = useFinance();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showFabMenu, setShowFabMenu] = useState(false);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
    const fabRef = useRef<HTMLButtonElement>(null);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/finance/dashboard/v2?currency=${baseCurrency}`);
            if (res.ok) {
                const result = await res.json();
                setData(result.data);

                // Check if needs onboarding
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

    // Dismiss alert
    const dismissAlert = (alertId: string) => {
        setDismissedAlerts(prev => new Set([...prev, alertId]));
    };

    // Handle batch scan complete - multiple receipts
    const handleBatchScanComplete = (results: { data: OCRData; imageData: string }[]) => {
        setShowScanner(false);

        if (results.length === 0) return;

        if (results.length === 1) {
            // Single receipt - navigate to form with pre-filled data
            const ocrData = results[0].data;
            const params = new URLSearchParams({
                amount: ocrData.financials?.total?.toString() || ocrData.amount?.value?.toString() || "",
                description: ocrData.merchant?.value?.name || "",
                categoryId: ocrData.suggestedCategory?.categoryId || "",
                date: ocrData.emissionDate?.value || ocrData.date?.value || "",
                source: "ocr",
            });
            window.location.href = `/admin/finance/transactions/new?${params}`;
        } else {
            // Multiple receipts - store in sessionStorage and navigate to batch page
            sessionStorage.setItem("batchOCRResults", JSON.stringify(results));
            window.location.href = "/admin/finance/transactions/batch";
        }
    };

    // Onboarding complete
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        fetchData();
    };

    // Loading skeleton
    if (loading && !data) {
        return <DashboardSkeleton />;
    }

    // Show onboarding if needed - but inside the dashboard layout
    if (showOnboarding) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-full max-w-lg">
                    <FinanceOnboarding onComplete={handleOnboardingComplete} />
                </div>
            </div>
        );
    }

    // Show batch scanner
    if (showScanner) {
        return (
            <BatchReceiptScanner
                onComplete={handleBatchScanComplete}
                onCancel={() => setShowScanner(false)}
            />
        );
    }

    if (!data) return null;

    const visibleAlerts = data.alerts.filter(a => !dismissedAlerts.has(a.id)).slice(0, 2);

    return (
        <div className="pb-28 md:pb-24">
            {/* Page Header */}
            <PageHeader />
            <OfflineIndicator />

            {/* Hero Section - Balance Disponible */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-6 md:p-8 mb-6"
            >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="relative z-10">
                    {/* Label */}
                    <p className="text-blue-200 text-sm font-medium mb-2">
                        Balance Disponible
                    </p>

                    {/* Hero Metric */}
                    <div className="flex items-baseline gap-3 mb-4">
                        <motion.span
                            key={data.balance.available}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-4xl md:text-5xl font-bold text-white"
                        >
                            {formatCurrency(data.balance.available, baseCurrency)}
                        </motion.span>

                        {/* Change indicator */}
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${data.balance.change >= 0
                                ? "bg-green-500/20 text-green-300"
                                : "bg-red-500/20 text-red-300"
                            }`}>
                            {data.balance.change >= 0 ? "+" : ""}
                            {data.balance.changePercent.toFixed(1)}%
                        </span>
                    </div>

                    {/* Context Bar - Progress del Mes */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-blue-200">
                                Día {data.monthProgress.dayOfMonth} de {data.monthProgress.daysInMonth}
                            </span>
                            <span className="text-white font-medium">
                                {formatCurrency(data.monthProgress.spent)} de {formatCurrency(data.monthProgress.budget)}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((data.monthProgress.spent / data.monthProgress.budget) * 100, 100)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${data.monthProgress.status === "under" ? "bg-green-400" :
                                        data.monthProgress.status === "on-track" ? "bg-yellow-400" :
                                            "bg-red-400"
                                    }`}
                            />
                        </div>

                        {/* Daily average */}
                        <p className="text-blue-200 text-xs mt-2">
                            Promedio diario: {formatCurrency(data.monthProgress.dailyAverage)} •
                            {data.monthProgress.status === "under" && " ✓ Vas bien"}
                            {data.monthProgress.status === "on-track" && " ⚠️ En el límite"}
                            {data.monthProgress.status === "over" && " 🔴 Sobre presupuesto"}
                        </p>
                    </div>
                </div>
            </motion.section>

            {/* Smart Alerts */}
            <AnimatePresence>
                {visibleAlerts.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mb-6"
                    >
                        {visibleAlerts.map((alert, index) => (
                            <SmartAlertCard
                                key={alert.id}
                                alert={alert}
                                onDismiss={() => dismissAlert(alert.id)}
                                delay={index * 0.1}
                            />
                        ))}
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Quick Actions - Frecuentes */}
            {/* Goals Progress */}
            {data.goals.length > 0 && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                >
                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <span>🎯</span> Metas de Ahorro
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.goals.slice(0, 2).map((goal) => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                </motion.section>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Left: Insights + Transactions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* AI Insights */}
                    {data.insights.length > 0 && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                <span>💡</span> Insights Inteligentes
                            </h3>
                            <div className="space-y-3">
                                {data.insights.slice(0, 3).map((insight) => (
                                    <InsightCard key={insight.id} insight={insight} />
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Recent Transactions */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                <span>📋</span> Últimos Movimientos
                            </h3>
                            <a
                                href="/admin/finance/transactions"
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                                Ver todos →
                            </a>
                        </div>
                        <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
                            {data.recentTransactions.slice(0, 5).map((tx, index) => (
                                <TransactionRow
                                    key={tx.id}
                                    transaction={tx}
                                    isLast={index === Math.min(data.recentTransactions.length - 1, 4)}
                                />
                            ))}
                            {data.recentTransactions.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    <p>No hay transacciones recientes</p>
                                    <a
                                        href="/admin/finance/transactions/new"
                                        className="mt-2 inline-block text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                        Registrar primera transacción →
                                    </a>
                                </div>
                            )}
                        </div>
                    </motion.section>
                </div>

                {/* Right: Categories */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <span>📊</span> Gastos por Categoría
                    </h3>
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-4">
                        {data.topCategories.slice(0, 6).map((cat, index) => (
                            <CategoryRow
                                key={cat.id}
                                category={cat}
                                index={index}
                                total={data.monthProgress.spent}
                            />
                        ))}
                        {data.topCategories.length === 0 && (
                            <p className="text-center text-gray-500 py-4">
                                Sin gastos este mes
                            </p>
                        )}
                    </div>
                </motion.section>
            </div>

            {/* New Section: Metrics, Tips & Reminders */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
            >
                {/* Metrics Card */}
                <div className="lg:col-span-2 bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                    <FinanceMetrics />
                </div>

                {/* Sidebar: Tips & Reminders */}
                <div className="space-y-6">
                    {/* Reminders */}
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                        <FinanceReminders />
                    </div>

                    {/* Tips */}
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
                        <FinanceTips limit={3} />
                    </div>
                </div>
            </motion.section>

            {/* Product Catalog Section */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
            >
                <ProductCatalog />
            </motion.section>

            {/* Floating Action Button with Menu */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {showFabMenu && (
                        <>
                            {/* Backdrop to close menu */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-30"
                                onClick={() => setShowFabMenu(false)}
                            />

                            {/* Option: Scan with AI (Multiple receipts) */}
                            <motion.button
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: 0.05 }}
                                onClick={() => {
                                    setShowFabMenu(false);
                                    setShowScanner(true);
                                }}
                                className="relative z-40 flex items-center gap-3 pl-4 pr-5 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-500 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-medium">Con IA</span>
                                    <span className="block text-xs text-purple-200">Escanear boletas</span>
                                </div>
                            </motion.button>

                            {/* Option: Manual Entry */}
                            <motion.button
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                onClick={() => {
                                    setShowFabMenu(false);
                                    window.location.href = "/admin/finance/transactions/new";
                                }}
                                className="relative z-40 flex items-center gap-3 pl-4 pr-5 py-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-500 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-medium">Manual</span>
                                    <span className="block text-xs text-emerald-200">Ingresar datos</span>
                                </div>
                            </motion.button>
                        </>
                    )}
                </AnimatePresence>

                {/* Main FAB */}
                <motion.button
                    ref={fabRef}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className={`relative z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${showFabMenu
                            ? "bg-neutral-700 rotate-45"
                            : "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
                        }`}
                    title="Nueva transacción"
                >
                    <svg className="w-6 h-6 text-white transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </motion.button>
            </div>

            {/* PWA Install Banner */}
            <PWAInstallBanner />
        </div>
    );
}

// Sub-components

function SmartAlertCard({
    alert,
    onDismiss,
    delay
}: {
    alert: SmartAlert;
    onDismiss: () => void;
    delay: number;
}) {
    const colors = {
        warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        success: "bg-green-500/10 border-green-500/30 text-green-400",
        danger: "bg-red-500/10 border-red-500/30 text-red-400",
    };

    const icons = {
        warning: "⚠️",
        info: "💡",
        success: "🎉",
        danger: "🚨",
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className={`p-4 rounded-xl border ${colors[alert.type]} flex items-start gap-3`}
        >
            <span className="text-xl">{icons[alert.type]}</span>
            <div className="flex-1 min-w-0">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm opacity-80 mt-0.5">{alert.message}</p>
                {alert.action && (
                    <a
                        href={alert.action.href}
                        className="inline-block mt-2 text-sm underline hover:no-underline"
                    >
                        {alert.action.label} →
                    </a>
                )}
            </div>
            {alert.dismissable && (
                <button
                    onClick={onDismiss}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </motion.div>
    );
}

function GoalCard({ goal }: { goal: Goal }) {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const remaining = goal.targetAmount - goal.currentAmount;

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-4">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{goal.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{goal.name}</p>
                    <p className="text-xs text-gray-400">
                        Faltan {formatCurrency(remaining)}
                    </p>
                </div>
                <span className="text-lg font-bold text-white">
                    {progress.toFixed(0)}%
                </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: goal.color }}
                />
            </div>
            {goal.deadline && (
                <p className="text-xs text-gray-500 mt-2">
                    Meta: {new Date(goal.deadline).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                </p>
            )}
        </div>
    );
}

function InsightCard({ insight }: { insight: Insight }) {
    const colors = {
        spending_pattern: "bg-purple-500/10 border-purple-500/30",
        saving_opportunity: "bg-green-500/10 border-green-500/30",
        anomaly: "bg-yellow-500/10 border-yellow-500/30",
        achievement: "bg-blue-500/10 border-blue-500/30",
    };

    return (
        <div className={`p-4 rounded-xl border ${colors[insight.type]}`}>
            <div className="flex items-start gap-3">
                <span className="text-xl">{insight.icon}</span>
                <div>
                    <p className="font-medium text-white">{insight.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{insight.description}</p>
                    {insight.impact && (
                        <p className="text-xs text-green-400 mt-2">
                            💰 Ahorro potencial: {formatCurrency(insight.impact)}/mes
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function TransactionRow({
    transaction,
    isLast
}: {
    transaction: Transaction;
    isLast: boolean;
}) {
    const isExpense = transaction.type === "expense";

    return (
        <div className={`flex items-center gap-4 p-4 ${!isLast ? "border-b border-gray-800/50" : ""}`}>
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                {transaction.categoryIcon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{transaction.description}</p>
                <p className="text-xs text-gray-500">
                    {transaction.category} • {new Date(transaction.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                </p>
            </div>
            <span className={`font-medium ${isExpense ? "text-red-400" : "text-green-400"}`}>
                {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
            </span>
        </div>
    );
}

function CategoryRow({
    category,
    index,
    total
}: {
    category: CategorySpend;
    index: number;
    total: number;
}) {
    const percentage = total > 0 ? (category.amount / total) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`py-3 ${index > 0 ? "border-t border-gray-800/50" : ""}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span className="text-sm text-white">{category.name}</span>
                </div>
                <div className="text-right">
                    <span className="text-sm font-medium text-white">
                        {formatCurrency(category.amount)}
                    </span>
                    {category.change !== 0 && (
                        <span className={`text-xs ml-2 ${category.change > 0 ? "text-red-400" : "text-green-400"}`}>
                            {category.change > 0 ? "↑" : "↓"}{Math.abs(category.change)}%
                        </span>
                    )}
                </div>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: category.color }}
                />
            </div>
        </motion.div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Hero skeleton */}
            <div className="h-48 bg-gray-800 rounded-3xl" />

            {/* Quick actions skeleton */}
            <div className="flex gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 w-28 bg-gray-800 rounded-xl" />
                ))}
            </div>

            {/* Grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="h-32 bg-gray-800 rounded-2xl" />
                    <div className="h-64 bg-gray-800 rounded-2xl" />
                </div>
                <div className="h-80 bg-gray-800 rounded-2xl" />
            </div>
        </div>
    );
}
