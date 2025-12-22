"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

export interface Experience {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
}

interface ExperienceSectionProps {
    experiences: Experience[];
    onChange: (experiences: Experience[]) => void;
}

export function ExperienceSection({ experiences, onChange }: ExperienceSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [newAchievement, setNewAchievement] = useState<Record<string, string>>({});

    const addExperience = () => {
        const newExp: Experience = {
            id: uuidv4(),
            company: "",
            position: "",
            startDate: "",
            endDate: "",
            current: false,
            description: "",
            achievements: [],
        };
        onChange([...experiences, newExp]);
        setExpandedId(newExp.id);
    };

    const updateExperience = (id: string, updates: Partial<Experience>) => {
        onChange(experiences.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)));
    };

    const removeExperience = (id: string) => {
        onChange(experiences.filter((exp) => exp.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const addAchievement = (expId: string) => {
        const text = newAchievement[expId]?.trim();
        if (!text) return;
        const exp = experiences.find((e) => e.id === expId);
        if (exp) {
            updateExperience(expId, { achievements: [...exp.achievements, text] });
            setNewAchievement((prev) => ({ ...prev, [expId]: "" }));
        }
    };

    const removeAchievement = (expId: string, index: number) => {
        const exp = experiences.find((e) => e.id === expId);
        if (exp) {
            updateExperience(expId, {
                achievements: exp.achievements.filter((_, i) => i !== index),
            });
        }
    };

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Experiencia Laboral</h3>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addExperience}
                    className="px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm font-medium flex items-center gap-2 hover:bg-accent-1/30 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Experiencia
                </motion.button>
            </div>

            {experiences.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p>No hay experiencias agregadas</p>
                    <p className="text-sm mt-1">Haz clic en "Agregar Experiencia" o usa el chatbot para empezar</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {experiences.map((exp, index) => (
                            <motion.div
                                key={exp.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="border border-accent-1/20 rounded-xl bg-white/5 overflow-hidden"
                            >
                                {/* Header - always visible */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-accent-1/20 flex items-center justify-center text-accent-1 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {exp.position || "Nuevo cargo"}
                                            </p>
                                            <p className="text-sm text-neutral-400">
                                                {exp.company || "Empresa"} • {exp.current ? "Actual" : exp.endDate || "Presente"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeExperience(exp.id);
                                            }}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <svg
                                            className={`w-5 h-5 text-neutral-400 transition-transform ${expandedId === exp.id ? "rotate-180" : ""}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded content */}
                                <AnimatePresence>
                                    {expandedId === exp.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 space-y-4 border-t border-accent-1/10">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">Empresa</label>
                                                        <input
                                                            type="text"
                                                            value={exp.company}
                                                            onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                                                            placeholder="Nombre de la empresa"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">Cargo</label>
                                                        <input
                                                            type="text"
                                                            value={exp.position}
                                                            onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                                                            placeholder="Tu cargo"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">Fecha inicio</label>
                                                        <input
                                                            type="month"
                                                            value={exp.startDate}
                                                            onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">Fecha fin</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="month"
                                                                value={exp.endDate}
                                                                onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                                                                disabled={exp.current}
                                                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50 disabled:opacity-50"
                                                            />
                                                            <label className="flex items-center gap-2 text-sm text-neutral-400 whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={exp.current}
                                                                    onChange={(e) => updateExperience(exp.id, { current: e.target.checked, endDate: "" })}
                                                                    className="w-4 h-4 rounded accent-accent-1"
                                                                />
                                                                Actual
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-neutral-400 mb-2">Descripción</label>
                                                    <textarea
                                                        value={exp.description}
                                                        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                                                        placeholder="Describe tus responsabilidades principales..."
                                                        rows={3}
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50 resize-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-neutral-400 mb-2">Logros clave</label>
                                                    <div className="space-y-2">
                                                        {exp.achievements.map((ach, i) => (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <span className="text-accent-1">•</span>
                                                                <span className="flex-1 text-white text-sm">{ach}</span>
                                                                <button
                                                                    onClick={() => removeAchievement(exp.id, i)}
                                                                    className="p-1 text-red-400 hover:bg-red-400/20 rounded transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={newAchievement[exp.id] || ""}
                                                                onChange={(e) => setNewAchievement((prev) => ({ ...prev, [exp.id]: e.target.value }))}
                                                                onKeyDown={(e) => e.key === "Enter" && addAchievement(exp.id)}
                                                                placeholder="Agregar logro..."
                                                                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-accent-1/20 text-white text-sm focus:outline-none focus:border-accent-1/50"
                                                            />
                                                            <button
                                                                onClick={() => addAchievement(exp.id)}
                                                                className="px-3 py-2 rounded-lg bg-accent-1/20 text-accent-1 text-sm hover:bg-accent-1/30 transition-colors"
                                                            >
                                                                Agregar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
