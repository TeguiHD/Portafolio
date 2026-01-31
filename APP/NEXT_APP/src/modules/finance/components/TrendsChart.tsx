"use client";

import { formatCurrency } from "@/lib/currency";

export interface TrendData {
    key: string;
    year: number;
    month: number;
    monthName: string;
    label: string;
    income: number;
    expenses: number;
    balance: number;
    count: number;
}

interface TrendsChartProps {
    data: TrendData[];
    summary: {
        avgIncome: number;
        avgExpenses: number;
        avgBalance: number;
        avgSavingsRate: number;
    };
}

export function TrendsChart({ data, summary }: TrendsChartProps) {
    const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1);

    return (
        <div className="space-y-6">
            {/* Line Chart Area */}
            <div className="relative h-64">
                <svg viewBox={`0 0 ${data.length * 60} 200`} className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map((ratio) => (
                        <line
                            key={ratio}
                            x1="0"
                            y1={200 - ratio * 180}
                            x2={data.length * 60}
                            y2={200 - ratio * 180}
                            stroke="#374151"
                            strokeDasharray="4"
                        />
                    ))}

                    {/* Income area */}
                    <path
                        d={`
                            M 30 ${200 - (data[0]?.income / maxValue) * 180}
                            ${data.map((d, i) => `L ${30 + i * 60} ${200 - (d.income / maxValue) * 180}`).join(" ")}
                            L ${30 + (data.length - 1) * 60} 200
                            L 30 200
                            Z
                        `}
                        fill="url(#incomeGradient)"
                        className="opacity-30"
                    />

                    {/* Expense area */}
                    <path
                        d={`
                            M 30 ${200 - (data[0]?.expenses / maxValue) * 180}
                            ${data.map((d, i) => `L ${30 + i * 60} ${200 - (d.expenses / maxValue) * 180}`).join(" ")}
                            L ${30 + (data.length - 1) * 60} 200
                            L 30 200
                            Z
                        `}
                        fill="url(#expenseGradient)"
                        className="opacity-30"
                    />

                    {/* Income line */}
                    <path
                        d={`M ${data.map((d, i) => `${30 + i * 60} ${200 - (d.income / maxValue) * 180}`).join(" L ")}`}
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Expense line */}
                    <path
                        d={`M ${data.map((d, i) => `${30 + i * 60} ${200 - (d.expenses / maxValue) * 180}`).join(" L ")}`}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {data.map((d, i) => (
                        <g key={d.key}>
                            {/* Income point */}
                            <circle
                                cx={30 + i * 60}
                                cy={200 - (d.income / maxValue) * 180}
                                r="5"
                                fill="#22C55E"
                                className="transition-all hover:r-7"
                            />
                            {/* Expense point */}
                            <circle
                                cx={30 + i * 60}
                                cy={200 - (d.expenses / maxValue) * 180}
                                r="5"
                                fill="#EF4444"
                                className="transition-all hover:r-7"
                            />
                        </g>
                    ))}

                    {/* Gradients */}
                    <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22C55E" />
                            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EF4444" />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 py-2">
                    <span>{formatCurrency(maxValue)}</span>
                    <span>{formatCurrency(maxValue * 0.75)}</span>
                    <span>{formatCurrency(maxValue * 0.5)}</span>
                    <span>{formatCurrency(maxValue * 0.25)}</span>
                    <span>$0</span>
                </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between px-8 text-xs text-gray-500 overflow-x-auto">
                {data.map((d) => (
                    <span key={d.key} className="flex-shrink-0">
                        {d.monthName}
                    </span>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 rounded bg-green-500" />
                    <span className="text-gray-400">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-1 rounded bg-red-500" />
                    <span className="text-gray-400">Gastos</span>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-800">
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Prom. Ingresos</p>
                    <p className="text-lg font-semibold text-green-400">{formatCurrency(summary.avgIncome)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Prom. Gastos</p>
                    <p className="text-lg font-semibold text-red-400">{formatCurrency(summary.avgExpenses)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Prom. Balance</p>
                    <p className={`text-lg font-semibold ${summary.avgBalance >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                        {formatCurrency(summary.avgBalance)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Tasa de Ahorro</p>
                    <p className={`text-lg font-semibold ${summary.avgSavingsRate >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {summary.avgSavingsRate}%
                    </p>
                </div>
            </div>
        </div>
    );
}
