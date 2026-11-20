"use client";

import { useId, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Check, Plus, Trash2, Zap } from "lucide-react";
import { BOTON, BOTON_SEC, CAMPO, ETIQUETA, FOCO, INTERRUPTOR } from "./estilos";
import { SeccionEditor, Vacio } from "./piezas";
import type { Language } from "../utils/latex-templates-enhanced";

interface LanguagesSectionProps {
    languages: Language[];
    onChange: (languages: Language[]) => void;
}

const LANGUAGE_LEVELS = [
    { value: "native", label: "Nativo", labelEn: "Native" },
    { value: "fluent", label: "Fluido", labelEn: "Fluent" },
    { value: "advanced", label: "Avanzado", labelEn: "Advanced" },
    { value: "intermediate", label: "Intermedio", labelEn: "Intermediate" },
    { value: "basic", label: "Básico", labelEn: "Basic" },
] as const;

const COMMON_LANGUAGES = [
    { name: "Español" },
    { name: "Inglés" },
    { name: "Portugués" },
    { name: "Francés" },
    { name: "Alemán" },
    { name: "Italiano" },
    { name: "Chino Mandarín" },
    { name: "Japonés" },
];

export function LanguagesSection({ languages, onChange }: LanguagesSectionProps) {
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const base = useId();

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
        <SeccionEditor
            titulo="Idiomas"
            descripcion="Los idiomas que manejas y tu nivel."
            acciones={
                <>
                    <button
                        type="button"
                        aria-expanded={showQuickAdd}
                        aria-controls={`${base}-rapido`}
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className={BOTON_SEC}
                    >
                        <Zap className="size-4" aria-hidden="true" />
                        Agregar rápido
                    </button>
                    <button type="button" onClick={() => addLanguage()} className={BOTON}>
                        <Plus className="size-4" aria-hidden="true" />
                        Agregar idioma
                    </button>
                </>
            }
        >
            <div id={`${base}-rapido`} hidden={!showQuickAdd} className="rounded-xl border border-[var(--linea)] bg-[var(--sup)] p-4">
                <p className="mb-3 text-sm text-[var(--mut)]">Idiomas comunes</p>
                <ul className="flex flex-wrap gap-2">
                    {COMMON_LANGUAGES.map((lang) => {
                        const isAdded = languages.some((l) => l.name === lang.name);
                        return (
                            <li key={lang.name}>
                                <button
                                    type="button"
                                    onClick={() => !isAdded && addLanguage(lang.name)}
                                    disabled={isAdded}
                                    className={INTERRUPTOR}
                                >
                                    {isAdded && <Check className="size-4 text-emerald-400" aria-hidden="true" />}
                                    {lang.name}
                                    {isAdded && <span className="sr-only">(ya agregado)</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {languages.length === 0 ? (
                <Vacio titulo="Aún no hay idiomas." detalle="Agrega los idiomas que manejas." />
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {languages.map((lang, index) => {
                        const fid = `${base}-${lang.id}`;
                        return (
                            <li key={lang.id} className="space-y-3 border-b border-[var(--linea)] py-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                                    <div className="flex-1">
                                        <label htmlFor={`${fid}-nombre`} className={ETIQUETA}>Idioma</label>
                                        <input
                                            id={`${fid}-nombre`}
                                            type="text"
                                            value={lang.name || ""}
                                            onChange={(e) => updateLanguage(lang.id, { name: e.target.value })}
                                            placeholder="Nombre del idioma"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <fieldset className="m-0 min-w-0 flex-1 border-0 p-0">
                                            <legend className={ETIQUETA}>Nivel</legend>
                                            <div className="flex flex-wrap gap-1.5">
                                                {LANGUAGE_LEVELS.map((level) => (
                                                    <button
                                                        key={level.value}
                                                        type="button"
                                                        aria-pressed={lang.level === level.value}
                                                        onClick={() => updateLanguage(lang.id, { level: level.value })}
                                                        className={INTERRUPTOR}
                                                    >
                                                        {level.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </fieldset>
                                        <button
                                            type="button"
                                            onClick={() => removeLanguage(lang.id)}
                                            aria-label={`Eliminar idioma ${lang.name || index + 1}`}
                                            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 sm:size-10 ${FOCO}`}
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor={`${fid}-cert`} className={ETIQUETA}>Certificación (opcional)</label>
                                    <input
                                        id={`${fid}-cert`}
                                        type="text"
                                        value={lang.certification || ""}
                                        onChange={(e) => updateLanguage(lang.id, { certification: e.target.value })}
                                        placeholder="Ej.: TOEFL 110, DELE C1"
                                        className={CAMPO}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {languages.length > 0 && (
                <div className="pt-2">
                    <p className="mb-1 text-sm text-[var(--mut)]">Así se verá</p>
                    <p className="text-[var(--txt)]">
                        {languages.map((lang, idx) => {
                            const levelInfo = getLevelInfo(lang.level);
                            return (
                                <span key={lang.id}>
                                    <span className="font-medium">{lang.name || "Idioma"}</span>
                                    <span className="text-[var(--mut)]"> ({levelInfo.label})</span>
                                    {lang.certification && (
                                        <span className="text-sm text-[var(--mut)]"> · {lang.certification}</span>
                                    )}
                                    {idx < languages.length - 1 && <span aria-hidden="true" className="mx-2 text-[var(--mut)]">·</span>}
                                </span>
                            );
                        })}
                    </p>
                </div>
            )}
        </SeccionEditor>
    );
}
