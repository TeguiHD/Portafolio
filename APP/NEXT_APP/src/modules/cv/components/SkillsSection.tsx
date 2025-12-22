"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SkillCategory {
    category: string;
    items: string[];
}

interface SkillsSectionProps {
    skills: SkillCategory[];
    onChange: (skills: SkillCategory[]) => void;
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
    const [newSkill, setNewSkill] = useState<Record<number, string>>({});
    const [newCategory, setNewCategory] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const addCategory = () => {
        if (!newCategory.trim()) return;
        onChange([...skills, { category: newCategory.trim(), items: [] }]);
        setNewCategory("");
        setIsAddingCategory(false);
    };

    const updateCategoryName = (index: number, name: string) => {
        const newSkills = [...skills];
        newSkills[index] = { ...newSkills[index], category: name };
        onChange(newSkills);
    };

    const removeCategory = (index: number) => {
        onChange(skills.filter((_, i) => i !== index));
    };

    const addSkill = (categoryIndex: number) => {
        const text = newSkill[categoryIndex]?.trim();
        if (!text) return;
        const newSkills = [...skills];
        newSkills[categoryIndex] = {
            ...newSkills[categoryIndex],
            items: [...newSkills[categoryIndex].items, text],
        };
        onChange(newSkills);
        setNewSkill((prev) => ({ ...prev, [categoryIndex]: "" }));
    };

    const removeSkill = (categoryIndex: number, skillIndex: number) => {
        const newSkills = [...skills];
        newSkills[categoryIndex] = {
            ...newSkills[categoryIndex],
            items: newSkills[categoryIndex].items.filter((_, i) => i !== skillIndex),
        };
        onChange(newSkills);
    };

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Habilidades</h3>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAddingCategory(true)}
                    className="px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm font-medium flex items-center gap-2 hover:bg-accent-1/30 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Categoría
                </motion.button>
            </div>

            {/* New category input */}
            <AnimatePresence>
                {isAddingCategory && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <div className="flex gap-2 p-4 bg-white/5 border border-accent-1/20 rounded-xl">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                                placeholder="Nombre de la categoría..."
                                autoFocus
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                            />
                            <button
                                onClick={addCategory}
                                className="px-4 py-2 rounded-xl bg-accent-1 text-black font-medium hover:bg-accent-1/90 transition-colors"
                            >
                                Crear
                            </button>
                            <button
                                onClick={() => {
                                    setIsAddingCategory(false);
                                    setNewCategory("");
                                }}
                                className="px-4 py-2 rounded-xl bg-white/10 text-neutral-400 font-medium hover:bg-white/20 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {skills.length === 0 && !isAddingCategory ? (
                <div className="text-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p>No hay categorías de habilidades</p>
                    <p className="text-sm mt-1">Crea categorías como "Frontend", "Backend", "DevOps", etc.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {skills.map((skill, categoryIndex) => (
                            <motion.div
                                key={categoryIndex}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="border border-accent-1/20 rounded-xl bg-white/5 p-4"
                            >
                                {/* Category header */}
                                <div className="flex items-center justify-between mb-4">
                                    <input
                                        type="text"
                                        value={skill.category}
                                        onChange={(e) => updateCategoryName(categoryIndex, e.target.value)}
                                        className="px-3 py-1.5 rounded-lg bg-transparent border border-transparent hover:border-accent-1/20 focus:border-accent-1/50 text-white font-medium focus:outline-none transition-colors"
                                    />
                                    <button
                                        onClick={() => removeCategory(categoryIndex)}
                                        className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Skills */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {skill.items.map((item, skillIndex) => (
                                        <motion.span
                                            key={skillIndex}
                                            layout
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="px-3 py-1.5 rounded-full bg-accent-1/10 border border-accent-1/30 text-accent-1 text-sm flex items-center gap-2 group"
                                        >
                                            {item}
                                            <button
                                                onClick={() => removeSkill(categoryIndex, skillIndex)}
                                                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </motion.span>
                                    ))}
                                </div>

                                {/* Add skill input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSkill[categoryIndex] || ""}
                                        onChange={(e) => setNewSkill((prev) => ({ ...prev, [categoryIndex]: e.target.value }))}
                                        onKeyDown={(e) => e.key === "Enter" && addSkill(categoryIndex)}
                                        placeholder="Agregar habilidad..."
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-accent-1/20 text-white text-sm focus:outline-none focus:border-accent-1/50"
                                    />
                                    <button
                                        onClick={() => addSkill(categoryIndex)}
                                        className="px-3 py-2 rounded-lg bg-accent-1/20 text-accent-1 text-sm hover:bg-accent-1/30 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
