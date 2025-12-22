"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/currency";

interface GoalFormProps {
    goal?: {
        id: string;
        name: string;
        icon: string;
        color: string;
        targetAmount: number;
        currentAmount: number;
        deadline: string | null;
    };
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

const GOAL_ICONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "🎓", "💍", "🏝️", "🎸", "📚", "💪", "🎮", "👶", "🐕", "🚀"];
const GOAL_COLORS = [
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#6366F1",
];

export function GoalForm({ goal, onSubmit, onCancel }: GoalFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: goal?.name || "",
        icon: goal?.icon || "🎯",
        color: goal?.color || "#3B82F6",
        targetAmount: goal?.targetAmount?.toString() || "",
        currentAmount: goal?.currentAmount?.toString() || "0",
        deadline: goal?.deadline ? goal.deadline.split("T")[0] : "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
        if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
            newErrors.targetAmount = "El monto objetivo debe ser mayor a 0";
        }
        if (formData.currentAmount && parseFloat(formData.currentAmount) < 0) {
            newErrors.currentAmount = "El monto actual no puede ser negativo";
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
                icon: formData.icon,
                color: formData.color,
                targetAmount: parseFloat(formData.targetAmount),
                currentAmount: parseFloat(formData.currentAmount) || 0,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
            });
        } finally {
            setLoading(false);
        }
    };

    const targetNum = parseFloat(formData.targetAmount) || 0;
    const currentNum = parseFloat(formData.currentAmount) || 0;
    const percentage = targetNum > 0 ? Math.min(100, (currentNum / targetNum) * 100) : 0;
    const remaining = Math.max(0, targetNum - currentNum);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Icon & Color Picker */}
            <div className="flex gap-6">
                <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icono</label>
                    <div className="grid grid-cols-4 gap-2 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                        {GOAL_ICONS.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => setFormData({ ...formData, icon })}
                                className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg transition-all
                                          ${
                                              formData.icon === icon
                                                  ? "bg-white/10 ring-2 ring-blue-500"
                                                  : "hover:bg-white/5"
                                          }`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                    <div className="grid grid-cols-5 gap-2 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                        {GOAL_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setFormData({ ...formData, color })}
                                className={`w-10 h-10 rounded-lg transition-all ${
                                    formData.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de la meta *</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                             focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Ej: Vacaciones a Europa"
                />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Monto objetivo *</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.targetAmount}
                            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                            className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                                     focus:ring-2 focus:ring-blue-500/20 transition-all"
                            placeholder="0.00"
                        />
                    </div>
                    {errors.targetAmount && <p className="mt-1 text-sm text-red-400">{errors.targetAmount}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Monto ahorrado</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.currentAmount}
                            onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                            className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                                     focus:ring-2 focus:ring-blue-500/20 transition-all"
                            placeholder="0.00"
                        />
                    </div>
                    {errors.currentAmount && <p className="mt-1 text-sm text-red-400">{errors.currentAmount}</p>}
                </div>
            </div>

            {/* Deadline */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha límite (opcional)</label>
                <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl
                             text-white focus:outline-none focus:border-blue-500
                             focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                    Si defines una fecha, te mostraremos cuánto debes ahorrar diario/mensual
                </p>
            </div>

            {/* Preview */}
            {formData.targetAmount && (
                <div className="p-5 bg-gray-800/30 rounded-xl border border-gray-700/50">
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: `${formData.color}20` }}
                        >
                            {formData.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{formData.name || "Mi meta"}</h3>
                            <p className="text-sm text-gray-400">
                                {formatCurrency(currentNum)} de {formatCurrency(targetNum)}
                            </p>
                        </div>
                        <div className="ml-auto text-right">
                            <span className="text-2xl font-bold" style={{ color: formData.color }}>
                                {percentage.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: formData.color }}
                        />
                    </div>
                    {remaining > 0 && (
                        <p className="mt-3 text-sm text-gray-400">
                            Te faltan <span className="text-white font-medium">{formatCurrency(remaining)}</span> para alcanzar tu meta
                        </p>
                    )}
                </div>
            )}

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
                    className="flex-1 px-4 py-3 text-white rounded-xl transition-all font-medium 
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${formData.color}, ${formData.color}dd)` }}
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
                    ) : goal ? (
                        "Actualizar meta"
                    ) : (
                        "Crear meta"
                    )}
                </button>
            </div>
        </form>
    );
}
