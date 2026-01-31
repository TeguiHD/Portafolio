"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TransactionList, TransactionForm, type TransactionListItem } from "@/modules/finance";
import { useFinance } from "@/modules/finance/context/FinanceContext";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";

// Note: Extended transaction type handled in TransactionList via props

// Form data type matching TransactionForm's Partial<TransactionFormData> & { id?: string }
interface TransactionFormData {
    id?: string;
    type?: "INCOME" | "EXPENSE";
    amount?: string;         // String as expected by TransactionForm
    displayAmount?: string;  // For display formatting
    description?: string;
    merchant?: string;
    notes?: string;
    categoryId?: string;
    accountId?: string;
    currencyId?: string;
    transactionDate?: string;
}

export default function TransactionsPageClient() {
    const { triggerRefresh } = useFinance();
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | undefined>(undefined);

    const handleSuccess = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
        triggerRefresh();
    };

    const handleEdit = (transaction: TransactionListItem) => {
        // Map transaction to form data format
        const transactionType = transaction.type === "TRANSFER" ? "EXPENSE" : transaction.type;
        const amountStr = String(Number(transaction.amount));

        setEditingTransaction({
            id: transaction.id,
            type: transactionType,
            amount: amountStr,
            displayAmount: amountStr,
            description: transaction.description || "",
            merchant: transaction.merchant || "",
            notes: "",
            categoryId: transaction.category?.id || "",
            accountId: transaction.account.id,
            currencyId: transaction.currency.code,
            transactionDate: new Date(transaction.transactionDate).toISOString().split("T")[0],
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
    };

    return (
        <div className="space-y-6">
            <FinanceBreadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white"
                    >
                        📝 Transacciones
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-neutral-400 text-sm mt-1"
                    >
                        Gestiona tus ingresos, gastos y transferencias
                    </motion.p>
                </div>

                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => {
                        setEditingTransaction(undefined);
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent-1 hover:bg-accent-1/90 text-white rounded-xl transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva transacción
                </motion.button>
            </div>

            {/* Transaction List */}
            <TransactionList
                onEdit={handleEdit}
                onDelete={() => triggerRefresh()}
            />

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={handleCancel}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">
                                    {editingTransaction ? "Editar transacción" : "Nueva transacción"}
                                </h2>
                                <button
                                    onClick={handleCancel}
                                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <TransactionForm
                                initialData={editingTransaction}
                                onSuccess={handleSuccess}
                                onCancel={handleCancel}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

