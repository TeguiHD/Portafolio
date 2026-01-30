"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProfessionalFeeItem } from "../types";
import { v4 as uuidv4 } from "uuid";
import { RichTextEditor } from "./RichTextEditor";

interface ProfessionalFeesSectionProps {
    items: ProfessionalFeeItem[];
    onChange: (items: ProfessionalFeeItem[]) => void;
}

export function ProfessionalFeesSection({ items, onChange }: ProfessionalFeesSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const addItem = () => {
        const newItem: ProfessionalFeeItem = {
            id: uuidv4(),
            title: "",
            description: "",
            price: 0,
        };
        onChange([...items, newItem]);
        setExpandedId(newItem.id);
    };

    const updateItem = (id: string, updates: Partial<ProfessionalFeeItem>) => {
        onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const removeItem = (id: string) => {
        onChange(items.filter((item) => item.id !== id));
    };

    const total = items.reduce((sum, item) => sum + item.price, 0);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    b. Honorarios Profesionales
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar servicio
                </button>
            </div>

            {/* Services */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    <div className="col-span-8">Servicio Profesional</div>
                    <div className="col-span-3 text-right">Valor</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Services List */}
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={isMounted ? { opacity: 0, height: 0 } : false}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-white/5"
                        >
                            {/* Service Header */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                                <div className="col-span-8">
                                    <input
                                        type="text"
                                        value={item.title}
                                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                        placeholder="Título del servicio"
                                        className="w-full px-0 py-1 text-sm font-semibold bg-transparent border-none text-white placeholder-neutral-500 focus:outline-none focus:ring-0"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="text-neutral-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            value={item.price || ""}
                                            onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                                            placeholder="0"
                                            className="w-24 px-2 py-1 text-sm font-bold bg-white/5 border border-white/10 rounded text-white text-right"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1 flex gap-1 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                        className={`p-1 transition-colors ${expandedId === item.id ? "text-purple-400" : "text-neutral-500 hover:text-white"}`}
                                    >
                                        {expandedId === item.id ? "▲" : "▼"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        className="p-1 text-neutral-500 hover:text-red-400"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* Service Description (expanded) */}
                            <AnimatePresence>
                                {expandedId === item.id && (
                                    <motion.div
                                        initial={isMounted ? { opacity: 0, height: 0 } : false}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-4 pb-4"
                                    >
                                        <RichTextEditor
                                            content={item.description}
                                            onChange={(html) => updateItem(item.id, { description: html })}
                                            placeholder="• Punto 1 del servicio&#10;• Punto 2 del servicio"
                                            minHeight="100px"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && (
                    <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                        No hay servicios profesionales. Haz clic en &quot;Agregar servicio&quot; para comenzar.
                    </div>
                )}

                {/* Total */}
                {items.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                        <div className="col-span-8 text-sm font-bold">
                            TOTAL HONORARIOS
                        </div>
                        <div className="col-span-3 text-right font-bold text-lg">
                            ${total.toLocaleString("es-CL")} CLP
                        </div>
                        <div className="col-span-1"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
