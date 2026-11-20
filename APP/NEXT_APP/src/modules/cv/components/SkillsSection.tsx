"use client";

import { useState, useCallback, useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SkillsSuggestions } from "./SkillsSuggestions";
import { BOTON, BOTON_SEC, CAMPO, ETIQUETA, FOCO } from "./estilos";
import { Ficha, SeccionEditor, Vacio } from "./piezas";

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
    const base = useId();

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

    // Add skill from suggestion
    const addSkillFromSuggestion = useCallback((categoryIndex: number, skill: string) => {
        const newSkills = [...skills];
        // Avoid duplicates
        if (!newSkills[categoryIndex].items.includes(skill)) {
            newSkills[categoryIndex] = {
                ...newSkills[categoryIndex],
                items: [...newSkills[categoryIndex].items, skill],
            };
            onChange(newSkills);
        }
    }, [skills, onChange]);

    const removeSkill = (categoryIndex: number, skillIndex: number) => {
        const newSkills = [...skills];
        newSkills[categoryIndex] = {
            ...newSkills[categoryIndex],
            items: newSkills[categoryIndex].items.filter((_, i) => i !== skillIndex),
        };
        onChange(newSkills);
    };

    return (
        <SeccionEditor
            titulo="Habilidades"
            descripcion="Agrúpalas por categoría: Frontend, Backend, DevOps…"
            acciones={
                <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    aria-expanded={isAddingCategory}
                    className={BOTON}
                >
                    <Plus className="size-4" aria-hidden="true" />
                    Nueva categoría
                </button>
            }
        >
            {isAddingCategory && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        addCategory();
                    }}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--linea)] bg-[var(--sup)] p-4 sm:flex-row sm:items-end"
                >
                    <div className="flex-1">
                        <label htmlFor={`${base}-nueva`} className={ETIQUETA}>Nombre de la categoría</label>
                        <input
                            id={`${base}-nueva`}
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setIsAddingCategory(false);
                                    setNewCategory("");
                                }
                            }}
                            placeholder="Ej.: Frontend"
                            autoFocus
                            className={CAMPO}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className={BOTON}>Crear</button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsAddingCategory(false);
                                setNewCategory("");
                            }}
                            className={BOTON_SEC}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {skills.length === 0 && !isAddingCategory ? (
                <Vacio titulo="Aún no hay categorías." detalle="Crea categorías como Frontend, Backend o DevOps." />
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {skills.map((skill, categoryIndex) => {
                        const fid = `${base}-${categoryIndex}`;
                        return (
                            <li key={categoryIndex} className="space-y-3 border-b border-[var(--linea)] py-4">
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label htmlFor={`${fid}-cat`} className="sr-only">Nombre de la categoría {categoryIndex + 1}</label>
                                        <input
                                            id={`${fid}-cat`}
                                            type="text"
                                            value={skill.category || ""}
                                            onChange={(e) => updateCategoryName(categoryIndex, e.target.value)}
                                            className="w-full min-h-11 rounded-lg border border-transparent bg-transparent px-3 py-2 text-base font-semibold text-[var(--txt)] transition-colors duration-150 hover:border-[var(--linea-2)] focus-visible:border-[var(--linea-2)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] sm:min-h-10"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeCategory(categoryIndex)}
                                        aria-label={`Eliminar la categoría ${skill.category || categoryIndex + 1}`}
                                        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 sm:size-10 ${FOCO}`}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </div>

                                {skill.items.length > 0 && (
                                    <ul className="flex flex-wrap gap-1.5">
                                        {skill.items.map((item, skillIndex) => (
                                            <Ficha
                                                key={skillIndex}
                                                texto={item}
                                                alQuitar={() => removeSkill(categoryIndex, skillIndex)}
                                                etiquetaQuitar={`Quitar ${item}`}
                                            />
                                        ))}
                                    </ul>
                                )}

                                <div className="flex gap-2">
                                    <label htmlFor={`${fid}-nueva`} className="sr-only">
                                        Agregar habilidad a {skill.category || `la categoría ${categoryIndex + 1}`}
                                    </label>
                                    <input
                                        id={`${fid}-nueva`}
                                        type="text"
                                        value={newSkill[categoryIndex] || ""}
                                        onChange={(e) => setNewSkill((prev) => ({ ...prev, [categoryIndex]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addSkill(categoryIndex);
                                            }
                                        }}
                                        placeholder="Agregar habilidad…"
                                        className={`${CAMPO} flex-1`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => addSkill(categoryIndex)}
                                        aria-label={`Agregar habilidad a ${skill.category || `la categoría ${categoryIndex + 1}`}`}
                                        className={BOTON_SEC}
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                    </button>
                                </div>

                                <SkillsSuggestions
                                    categoryName={skill.category}
                                    existingSkills={skill.items}
                                    onAddSkill={(s) => addSkillFromSuggestion(categoryIndex, s)}
                                />
                            </li>
                        );
                    })}
                </ul>
            )}
        </SeccionEditor>
    );
}
