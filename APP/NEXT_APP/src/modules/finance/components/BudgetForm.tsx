"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";

interface Category {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
}

interface BudgetFormProps {
    budget?: {
        id: string;
        name: string;
        categoryId: string | null;
        amount: number;
        period: string;
        alertAt75: boolean;
        alertAt90: boolean;
        alertAt100: boolean;
    };
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

const PERIODS = [
    { value: "WEEKLY", label: "Semanal" },
    { value: "MONTHLY", label: "Mensual" },
    { value: "QUARTERLY", label: "Trimestral" },
    { value: "YEARLY", label: "Anual" },
];

export function BudgetForm({ budget, onSubmit, onCancel }: BudgetFormProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        name: budget?.name || "",
        categoryId: budget?.categoryId || "",
        amount: budget?.amount?.toString() || "",
        period: budget?.period || "MONTHLY",
        alertAt75: budget?.alertAt75 ?? true,
        alertAt90: budget?.alertAt90 ?? true,
        alertAt100: budget?.alertAt100 ?? true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch("/api/finance/categories?type=EXPENSE");
            if (res.ok) {
                const { data } = await res.json();
                setCategories(data || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = "El monto debe ser mayor a 0";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                categoryId: formData.categoryId || null,
                amount: parseFloat(formData.amount),
                period: formData.period,
                alertAt75: formData.alertAt75,
                alertAt90: formData.alertAt90,
                alertAt100: formData.alertAt100,
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = categories.find((c) => c.id === formData.categoryId);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre del presupuesto *
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                             focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Ej: Comida del mes"
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Categoría (opcional)
                </label>
                <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                             text-white focus:outline-none focus:border-blue-500
                             focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                    <option value="">Todas las categorías de gasto</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                        </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                    Si no seleccionas categoría, el presupuesto aplica a todos los gastos
                </p>
            </div>

            {/* Amount and Period */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Monto límite *
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
                                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                                     focus:ring-2 focus:ring-blue-500/20 transition-all"
                            placeholder="0.00"
                        />
                    </div>
                    {errors.amount && <p className="mt-1 text-sm text-red-400">{errors.amount}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Período
                    </label>
                    <select
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                 text-white focus:outline-none focus:border-blue-500
                                 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                        {PERIODS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Preview */}
            {formData.amount && (
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <p className="text-sm text-gray-400">Vista previa:</p>
                    <p className="text-white font-medium mt-1">
                        {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : "Todos los gastos"}
                        {" — "}
                        <span className="text-blue-400">
                            {formatCurrency(parseFloat(formData.amount) || 0)}
                        </span>
                        {" "}
                        <span className="text-gray-500">
                            {PERIODS.find((p) => p.value === formData.period)?.label.toLowerCase()}
                        </span>
                    </p>
                </div>
            )}

            {/* Alerts */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Alertas de presupuesto
                </label>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={formData.alertAt75}
                            onChange={(e) => setFormData({ ...formData, alertAt75: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-yellow-500
                                     focus:ring-yellow-500/20 focus:ring-2"
                        />
                        <span className="text-gray-300 group-hover:text-white transition-colors">
                            Alertar al 75% del presupuesto
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                            Advertencia
                        </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={formData.alertAt90}
                            onChange={(e) => setFormData({ ...formData, alertAt90: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-orange-500
                                     focus:ring-orange-500/20 focus:ring-2"
                        />
                        <span className="text-gray-300 group-hover:text-white transition-colors">
                            Alertar al 90% del presupuesto
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                            Peligro
                        </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={formData.alertAt100}
                            onChange={(e) => setFormData({ ...formData, alertAt100: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-red-500
                                     focus:ring-red-500/20 focus:ring-2"
                        />
                        <span className="text-gray-300 group-hover:text-white transition-colors">
                            Alertar al superar el presupuesto
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                            Excedido
                        </span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl
                             hover:bg-gray-700 transition-all font-medium"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 
                             text-white rounded-xl hover:from-blue-500 hover:to-blue-400
                             transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Guardando...
                        </span>
                    ) : budget ? (
                        "Actualizar"
                    ) : (
                        "Crear presupuesto"
                    )}
                </button>
            </div>
        </form>
    );
}
