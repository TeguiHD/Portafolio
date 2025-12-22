"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import type { OCRData } from "@/modules/finance/components/OCRResultDisplay";

interface BatchResult {
    data: OCRData;
    imageData: string;
}

interface BatchTransaction {
    id: string;
    ocrData: OCRData;
    imageData: string;
    status: "pending" | "saving" | "saved" | "error";
    error?: string;
    // Form data
    amount: number;
    description: string;
    merchant: string;
    categoryId: string;
    accountId: string;
    transactionDate: string;
    notes: string;
}

interface Account {
    id: string;
    name: string;
    currency: { code: string; symbol: string };
}

interface Category {
    id: string;
    name: string;
    icon: string | null;
    type: "INCOME" | "EXPENSE";
}

export default function BatchTransactionsPage() {
    const { baseCurrency, triggerRefresh } = useFinance();
    const [transactions, setTransactions] = useState<BatchTransaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [defaultAccountId, setDefaultAccountId] = useState<string>("");

    // Load batch results from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem("batchOCRResults");
        if (stored) {
            try {
                const results: BatchResult[] = JSON.parse(stored);
                const batchTransactions: BatchTransaction[] = results.map((result, index) => ({
                    id: `batch-${index}-${Date.now()}`,
                    ocrData: result.data,
                    imageData: result.imageData,
                    status: "pending" as const,
                    amount: result.data.financials?.total || result.data.amount?.value || 0,
                    description: result.data.merchant?.value?.name || "",
                    merchant: result.data.merchant?.value?.name || "",
                    categoryId: result.data.suggestedCategory?.categoryId || "",
                    accountId: "",
                    transactionDate: result.data.emissionDate?.value || result.data.date?.value || new Date().toISOString().split("T")[0],
                    notes: buildNotes(result.data),
                }));
                setTransactions(batchTransactions);
                if (batchTransactions.length > 0) {
                    setSelectedId(batchTransactions[0].id);
                }
                // Clear sessionStorage
                sessionStorage.removeItem("batchOCRResults");
            } catch (err) {
                console.error("Error loading batch results:", err);
            }
        }
    }, []);

    // Fetch accounts and categories
    useEffect(() => {
        async function fetchData() {
            try {
                const [accountsRes, categoriesRes] = await Promise.all([
                    fetch("/api/finance/accounts"),
                    fetch("/api/finance/categories"),
                ]);

                if (accountsRes.ok) {
                    const { data } = await accountsRes.json();
                    setAccounts(data || []);
                    if (data?.length > 0) {
                        setDefaultAccountId(data[0].id);
                        // Set default account for all transactions
                        setTransactions(prev => prev.map(t => ({
                            ...t,
                            accountId: t.accountId || data[0].id,
                        })));
                    }
                }

                if (categoriesRes.ok) {
                    const { data } = await categoriesRes.json();
                    setCategories(data || []);
                }
            } catch (err) {
                console.error("Error fetching form data:", err);
            }
        }
        fetchData();
    }, []);

    // Build notes from OCR data
    function buildNotes(ocrData: OCRData): string {
        const parts: string[] = [];
        
        if (ocrData.documentType && ocrData.documentType !== "unknown") {
            const typeLabels: Record<string, string> = {
                boleta: "Boleta Electrónica",
                factura: "Factura Electrónica",
                ticket: "Ticket",
            };
            parts.push(`📄 ${typeLabels[ocrData.documentType] || ocrData.documentType}`);
        }
        
        if (ocrData.documentNumber?.value) {
            parts.push(`Folio: ${ocrData.documentNumber.value}`);
        }
        
        if (ocrData.merchant?.value?.rut) {
            parts.push(`RUT: ${ocrData.merchant.value.rut}`);
        }

        if (ocrData.merchant?.value?.location) {
            const loc = ocrData.merchant.value.location;
            const locationParts = [loc.city, loc.commune].filter(Boolean);
            if (locationParts.length > 0) {
                parts.push(`📍 ${locationParts.join(", ")}`);
            }
        }

        return parts.join(" | ");
    }

    // Update a transaction
    const updateTransaction = useCallback((id: string, updates: Partial<BatchTransaction>) => {
        setTransactions(prev => prev.map(t => 
            t.id === id ? { ...t, ...updates } : t
        ));
    }, []);

    // Remove a transaction
    const removeTransaction = useCallback((id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        if (selectedId === id) {
            setSelectedId(transactions.find(t => t.id !== id)?.id || null);
        }
    }, [selectedId, transactions]);

    // Save a single transaction
    const saveTransaction = useCallback(async (transaction: BatchTransaction) => {
        updateTransaction(transaction.id, { status: "saving" });

        try {
            const response = await fetch("/api/finance/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "EXPENSE",
                    amount: transaction.amount,
                    description: transaction.description,
                    merchant: transaction.merchant,
                    categoryId: transaction.categoryId || undefined,
                    accountId: transaction.accountId,
                    transactionDate: transaction.transactionDate,
                    notes: transaction.notes,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al guardar");
            }

            updateTransaction(transaction.id, { status: "saved" });
            return true;
        } catch (err) {
            updateTransaction(transaction.id, { 
                status: "error", 
                error: err instanceof Error ? err.message : "Error desconocido" 
            });
            return false;
        }
    }, [updateTransaction]);

    // Save all pending transactions
    const saveAll = useCallback(async () => {
        setIsSaving(true);
        
        const pendingTransactions = transactions.filter(t => t.status === "pending");
        
        for (const transaction of pendingTransactions) {
            await saveTransaction(transaction);
        }

        setIsSaving(false);
        triggerRefresh();
    }, [transactions, saveTransaction, triggerRefresh]);

    // Get selected transaction
    const selectedTransaction = transactions.find(t => t.id === selectedId);

    // Get expense categories
    const expenseCategories = categories.filter(c => c.type === "EXPENSE");

    // Stats
    const stats = {
        total: transactions.length,
        pending: transactions.filter(t => t.status === "pending").length,
        saved: transactions.filter(t => t.status === "saved").length,
        errors: transactions.filter(t => t.status === "error").length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    };

    if (transactions.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Sin transacciones</h2>
                <p className="text-neutral-400 mb-6">No hay boletas escaneadas para procesar</p>
                <a
                    href="/admin/finance"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    Volver a Finanzas
                </a>
            </div>
        );
    }

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-2">
                    <a
                        href="/admin/finance"
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </a>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Registrar Transacciones</h1>
                        <p className="text-neutral-400 text-sm">
                            {stats.total} boleta{stats.total !== 1 ? "s" : ""} escaneada{stats.total !== 1 ? "s" : ""} • 
                            Total: ${stats.totalAmount.toLocaleString("es-CL")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left - Transaction list */}
                <div className="lg:col-span-1 space-y-3">
                    {/* Quick actions */}
                    <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-neutral-400">Cuenta por defecto</span>
                        </div>
                        <select
                            value={defaultAccountId}
                            onChange={(e) => {
                                setDefaultAccountId(e.target.value);
                                setTransactions(prev => prev.map(t => ({
                                    ...t,
                                    accountId: t.accountId || e.target.value,
                                })));
                            }}
                            className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1"
                        >
                            <option value="">Seleccionar</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.currency.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transaction cards */}
                    {transactions.map((transaction) => (
                        <motion.div
                            key={transaction.id}
                            layout
                            onClick={() => setSelectedId(transaction.id)}
                            className={`relative bg-neutral-900/50 rounded-xl border p-4 cursor-pointer transition-all ${
                                selectedId === transaction.id
                                    ? "border-purple-500 ring-2 ring-purple-500/20"
                                    : "border-neutral-800 hover:border-neutral-700"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                                    <img
                                        src={transaction.imageData}
                                        alt="Receipt"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium text-white truncate">
                                            {transaction.merchant || "Sin comercio"}
                                        </p>
                                        {transaction.status === "saved" && (
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                                ✓ Guardado
                                            </span>
                                        )}
                                        {transaction.status === "error" && (
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                                Error
                                            </span>
                                        )}
                                        {transaction.status === "saving" && (
                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1">
                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Guardando
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-lg font-bold text-white">
                                        ${transaction.amount.toLocaleString("es-CL")}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {transaction.transactionDate}
                                    </p>
                                </div>
                            </div>

                            {/* Remove button */}
                            {transaction.status !== "saved" && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTransaction(transaction.id);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Right - Edit form */}
                <div className="lg:col-span-2">
                    {selectedTransaction ? (
                        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                            {/* Image preview header */}
                            <div className="h-48 bg-neutral-950 relative">
                                <img
                                    src={selectedTransaction.imageData}
                                    alt="Receipt"
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-4">
                                {selectedTransaction.status === "error" && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                        {selectedTransaction.error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Amount */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                                            Monto
                                        </label>
                                        <input
                                            type="number"
                                            value={selectedTransaction.amount}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                amount: parseFloat(e.target.value) || 0
                                            })}
                                            disabled={selectedTransaction.status === "saved"}
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white disabled:opacity-50"
                                        />
                                    </div>

                                    {/* Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                                            Fecha
                                        </label>
                                        <input
                                            type="date"
                                            value={selectedTransaction.transactionDate}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                transactionDate: e.target.value
                                            })}
                                            disabled={selectedTransaction.status === "saved"}
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Merchant */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Comercio
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedTransaction.merchant}
                                        onChange={(e) => updateTransaction(selectedTransaction.id, {
                                            merchant: e.target.value,
                                            description: e.target.value,
                                        })}
                                        disabled={selectedTransaction.status === "saved"}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white disabled:opacity-50"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Account */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                                            Cuenta
                                        </label>
                                        <select
                                            value={selectedTransaction.accountId}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                accountId: e.target.value
                                            })}
                                            disabled={selectedTransaction.status === "saved"}
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white disabled:opacity-50"
                                        >
                                            <option value="">Seleccionar</option>
                                            {accounts.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.name} ({account.currency.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                                            Categoría
                                        </label>
                                        <select
                                            value={selectedTransaction.categoryId}
                                            onChange={(e) => updateTransaction(selectedTransaction.id, {
                                                categoryId: e.target.value
                                            })}
                                            disabled={selectedTransaction.status === "saved"}
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white disabled:opacity-50"
                                        >
                                            <option value="">Sin categoría</option>
                                            {expenseCategories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.icon} {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Notas
                                    </label>
                                    <textarea
                                        value={selectedTransaction.notes}
                                        onChange={(e) => updateTransaction(selectedTransaction.id, {
                                            notes: e.target.value
                                        })}
                                        disabled={selectedTransaction.status === "saved"}
                                        rows={2}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white disabled:opacity-50 resize-none"
                                    />
                                </div>

                                {/* Individual save button */}
                                {selectedTransaction.status !== "saved" && (
                                    <button
                                        onClick={() => saveTransaction(selectedTransaction)}
                                        disabled={selectedTransaction.status === "saving" || !selectedTransaction.accountId}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
                                    >
                                        {selectedTransaction.status === "saving" ? "Guardando..." : "Guardar esta transacción"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-neutral-500">
                            Selecciona una boleta para editar
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-neutral-950/90 backdrop-blur-sm border-t border-neutral-800 p-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="text-sm text-neutral-400">
                        {stats.saved} de {stats.total} guardadas • 
                        Total: <span className="text-white font-medium">${stats.totalAmount.toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href="/admin/finance"
                            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                        >
                            {stats.saved === stats.total ? "Finalizar" : "Cancelar"}
                        </a>
                        {stats.pending > 0 && (
                            <button
                                onClick={saveAll}
                                disabled={isSaving}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Guardar todo ({stats.pending})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
