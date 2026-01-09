"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { CvEditorPageSkeleton } from "@/components/ui/Skeleton";
import { ExperienceSection, type Experience } from "@/modules/cv/components/ExperienceSection";
import { EducationSection, type Education } from "@/modules/cv/components/EducationSection";
import { ProjectsSection, type Project } from "@/modules/cv/components/ProjectsSection";
import { SkillsSection, type SkillCategory } from "@/modules/cv/components/SkillsSection";
import { CertificationsSection } from "@/modules/cv/components/CertificationsSection";
import { LanguagesSection } from "@/modules/cv/components/LanguagesSection";
import { DesignConfigPanel } from "@/modules/cv/components/DesignConfigPanel";
import { LatexPreviewEnhanced } from "@/modules/cv/components/LatexPreviewEnhanced";
import { FloatingCvChat } from "@/modules/cv/components/CvAIChat";
import { SocialNetworksEditor } from "@/modules/cv/components/SocialNetworksEditor";
import { CvLivePreview } from "@/modules/cv/components/CvLivePreview";
import {
    generateLatexWithDesign,
    type CvData,
    type Certification,
    type Language,
    type SocialNetwork,
} from "@/modules/cv/utils/latex-templates-enhanced";
import {
    type CvDesignConfig,
    DEFAULT_DESIGN_CONFIG,
} from "@/modules/cv/utils/cv-design";

type Tab = "personal" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages" | "design" | "latex";

interface CvVersion {
    id: string;
    name: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

// Extended CvData to include new sections
interface ExtendedCvData extends CvData {
    certifications: Certification[];
    languages: Language[];
    socialNetworks: SocialNetwork[];
}

const initialData: ExtendedCvData = {
    personalInfo: {
        name: "Nicoholas Lopetegui",
        headline: "Full Stack Developer & Consultant",
        title: "Full Stack Developer & Consultant",
        email: "tu-email@dominio.com",
        phone: "+56 9 XXXX XXXX",
        location: "Chile",
        linkedin: "",
        github: "",
        website: "",
        summary: "Desarrollador Full Stack con 5+ años de experiencia en proyectos de alto impacto. Especializado en Next.js, TypeScript, PostgreSQL y automatizaciones con n8n.",
        socialNetworks: [],
    },
    experience: [],
    education: [],
    skills: [
        { category: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
        { category: "Backend", items: ["Node.js", "PHP", "Laravel", "PostgreSQL"] },
        { category: "DevOps", items: ["Docker", "Git", "Linux", "CI/CD"] },
    ],
    projects: [],
    certifications: [],
    languages: [],
    socialNetworks: [],
};

export default function CvEditorPageClientEnhanced() {
    const [data, setData] = useState<ExtendedCvData>(initialData);
    const [designConfig, setDesignConfig] = useState<CvDesignConfig>(DEFAULT_DESIGN_CONFIG);
    const [activeTab, setActiveTab] = useState<Tab>("personal");
    const [versions, setVersions] = useState<CvVersion[]>([]);
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const toast = useToast();

    // Load versions on mount
    useEffect(() => {
        const loadVersions = async () => {
            try {
                console.log("[CV Editor] Loading versions...");
                const res = await fetch("/api/cv");
                console.log("[CV Editor] Versions response status:", res.status);
                if (res.ok) {
                    const responseData = await res.json();
                    console.log("[CV Editor] Versions loaded:", responseData);
                    setVersions(responseData);
                    const defaultVersion = responseData.find((v: CvVersion) => v.isDefault);
                    const versionToLoad = defaultVersion || responseData[0];
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
                // Merge with initial data to ensure all fields exist
                setData({
                    ...initialData,
                    ...(version.data as ExtendedCvData),
                    certifications: version.data?.certifications || [],
                    languages: version.data?.languages || [],
                });
                if (version.designConfig) {
                    setDesignConfig({ ...DEFAULT_DESIGN_CONFIG, ...version.designConfig });
                }
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
            const latexCode = generateLatexWithDesign(data, designConfig);

            console.log("[CV Editor] Saving... currentVersionId:", currentVersionId);

            if (currentVersionId) {
                console.log("[CV Editor] Using PUT to update version:", currentVersionId);
                const res = await fetch(`/api/cv/${currentVersionId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data, designConfig, latexCode }),
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
                const isFirstVersion = versions.length === 0;
                const versionName = name || `CV ${new Date().toLocaleDateString("es-CL")}`;
                const res = await fetch("/api/cv", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: versionName, data, designConfig, latexCode, isDefault: isFirstVersion }),
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

    const updateData = useCallback((updates: Partial<ExtendedCvData>) => {
        setData((prev) => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
    }, []);

    const updatePersonalInfo = (updates: Partial<ExtendedCvData["personalInfo"]>) => {
        setData((prev) => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, ...updates },
        }));
        setHasUnsavedChanges(true);
    };

    const updateDesignConfig = useCallback((config: CvDesignConfig) => {
        setDesignConfig(config);
        setHasUnsavedChanges(true);
    }, []);

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

    const handleAddEducation = useCallback((edu: Education) => {
        setData((prev) => ({
            ...prev,
            education: [...prev.education, edu],
        }));
        setHasUnsavedChanges(true);
    }, []);

    const handleAddSkillCategory = useCallback((category: SkillCategory) => {
        setData((prev) => ({
            ...prev,
            skills: [...prev.skills, category],
        }));
        setHasUnsavedChanges(true);
    }, []);

    const handleAddCertification = useCallback((cert: Certification) => {
        setData((prev) => ({
            ...prev,
            certifications: [...prev.certifications, cert],
        }));
        setHasUnsavedChanges(true);
    }, []);

    const handleAddLanguage = useCallback((lang: Language) => {
        setData((prev) => ({
            ...prev,
            languages: [...prev.languages, lang],
        }));
        setHasUnsavedChanges(true);
    }, []);

    // Tab configuration with icons
    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number; color?: string }[] = [
        {
            id: "personal",
            label: "Personal",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        },
        {
            id: "experience",
            label: "Experiencia",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
            count: data.experience.length,
            color: "accent-1",
        },
        {
            id: "education",
            label: "Educación",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
            count: data.education.length,
            color: "teal-400",
        },
        {
            id: "skills",
            label: "Skills",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
            count: data.skills.length,
            color: "yellow-400",
        },
        {
            id: "projects",
            label: "Proyectos",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
            count: data.projects.length,
            color: "purple-400",
        },
        {
            id: "certifications",
            label: "Certificaciones",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
            count: data.certifications?.length || 0,
            color: "amber-400",
        },
        {
            id: "languages",
            label: "Idiomas",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
            count: data.languages?.length || 0,
            color: "blue-400",
        },
        {
            id: "design",
            label: "Diseño",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
        },
        {
            id: "latex",
            label: "Exportar",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
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
                        <span className="px-2 py-0.5 rounded-full bg-accent-1/20 text-accent-1 text-xs font-normal">
                            Pro
                        </span>
                        {hasUnsavedChanges && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-normal">
                                Sin guardar
                            </span>
                        )}
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        {currentVersionId
                            ? `Editando: ${versions.find(v => v.id === currentVersionId)?.name || "CV"}`
                            : "Crea y gestiona versiones de tu curriculum profesional"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
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

                    {/* Preview toggle */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowPreview(!showPreview)}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors ${showPreview
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "bg-white/5 text-neutral-400 border border-white/10 hover:text-white"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">{showPreview ? "Ocultar" : "Preview"}</span>
                    </motion.button>
                </div>
            </div>

            {/* Theme/Language Quick Info */}
            <div className="flex items-center gap-4 text-sm">
                <span className="text-neutral-400">
                    Tema: <span className="text-white">{designConfig.theme}</span>
                </span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">
                    Idioma: <span className="text-white">{designConfig.language === "es" ? "🇪🇸 Español" : "🇺🇸 English"}</span>
                </span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">
                    Formato: <span className="text-white">{designConfig.page.size.toUpperCase()}</span>
                </span>
            </div>

            {/* Main content area - split view when preview is enabled */}
            <div className={`flex gap-6 ${showPreview ? 'flex-col xl:flex-row' : ''}`}>
                {/* Editor section */}
                <div className={showPreview ? 'flex-1 xl:max-w-[60%]' : 'w-full'}>
                    {/* Tabs */}
                    <div className="glass-panel rounded-xl border border-accent-1/20 p-1 flex gap-1 overflow-x-auto mb-6">
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
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full bg-${tab.color || "accent-1"}/20 text-${tab.color || "accent-1"} text-xs`}>
                                        {tab.count}
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
                                            <label className="block text-sm text-neutral-400 mb-2">Título / Headline</label>
                                            <input
                                                type="text"
                                                value={data.personalInfo.headline || data.personalInfo.title}
                                                onChange={(e) => updatePersonalInfo({ headline: e.target.value, title: e.target.value })}
                                                placeholder="Full Stack Developer | Tech Lead"
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
                                            <label className="block text-sm text-neutral-400 mb-2">Website / Portfolio</label>
                                            <input
                                                type="text"
                                                value={data.personalInfo.website || ""}
                                                onChange={(e) => updatePersonalInfo({ website: e.target.value })}
                                                placeholder="www.miportfolio.com"
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50"
                                            />
                                        </div>

                                        {/* Social Networks - Dynamic Editor */}
                                        <div className="md:col-span-2 pt-4 border-t border-accent-1/10">
                                            <SocialNetworksEditor
                                                networks={data.socialNetworks || data.personalInfo.socialNetworks || []}
                                                onChange={(networks) => {
                                                    updateData({ socialNetworks: networks });
                                                    // Also update personalInfo for backward compatibility
                                                    updatePersonalInfo({ socialNetworks: networks });
                                                }}
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm text-neutral-400 mb-2">
                                                Resumen profesional
                                                <span className="text-neutral-500 ml-2">
                                                    ({data.personalInfo.summary.length}/500 caracteres)
                                                </span>
                                            </label>
                                            <textarea
                                                value={data.personalInfo.summary}
                                                onChange={(e) => updatePersonalInfo({ summary: e.target.value })}
                                                rows={4}
                                                maxLength={500}
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-accent-1/20 text-white focus:outline-none focus:border-accent-1/50 resize-none"
                                                placeholder="Breve descripción de tu perfil profesional..."
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

                            {activeTab === "certifications" && (
                                <CertificationsSection
                                    certifications={data.certifications || []}
                                    onChange={(certifications) => updateData({ certifications })}
                                />
                            )}

                            {activeTab === "languages" && (
                                <LanguagesSection
                                    languages={data.languages || []}
                                    onChange={(languages) => updateData({ languages })}
                                />
                            )}

                            {activeTab === "design" && (
                                <DesignConfigPanel
                                    config={designConfig}
                                    onChange={updateDesignConfig}
                                />
                            )}

                            {activeTab === "latex" && (
                                <LatexPreviewEnhanced
                                    data={data}
                                    designConfig={designConfig}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>

                </div>

                {/* Live Preview Panel */}
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="xl:w-[40%] xl:sticky xl:top-4 h-fit"
                    >
                        <div className="glass-panel rounded-2xl border border-purple-500/20 p-4">
                            <div className="flex items-center gap-2 text-sm text-purple-400 mb-3">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Vista previa en tiempo real
                            </div>
                            <CvLivePreview
                                data={data}
                                designConfig={designConfig}
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Floating AI Chat Button - only for supported sections */}
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
