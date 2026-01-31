"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { CvEditorPageSkeleton } from "@/components/ui/Skeleton";
import { ExperienceSection, type Experience } from "@/modules/cv/components/ExperienceSection";
import { EducationSection } from "@/modules/cv/components/EducationSection";
import { ProjectsSection, type Project } from "@/modules/cv/components/ProjectsSection";
import { SkillsSection } from "@/modules/cv/components/SkillsSection";
import { LatexPreview } from "@/modules/cv/components/LatexPreview";
import { FloatingCvChat } from "@/modules/cv/components/CvAIChat";
import { generateLatex, type CvData } from "@/modules/cv/utils/latex-templates";

type Tab = "personal" | "experience" | "education" | "skills" | "projects" | "latex";

interface CvVersion {
    id: string;
    name: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

const initialData: CvData = {
    personalInfo: {
        name: "Nicoholas Lopetegui",
        title: "Full Stack Developer & Consultant",
        email: "tu-email@dominio.com",
        phone: "+56 9 XXXX XXXX",
        location: "Chile",
        linkedin: "linkedin.com/in/nlopetegui",
        github: "github.com/nlopetegui",
        summary: "Desarrollador Full Stack con 5+ años de experiencia en proyectos de alto impacto. Especializado en Next.js, TypeScript, PostgreSQL y automatizaciones con n8n.",
    },
    experience: [],
    education: [],
    skills: [
        { category: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
        { category: "Backend", items: ["Node.js", "PHP", "Laravel", "PostgreSQL"] },
        { category: "DevOps", items: ["Docker", "Git", "Linux", "CI/CD"] },
    ],
    projects: [],
};

export default function CvEditorPageClient() {
    const [data, setData] = useState<CvData>(initialData);
    const [activeTab, setActiveTab] = useState<Tab>("personal");
    const [versions, setVersions] = useState<CvVersion[]>([]);
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const toast = useToast();

    // Load versions on mount
    useEffect(() => {
        const loadVersions = async () => {
            try {
                console.log("[CV Editor] Loading versions...");
                const res = await fetch("/api/cv");
                console.log("[CV Editor] Versions response status:", res.status);
                if (res.ok) {
                    const data = await res.json();
                    console.log("[CV Editor] Versions loaded:", data);
                    setVersions(data);
                    // Load default version if exists, otherwise load most recent
                    const defaultVersion = data.find((v: CvVersion) => v.isDefault);
                    const versionToLoad = defaultVersion || data[0]; // data is ordered by updatedAt desc
                    console.log("[CV Editor] Version to load:", versionToLoad);
                    if (versionToLoad) {
                        await loadVersion(versionToLoad.id);
                    }
                } else {
                    console.error("[CV Editor] Failed to fetch versions:", res.status);
                }
            } catch (error) {
                console.error("[CV Editor] Failed to load CV versions:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadVersions();
    }, []);

    const loadVersion = async (id: string) => {
        try {
            const res = await fetch(`/api/cv/${id}`);
            if (res.ok) {
                const version = await res.json();
                setData(version.data as CvData);
                setCurrentVersionId(id);
                setHasUnsavedChanges(false);
            }
        } catch (error) {
            console.error("Failed to load CV version:", error);
            toast.error("Error al cargar la versión");
        }
    };

    const saveVersion = async (name?: string) => {
        setIsSaving(true);
        try {
            const latexCode = generateLatex(data);

            console.log("[CV Editor] Saving... currentVersionId:", currentVersionId);

            if (currentVersionId) {
                // Update existing
                console.log("[CV Editor] Using PUT to update version:", currentVersionId);
                const res = await fetch(`/api/cv/${currentVersionId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data, latexCode }),
                });

                if (res.ok) {
                    toast.success("CV guardado correctamente");
                    setHasUnsavedChanges(false);
                } else {
                    const errorData = await res.json();
                    console.error("CV save error response:", errorData);
                    toast.error(errorData.error || "Error al guardar");
                }
            } else {
                // Create new - make it default if it's the first version
                const isFirstVersion = versions.length === 0;
                const versionName = name || `CV ${new Date().toLocaleDateString("es-CL")}`;
                const res = await fetch("/api/cv", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: versionName, data, latexCode, isDefault: isFirstVersion }),
                });

                if (res.ok) {
                    const newVersion = await res.json();
                    setVersions((prev) => [newVersion, ...prev]);
                    setCurrentVersionId(newVersion.id);
                    toast.success("Nueva versión creada");
                    setHasUnsavedChanges(false);
                } else {
                    const errorData = await res.json();
                    console.error("CV create error response:", errorData);
                    toast.error(errorData.error || "Error al crear versión");
                }
            }
        } catch (error) {
            console.error("Failed to save CV:", error);
            toast.error("Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    // Track unsaved changes
    const updateData = useCallback((updates: Partial<CvData>) => {
        setData((prev) => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
    }, []);

    const updatePersonalInfo = (updates: Partial<CvData["personalInfo"]>) => {
        setData((prev) => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, ...updates },
        }));
        setHasUnsavedChanges(true);
    };

    // Handlers for AI chat actions
    const handleAddExperience = useCallback((exp: Experience) => {
        setData((prev) => ({
            ...prev,
            experience: [...prev.experience, exp],
        }));
        setHasUnsavedChanges(true);
        setActiveTab("experience");
    }, []);

    const handleAddProject = useCallback((project: Project) => {
        setData((prev) => ({
            ...prev,
            projects: [...prev.projects, project],
        }));
        setHasUnsavedChanges(true);
        setActiveTab("projects");
    }, []);

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        {
            id: "personal",
            label: "Personal",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        },
        {
            id: "experience",
            label: "Experiencia",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        },
        {
            id: "education",
            label: "Educación",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
        },
        {
            id: "skills",
            label: "Skills",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
        },
        {
            id: "projects",
            label: "Proyectos",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
        },
        {
            id: "latex",
            label: "LaTeX",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
        },
    ];

    if (isLoading) {
        return <CvEditorPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        Editor de CV
                        {hasUnsavedChanges && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-normal">
                                Sin guardar
                            </span>
                        )}
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        {currentVersionId
                            ? `Editando: ${versions.find(v => v.id === currentVersionId)?.name || "CV"}`
                            : "Crea y gestiona versiones de tu curriculum"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Version selector */}
                    {versions.length > 0 && (
                        <select
                            value={currentVersionId || ""}
                            onChange={(e) => e.target.value && loadVersion(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-accent-1/20 text-white text-sm focus:outline-none focus:border-accent-1/50"
                        >
                            <option value="" disabled>Seleccionar versión</option>
                            {versions.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name} {v.isDefault && "⭐"}
                                </option>
                            ))}
                        </select>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => saveVersion()}
                        disabled={isSaving}
                        className="px-4 py-2.5 rounded-xl bg-accent-1 text-black font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Guardar
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Tabs */}
            <div className="glass-panel rounded-xl border border-accent-1/20 p-1 flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? "bg-accent-1/20 text-accent-1"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === "experience" && data.experience.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent-1/20 text-accent-1 text-xs">
                                {data.experience.length}
                            </span>
                        )}
                        {tab.id === "projects" && data.projects.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                                {data.projects.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "personal" && (
                        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                            <h3 className="font-semibold text-white mb-6">Información Personal</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Nombre completo</label>
                                    <input
                                        type="text"
                                        value={data.personalInfo.name}
                                        onChange={(e) => updatePersonalInfo({ name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Título profesional</label>
                                    <input
                                        type="text"
                                        value={data.personalInfo.title}
                                        onChange={(e) => updatePersonalInfo({ title: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={data.personalInfo.email}
                                        onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={data.personalInfo.phone}
                                        onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Ubicación</label>
                                    <input
                                        type="text"
                                        value={data.personalInfo.location}
                                        onChange={(e) => updatePersonalInfo({ location: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">LinkedIn</label>
                                    <input
                                        type="text"
                                        value={data.personalInfo.linkedin}
                                        onChange={(e) => updatePersonalInfo({ linkedin: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">GitHub</label>
                                    <input
                                        type="text"
                                        value={data.personalInfo.github}
                                        onChange={(e) => updatePersonalInfo({ github: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-neutral-400 mb-2">Resumen profesional</label>
                                    <textarea
                                        value={data.personalInfo.summary}
                                        onChange={(e) => updatePersonalInfo({ summary: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50 resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "experience" && (
                        <ExperienceSection
                            experiences={data.experience}
                            onChange={(experiences) => updateData({ experience: experiences })}
                        />
                    )}

                    {activeTab === "education" && (
                        <EducationSection
                            education={data.education}
                            onChange={(education) => updateData({ education })}
                        />
                    )}

                    {activeTab === "skills" && (
                        <SkillsSection
                            skills={data.skills}
                            onChange={(skills) => updateData({ skills })}
                        />
                    )}

                    {activeTab === "projects" && (
                        <ProjectsSection
                            projects={data.projects}
                            onChange={(projects) => updateData({ projects })}
                        />
                    )}

                    {activeTab === "latex" && (
                        <LatexPreview data={data} />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* AI Chat Panel - Floating button for supported sections */}
            {(activeTab === "experience" || activeTab === "projects") && (
                <FloatingCvChat
                    data={data}
                    activeSection={activeTab}
                    onAddExperience={handleAddExperience}
                    onAddProject={handleAddProject}
                />
            )}
        </div>
    );
}
