"use client";

import { useState, useEffect } from "react";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

interface Payment {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
    paidAt: string;
    registeredBy: string;
}

interface PaymentManagerProps {
    quotationId: string;
    total: number;
    totalPaid: number;
    currency?: string;
    readOnly?: boolean;
    onPaymentRegistered?: () => void;
}

export function PaymentManager({
    quotationId,
    total,
    totalPaid,
    currency = "CLP",
    readOnly = false,
    onPaymentRegistered,
}: PaymentManagerProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("TRANSFER");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");

    const remaining = Math.max(0, total - totalPaid);
    const progress = total > 0 ? (totalPaid / total) * 100 : 0;

    useEffect(() => {
        fetchPayments();
    }, [quotationId]);

    const fetchPayments = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/quotations/payments?quotationId=${quotationId}`);
            const data = await res.json();
            if (data.success) {
                setPayments(data.payments);
            }
        } catch (error) {
            console.error("Error fetching payments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;

        try {
            setIsSubmitting(true);
            const res = await fetch("/api/quotations/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quotationId,
                    amount: parseFloat(amount),
                    method,
                    reference,
                    notes,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Success
            setIsModalOpen(false);
            setAmount("");
            setReference("");
            setNotes("");
            fetchPayments();
            if (onPaymentRegistered) onPaymentRegistered();

        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al registrar pago");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Gestión de Pagos
                </h3>
                {!readOnly && remaining > 0 && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        + Registrar Abono
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                    <span>Progreso de Pago</span>
                    <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full ${progress >= 100 ? "bg-green-500" : "bg-gradient-to-r from-blue-600 to-purple-600"
                            }`}
                    />
                </div>
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-400">Pagado: {formatCurrency(totalPaid, currency as SupportedCurrency)}</span>
                    <span className="text-red-400">Pendiente: {formatCurrency(remaining, currency as SupportedCurrency)}</span>
                </div>
            </div>

            {/* History Table */}
            <div className="overflow-hidden rounded-lg border border-white/5">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Método</th>
                            <th className="p-3">Referencia</th>
                            <th className="p-3 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500">
                                    No hay pagos registrados
                                </td>
                            </tr>
                        ) : (
                            payments.map((p) => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">{new Date(p.paidAt).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                                            {p.method}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-400">{p.reference || "-"}</td>
                                    <td className="p-3 text-right font-medium text-green-400">
                                        {formatCurrency(p.amount, currency as SupportedCurrency)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="bg-[#111] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
                                <h3 className="text-lg font-bold text-white mb-4">Registrar Nuevo Pago</h3>

                                <form onSubmit={handleRegisterPayment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Monto del Abono</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max={remaining}
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Máximo permitido: {formatCurrency(remaining, currency as SupportedCurrency)}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Método de Pago</label>
                                        <select
                                            value={method}
                                            onChange={(e) => setMethod(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none"
                                        >
                                            <option value="TRANSFER">Transferencia</option>
                                            <option value="CASH">Efectivo</option>
                                            <option value="CREDIT_CARD">Tarjeta de Crédito</option>
                                            <option value="DEBIT_CARD">Tarjeta de Débito</option>
                                            <option value="CHECK">Cheque</option>
                                            <option value="PAYPAL">PayPal</option>
                                            <option value="CRYPTO">Crypto</option>
                                            <option value="OTHER">Otro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Referencia (Opcional)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: ID Transferencia 12345"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Notas (Opcional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-400 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Registrando..." : "Confirmar Pago"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
