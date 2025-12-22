"use client";

import { formatCurrency } from "@/lib/currency";

interface CategoryData {
    category: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    };
    amount: number;
    count: number;
    prevAmount: number;
    delta: number;
    percentage: number;
}

interface CategoryBreakdownProps {
    categories: CategoryData[];
    totalExpenses: number;
}

export function CategoryBreakdown({ categories, totalExpenses }: CategoryBreakdownProps) {
    if (categories.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">No hay gastos por categoría este mes</p>
            </div>
        );
    }

    // Take top 8 for chart, rest goes to "Otros"
    const topCategories = categories.slice(0, 8);
    const otherCategories = categories.slice(8);
    const otherTotal = otherCategories.reduce((sum, c) => sum + c.amount, 0);

    return (
        <div className="space-y-6">
            {/* Donut Chart Visualization */}
            <div className="flex items-center gap-8">
                <div className="relative w-48 h-48 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {renderDonutSegments(topCategories, otherTotal, totalExpenses)}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm text-gray-400">Total</span>
                        <span className="text-xl font-bold text-white">{formatCurrency(totalExpenses)}</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                    {topCategories.map((cat) => (
                        <div key={cat.category.id} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.category.color || "#6B7280" }}
                            />
                            <span className="text-sm text-gray-400 truncate">
                                {cat.category.icon} {cat.category.name}
                            </span>
                            <span className="text-sm text-white ml-auto">{cat.percentage}%</span>
                        </div>
                    ))}
                    {otherTotal > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-600" />
                            <span className="text-sm text-gray-400">Otros</span>
                            <span className="text-sm text-white ml-auto">
                                {Math.round((otherTotal / totalExpenses) * 100)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Table */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Detalle por categoría</h4>
                {categories.map((cat) => (
                    <div
                        key={cat.category.id}
                        className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors"
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${cat.category.color || "#6B7280"}20` }}
                        >
                            {cat.category.icon || "❓"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-white">{cat.category.name}</span>
                                <span className="text-white font-semibold">{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">{cat.count} transacciones</span>
                                <div className="flex items-center gap-2">
                                    {cat.prevAmount > 0 && (
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${
                                                cat.delta > 0
                                                    ? "bg-red-500/20 text-red-400"
                                                    : cat.delta < 0
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-gray-500/20 text-gray-400"
                                            }`}
                                        >
                                            {cat.delta > 0 ? "+" : ""}
                                            {cat.delta}%
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500">{cat.percentage}% del total</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function renderDonutSegments(
    categories: CategoryData[],
    otherTotal: number,
    total: number
): React.ReactNode[] {
    const segments: React.ReactNode[] = [];
    let currentAngle = 0;
    const radius = 35;
    const circumference = 2 * Math.PI * radius;

    const allSegments = [
        ...categories.map((c) => ({ color: c.category.color || "#6B7280", amount: c.amount })),
        ...(otherTotal > 0 ? [{ color: "#4B5563", amount: otherTotal }] : []),
    ];

    allSegments.forEach((segment, i) => {
        const percentage = segment.amount / total;
        const strokeLength = percentage * circumference;
        const strokeOffset = currentAngle * circumference;

        segments.push(
            <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={-strokeOffset}
                className="transition-all duration-500"
            />
        );

        currentAngle += percentage;
    });

    return segments;
}
