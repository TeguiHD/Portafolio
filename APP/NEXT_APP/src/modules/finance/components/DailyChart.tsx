"use client";

import { formatCurrency } from "@/lib/currency";

interface DailyData {
    date: string;
    day: number;
    income: number;
    expense: number;
    balance: number;
}

interface DailyChartProps {
    data: DailyData[];
    month: number;
    year: number;
}

export function DailyChart({ data, month, year }: DailyChartProps) {
    const maxExpense = Math.max(...data.map((d) => d.expense), 1);
    const maxIncome = Math.max(...data.map((d) => d.income), 1);
    const maxValue = Math.max(maxExpense, maxIncome);

    const totalExpenses = data.reduce((sum, d) => sum + d.expense, 0);
    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const avgDaily = totalExpenses / data.length;

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">
                    Gastos diarios - {monthNames[month - 1]} {year}
                </h3>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-gray-400">Gastos</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-gray-400">Ingresos</span>
                    </div>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="relative h-48 flex items-end gap-0.5">
                {data.map((day) => {
                    const expenseHeight = maxValue > 0 ? (day.expense / maxValue) * 100 : 0;
                    const incomeHeight = maxValue > 0 ? (day.income / maxValue) * 100 : 0;
                    const isToday =
                        new Date().getDate() === day.day &&
                        new Date().getMonth() + 1 === month &&
                        new Date().getFullYear() === year;

                    return (
                        <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-0.5 group relative"
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg border border-gray-700">
                                    <p className="font-medium text-white mb-1">Día {day.day}</p>
                                    {day.income > 0 && (
                                        <p className="text-green-400">+ {formatCurrency(day.income)}</p>
                                    )}
                                    {day.expense > 0 && (
                                        <p className="text-red-400">- {formatCurrency(day.expense)}</p>
                                    )}
                                    {day.income === 0 && day.expense === 0 && (
                                        <p className="text-gray-400">Sin movimientos</p>
                                    )}
                                </div>
                            </div>

                            {/* Income bar */}
                            {day.income > 0 && (
                                <div
                                    className="w-full bg-green-500/80 rounded-t transition-all duration-300 hover:bg-green-500"
                                    style={{ height: `${incomeHeight}%`, minHeight: incomeHeight > 0 ? "4px" : 0 }}
                                />
                            )}

                            {/* Expense bar */}
                            <div
                                className={`w-full rounded-t transition-all duration-300 ${
                                    day.expense > avgDaily * 1.5
                                        ? "bg-red-500/80 hover:bg-red-500"
                                        : "bg-red-400/60 hover:bg-red-400"
                                }`}
                                style={{ height: `${expenseHeight}%`, minHeight: day.expense > 0 ? "2px" : 0 }}
                            />

                            {/* Today indicator */}
                            {isToday && (
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Average line */}
                <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500/50"
                    style={{ bottom: `${(avgDaily / maxValue) * 100}%` }}
                >
                    <span className="absolute right-0 -top-5 text-xs text-yellow-500">
                        Prom: {formatCurrency(avgDaily)}
                    </span>
                </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>1</span>
                <span>{Math.ceil(data.length / 4)}</span>
                <span>{Math.ceil(data.length / 2)}</span>
                <span>{Math.ceil((data.length * 3) / 4)}</span>
                <span>{data.length}</span>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <div className="text-center">
                    <p className="text-sm text-gray-400">Total gastos</p>
                    <p className="text-lg font-semibold text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400">Promedio diario</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(avgDaily)}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400">Total ingresos</p>
                    <p className="text-lg font-semibold text-green-400">{formatCurrency(totalIncome)}</p>
                </div>
            </div>
        </div>
    );
}
