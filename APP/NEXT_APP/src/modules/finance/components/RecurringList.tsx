"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

interface RecurringPayment {
    id: string;
    name: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: string;
    nextDueDate: string | null;
    daysUntilDue: number | null;
    status: "upcoming" | "due_soon" | "overdue" | "inactive";
    isActive: boolean;
    autoCreate: boolean;
    category?: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    } | null;
    account?: {
        id: string;
        name: string;
        icon: string | null;
    } | null;
}

interface RecurringListProps {
    payments: RecurringPayment[];
    onMarkPaid?: (id: string) => Promise<void>;
    onSkip?: (id: string) => Promise<void>;
    onToggleActive?: (id: string, isActive: boolean) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

const FREQUENCY_LABELS: Record<string, string> = {
    DAILY: "Diario",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    YEARLY: "Anual",
};

const STATUS_CONFIG = {
    upcoming: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", label: "Próximo" },
    due_soon: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", label: "Pronto" },
    overdue: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", label: "Vencido" },
    inactive: { bg: "bg-gray-500/10", border: "border-gray-500/30", text: "text-gray-400", label: "Pausado" },
};

export function RecurringList({ payments, onMarkPaid, onSkip, onToggleActive, onDelete }: RecurringListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<string | null>(null);

    const handleAction = async (id: string, action: "mark_paid" | "skip" | "toggle" | "delete", isActive?: boolean) => {
        setProcessingId(id);
        setActionType(action);
        try {
            if (action === "mark_paid" && onMarkPaid) await onMarkPaid(id);
            else if (action === "skip" && onSkip) await onSkip(id);
            else if (action === "toggle" && onToggleActive) await onToggleActive(id, !isActive);
            else if (action === "delete" && onDelete) {
                if (confirm("¿Eliminar este pago recurrente?")) await onDelete(id);
            }
        } finally {
            setProcessingId(null);
            setActionType(null);
        }
    };

    if (payments.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Sin pagos recurrentes</h3>
                <p className="text-gray-400 mb-6">Configura tus gastos e ingresos fijos para mejor control</p>
                <Link
                    href="/admin/finance/recurring/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500
                             text-white rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear pago recurrente
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {payments.map((payment) => {
                const config = STATUS_CONFIG[payment.status];
                const isProcessing = processingId === payment.id;

                return (
                    <div
                        key={payment.id}
                        className={`group relative bg-gray-900/50 rounded-2xl border overflow-hidden
                                  transition-all duration-300 hover:border-gray-700/50
                                  ${config.border} ${!payment.isActive ? "opacity-60" : ""}`}
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Icon & Info */}
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl
                                                  ${payment.type === "INCOME" ? "bg-green-500/20" : "bg-red-500/20"}`}
                                    >
                                        {payment.category?.icon || (payment.type === "INCOME" ? "💰" : "💸")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-white truncate">{payment.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                                            <span>{FREQUENCY_LABELS[payment.frequency]}</span>
                                            {payment.category && (
                                                <>
                                                    <span>•</span>
                                                    <span>{payment.category.name}</span>
                                                </>
                                            )}
                                            {payment.account && (
                                                <>
                                                    <span>•</span>
                                                    <span>{payment.account.icon} {payment.account.name}</span>
                                                </>
                                            )}
                                        </div>
                                        {payment.nextDueDate && payment.isActive && (
                                            <p className={`text-sm mt-1 ${config.text}`}>
                                                {payment.daysUntilDue === 0
                                                    ? "Vence hoy"
                                                    : payment.daysUntilDue! < 0
                                                    ? `Vencido hace ${Math.abs(payment.daysUntilDue!)} días`
                                                    : `En ${payment.daysUntilDue} días (${new Date(payment.nextDueDate).toLocaleDateString("es-CL")})`}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Amount & Actions */}
                                <div className="text-right">
                                    <p className={`text-xl font-bold ${payment.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                                        {payment.type === "INCOME" ? "+" : "-"}
                                        {formatCurrency(payment.amount)}
                                    </p>

                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {payment.isActive && payment.status !== "inactive" && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(payment.id, "mark_paid")}
                                                    disabled={isProcessing}
                                                    className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30
                                                             disabled:opacity-50 transition-colors"
                                                    title="Marcar como pagado"
                                                >
                                                    {isProcessing && actionType === "mark_paid" ? (
                                                        <LoadingSpinner />
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleAction(payment.id, "skip")}
                                                    disabled={isProcessing}
                                                    className="p-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600
                                                             disabled:opacity-50 transition-colors"
                                                    title="Saltar este período"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleAction(payment.id, "toggle", payment.isActive)}
                                            disabled={isProcessing}
                                            className={`p-2 rounded-lg transition-colors disabled:opacity-50
                                                      ${payment.isActive
                                                          ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                      }`}
                                            title={payment.isActive ? "Pausar" : "Activar"}
                                        >
                                            {payment.isActive ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                        </button>
                                        <Link
                                            href={`/admin/finance/recurring/${payment.id}/edit`}
                                            className="p-2 bg-gray-700 text-gray-400 rounded-lg hover:text-white transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={() => handleAction(payment.id, "delete")}
                                            disabled={isProcessing}
                                            className="p-2 bg-gray-700 text-gray-400 rounded-lg hover:text-red-400
                                                     disabled:opacity-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function LoadingSpinner() {
    return (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}
