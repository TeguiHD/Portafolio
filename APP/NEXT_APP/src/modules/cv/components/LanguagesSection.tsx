"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import type { Language } from "../utils/latex-templates-enhanced";

interface LanguagesSectionProps {
    languages: Language[];
    onChange: (languages: Language[]) => void;
}

const LANGUAGE_LEVELS = [
    { value: "native", label: "Nativo", labelEn: "Native", color: "text-emerald-400 bg-emerald-500/20" },
    { value: "fluent", label: "Fluido", labelEn: "Fluent", color: "text-blue-400 bg-blue-500/20" },
    { value: "advanced", label: "Avanzado", labelEn: "Advanced", color: "text-purple-400 bg-purple-500/20" },
    { value: "intermediate", label: "Intermedio", labelEn: "Intermediate", color: "text-amber-400 bg-amber-500/20" },
    { value: "basic", label: "Básico", labelEn: "Basic", color: "text-neutral-400 bg-neutral-500/20" },
] as const;

const COMMON_LANGUAGES = [
    { name: "Español", flag: "🇪🇸" },
    { name: "Inglés", flag: "🇺🇸" },
    { name: "Portugués", flag: "🇧🇷" },
    { name: "Francés", flag: "🇫🇷" },
    { name: "Alemán", flag: "🇩🇪" },
    { name: "Italiano", flag: "🇮🇹" },
    { name: "Chino Mandarín", flag: "🇨🇳" },
    { name: "Japonés", flag: "🇯🇵" },
];

export function LanguagesSection({ languages, onChange }: LanguagesSectionProps) {
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    const addLanguage = (name: string = "", level: Language["level"] = "intermediate") => {
        const newLang: Language = {
            id: uuidv4(),
            name,
            level,
            certification: "",
        };
        onChange([...languages, newLang]);
    };

    const updateLanguage = (id: string, updates: Partial<Language>) => {
        onChange(languages.map((lang) => (lang.id === id ? { ...lang, ...updates } : lang)));
    };

    const removeLanguage = (id: string) => {
        onChange(languages.filter((lang) => lang.id !== id));
    };

    const getLevelInfo = (level: Language["level"]) => {
        return LANGUAGE_LEVELS.find((l) => l.value === level) || LANGUAGE_LEVELS[3];
    };

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-white">Idiomas</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Idiomas que dominas y tu nivel de competencia
                    </p>
                </div>
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                            showQuickAdd
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-white/10 text-neutral-400 hover:text-white"
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Agregar Rápido
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addLanguage()}
                        className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-medium flex items-center gap-2 hover:bg-blue-500/30 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar Idioma
                    </motion.button>
                </div>
            </div>

            {/* Quick Add Panel */}
            <AnimatePresence>
                {showQuickAdd && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-sm text-blue-400 mb-3">Idiomas comunes:</p>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_LANGUAGES.map((lang) => {
                                    const isAdded = languages.some((l) => l.name === lang.name);
                                    return (
                                        <button
                                            key={lang.name}
                                            onClick={() => !isAdded && addLanguage(lang.name)}
                                            disabled={isAdded}
                                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all ${
                                                isAdded
                                                    ? "bg-white/5 text-neutral-500 cursor-not-allowed"
                                                    : "bg-white/10 text-white hover:bg-white/20"
                                            }`}
                                        >
                                            <span>{lang.flag}</span>
                                            {lang.name}
                                            {isAdded && (
                                                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {languages.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <p>No hay idiomas agregados</p>
                    <p className="text-sm mt-1">Agrega los idiomas que dominas</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {languages.map((lang) => {
                            const levelInfo = getLevelInfo(lang.level);
                            return (
                                <motion.div
                                    key={lang.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="p-4 border border-blue-500/20 rounded-xl bg-white/5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        {/* Language Name */}
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={lang.name || ""}
                                                onChange={(e) => updateLanguage(lang.id, { name: e.target.value })}
                                                placeholder="Nombre del idioma"
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                                            />
                                        </div>

                                        {/* Level Selector */}
                                        <div className="flex flex-wrap gap-2">
                                            {LANGUAGE_LEVELS.map((level) => (
                                                <button
                                                    key={level.value}
                                                    onClick={() => updateLanguage(lang.id, { level: level.value })}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        lang.level === level.value
                                                            ? level.color
                                                            : "bg-white/5 text-neutral-400 hover:text-white"
                                                    }`}
                                                >
                                                    {level.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => removeLanguage(lang.id)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Certification (optional) */}
                                    <div className="mt-3">
                                        <input
                                            type="text"
                                            value={lang.certification || ""}
                                            onChange={(e) => updateLanguage(lang.id, { certification: e.target.value })}
                                            placeholder="Certificación (ej: TOEFL 110, DELE C1) - opcional"
                                            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Summary Preview */}
            {languages.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-sm text-neutral-400 mb-2">Vista previa:</p>
                    <p className="text-white">
                        {languages.map((lang, idx) => {
                            const levelInfo = getLevelInfo(lang.level);
                            return (
                                <span key={lang.id}>
                                    <span className="font-medium">{lang.name || "Idioma"}</span>
                                    <span className="text-neutral-400"> ({levelInfo.label})</span>
                                    {lang.certification && (
                                        <span className="text-neutral-500 text-sm"> - {lang.certification}</span>
                                    )}
                                    {idx < languages.length - 1 && <span className="mx-2 text-neutral-600">•</span>}
                                </span>
                            );
                        })}
                    </p>
                </div>
            )}
        </div>
    );
}
