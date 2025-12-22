"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check, CreditCard, Wallet, PiggyBank, Building2, TrendingUp, MoreHorizontal } from "lucide-react";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "@/modules/finance/context/FinanceContext";

interface Account {
    id: string;
    name: string;
    type: "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "OTHER";
    icon: string | null;
    color: string | null;
    isDefault: boolean;
    isActive: boolean;
    initialBalance: number;
    currentBalance: number;
    sortOrder: number;
    currency: {
        id: string;
        code: string;
        symbol: string;
        name: string;
    };
}

const ACCOUNT_TYPES = [
    { value: "CASH", label: "Efectivo", icon: Wallet, color: "#22c55e" },
    { value: "CHECKING", label: "Cuenta corriente", icon: Building2, color: "#3b82f6" },
    { value: "SAVINGS", label: "Ahorro", icon: PiggyBank, color: "#8b5cf6" },
    { value: "CREDIT_CARD", label: "Tarjeta crédito", icon: CreditCard, color: "#ef4444" },
    { value: "INVESTMENT", label: "Inversión", icon: TrendingUp, color: "#f59e0b" },
    { value: "OTHER", label: "Otra", icon: MoreHorizontal, color: "#64748b" },
];

const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981",
    "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
    "#a855f7", "#d946ef", "#ec4899", "#64748b"
];

const PRESET_ICONS = ["💵", "💳", "🏦", "💰", "🐷", "📈", "💎", "🏧", "💴", "💶"];

export default function AccountsPageClient() {
    const { baseCurrency, triggerRefresh } = useFinance();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        type: "CHECKING" as Account["type"],
        icon: "🏦",
        color: "#3b82f6",
        initialBalance: 0,
        isDefault: false,
    });
    const [saving, setSaving] = useState(false);

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/finance/accounts");
            if (!res.ok) throw new Error("Error al cargar cuentas");
            const { data } = await res.json();
            setAccounts(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    // Calculate totals
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const handleOpenForm = (account?: Account) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                name: account.name,
                type: account.type,
                icon: account.icon || "🏦",
                color: account.color || "#3b82f6",
                initialBalance: account.initialBalance,
                isDefault: account.isDefault,
            });
        } else {
            setEditingAccount(null);
            setFormData({
                name: "",
                type: "CHECKING",
                icon: "🏦",
                color: "#3b82f6",
                initialBalance: 0,
                isDefault: false,
            });
        }
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingAccount(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            const url = editingAccount 
                ? `/api/finance/accounts/${editingAccount.id}`
                : "/api/finance/accounts";
            
            const res = await fetch(url, {
                method: editingAccount ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    currency: baseCurrency,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al guardar");
            }

            await fetchAccounts();
            triggerRefresh();
            handleCloseForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta cuenta? Las transacciones asociadas se mantendrán pero quedarán sin cuenta.")) return;

        try {
            const res = await fetch(`/api/finance/accounts/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar");
            setAccounts((prev) => prev.filter((a) => a.id !== id));
            triggerRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar");
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch(`/api/finance/accounts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });
            if (!res.ok) throw new Error("Error al actualizar");
            await fetchAccounts();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al actualizar");
        }
    };

    const getAccountTypeInfo = (type: Account["type"]) => {
        return ACCOUNT_TYPES.find((t) => t.value === type) || ACCOUNT_TYPES[5];
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-neutral-400">Cargando cuentas...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                        🏦 Cuentas
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-neutral-400 text-sm mt-1"
                    >
                        Gestiona tus cuentas y tarjetas
                    </motion.p>
                </div>

                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => handleOpenForm()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nueva cuenta
                </motion.button>
            </div>

            {/* Total Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6"
            >
                <p className="text-neutral-400 text-sm mb-1">Balance total</p>
                <p className={`text-3xl font-bold ${totalBalance >= 0 ? "text-white" : "text-red-400"}`}>
                    {formatCurrency(totalBalance, baseCurrency)}
                </p>
                <p className="text-neutral-500 text-sm mt-2">
                    {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""} activa{accounts.length !== 1 ? "s" : ""}
                </p>
            </motion.div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Accounts List */}
            {accounts.length > 0 ? (
                <div className="grid gap-4">
                    {accounts.map((account, index) => {
                        const typeInfo = getAccountTypeInfo(account.type);
                        const IconComponent = typeInfo.icon;

                        return (
                            <motion.div
                                key={account.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ backgroundColor: (account.color || typeInfo.color) + "20" }}
                                    >
                                        {account.icon || <IconComponent className="w-6 h-6" style={{ color: account.color || typeInfo.color }} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-medium truncate">{account.name}</p>
                                            {account.isDefault && (
                                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                                                    Principal
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-500">{typeInfo.label}</p>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-bold ${account.currentBalance >= 0 ? "text-white" : "text-red-400"}`}>
                                            {formatCurrency(account.currentBalance)}
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            {account.currency.code}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!account.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(account.id)}
                                                title="Establecer como principal"
                                                className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleOpenForm(account)}
                                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(account.id)}
                                            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🏦</span>
                    </div>
                    <p className="text-neutral-400 mb-2">No tienes cuentas configuradas</p>
                    <button
                        onClick={() => handleOpenForm()}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                        Crear primera cuenta →
                    </button>
                </div>
            )}

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={handleCloseForm}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">
                                    {editingAccount ? "Editar cuenta" : "Nueva cuenta"}
                                </h2>
                                <button
                                    onClick={handleCloseForm}
                                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                                        Nombre de la cuenta
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Cuenta corriente BCI"
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                                        Tipo de cuenta
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ACCOUNT_TYPES.map(({ value, label, icon: Icon, color }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: value as Account["type"], color })}
                                                className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
                                                    formData.type === value
                                                        ? "border-blue-500 bg-blue-500/10 text-white"
                                                        : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                                }`}
                                            >
                                                <Icon className="w-5 h-5" style={{ color }} />
                                                <span className="text-sm">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Initial Balance (only for new accounts) */}
                                {!editingAccount && (
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">
                                            Saldo inicial
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.initialBalance}
                                            onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
                                            placeholder="0"
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                                        />
                                        <p className="text-xs text-neutral-500 mt-1">
                                            El saldo actual de la cuenta en {baseCurrency}
                                        </p>
                                    </div>
                                )}

                                {/* Icon */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                                        Ícono
                                    </label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-neutral-800/30 border border-neutral-700 rounded-xl">
                                        {PRESET_ICONS.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icon })}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                                                    formData.icon === icon
                                                        ? "bg-blue-600 ring-2 ring-blue-400"
                                                        : "bg-neutral-800 hover:bg-neutral-700"
                                                }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-neutral-800/30 border border-neutral-700 rounded-xl">
                                        {PRESET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`w-8 h-8 rounded-lg transition-all ${
                                                    formData.color === color
                                                        ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900"
                                                        : ""
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Default */}
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-neutral-300">Establecer como cuenta principal</span>
                                </label>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || !formData.name.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                Guardar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

