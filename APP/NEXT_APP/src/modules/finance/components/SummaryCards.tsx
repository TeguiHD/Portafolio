"use client";

import { formatCurrency } from "@/lib/currency";

interface SummaryCardsProps {
    income: number;
    expenses: number;
    balance: number;
    incomeChange: number;
    expenseChange: number;
    transactionCount: number;
}

export function SummaryCards({
    income,
    expenses,
    balance,
    incomeChange,
    expenseChange,
    transactionCount,
}: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Income Card */}
            <div className="p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-2xl border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-400">Ingresos</span>
                    <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                    </span>
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(income)}</p>
                <div className="flex items-center gap-1 mt-1">
                    {incomeChange !== 0 && (
                        <>
                            <span className={incomeChange > 0 ? "text-green-400" : "text-red-400"}>
                                {incomeChange > 0 ? "↑" : "↓"} {Math.abs(incomeChange)}%
                            </span>
                            <span className="text-xs text-gray-500">vs mes anterior</span>
                        </>
                    )}
                </div>
            </div>

            {/* Expenses Card */}
            <div className="p-5 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-2xl border border-red-500/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-red-400">Gastos</span>
                    <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                    </span>
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(expenses)}</p>
                <div className="flex items-center gap-1 mt-1">
                    {expenseChange !== 0 && (
                        <>
                            <span className={expenseChange < 0 ? "text-green-400" : "text-red-400"}>
                                {expenseChange > 0 ? "↑" : "↓"} {Math.abs(expenseChange)}%
                            </span>
                            <span className="text-xs text-gray-500">vs mes anterior</span>
                        </>
                    )}
                </div>
            </div>

            {/* Balance Card */}
            <div
                className={`p-5 rounded-2xl border ${
                    balance >= 0
                        ? "bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20"
                        : "bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20"
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className={balance >= 0 ? "text-sm text-blue-400" : "text-sm text-orange-400"}>Balance</span>
                    <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            balance >= 0 ? "bg-blue-500/20" : "bg-orange-500/20"
                        }`}
                    >
                        <svg
                            className={`w-4 h-4 ${balance >= 0 ? "text-blue-400" : "text-orange-400"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                            />
                        </svg>
                    </span>
                </div>
                <p className="text-2xl font-bold text-white">
                    {balance < 0 ? "-" : ""}
                    {formatCurrency(Math.abs(balance))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {balance >= 0 ? "Ahorraste este mes" : "Gastaste más de lo que ingresó"}
                </p>
            </div>

            {/* Transactions Count */}
            <div className="p-5 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-2xl border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-400">Transacciones</span>
                    <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                    </span>
                </div>
                <p className="text-2xl font-bold text-white">{transactionCount}</p>
                <p className="text-xs text-gray-500 mt-1">movimientos registrados</p>
            </div>
        </div>
    );
}
