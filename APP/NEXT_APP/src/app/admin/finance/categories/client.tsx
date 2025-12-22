"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string | null;
    type: "INCOME" | "EXPENSE";
    userId: string | null; // null = global/system
    parentId: string | null;
}

// Preset icons for category selection
const PRESET_ICONS = [
    "🍔", "🚗", "🏠", "💊", "🎓", "👔", "🎮", "📱", "💳", "💰", 
    "🎁", "🛠️", "☕", "🛒", "✈️", "🎬", "📚", "💪", "🌿", "🐕",
    "👶", "💄", "🔧", "📦", "🎵", "🏥", "🎨", "🍕", "🚌", "💡"
];

const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
    "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b"
];

export default function CategoriesPageClient() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        icon: "💰",
        color: "#3b82f6",
        type: "EXPENSE" as "INCOME" | "EXPENSE",
    });
    const [saving, setSaving] = useState(false);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/finance/categories");
            if (!res.ok) throw new Error("Error al cargar categorías");
            const { data } = await res.json();
            setCategories(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const filteredCategories = categories.filter((c) => 
        filterType === "ALL" ? true : c.type === filterType
    );

    const systemCategories = filteredCategories.filter((c) => !c.userId);
    const customCategories = filteredCategories.filter((c) => c.userId);

    const handleOpenForm = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                icon: category.icon || "💰",
                color: category.color || "#3b82f6",
                type: category.type,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: "",
                icon: "💰",
                color: "#3b82f6",
                type: "EXPENSE",
            });
        }
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            const url = editingCategory 
                ? `/api/finance/categories/${editingCategory.id}`
                : "/api/finance/categories";
            
            const res = await fetch(url, {
                method: editingCategory ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al guardar");
            }

            await fetchCategories();
            handleCloseForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta categoría?")) return;

        try {
            const res = await fetch(`/api/finance/categories/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar");
            setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar");
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-neutral-400">Cargando categorías...</p>
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
                        📊 Categorías
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-neutral-400 text-sm mt-1"
                    >
                        Organiza tus transacciones por categorías
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
                    Nueva categoría
                </motion.button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-neutral-800 pb-1">
                {[
                    { key: "ALL", label: "Todas" },
                    { key: "EXPENSE", label: "Gastos" },
                    { key: "INCOME", label: "Ingresos" },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilterType(key as typeof filterType)}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                            filterType === key
                                ? "bg-blue-600 text-white"
                                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* System Categories */}
            {systemCategories.length > 0 && (
                <div>
                    <h2 className="text-sm font-medium text-neutral-500 mb-3">Categorías del sistema</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {systemCategories.map((cat) => (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                        style={{ backgroundColor: (cat.color || "#3b82f6") + "20" }}
                                    >
                                        {cat.icon || "💰"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{cat.name}</p>
                                        <p className={`text-xs ${cat.type === "INCOME" ? "text-emerald-400" : "text-red-400"}`}>
                                            {cat.type === "INCOME" ? "Ingreso" : "Gasto"}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Categories */}
            <div>
                <h2 className="text-sm font-medium text-neutral-500 mb-3">Mis categorías personalizadas</h2>
                {customCategories.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {customCategories.map((cat) => (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                        style={{ backgroundColor: (cat.color || "#3b82f6") + "20" }}
                                    >
                                        {cat.icon || "💰"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{cat.name}</p>
                                        <p className={`text-xs ${cat.type === "INCOME" ? "text-emerald-400" : "text-red-400"}`}>
                                            {cat.type === "INCOME" ? "Ingreso" : "Gasto"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenForm(cat)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Eliminar
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📂</span>
                        </div>
                        <p className="text-neutral-400 mb-2">No tienes categorías personalizadas</p>
                        <button
                            onClick={() => handleOpenForm()}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                            Crear primera categoría →
                        </button>
                    </div>
                )}
            </div>

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
                                    {editingCategory ? "Editar categoría" : "Nueva categoría"}
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
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Comida rápida"
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                                        Tipo
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: "EXPENSE", label: "Gasto", color: "red" },
                                            { value: "INCOME", label: "Ingreso", color: "emerald" },
                                        ].map(({ value, label, color }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: value as "INCOME" | "EXPENSE" })}
                                                className={`px-4 py-3 rounded-xl border transition-all ${
                                                    formData.type === value
                                                        ? `bg-${color}-500/20 border-${color}-500 text-${color}-400`
                                                        : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Icon */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                                        Ícono
                                    </label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-neutral-800/30 border border-neutral-700 rounded-xl max-h-32 overflow-y-auto">
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

                                {/* Preview */}
                                <div className="p-4 bg-neutral-800/30 border border-neutral-700 rounded-xl">
                                    <p className="text-xs text-neutral-500 mb-2">Vista previa</p>
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                            style={{ backgroundColor: formData.color + "20" }}
                                        >
                                            {formData.icon}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{formData.name || "Nombre"}</p>
                                            <p className={`text-xs ${formData.type === "INCOME" ? "text-emerald-400" : "text-red-400"}`}>
                                                {formData.type === "INCOME" ? "Ingreso" : "Gasto"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

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

