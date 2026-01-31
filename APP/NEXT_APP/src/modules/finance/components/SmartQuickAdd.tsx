"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/components/ui/Toast";

interface FrequentTransaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    accountId: string;
    accountName: string;
    frequency: number;
    lastUsed: string;
}

interface SmartQuickAddProps {
    onQuickAdd: (transaction: {
        description: string;
        amount: number;
        type: "income" | "expense";
        categoryId: string;
        accountId: string;
    }) => void;
    onCreateTransaction?: (transaction: FrequentTransaction) => Promise<void>;
}

const QUICK_ICONS: Record<string, string> = {
    transporte: "🚌",
    alimentación: "🍔",
    café: "☕",
    supermercado: "🛒",
    gasolina: "⛽",
    netflix: "🎬",
    spotify: "🎵",
    uber: "🚗",
    gym: "💪",
    farmacia: "💊",
    default: "💳",
};

function getIcon(description: string, categoryName: string): string {
    const searchTerm = `${description} ${categoryName}`.toLowerCase();

    for (const [key, icon] of Object.entries(QUICK_ICONS)) {
        if (searchTerm.includes(key)) return icon;
    }

    return categoryName?.charAt(0)?.toUpperCase() || QUICK_ICONS.default;
}

export function SmartQuickAdd({ onQuickAdd, onCreateTransaction }: SmartQuickAddProps) {
    const [frequentTransactions, setFrequentTransactions] = useState<FrequentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const { success, error } = useToast();

    // Fetch frequent transactions
    useEffect(() => {
        const fetchFrequent = async () => {
            try {
                const res = await fetch("/api/finance/transactions/frequent");
                if (res.ok) {
                    const data = await res.json();
                    setFrequentTransactions(data.data || []);
                }
            } catch (e) {
                console.error("Error fetching frequent transactions:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchFrequent();
    }, []);

    // Handle quick add click
    const handleQuickAdd = useCallback(
        async (transaction: FrequentTransaction) => {
            if (onCreateTransaction) {
                setProcessing(transaction.id);
                try {
                    await onCreateTransaction(transaction);
                    success(
                        "¡Agregado!",
                        `${transaction.description} - ${formatCurrency(transaction.amount)}`
                    );
                } catch {
                    error(
                        "Error",
                        "No se pudo agregar la transacción"
                    );
                } finally {
                    setProcessing(null);
                }
            } else {
                onQuickAdd({
                    description: transaction.description,
                    amount: transaction.amount,
                    type: transaction.type,
                    categoryId: transaction.categoryId,
                    accountId: transaction.accountId,
                });
            }
        },
        [onQuickAdd, onCreateTransaction, success, error]
    );

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-shrink-0 w-28 h-20 bg-gray-800 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (frequentTransactions.length === 0) {
        return null; // Don't show if no frequent transactions
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                    Acceso Rápido
                </h3>
                <span className="text-xs text-gray-500">
                    Basado en tu historial
                </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {frequentTransactions.slice(0, 6).map((transaction) => (
                    <button
                        key={transaction.id}
                        onClick={() => handleQuickAdd(transaction)}
                        disabled={processing === transaction.id}
                        className={`
                            flex-shrink-0 p-3 rounded-xl text-left transition-all
                            ${transaction.type === "expense"
                                ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
                                : "bg-green-500/10 hover:bg-green-500/20 border border-green-500/20"
                            }
                            ${processing === transaction.id ? "opacity-50 cursor-wait" : ""}
                            hover:scale-105 active:scale-95
                        `}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                                {getIcon(transaction.description, transaction.categoryName)}
                            </span>
                            {processing === transaction.id && (
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                        </div>
                        <p className="text-white text-sm font-medium truncate max-w-[100px]">
                            {transaction.description}
                        </p>
                        <p className={`text-xs ${transaction.type === "expense" ? "text-red-400" : "text-green-400"}`}>
                            {transaction.type === "expense" ? "-" : "+"}
                            {formatCurrency(transaction.amount)}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Compact version for inline use
export function QuickAddButton({
    description,
    amount,
    type,
    onClick,
}: {
    description: string;
    amount: number;
    type: "income" | "expense";
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                ${type === "expense"
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                }
                transition-colors
            `}
        >
            <span>{description}</span>
            <span className="font-medium">{formatCurrency(amount)}</span>
        </button>
    );
}
