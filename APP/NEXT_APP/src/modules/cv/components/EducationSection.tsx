"use client";

import { useId, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { BOTON, CAMPO, ETIQUETA } from "./estilos";
import { ElementoPlegable, SeccionEditor, Vacio } from "./piezas";

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
    const base = useId();

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
        <SeccionEditor
            titulo="Educación"
            acciones={
                <button type="button" onClick={addEducation} className={BOTON}>
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar educación
                </button>
            }
        >
            {education.length === 0 ? (
                <Vacio titulo="Aún no hay estudios." detalle="Usa «Agregar educación» para empezar." />
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {education.map((edu, index) => {
                        const fid = `${base}-${edu.id}`;
                        return (
                            <ElementoPlegable
                                key={edu.id}
                                numero={index + 1}
                                titulo={edu.degree || "Título sin nombre"}
                                subtitulo={`${edu.institution || "Institución"} · ${edu.field || "Área de estudio"}`}
                                abierto={expandedId === edu.id}
                                alAlternar={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                                alEliminar={() => removeEducation(edu.id)}
                                etiquetaEliminar={`Eliminar estudio ${index + 1}`}
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${fid}-institucion`} className={ETIQUETA}>Institución</label>
                                        <input
                                            id={`${fid}-institucion`}
                                            type="text"
                                            value={edu.institution || ""}
                                            onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                                            placeholder="Universidad o instituto"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-titulo`} className={ETIQUETA}>Título</label>
                                        <input
                                            id={`${fid}-titulo`}
                                            type="text"
                                            value={edu.degree || ""}
                                            onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                                            placeholder="Ej.: Ingeniería Civil Informática"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-campo`} className={ETIQUETA}>Área de estudio</label>
                                        <input
                                            id={`${fid}-campo`}
                                            type="text"
                                            value={edu.field || ""}
                                            onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                                            placeholder="Ej.: Ciencias de la Computación"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor={`${fid}-inicio`} className={ETIQUETA}>Inicio</label>
                                            <input
                                                id={`${fid}-inicio`}
                                                type="month"
                                                value={edu.startDate || ""}
                                                onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                                                className={CAMPO}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`${fid}-fin`} className={ETIQUETA}>Término</label>
                                            <input
                                                id={`${fid}-fin`}
                                                type="month"
                                                value={edu.endDate || ""}
                                                onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                                                className={CAMPO}
                                            />
                                        </div>
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
