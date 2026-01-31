"use client";

export interface Insight {
    type: string;
    icon: string;
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
}

interface InsightsCardProps {
    insights: Insight[];
}

const IMPACT_STYLES = {
    high: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        badge: "bg-red-500/20 text-red-400",
    },
    medium: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        badge: "bg-yellow-500/20 text-yellow-400",
    },
    low: {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        badge: "bg-green-500/20 text-green-400",
    },
};

const IMPACT_LABELS = {
    high: "Alta prioridad",
    medium: "Revisar",
    low: "Positivo",
};

export function InsightsCard({ insights }: InsightsCardProps) {
    if (insights.length === 0) {
        return (
            <div className="p-6 bg-gray-800/30 rounded-2xl border border-gray-700/50 text-center">
                <span className="text-4xl">🔍</span>
                <p className="text-gray-400 mt-2">
                    No hay insights relevantes este mes.
                    <br />
                    <span className="text-sm">Sigue registrando transacciones para obtener análisis.</span>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="font-medium text-white flex items-center gap-2">
                <span className="text-xl">💡</span>
                Insights del mes
            </h3>

            <div className="space-y-3">
                {insights.map((insight, index) => {
                    const styles = IMPACT_STYLES[insight.impact];

                    return (
                        <div
                            key={index}
                            className={`p-4 rounded-xl border ${styles.bg} ${styles.border} transition-all hover:scale-[1.01]`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl flex-shrink-0">{insight.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium text-white">{insight.title}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge}`}>
                                            {IMPACT_LABELS[insight.impact]}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{insight.description}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
