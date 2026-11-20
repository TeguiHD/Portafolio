"use client";

import { useId, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus, X } from "lucide-react";
import { BOTON, BOTON_SEC, CAMPO, ETIQUETA, FOCO } from "./estilos";
import { ElementoPlegable, SeccionEditor, Vacio } from "./piezas";

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
    const base = useId();

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
        <SeccionEditor
            titulo="Experiencia laboral"
            acciones={
                <button type="button" onClick={addExperience} className={BOTON}>
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar experiencia
                </button>
            }
        >
            {experiences.length === 0 ? (
                <Vacio
                    titulo="Aún no hay experiencias."
                    detalle="Usa «Agregar experiencia» o el asistente para empezar."
                />
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {experiences.map((exp, index) => {
                        const fid = `${base}-${exp.id}`;
                        return (
                            <ElementoPlegable
                                key={exp.id}
                                numero={index + 1}
                                titulo={exp.position || "Cargo sin nombre"}
                                subtitulo={`${exp.company || "Empresa"} · ${exp.current ? "Actual" : exp.endDate || "Presente"}`}
                                abierto={expandedId === exp.id}
                                alAlternar={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                                alEliminar={() => removeExperience(exp.id)}
                                etiquetaEliminar={`Eliminar experiencia ${index + 1}`}
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${fid}-empresa`} className={ETIQUETA}>Empresa</label>
                                        <input
                                            id={`${fid}-empresa`}
                                            type="text"
                                            value={exp.company || ""}
                                            onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                                            placeholder="Nombre de la empresa"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-cargo`} className={ETIQUETA}>Cargo</label>
                                        <input
                                            id={`${fid}-cargo`}
                                            type="text"
                                            value={exp.position || ""}
                                            onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                                            placeholder="Tu cargo"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-inicio`} className={ETIQUETA}>Fecha de inicio</label>
                                        <input
                                            id={`${fid}-inicio`}
                                            type="month"
                                            value={exp.startDate || ""}
                                            onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-fin`} className={ETIQUETA}>Fecha de término</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                id={`${fid}-fin`}
                                                type="month"
                                                value={exp.endDate || ""}
                                                onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                                                disabled={exp.current}
                                                className={`${CAMPO} flex-1`}
                                            />
                                            <label className="flex min-h-11 items-center gap-2 whitespace-nowrap text-sm text-[var(--txt)]">
                                                <input
                                                    type="checkbox"
                                                    checked={exp.current}
                                                    onChange={(e) => updateExperience(exp.id, { current: e.target.checked, endDate: "" })}
                                                    className="size-4 accent-[var(--acento)]"
                                                />
                                                Actual
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor={`${fid}-desc`} className={ETIQUETA}>Descripción</label>
                                    <textarea
                                        id={`${fid}-desc`}
                                        value={exp.description || ""}
                                        onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                                        placeholder="Tus responsabilidades principales…"
                                        rows={3}
                                        className={`${CAMPO} resize-y`}
                                    />
                                </div>

                                <div>
                                    <label htmlFor={`${fid}-logro`} className={ETIQUETA}>Logros clave</label>
                                    {exp.achievements.length > 0 && (
                                        <ul className="mb-2 space-y-1.5">
                                            {exp.achievements.map((ach, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-[var(--txt)]">
                                                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--acento)]" />
                                                    <span className="flex-1 pt-0.5">{ach}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAchievement(exp.id, i)}
                                                        aria-label={`Quitar logro ${i + 1}`}
                                                        className={`inline-flex size-11 shrink-0 items-center justify-center rounded text-[var(--mut)] sm:size-8 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 ${FOCO}`}
                                                    >
                                                        <X className="size-3.5" aria-hidden="true" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            id={`${fid}-logro`}
                                            type="text"
                                            value={newAchievement[exp.id] || ""}
                                            onChange={(e) => setNewAchievement((prev) => ({ ...prev, [exp.id]: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addAchievement(exp.id);
                                                }
                                            }}
                                            placeholder="Ej.: reduje el tiempo de carga a la mitad"
                                            className={`${CAMPO} flex-1`}
                                        />
                                        <button type="button" onClick={() => addAchievement(exp.id)} className={BOTON_SEC}>
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </ElementoPlegable>
                        );
                    })}
                </ul>
            )}
        </SeccionEditor>
    );
}
