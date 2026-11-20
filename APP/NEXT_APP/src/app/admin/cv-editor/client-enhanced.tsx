"use client";

import { useState, useEffect, useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
    Award,
    BarChart3,
    Briefcase,
    Download,
    Eye,
    FolderGit2,
    GraduationCap,
    Languages,
    Loader2,
    Palette,
    Save,
    User,
    Wrench,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";
import { BOTON, BOTON_SEC, CAMPO, ENLACE, ETIQUETA } from "@/modules/cv/components/estilos";
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
    CV_THEMES,
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
    const base = useId();

    // Load versions on mount
    const loadVersion = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/cv/${id}`);
            if (res.ok) {
                const version = await res.json();
                // Reconstruct socialNetworks from persisted personalInfo fields
                const pi = version.data?.personalInfo;
                const reconstructedNetworks: SocialNetwork[] = [];
                if (pi?.linkedin) {
                    reconstructedNetworks.push({ network: "LinkedIn", username: pi.linkedin });
                }
                if (pi?.github) {
                    reconstructedNetworks.push({ network: "GitHub", username: pi.github });
                }
                if (pi?.website) {
                    reconstructedNetworks.push({ network: "Website", username: pi.website });
                }
                // Use saved socialNetworks if available, otherwise reconstruct from persisted fields
                const savedNetworks = version.data?.socialNetworks || version.data?.personalInfo?.socialNetworks;
                const socialNetworks = (savedNetworks && savedNetworks.length > 0) ? savedNetworks : reconstructedNetworks;

                setData({
                    ...initialData,
                    ...(version.data as ExtendedCvData),
                    certifications: version.data?.certifications || [],
                    languages: version.data?.languages || [],
                    socialNetworks,
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
    }, [toast]);

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
                    // ?versionId=… (el enlace «Abrir la versión adaptada» de Postulaciones) manda sobre la principal
                    const pedida = new URLSearchParams(window.location.search).get("versionId");
                    const versionPedida = pedida ? responseData.find((v: CvVersion) => v.id === pedida) : undefined;
                    const defaultVersion = responseData.find((v: CvVersion) => v.isDefault);
                    const versionToLoad = versionPedida || defaultVersion || responseData[0];
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
    }, [loadVersion]);

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

    const _handleAddEducation = useCallback((edu: Education) => {
        setData((prev) => ({
            ...prev,
            education: [...prev.education, edu],
        }));
        setHasUnsavedChanges(true);
    }, []);

    const _handleAddSkillCategory = useCallback((category: SkillCategory) => {
        setData((prev) => ({
            ...prev,
            skills: [...prev.skills, category],
        }));
        setHasUnsavedChanges(true);
    }, []);

    const _handleAddCertification = useCallback((cert: Certification) => {
        setData((prev) => ({
            ...prev,
            certifications: [...prev.certifications, cert],
        }));
        setHasUnsavedChanges(true);
    }, []);

    const _handleAddLanguage = useCallback((lang: Language) => {
        setData((prev) => ({
            ...prev,
            languages: [...prev.languages, lang],
        }));
        setHasUnsavedChanges(true);
    }, []);

    // Pestañas del editor
    const tabs: { id: Tab; label: string; icon: ReactNode; count?: number }[] = [
        { id: "personal", label: "Datos personales", icon: <User className="size-4" aria-hidden="true" /> },
        { id: "experience", label: "Experiencia", icon: <Briefcase className="size-4" aria-hidden="true" />, count: data.experience.length },
        { id: "education", label: "Educación", icon: <GraduationCap className="size-4" aria-hidden="true" />, count: data.education.length },
        { id: "skills", label: "Habilidades", icon: <Wrench className="size-4" aria-hidden="true" />, count: data.skills.length },
        { id: "projects", label: "Proyectos", icon: <FolderGit2 className="size-4" aria-hidden="true" />, count: data.projects.length },
        { id: "certifications", label: "Certificaciones", icon: <Award className="size-4" aria-hidden="true" />, count: data.certifications?.length || 0 },
        { id: "languages", label: "Idiomas", icon: <Languages className="size-4" aria-hidden="true" />, count: data.languages?.length || 0 },
        { id: "design", label: "Diseño", icon: <Palette className="size-4" aria-hidden="true" /> },
        { id: "latex", label: "Exportar", icon: <Download className="size-4" aria-hidden="true" /> },
    ];

    // Flechas, Inicio y Fin recorren las pestañas (patrón de pestañas de ARIA)
    const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let next = -1;
        if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next < 0) return;
        e.preventDefault();
        setActiveTab(tabs[next].id);
        document.getElementById(`${base}-tab-${tabs[next].id}`)?.focus();
    };

    if (isLoading) {
        return <EsqueletoSeccion nombre="el currículum" barra filas={5} />;
    }

    const versionActual = versions.find((v) => v.id === currentVersionId);
    const nombreFormato =
        designConfig.layout === "two-column-sidebar" ? "Con barra lateral" : designConfig.layout === "compact-grid" ? "Compacto" : "Clásico";
    const nombrePagina = designConfig.page.size === "a4" ? "A4" : designConfig.page.size === "letter" ? "Carta" : "Legal";

    return (
        <div className="max-w-[1440px] space-y-8">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <h1 className="text-[clamp(30px,3.6vw,44px)] font-extrabold leading-none tracking-[-0.04em] text-[var(--txt)]">
                        Currículum
                    </h1>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-[var(--mut)]">
                        <span>{versionActual ? `Editando: ${versionActual.name}` : "Crea y ordena las versiones de tu CV."}</span>
                        <span role="status" className="text-sm">
                            {hasUnsavedChanges && (
                                <span className="inline-flex items-center gap-1.5 text-amber-400">
                                    <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400" />
                                    Cambios sin guardar
                                </span>
                            )}
                        </span>
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    {versions.length > 0 && (
                        <div className="sm:w-64">
                            <label htmlFor={`${base}-version`} className={ETIQUETA}>Versión</label>
                            <select
                                id={`${base}-version`}
                                value={currentVersionId || ""}
                                onChange={(e) => e.target.value && loadVersion(e.target.value)}
                                className={CAMPO}
                            >
                                <option value="" disabled>Elige una versión</option>
                                {versions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}{v.isDefault ? " (principal)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            aria-pressed={showPreview}
                            className={`${BOTON_SEC} flex-1 aria-pressed:border-[var(--acento)] sm:flex-none`}
                        >
                            <Eye className="size-4" aria-hidden="true" />
                            Vista previa
                        </button>
                        <button
                            type="button"
                            onClick={() => saveVersion()}
                            disabled={isSaving}
                            className={`${BOTON} flex-1 sm:flex-none`}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                    Guardando…
                                </>
                            ) : (
                                <>
                                    <Save className="size-4" aria-hidden="true" />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <dl aria-label="Diseño actual" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {[
                    ["Tema", CV_THEMES[designConfig.theme]?.name ?? designConfig.theme],
                    ["Formato", nombreFormato],
                    ["Idioma", designConfig.language === "es" ? "Español" : "English"],
                    ["Página", nombrePagina],
                ].map(([k, v]) => (
                    <div key={k} className="flex gap-1.5">
                        <dt className="text-[var(--mut)]">{k}:</dt>
                        <dd className="m-0 text-[var(--txt)]">{v}</dd>
                    </div>
                ))}
            </dl>

            {currentVersionId && (
                <CvJobsIntegrationPanel cvVersionId={currentVersionId} />
            )}

            <div className={showPreview ? "grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}>
                <div className="min-w-0">
                    {/* Las pestañas se desplazan dentro de su franja en celular; la página nunca se mueve de lado. */}
                    <div className="mb-8 overflow-x-auto border-b border-[var(--linea)] [scrollbar-width:thin]">
                        <div role="tablist" aria-label="Partes del currículum" className="flex min-w-max gap-1">
                            {tabs.map((tab, index) => {
                                const activa = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        id={`${base}-tab-${tab.id}`}
                                        type="button"
                                        role="tab"
                                        aria-selected={activa}
                                        tabIndex={activa ? 0 : -1}
                                        onClick={() => setActiveTab(tab.id)}
                                        onKeyDown={(e) => onTabKeyDown(e, index)}
                                        className={`-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] ${
                                            activa
                                                ? "border-[var(--acento)] text-[var(--txt)]"
                                                : "border-transparent text-[var(--mut)] hover:text-[var(--txt)]"
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className="font-mono text-xs tabular-nums text-[var(--mut)]">{tab.count}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div
                        id={`${base}-panel`}
                        role="tabpanel"
                        aria-labelledby={`${base}-tab-${activeTab}`}
                    >
                        {activeTab === "personal" && (
                            <section aria-labelledby={`${base}-personal`} className="space-y-5">
                                <h2 id={`${base}-personal`} className="text-xl font-semibold text-[var(--txt)]">Datos personales</h2>
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div>
                                        <label htmlFor={`${base}-nombre`} className={ETIQUETA}>Nombre completo</label>
                                        <input
                                            id={`${base}-nombre`}
                                            type="text"
                                            autoComplete="name"
                                            value={data.personalInfo.name}
                                            onChange={(e) => updatePersonalInfo({ name: e.target.value })}
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${base}-titular`} className={ETIQUETA}>Título profesional</label>
                                        <input
                                            id={`${base}-titular`}
                                            type="text"
                                            autoComplete="organization-title"
                                            value={data.personalInfo.headline || data.personalInfo.title}
                                            onChange={(e) => updatePersonalInfo({ headline: e.target.value, title: e.target.value })}
                                            placeholder="Desarrollador full stack"
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${base}-correo`} className={ETIQUETA}>Correo</label>
                                        <input
                                            id={`${base}-correo`}
                                            type="email"
                                            autoComplete="email"
                                            value={data.personalInfo.email}
                                            onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${base}-telefono`} className={ETIQUETA}>Teléfono</label>
                                        <input
                                            id={`${base}-telefono`}
                                            type="tel"
                                            autoComplete="tel"
                                            value={data.personalInfo.phone}
                                            onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${base}-ubicacion`} className={ETIQUETA}>Ubicación</label>
                                        <input
                                            id={`${base}-ubicacion`}
                                            type="text"
                                            value={data.personalInfo.location}
                                            onChange={(e) => updatePersonalInfo({ location: e.target.value })}
                                            className={CAMPO}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`${base}-web`} className={ETIQUETA}>Sitio web o portafolio</label>
                                        <input
                                            id={`${base}-web`}
                                            type="text"
                                            inputMode="url"
                                            autoComplete="url"
                                            value={data.personalInfo.website || ""}
                                            onChange={(e) => updatePersonalInfo({ website: e.target.value })}
                                            placeholder="www.miportafolio.cl"
                                            className={CAMPO}
                                        />
                                    </div>

                                    <div className="border-t border-[var(--linea)] pt-5 md:col-span-2">
                                        <SocialNetworksEditor
                                            networks={data.socialNetworks || data.personalInfo.socialNetworks || []}
                                            onChange={(networks) => {
                                                updateData({ socialNetworks: networks });
                                                // Copia a los campos de personalInfo, que son los que se guardan en la base
                                                const linkedinNet = networks.find(n => n.network === "LinkedIn");
                                                const githubNet = networks.find(n => n.network === "GitHub");
                                                const websiteNet = networks.find(n => n.network === "Website");
                                                updatePersonalInfo({
                                                    socialNetworks: networks,
                                                    linkedin: linkedinNet?.username || "",
                                                    github: githubNet?.username || "",
                                                    website: websiteNet?.username || "",
                                                });
                                            }}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor={`${base}-resumen`} className={ETIQUETA}>Resumen profesional</label>
                                        <textarea
                                            id={`${base}-resumen`}
                                            value={data.personalInfo.summary}
                                            onChange={(e) => updatePersonalInfo({ summary: e.target.value })}
                                            rows={4}
                                            maxLength={500}
                                            aria-describedby={`${base}-resumen-cuenta`}
                                            className={`${CAMPO} resize-y`}
                                            placeholder="Tu perfil profesional en pocas líneas…"
                                        />
                                        <p id={`${base}-resumen-cuenta`} className="mt-1.5 font-mono text-xs tabular-nums text-[var(--mut)]">
                                            {data.personalInfo.summary.length} de 500 caracteres
                                        </p>
                                    </div>
                                </div>
                            </section>
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
                    </div>
                </div>

                {showPreview && (
                    <aside aria-labelledby={`${base}-vista`} className="min-w-0 xl:sticky xl:top-20">
                        <h2 id={`${base}-vista`} className="mb-3 text-[15px] font-semibold text-[var(--mut)]">Vista previa en vivo</h2>
                        <CvLivePreview data={data} designConfig={designConfig} />
                    </aside>
                )}
            </div>

            {/* Asistente flotante: solo en las secciones que sabe completar */}
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

// ─── Jobs Integration Panel ───────────────────────────────────────────────────

type JobsSummary = {
    analysisCount: number;
    adaptationCount: number;
    avgMatchScore: number | null;
    latestAnalysisVacancy: string | null;
};

function CvJobsIntegrationPanel({ cvVersionId }: { cvVersionId: string }) {
    const [summary, setSummary] = useState<JobsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const prevId = useRef<string | null>(null);

    useEffect(() => {
        if (prevId.current === cvVersionId) return;
        prevId.current = cvVersionId;
        setLoading(true);
        fetch(`/api/cv/${cvVersionId}/jobs-summary`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setSummary(data))
            .catch(() => setSummary(null))
            .finally(() => setLoading(false));
    }, [cvVersionId]);

    if (loading) {
        return <div aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] motion-reduce:animate-none" />;
    }

    const hasActivity = summary && (summary.analysisCount > 0 || summary.adaptationCount > 0);

    return (
        <section
            aria-label="Uso de esta versión en Postulaciones"
            className="flex flex-col gap-3 border-y border-[var(--linea)] py-3 sm:flex-row sm:items-center sm:gap-6"
        >
            <dl className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-1.5">
                    <dt className="text-[var(--mut)]">Análisis:</dt>
                    <dd className="m-0 font-semibold tabular-nums text-[var(--txt)]">{summary?.analysisCount ?? 0}</dd>
                </div>
                <div className="flex gap-1.5">
                    <dt className="text-[var(--mut)]">Adaptaciones:</dt>
                    <dd className="m-0 font-semibold tabular-nums text-[var(--txt)]">{summary?.adaptationCount ?? 0}</dd>
                </div>
                {summary?.avgMatchScore != null && (
                    <div className="flex gap-1.5">
                        <dt className="text-[var(--mut)]">Coincidencia promedio:</dt>
                        <dd className="m-0 font-semibold tabular-nums text-[var(--txt)]">{Math.round(summary.avgMatchScore)}%</dd>
                    </div>
                )}
                {hasActivity && summary?.latestAnalysisVacancy && (
                    <div className="flex min-w-0 gap-1.5">
                        <dt className="text-[var(--mut)]">Último:</dt>
                        <dd className="m-0 max-w-[16rem] truncate text-[var(--txt)]">{summary.latestAnalysisVacancy}</dd>
                    </div>
                )}
            </dl>

            <a href="/admin/jobs/analysis" className={`${ENLACE} min-h-11 whitespace-nowrap text-sm font-semibold sm:min-h-0`}>
                <BarChart3 className="size-4" aria-hidden="true" />
                Analizar una vacante con este CV
            </a>
        </section>
    );
}
