"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, type SupportedCurrency } from "@/lib/currency";
import { useFinance } from "../context/FinanceContext";
import type { TransactionType } from "../types";

export interface TransactionListItem {
    id: string;
    type: TransactionType;
    amount: number;
    description: string | null;
    merchant: string | null;
    transactionDate: string;
    category: { id: string; name: string; icon: string | null } | null;
    account: { id: string; name: string; currency: { code: string; symbol: string } };
    currency: { code: string; symbol: string };
}

interface TransactionListProps {
    onEdit?: (transaction: TransactionListItem) => void;
    onDelete?: (id: string) => void;
}

interface Filters {
    type: TransactionType | "";
    categoryId: string;
    accountId: string;
    startDate: string;
    endDate: string;
    search: string;
}

export function TransactionList({ onEdit, onDelete }: TransactionListProps) {
    const { baseCurrency: _baseCurrency, refreshKey } = useFinance();  // baseCurrency reserved for future formatting
    const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filters, setFilters] = useState<Filters>({
        type: "",
        categoryId: "",
        accountId: "",
        startDate: "",
        endDate: "",
        search: "",
    });
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);
    const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchTransactions = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "15" });

            if (filters.type) params.set("type", filters.type);
            if (filters.categoryId) params.set("categoryId", filters.categoryId);
            if (filters.accountId) params.set("accountId", filters.accountId);
            if (filters.startDate) params.set("startDate", filters.startDate);
            if (filters.endDate) params.set("endDate", filters.endDate);
            if (filters.search) params.set("search", filters.search);

            const response = await fetch(`/api/finance/transactions?${params}`);
            if (response.ok) {
                const { data, pagination: pag } = await response.json();
                setTransactions(data);
                setPagination(pag);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch filter options
    useEffect(() => {
        async function fetchOptions() {
            try {
                const [catRes, accRes] = await Promise.all([
                    fetch("/api/finance/categories"),
                    fetch("/api/finance/accounts"),
                ]);
                if (catRes.ok) {
                    const { data } = await catRes.json();
                    setCategories(data || []);
                }
                if (accRes.ok) {
                    const { data } = await accRes.json();
                    setAccounts(data || []);
                }
            } catch (error) {
                console.error("Error fetching filter options:", error);
            }
        }
        fetchOptions();
    }, []);

    // Fetch transactions when filters or page changes
    useEffect(() => {
        fetchTransactions(pagination.page);
        // pagination.page is passed as parameter, fetchTransactions already handles it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTransactions, refreshKey]);

    const handleFilterChange = (name: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            type: "",
            categoryId: "",
            accountId: "",
            startDate: "",
            endDate: "",
            search: "",
        });
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/finance/transactions/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                setTransactions(prev => prev.filter(t => t.id !== id));
                setPagination(prev => ({ ...prev, total: prev.total - 1 }));
                onDelete?.(id);
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
        }
        setDeleteConfirm(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoy";
        if (diffDays === 1) return "Ayer";

        return date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
    };

    const typeConfig = {
        EXPENSE: { color: "text-red-400", bg: "bg-red-500/10", label: "Gasto", sign: "-" },
        INCOME: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Ingreso", sign: "+" },
        TRANSFER: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Transferencia", sign: "" },
    };

    const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;

    return (
        <div className="space-y-4">
            {/* Search and Filters Header */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        placeholder="Buscar transacciones..."
                        className="w-full pl-12 pr-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1 transition-colors"
                    />
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${showFilters || activeFiltersCount > 0
                        ? "bg-accent-1/10 border-accent-1/30 text-accent-1"
                        : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Filtros</span>
                    {activeFiltersCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-accent-1 text-white text-xs flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange("type", e.target.value)}
                                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1"
                            >
                                <option value="">Todos los tipos</option>
                                <option value="EXPENSE">Gastos</option>
                                <option value="INCOME">Ingresos</option>
                                <option value="TRANSFER">Transferencias</option>
                            </select>

                            <select
                                value={filters.categoryId}
                                onChange={(e) => handleFilterChange("categoryId", e.target.value)}
                                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1"
                            >
                                <option value="">Todas las categorías</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                ))}
                            </select>

                            <select
                                value={filters.accountId}
                                onChange={(e) => handleFilterChange("accountId", e.target.value)}
                                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1"
                            >
                                <option value="">Todas las cuentas</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                placeholder="Desde"
                                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1"
                            />

                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                placeholder="Hasta"
                                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1"
                            />

                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={clearFilters}
                                    className="col-span-full sm:col-span-1 px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results count */}
            <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>{pagination.total} transacciones encontradas</span>
            </div>

            {/* Transaction List */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-neutral-900/50 rounded-xl">
                            <div className="w-10 h-10 bg-neutral-800 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-neutral-800 rounded" />
                                <div className="h-3 w-24 bg-neutral-800 rounded" />
                            </div>
                            <div className="h-5 w-20 bg-neutral-800 rounded" />
                        </div>
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-12 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">No hay transacciones</h3>
                    <p className="text-neutral-500">Registra tu primera transacción para comenzar</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {transactions.map((transaction, index) => {
                        const config = typeConfig[transaction.type];
                        return (
                            <motion.div
                                key={transaction.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="group flex items-center gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors"
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${config.bg}`}>
                                    {transaction.category?.icon || (transaction.type === "INCOME" ? "💰" : transaction.type === "EXPENSE" ? "💸" : "🔄")}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white truncate">
                                            {transaction.description || transaction.merchant || transaction.category?.name || "Sin descripción"}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                                        <span>{transaction.account.name}</span>
                                        <span>•</span>
                                        <span>{formatDate(transaction.transactionDate)}</span>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="text-right">
                                    <span className={`font-semibold ${config.color}`}>
                                        {config.sign}{formatCurrency(transaction.amount, transaction.currency.code as SupportedCurrency)}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(transaction)}
                                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDeleteConfirm(transaction.id)}
                                        className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                        onClick={() => fetchTransactions(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <span className="px-4 py-2 text-neutral-400">
                        Página {pagination.page} de {pagination.totalPages}
                    </span>

                    <button
                        onClick={() => fetchTransactions(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm mx-4"
                        >
                            <h3 className="text-lg font-semibold text-white mb-2">¿Eliminar transacción?</h3>
                            <p className="text-neutral-400 text-sm mb-6">
                                Esta acción revertirá los cambios en el balance de tu cuenta.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
