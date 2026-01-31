"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinance } from "../context/FinanceContext";

interface Tip {
    id: string;
    type: "savings" | "investment" | "budgeting" | "debt" | "general";
    title: string;
    description: string;
    impact?: string;
    actionLabel?: string;
    actionUrl?: string;
    isPersonalized: boolean;
    priority: number;
}

interface FinanceTipsProps {
    limit?: number;
    showPersonalized?: boolean;
}

export function FinanceTips({ limit = 3, showPersonalized = true }: FinanceTipsProps) {
    const { baseCurrency, refreshKey } = useFinance();
    const [tips, setTips] = useState<Tip[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchTips() {
            try {
                setLoading(true);
                const res = await fetch(`/api/finance/tips?currency=${baseCurrency}&personalized=${showPersonalized}`);
                if (res.ok) {
                    const data = await res.json();
                    setTips(data.data || []);
                } else {
                    // Fallback tips if API fails
                    setTips(getDefaultTips());
                }
            } catch (error) {
                console.error("Error fetching tips:", error);
                setTips(getDefaultTips());
            } finally {
                setLoading(false);
            }
        }
        fetchTips();
    }, [baseCurrency, refreshKey, showPersonalized]);

    const dismissTip = (tipId: string) => {
        setDismissedTips(prev => new Set([...prev, tipId]));
    };

    const filteredTips = tips
        .filter(tip => !dismissedTips.has(tip.id))
        .filter(tip => !selectedType || tip.type === selectedType)
        .slice(0, limit);

    const typeConfig = {
        savings: { icon: "💰", label: "Ahorro", color: "emerald" },
        investment: { icon: "📈", label: "Inversión", color: "blue" },
        budgeting: { icon: "📊", label: "Presupuesto", color: "purple" },
        debt: { icon: "💳", label: "Deudas", color: "orange" },
        general: { icon: "💡", label: "General", color: "yellow" },
    };

    if (loading) {
        return <TipsSkeleton />;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <span>💡</span> Tips Financieros
                </h3>
                <a
                    href="/admin/finance/tips"
                    className="text-xs text-blue-400 hover:text-blue-300"
                >
                    Ver todos →
                </a>
            </div>

            {/* Type Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setSelectedType(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${!selectedType
                        ? "bg-accent-1 text-white"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                >
                    Todos
                </button>
                {Object.entries(typeConfig).map(([type, config]) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${selectedType === type
                            ? "bg-accent-1 text-white"
                            : "bg-neutral-800 text-neutral-400 hover:text-white"
                            }`}
                    >
                        {config.icon} {config.label}
                    </button>
                ))}
            </div>

            {/* Tips List */}
            <AnimatePresence mode="popLayout">
                {filteredTips.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTips.map((tip, index) => (
                            <TipCard
                                key={tip.id}
                                tip={tip}
                                config={typeConfig[tip.type]}
                                onDismiss={() => dismissTip(tip.id)}
                                delay={index * 0.1}
                            />
                        ))}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-6 text-center bg-neutral-800/50 rounded-xl"
                    >
                        <p className="text-neutral-400">
                            {dismissedTips.size > 0
                                ? "Has visto todos los tips. ¡Vuelve pronto!"
                                : "No hay tips disponibles en este momento."}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TipCard({
    tip,
    config,
    onDismiss,
    delay,
}: {
    tip: Tip;
    config: { icon: string; label: string; color: string };
    onDismiss: () => void;
    delay: number;
}) {
    const colorClasses = {
        emerald: "border-emerald-500/30 bg-emerald-500/5",
        blue: "border-blue-500/30 bg-blue-500/5",
        purple: "border-purple-500/30 bg-purple-500/5",
        orange: "border-orange-500/30 bg-orange-500/5",
        yellow: "border-yellow-500/30 bg-yellow-500/5",
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ delay }}
            className={`p-4 rounded-xl border ${colorClasses[config.color as keyof typeof colorClasses]}`}
        >
            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{tip.title}</h4>
                        {tip.isPersonalized && (
                            <span className="px-2 py-0.5 bg-accent-1/20 text-accent-1 text-xs rounded-full">
                                Para ti
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-neutral-400">{tip.description}</p>

                    {tip.impact && (
                        <p className="text-xs text-emerald-400 mt-2">
                            💵 {tip.impact}
                        </p>
                    )}

                    {tip.actionLabel && tip.actionUrl && (
                        <a
                            href={tip.actionUrl}
                            className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 hover:underline"
                        >
                            {tip.actionLabel} →
                        </a>
                    )}
                </div>
                <button
                    onClick={onDismiss}
                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                    title="Ocultar tip"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </motion.div>
    );
}

function TipsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex justify-between">
                <div className="h-5 w-32 bg-neutral-800 rounded" />
                <div className="h-4 w-20 bg-neutral-800 rounded" />
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-8 w-20 bg-neutral-800 rounded-full" />
                ))}
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-neutral-800 rounded-xl" />
                ))}
            </div>
        </div>
    );
}

// Default tips when API is not available
function getDefaultTips(): Tip[] {
    return [
        {
            id: "1",
            type: "savings",
            title: "Regla del 50/30/20",
            description: "Destina 50% de tus ingresos a necesidades, 30% a deseos y 20% a ahorro. Es una forma simple de mantener el equilibrio financiero.",
            impact: "Podrías ahorrar hasta un 20% más cada mes",
            isPersonalized: false,
            priority: 1,
        },
        {
            id: "2",
            type: "investment",
            title: "Empieza a invertir temprano",
            description: "El interés compuesto es tu mejor aliado. Incluso pequeñas inversiones pueden crecer significativamente con el tiempo.",
            impact: "Una inversión de $100.000 mensuales puede duplicarse en 7-10 años",
            actionLabel: "Explorar opciones de inversión",
            actionUrl: "/admin/finance/goals",
            isPersonalized: false,
            priority: 2,
        },
        {
            id: "3",
            type: "budgeting",
            title: "Revisa tus suscripciones",
            description: "Evalúa todos los servicios mensuales que pagas. Cancela aquellos que no uses regularmente.",
            impact: "Podrías ahorrar entre $10.000 y $50.000 mensuales",
            isPersonalized: false,
            priority: 3,
        },
        {
            id: "4",
            type: "debt",
            title: "Paga más del mínimo",
            description: "Si tienes deudas de tarjeta de crédito, intenta pagar más del mínimo. Esto reduce significativamente los intereses a largo plazo.",
            isPersonalized: false,
            priority: 4,
        },
        {
            id: "5",
            type: "savings",
            title: "Fondo de emergencia",
            description: "Mantén un fondo de emergencia equivalente a 3-6 meses de gastos. Te dará tranquilidad ante imprevistos.",
            actionLabel: "Crear meta de ahorro",
            actionUrl: "/admin/finance/goals/new",
            isPersonalized: false,
            priority: 5,
        },
        {
            id: "6",
            type: "general",
            title: "Automatiza tus ahorros",
            description: "Configura transferencias automáticas a tu cuenta de ahorros justo después de recibir tu sueldo. Lo que no ves, no lo gastas.",
            isPersonalized: false,
            priority: 6,
        },
        {
            id: "7",
            type: "investment",
            title: "Diversifica tus inversiones",
            description: "No pongas todos los huevos en la misma canasta. Distribuye tu dinero entre diferentes tipos de inversiones para reducir el riesgo.",
            isPersonalized: false,
            priority: 7,
        },
        {
            id: "8",
            type: "budgeting",
            title: "Registra cada gasto",
            description: "El seguimiento diario de tus gastos te ayuda a identificar patrones y encontrar áreas de mejora.",
            actionLabel: "Registrar gasto",
            actionUrl: "/admin/finance/transactions/new",
            isPersonalized: false,
            priority: 8,
        },
    ];
}
