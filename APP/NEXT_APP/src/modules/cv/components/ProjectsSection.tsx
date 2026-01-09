"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

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
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Proyectos</h3>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addProject}
                    className="px-4 py-2 rounded-xl bg-accent-1/20 text-accent-1 text-sm font-medium flex items-center gap-2 hover:bg-accent-1/30 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Proyecto
                </motion.button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p>No hay proyectos agregados</p>
                    <p className="text-sm mt-1">Haz clic en "Agregar Proyecto" o usa el chatbot</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {projects.map((proj, index) => (
                            <motion.div
                                key={proj.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="border border-accent-1/20 rounded-xl bg-white/5 overflow-hidden"
                            >
                                {/* Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {proj.name || "Nuevo proyecto"}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {proj.technologies.slice(0, 3).map((tech, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                                                        {tech}
                                                    </span>
                                                ))}
                                                {proj.technologies.length > 3 && (
                                                    <span className="text-xs text-neutral-400">+{proj.technologies.length - 3}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeProject(proj.id);
                                            }}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <svg
                                            className={`w-5 h-5 text-neutral-400 transition-transform ${expandedId === proj.id ? "rotate-180" : ""}`}
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
                                    {expandedId === proj.id && (
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
                                                        <label className="block text-sm text-neutral-400 mb-2">Nombre del proyecto</label>
                                                        <input
                                                            type="text"
                                                            value={proj.name || ""}
                                                            onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                                                            placeholder="Nombre del proyecto"
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-neutral-400 mb-2">URL del proyecto</label>
                                                        <input
                                                            type="url"
                                                            value={proj.url || ""}
                                                            onChange={(e) => updateProject(proj.id, { url: e.target.value })}
                                                            placeholder="https://..."
                                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-neutral-400 mb-2">Descripción</label>
                                                    <textarea
                                                        value={proj.description || ""}
                                                        onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                                                        placeholder="Describe el proyecto, su propósito y tu rol..."
                                                        rows={3}
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50 resize-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-neutral-400 mb-2">Tecnologías</label>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {proj.technologies.map((tech, i) => (
                                                            <span
                                                                key={i}
                                                                className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm flex items-center gap-2"
                                                            >
                                                                {tech}
                                                                <button
                                                                    onClick={() => removeTechnology(proj.id, i)}
                                                                    className="hover:text-red-400 transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newTech[proj.id] || ""}
                                                            onChange={(e) => setNewTech((prev) => ({ ...prev, [proj.id]: e.target.value }))}
                                                            onKeyDown={(e) => e.key === "Enter" && addTechnology(proj.id)}
                                                            placeholder="Agregar tecnología..."
                                                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-accent-1/20 text-white text-sm focus:outline-none focus:border-accent-1/50"
                                                        />
                                                        <button
                                                            onClick={() => addTechnology(proj.id)}
                                                            className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors"
                                                        >
                                                            Agregar
                                                        </button>
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
