"use client";

import { useId, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { BOTON, BOTON_SEC, CAMPO, ETIQUETA } from "./estilos";
import { ElementoPlegable, Ficha, SeccionEditor, Vacio } from "./piezas";

export interface Project {
    id: string;
    name: string;
    description: string;
    technologies: string[];
    url: string;
}

interface ProjectsSectionProps {
    projects: Project[];
    onChange: (projects: Project[]) => void;
}

export function ProjectsSection({ projects, onChange }: ProjectsSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [newTech, setNewTech] = useState<Record<string, string>>({});
    const base = useId();

    const addProject = () => {
        const newProj: Project = {
            id: uuidv4(),
            name: "",
            description: "",
            technologies: [],
            url: "",
        };
        onChange([...projects, newProj]);
        setExpandedId(newProj.id);
    };

    const updateProject = (id: string, updates: Partial<Project>) => {
        onChange(projects.map((proj) => (proj.id === id ? { ...proj, ...updates } : proj)));
    };

    const removeProject = (id: string) => {
        onChange(projects.filter((proj) => proj.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const addTechnology = (projId: string) => {
        const text = newTech[projId]?.trim();
        if (!text) return;
        const proj = projects.find((p) => p.id === projId);
        if (proj) {
            updateProject(projId, { technologies: [...proj.technologies, text] });
            setNewTech((prev) => ({ ...prev, [projId]: "" }));
        }
    };

    const removeTechnology = (projId: string, index: number) => {
        const proj = projects.find((p) => p.id === projId);
        if (proj) {
            updateProject(projId, {
                technologies: proj.technologies.filter((_, i) => i !== index),
            });
        }
    };

    return (
        <SeccionEditor
            titulo="Proyectos"
            acciones={
                <button type="button" onClick={addProject} className={BOTON}>
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar proyecto
                </button>
            }
        >
            {projects.length === 0 ? (
                <Vacio titulo="Aún no hay proyectos." detalle="Usa «Agregar proyecto» o el asistente para empezar." />
            ) : (
                <ul className="border-t border-[var(--linea)]">
                    {projects.map((proj, index) => {
                        const fid = `${base}-${proj.id}`;
                        const resumenTec =
                            proj.technologies.length > 0
                                ? `${proj.technologies.slice(0, 3).join(" · ")}${proj.technologies.length > 3 ? ` +${proj.technologies.length - 3}` : ""}`
                                : "Sin tecnologías";
                        return (
                            <ElementoPlegable
                                key={proj.id}
                                numero={index + 1}
                                titulo={proj.name || "Proyecto sin nombre"}
                                subtitulo={resumenTec}
                                abierto={expandedId === proj.id}
                                alAlternar={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
                                alEliminar={() => removeProject(proj.id)}
                                etiquetaEliminar={`Eliminar proyecto ${index + 1}`}
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${fid}-nombre`} className={ETIQUETA}>Nombre del proyecto</label>
                                        <input
                                            id={`${fid}-nombre`}
                                            type="text"
                                            value={proj.name || ""}
                                            onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                                            placeholder="Nombre del proyecto"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${fid}-url`} className={ETIQUETA}>URL del proyecto</label>
                                        <input
                                            id={`${fid}-url`}
                                            type="url"
                                            inputMode="url"
                                            value={proj.url || ""}
                                            onChange={(e) => updateProject(proj.id, { url: e.target.value })}
                                            placeholder="https://…"
                                            className={CAMPO}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor={`${fid}-desc`} className={ETIQUETA}>Descripción</label>
                                    <textarea
                                        id={`${fid}-desc`}
                                        value={proj.description || ""}
                                        onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                                        placeholder="El propósito del proyecto y tu rol…"
                                        rows={3}
                                        className={`${CAMPO} resize-y`}
                                    />
                                </div>

                                <div>
                                    <label htmlFor={`${fid}-tec`} className={ETIQUETA}>Tecnologías</label>
                                    {proj.technologies.length > 0 && (
                                        <ul className="mb-2 flex flex-wrap gap-1.5">
                                            {proj.technologies.map((tech, i) => (
                                                <Ficha
                                                    key={i}
                                                    texto={tech}
                                                    alQuitar={() => removeTechnology(proj.id, i)}
                                                    etiquetaQuitar={`Quitar ${tech}`}
                                                />
                                            ))}
                                        </ul>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            id={`${fid}-tec`}
                                            type="text"
                                            value={newTech[proj.id] || ""}
                                            onChange={(e) => setNewTech((prev) => ({ ...prev, [proj.id]: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addTechnology(proj.id);
                                                }
                                            }}
                                            placeholder="Ej.: Next.js"
                                            className={`${CAMPO} flex-1`}
                                        />
                                        <button type="button" onClick={() => addTechnology(proj.id)} className={BOTON_SEC}>
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
