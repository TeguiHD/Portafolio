"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

export interface Education {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
}

interface EducationSectionProps {
    education: Education[];
    onChange: (education: Education[]) => void;
}

export function EducationSection({ education, onChange }: EducationSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const addEducation = () => {
        const newEdu: Education = {
            id: uuidv4(),
            institution: "",
            degree: "",
            field: "",
            startDate: "",
            endDate: "",
        };
        onChange([...education, newEdu]);
        setExpandedId(newEdu.id);
    };

    const updateEducation = (id: string, updates: Partial<Education>) => {
        onChange(education.map((edu) => (edu.id === id ? { ...edu, ...updates } : edu)));
    };

    const removeEducation = (id: string) => {
        onChange(education.filter((edu) => edu.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Educación</h3>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addEducation}
                    className="px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm font-medium flex items-center gap-2 hover:bg-accent-1/30 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Educación
                </motion.button>
            </div>

            {education.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                    <p>No hay educación agregada</p>
                    <p className="text-sm mt-1">Haz clic en "Agregar Educación" para empezar</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {education.map((edu, index) => (
                            <motion.div
                                key={edu.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="border border-accent-1/20 rounded-xl bg-white/5 overflow-hidden"
                            >
                                {/* Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {edu.degree || "Nuevo título"}
                                            </p>
                                            <p className="text-sm text-neutral-400">
                                                {edu.institution || "Institución"} • {edu.field || "Campo de estudio"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeEducation(edu.id);
                                            }}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <svg
                                            className={`w-5 h-5 text-neutral-400 transition-transform ${expandedId === edu.id ? "rotate-180" : ""}`}
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
                                    {expandedId === edu.id && (
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
                                                        <label className="block text-sm text-neutral-400 mb-2">Institución</label>
                                                        <input
                                                            type="text"
                                                            value={edu.institution}
                                                            onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                                                            placeholder="Universidad o instituto"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">Título</label>
                                                        <input
                                                            type="text"
                                                            value={edu.degree}
                                                            onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                                                            placeholder="Ej: Ingeniería Civil Informática"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">Campo de estudio</label>
                                                        <input
                                                            type="text"
                                                            value={edu.field}
                                                            onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                                                            placeholder="Ej: Ciencias de la Computación"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm text-neutral-400 mb-2">Fecha inicio</label>
                                                            <input
                                                                type="month"
                                                                value={edu.startDate}
                                                                onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm text-neutral-400 mb-2">Fecha fin</label>
                                                            <input
                                                                type="month"
                                                                value={edu.endDate}
                                                                onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                            />
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
