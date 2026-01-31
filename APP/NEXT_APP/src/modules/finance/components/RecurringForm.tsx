"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
    id: string;
    name: string;
    icon: string | null;
}

interface Account {
    id: string;
    name: string;
    icon: string | null;
}

interface RecurringPaymentData {
    id?: string;
    name: string;
    amount: number;
    type: string;
    categoryId: string | null;
    accountId: string | null;
    frequency: string;
    startDate: string;
    endDate: string | null;
    dayOfMonth: number | null;
    description: string | null;
    autoCreate: boolean;
    notifyBefore?: number;
    notifyDaysBefore?: number | null;
    isActive?: boolean;
}

interface RecurringFormProps {
    payment?: RecurringPaymentData;
    initialData?: RecurringPaymentData;
    onSubmit?: (data: Omit<RecurringPaymentData, "id"> & { id?: string }) => Promise<void>;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const FREQUENCIES = [
    { value: "DAILY", label: "Diario" },
    { value: "WEEKLY", label: "Semanal" },
    { value: "BIWEEKLY", label: "Quincenal" },
    { value: "MONTHLY", label: "Mensual" },
    { value: "QUARTERLY", label: "Trimestral" },
    { value: "YEARLY", label: "Anual" },
];

export function RecurringForm({ payment, initialData, onSubmit, onSuccess, onCancel }: RecurringFormProps) {
    const data = payment || initialData;
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const notifyValue = data?.notifyBefore ?? data?.notifyDaysBefore ?? 3;
    const [formData, setFormData] = useState({
        name: data?.name || "",
        amount: data?.amount?.toString() || "",
        type: data?.type || "EXPENSE",
        categoryId: data?.categoryId || "",
        accountId: data?.accountId || "",
        frequency: data?.frequency || "MONTHLY",
        startDate: data?.startDate ? data.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
        endDate: data?.endDate ? data.endDate.split("T")[0] : "",
        dayOfMonth: data?.dayOfMonth?.toString() || "",
        description: data?.description || "",
        autoCreate: data?.autoCreate ?? true,
        notifyBefore: notifyValue,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
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
            console.error("Error fetching data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredCategories = categories.filter((c) => {
        const categoryWithType = c as Category & { type?: string };
        if (formData.type === "INCOME") return categoryWithType.type === "INCOME" || categoryWithType.type === "BOTH";
        return categoryWithType.type === "EXPENSE" || categoryWithType.type === "BOTH";
    });

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = "El monto debe ser mayor a 0";
        }
        if (!formData.startDate) newErrors.startDate = "La fecha de inicio es requerida";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const submitData = {
                id: data?.id,
                name: formData.name.trim(),
                amount: parseFloat(formData.amount),
                type: formData.type,
                categoryId: formData.categoryId || null,
                accountId: formData.accountId || null,
                frequency: formData.frequency,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
                dayOfMonth: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : null,
                description: formData.description || null,
                autoCreate: formData.autoCreate,
                notifyBefore: formData.notifyBefore,
            };

            if (onSubmit) {
                await onSubmit(submitData);
            } else {
                // Default API call
                const url = data?.id
                    ? `/api/finance/recurring/${data.id}`
                    : "/api/finance/recurring";
                const method = data?.id ? "PUT" : "POST";

                const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(submitData),
                });

                if (!res.ok) {
                    throw new Error("Error al guardar");
                }
            }

            onSuccess?.();
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Toggle */}
            <div className="flex bg-gray-800/50 rounded-xl p-1">
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "EXPENSE", categoryId: "" })}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${formData.type === "EXPENSE"
                        ? "bg-red-500/20 text-red-400"
                        : "text-gray-400 hover:text-white"
                        }`}
                >
                    💸 Gasto
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "INCOME", categoryId: "" })}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${formData.type === "INCOME"
                        ? "bg-green-500/20 text-green-400"
                        : "text-gray-400 hover:text-white"
                        }`}
                >
                    💰 Ingreso
                </button>
            </div>

            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre *
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="Ej: Netflix, Arriendo, Sueldo"
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            {/* Amount and Frequency */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Monto *
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            placeholder="0.00"
                        />
                    </div>
                    {errors.amount && <p className="mt-1 text-sm text-red-400">{errors.amount}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Frecuencia
                    </label>
                    <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white focus:outline-none focus:border-blue-500"
                    >
                        {FREQUENCIES.map((f) => (
                            <option key={f.value} value={f.value}>
                                {f.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Day of Month (for monthly) */}
            {formData.frequency === "MONTHLY" && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Día del mes (opcional)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        placeholder="1-31"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Si no especificas, usará la fecha de inicio como referencia
                    </p>
                </div>
            )}

            {/* Category and Account */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Categoría
                    </label>
                    <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Sin categoría</option>
                        {filteredCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cuenta
                    </label>
                    <select
                        value={formData.accountId}
                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Sin cuenta asignada</option>
                        {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.icon} {acc.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Fecha de inicio *
                    </label>
                    <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white focus:outline-none focus:border-blue-500"
                    />
                    {errors.startDate && <p className="mt-1 text-sm text-red-400">{errors.startDate}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Fecha de fin (opcional)
                    </label>
                    <input
                        type="date"
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.autoCreate}
                        onChange={(e) => setFormData({ ...formData, autoCreate: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500"
                    />
                    <span className="text-gray-300">Crear transacción automáticamente en la fecha</span>
                </label>

                <div className="flex items-center gap-3">
                    <span className="text-gray-300">Notificar</span>
                    <select
                        value={formData.notifyBefore}
                        onChange={(e) => setFormData({ ...formData, notifyBefore: parseInt(e.target.value) })}
                        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    >
                        <option value={0}>El mismo día</option>
                        <option value={1}>1 día antes</option>
                        <option value={3}>3 días antes</option>
                        <option value={7}>1 semana antes</option>
                    </select>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas (opcional)
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Notas adicionales..."
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium disabled:opacity-50
                              ${formData.type === "EXPENSE"
                            ? "bg-gradient-to-r from-red-600 to-red-500 text-white"
                            : "bg-gradient-to-r from-green-600 to-green-500 text-white"
                        }`}
                >
                    {loading ? "Guardando..." : payment ? "Actualizar" : "Crear pago recurrente"}
                </button>
            </div>
        </form>
    );
}
