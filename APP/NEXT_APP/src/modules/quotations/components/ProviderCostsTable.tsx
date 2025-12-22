"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProviderCostItem } from "@/app/admin/quotations/new/client";
import { v4 as uuidv4 } from "uuid";

interface ProviderCostsTableProps {
    items: ProviderCostItem[];
    onChange: (items: ProviderCostItem[]) => void;
}

const BADGE_OPTIONS = ["OFERTA", "DOMINIO GRATIS", "RECOMENDADO", ""];

export function ProviderCostsTable({ items, onChange }: ProviderCostsTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const addItem = () => {
        const newItem: ProviderCostItem = {
            id: uuidv4(),
            name: "",
            provider: "",
            providerDetail: "",
            costMin: 0,
            costMax: undefined,
            isHighlighted: false,
            badge: undefined,
        };
        onChange([...items, newItem]);
        setEditingId(newItem.id);
    };

    const updateItem = (id: string, updates: Partial<ProviderCostItem>) => {
        onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const removeItem = (id: string) => {
        onChange(items.filter((item) => item.id !== id));
    };

    const formatCost = (min: number, max?: number): string => {
        const formatNum = (n: number) => `$${n.toLocaleString("es-CL")}`;
        if (max && max !== min) {
            return `~${formatNum(min)} - ${formatNum(max)}`;
        }
        return formatNum(min);
    };

    const total = items.reduce((sum, item) => {
        const avg = item.costMax ? (item.costMin + item.costMax) / 2 : item.costMin;
        return sum + avg;
    }, 0);

    const totalMin = items.reduce((sum, item) => sum + item.costMin, 0);
    const totalMax = items.reduce((sum, item) => sum + (item.costMax || item.costMin), 0);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    a. Costos Directos (Pago a Proveedores)
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar ítem
                </button>
            </div>

            {/* Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    <div className="col-span-3">Ítem</div>
                    <div className="col-span-5">Detalle / Proveedor</div>
                    <div className="col-span-3 text-right">Costo Aprox.</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Table Body */}
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`grid grid-cols-12 gap-2 px-4 py-3 border-t border-white/5 items-center ${item.isHighlighted ? "bg-yellow-500/10" : ""
                                }`}
                        >
                            {editingId === item.id ? (
                                // Edit Mode
                                <>
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                            placeholder="Ej: Dominio .CL"
                                            className="w-full px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                        />
                                    </div>
                                    <div className="col-span-5 space-y-1">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={item.provider}
                                                onChange={(e) => updateItem(item.id, { provider: e.target.value })}
                                                placeholder="Proveedor"
                                                className="flex-1 px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white"
                                            />
                                            <select
                                                value={item.badge || ""}
                                                onChange={(e) => updateItem(item.id, { badge: e.target.value || undefined })}
                                                className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white"
                                            >
                                                {BADGE_OPTIONS.map((b) => (
                                                    <option key={b} value={b}>{b || "Sin badge"}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input
                                            type="text"
                                            value={item.providerDetail || ""}
                                            onChange={(e) => updateItem(item.id, { providerDetail: e.target.value })}
                                            placeholder="Detalle (Pago Anual)"
                                            className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-neutral-400"
                                        />
                                    </div>
                                    <div className="col-span-3 flex gap-1">
                                        <input
                                            type="number"
                                            value={item.costMin || ""}
                                            onChange={(e) => updateItem(item.id, { costMin: Number(e.target.value) })}
                                            placeholder="Min"
                                            className="w-1/2 px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white text-right"
                                        />
                                        <input
                                            type="number"
                                            value={item.costMax || ""}
                                            onChange={(e) => updateItem(item.id, { costMax: Number(e.target.value) || undefined })}
                                            placeholder="Max"
                                            className="w-1/2 px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white text-right"
                                        />
                                    </div>
                                    <div className="col-span-1 flex gap-1 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => updateItem(item.id, { isHighlighted: !item.isHighlighted })}
                                            className={`p-1 rounded ${item.isHighlighted ? "text-yellow-400" : "text-neutral-500"} hover:text-yellow-300`}
                                            title="Destacar"
                                        >
                                            ⭐
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            className="p-1 text-green-400 hover:text-green-300"
                                        >
                                            ✓
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // View Mode
                                <>
                                    <div className="col-span-3 text-sm text-white font-medium">
                                        {item.name || <span className="text-neutral-500 italic">Sin nombre</span>}
                                    </div>
                                    <div className="col-span-5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-purple-300">{item.provider}</span>
                                            {item.badge && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-300 rounded">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        {item.providerDetail && (
                                            <span className="text-xs text-neutral-500">{item.providerDetail}</span>
                                        )}
                                    </div>
                                    <div className="col-span-3 text-sm text-white text-right font-medium">
                                        {formatCost(item.costMin, item.costMax)}
                                    </div>
                                    <div className="col-span-1 flex gap-1 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(item.id)}
                                            className="p-1 text-neutral-500 hover:text-white"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="p-1 text-neutral-500 hover:text-red-400"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && (
                    <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                        No hay costos de proveedores. Haz clic en &quot;Agregar ítem&quot; para comenzar.
                    </div>
                )}

                {/* Total */}
                {items.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-t border-white/10">
                        <div className="col-span-8 text-sm font-medium text-neutral-300">
                            TOTAL APROX. PROVEEDORES
                        </div>
                        <div className="col-span-3 text-sm text-white text-right font-bold">
                            {totalMin === totalMax
                                ? `$${totalMin.toLocaleString("es-CL")} CLP`
                                : `~$${totalMin.toLocaleString("es-CL")} - $${totalMax.toLocaleString("es-CL")} CLP`
                            }
                        </div>
                        <div className="col-span-1"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
