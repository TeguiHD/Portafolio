"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/currency";

interface FinanceMetrics {
    adoption: {
        totalUsers: number;
        activeUsers: number;
        newUsersThisWeek: number;
        newUsersLastWeek: number;
        growthRate: number;
        onboardingCompletion: number;
    };
    engagement: {
        avgTransactionsPerUser: number;
        avgSessionDuration: number;
        dailyActiveUsers: number;
        weeklyActiveUsers: number;
        monthlyActiveUsers: number;
        retentionRate: number;
    };
    quality: {
        avgCategorizationConfidence: number;
        manualCategoryOverrides: number;
        ocrUsageCount: number;
        ocrSuccessRate: number;
        aiAnalysisUsage: number;
        exportCount: number;
    };
    financial: {
        totalTransactionsRecorded: number;
        totalVolumeTracked: number;
        avgTransactionAmount: number;
        categoriesUsed: number;
        goalsCreated: number;
        budgetsSet: number;
    };
}

export default function FinanceMetricsDashboard() {
    const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/finance/metrics?period=${period}`);
                if (res.ok) {
                    const data = await res.json();
                    setMetrics(data.data);
                }
            } catch (error) {
                console.error("Error fetching metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [period]);

    if (loading) {
        return (
            <div className="p-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-gray-800 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="p-6 text-center text-gray-400">
                No se pudieron cargar las métricas
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Métricas de Finanzas</h1>
                    <p className="text-gray-400">Dashboard de adopción y uso del módulo</p>
                </div>

                <div className="flex gap-2">
                    {(["7d", "30d", "90d"] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                period === p
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            }`}
                        >
                            {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "90 días"}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Usuarios Activos"
                    value={metrics.adoption.activeUsers}
                    subtitle={`de ${metrics.adoption.totalUsers} totales`}
                    trend={metrics.adoption.growthRate}
                    icon="👥"
                    color="blue"
                />
                <MetricCard
                    title="Transacciones/Usuario"
                    value={metrics.engagement.avgTransactionsPerUser.toFixed(1)}
                    subtitle="promedio mensual"
                    icon="📊"
                    color="green"
                />
                <MetricCard
                    title="Retención"
                    value={`${(metrics.engagement.retentionRate * 100).toFixed(0)}%`}
                    subtitle="usuarios recurrentes"
                    icon="🔄"
                    color="purple"
                />
                <MetricCard
                    title="Precisión OCR"
                    value={`${(metrics.quality.ocrSuccessRate * 100).toFixed(0)}%`}
                    subtitle={`${metrics.quality.ocrUsageCount} escaneos`}
                    icon="📸"
                    color="yellow"
                />
            </div>

            {/* Detailed Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Adoption */}
                <MetricSection title="📈 Adopción" icon="adoption">
                    <MetricRow label="Total usuarios" value={metrics.adoption.totalUsers} />
                    <MetricRow label="Usuarios activos" value={metrics.adoption.activeUsers} />
                    <MetricRow
                        label="Nuevos esta semana"
                        value={metrics.adoption.newUsersThisWeek}
                        change={
                            metrics.adoption.newUsersLastWeek > 0
                                ? ((metrics.adoption.newUsersThisWeek - metrics.adoption.newUsersLastWeek) /
                                      metrics.adoption.newUsersLastWeek) *
                                  100
                                : 0
                        }
                    />
                    <MetricRow
                        label="Onboarding completado"
                        value={`${(metrics.adoption.onboardingCompletion * 100).toFixed(0)}%`}
                    />
                </MetricSection>

                {/* Engagement */}
                <MetricSection title="⚡ Engagement" icon="engagement">
                    <MetricRow label="DAU" value={metrics.engagement.dailyActiveUsers} />
                    <MetricRow label="WAU" value={metrics.engagement.weeklyActiveUsers} />
                    <MetricRow label="MAU" value={metrics.engagement.monthlyActiveUsers} />
                    <MetricRow
                        label="Sesión promedio"
                        value={`${Math.round(metrics.engagement.avgSessionDuration / 60)}min`}
                    />
                </MetricSection>

                {/* Quality */}
                <MetricSection title="✨ Calidad" icon="quality">
                    <MetricRow
                        label="Confianza categorización"
                        value={`${(metrics.quality.avgCategorizationConfidence * 100).toFixed(0)}%`}
                    />
                    <MetricRow label="Correcciones manuales" value={metrics.quality.manualCategoryOverrides} />
                    <MetricRow label="Uso de OCR" value={metrics.quality.ocrUsageCount} />
                    <MetricRow label="Análisis IA" value={metrics.quality.aiAnalysisUsage} />
                    <MetricRow label="Exportaciones" value={metrics.quality.exportCount} />
                </MetricSection>

                {/* Financial Overview */}
                <MetricSection title="💰 Volumen" icon="financial">
                    <MetricRow label="Total transacciones" value={metrics.financial.totalTransactionsRecorded.toLocaleString()} />
                    <MetricRow
                        label="Volumen registrado"
                        value={formatCurrency(metrics.financial.totalVolumeTracked)}
                    />
                    <MetricRow
                        label="Transacción promedio"
                        value={formatCurrency(metrics.financial.avgTransactionAmount)}
                    />
                    <MetricRow label="Categorías activas" value={metrics.financial.categoriesUsed} />
                    <MetricRow label="Metas creadas" value={metrics.financial.goalsCreated} />
                    <MetricRow label="Presupuestos activos" value={metrics.financial.budgetsSet} />
                </MetricSection>
            </div>

            {/* Feature Usage Breakdown */}
            <div className="bg-gray-900/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Uso de Features</h3>
                <div className="space-y-4">
                    <FeatureBar label="Transacciones" percentage={95} color="blue" />
                    <FeatureBar label="Categorías" percentage={78} color="green" />
                    <FeatureBar label="Análisis" percentage={52} color="purple" />
                    <FeatureBar label="OCR Boletas" percentage={35} color="yellow" />
                    <FeatureBar label="Metas/Presupuestos" percentage={28} color="pink" />
                    <FeatureBar label="IA Insights" percentage={22} color="cyan" />
                    <FeatureBar label="Export/Import" percentage={15} color="orange" />
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    subtitle,
    trend,
    icon,
    color,
}: {
    title: string;
    value: string | number;
    subtitle: string;
    trend?: number;
    icon: string;
    color: "blue" | "green" | "purple" | "yellow";
}) {
    const colors = {
        blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
        green: "from-green-500/20 to-green-600/10 border-green-500/30",
        purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
        yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
            <div className="flex items-start justify-between">
                <span className="text-2xl">{icon}</span>
                {trend !== undefined && (
                    <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            trend > 0
                                ? "bg-green-500/20 text-green-400"
                                : trend < 0
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                        }`}
                    >
                        {trend > 0 ? "+" : ""}
                        {trend.toFixed(1)}%
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-white mt-3">{value}</p>
            <p className="text-sm text-gray-400 mt-1">{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
    );
}

function MetricSection({
    title,
    icon,
    children,
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-900/50 rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function MetricRow({
    label,
    value,
    change,
}: {
    label: string;
    value: string | number;
    change?: number;
}) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
            <span className="text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-white font-medium">{value}</span>
                {change !== undefined && (
                    <span
                        className={`text-xs ${
                            change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400"
                        }`}
                    >
                        {change > 0 ? "↑" : change < 0 ? "↓" : "→"}
                        {Math.abs(change).toFixed(0)}%
                    </span>
                )}
            </div>
        </div>
    );
}

function FeatureBar({
    label,
    percentage,
    color,
}: {
    label: string;
    percentage: number;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        purple: "bg-purple-500",
        yellow: "bg-yellow-500",
        pink: "bg-pink-500",
        cyan: "bg-cyan-500",
        orange: "bg-orange-500",
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="text-white">{percentage}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorClasses[color]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
