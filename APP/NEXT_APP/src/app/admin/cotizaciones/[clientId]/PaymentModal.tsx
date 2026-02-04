"use client";

import { useState, useEffect } from "react";
import { DollarSign, X, CreditCard, Banknote, Building2, Wallet, Bitcoin, HelpCircle, Calendar, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { useCallback } from "react";
import type { PaymentMethod } from "@prisma/client";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    quotationId: string;
    quotationFolio: string;
    total: number;
    totalPaid: number;
    onPaymentRegistered?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof DollarSign }[] = [
    { value: "TRANSFER", label: "Transferencia", icon: Building2 },
    { value: "CASH", label: "Efectivo", icon: Banknote },
    { value: "CREDIT_CARD", label: "Tarjeta de Crédito", icon: CreditCard },
    { value: "DEBIT_CARD", label: "Tarjeta de Débito", icon: Wallet },
    { value: "CHECK", label: "Cheque", icon: FileText },
    { value: "PAYPAL", label: "PayPal", icon: DollarSign },
    { value: "CRYPTO", label: "Crypto", icon: Bitcoin },
    { value: "OTHER", label: "Otro", icon: HelpCircle },
];

interface Payment {
    id: string;
    amount: number;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
    paidAt: string;
}

export default function PaymentModal({
    isOpen,
    onClose,
    quotationId,
    quotationFolio,
    total,
    totalPaid,
    onPaymentRegistered
}: PaymentModalProps) {
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const remaining = total - totalPaid;
    const percentagePaid = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 0;

    const loadPaymentHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch(`/api/quotations/payments?quotationId=${quotationId}`);
            const data = await response.json();
            if (data.success) {
                setPayments(data.payments || []);
            }
        } catch (error) {
            console.error("Error loading payments:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [quotationId]);

    useEffect(() => {
        if (isOpen) {
            loadPaymentHistory();
        }
    }, [isOpen, loadPaymentHistory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Ingresa un monto válido");
            return;
        }

        if (amountNum > remaining) {
            toast.error(`El monto excede el saldo pendiente ($${remaining.toLocaleString("es-CL")})`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/quotations/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quotationId,
                    amount: amountNum,
                    method,
                    reference: reference.trim() || null,
                    notes: notes.trim() || null,
                    paidAt: new Date(paidAt).toISOString(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al registrar pago");
            }

            toast.success(data.isFullyPaid
                ? "¡Pago completo registrado! Cotización completada."
                : "Pago registrado exitosamente"
            );

            // Reset form
            setAmount("");
            setReference("");
            setNotes("");

            // Reload history
            await loadPaymentHistory();

            // Notify parent
            onPaymentRegistered?.();

            if (data.isFullyPaid) {
                onClose();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al registrar pago");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getMethodIcon = (m: PaymentMethod) => {
        const found = PAYMENT_METHODS.find(pm => pm.value === m);
        return found?.icon || HelpCircle;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Registrar Pago</h2>
                            <p className="text-sm text-slate-400">{quotationFolio}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {/* Payment Summary */}
                    <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-slate-400">Total Cotización</span>
                            <span className="text-white font-bold text-lg">${total.toLocaleString("es-CL")}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-slate-400">Total Pagado</span>
                            <span className="text-emerald-400 font-bold">${totalPaid.toLocaleString("es-CL")}</span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400">Saldo Pendiente</span>
                            <span className={`font-bold ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                ${remaining.toLocaleString("es-CL")}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${percentagePaid}%` }}
                            />
                        </div>
                        <p className="text-center text-sm text-slate-400 mt-2">
                            {percentagePaid.toFixed(0)}% pagado
                        </p>
                    </div>

                    {remaining > 0 && (
                        <form onSubmit={handleSubmit} className="space-y-5 mb-6">
                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Monto del Pago
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={remaining.toString()}
                                        className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                        min="1"
                                        max={remaining}
                                        step="any"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setAmount(remaining.toString())}
                                        className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                    >
                                        Pagar todo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAmount((remaining / 2).toString())}
                                        className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                    >
                                        50%
                                    </button>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Método de Pago
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {PAYMENT_METHODS.map((pm) => {
                                        const PMIcon = pm.icon;
                                        return (
                                            <button
                                                key={pm.value}
                                                type="button"
                                                onClick={() => setMethod(pm.value)}
                                                className={`p-3 rounded-lg border text-center transition-colors ${method === pm.value
                                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                                                    }`}
                                            >
                                                <PMIcon className="w-5 h-5 mx-auto mb-1" />
                                                <span className="text-xs">{pm.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Date */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        Fecha de Pago
                                    </label>
                                    <input
                                        type="date"
                                        value={paidAt}
                                        onChange={(e) => setPaidAt(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                    />
                                </div>

                                {/* Reference */}
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        Referencia (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Nº de operación..."
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Notas (opcional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas adicionales..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Registrar Pago
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {remaining <= 0 && (
                        <div className="text-center py-8 mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">¡Cotización Pagada!</h3>
                            <p className="text-slate-400">Esta cotización ya ha sido pagada en su totalidad.</p>
                        </div>
                    )}

                    {/* Payment History */}
                    {payments.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-white mb-3">Historial de Pagos</h3>
                            <div className="space-y-2">
                                {payments.map((payment) => {
                                    const MethodIcon = getMethodIcon(payment.method);
                                    return (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-700 rounded-lg">
                                                    <MethodIcon className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">
                                                        ${payment.amount.toLocaleString("es-CL")}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {formatDate(payment.paidAt)}
                                                        {payment.reference && ` • ${payment.reference}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {isLoadingHistory && (
                        <div className="text-center py-4">
                            <span className="w-6 h-6 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin inline-block" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
