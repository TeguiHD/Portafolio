"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Send, Loader2 } from "lucide-react";
import { MatchScoreGauge } from "./components/MatchScoreGauge";
import { SkillsComparison } from "./components/SkillsComparison";
import { LearningPlanCard } from "./components/LearningPlanCard";
import { AdaptationPreview } from "./components/AdaptationPreview";
import { AnalysisControls } from "./components/AnalysisControls";
import { SourceBadge } from "../components/SourceBadge";
import { parseJsonResponse, formatDate } from "../utils";
import type { CvVersionOption, AiProviderChoice } from "../types";
import type { AnalysisSummary, AdaptationSummary } from "./page";
import { BOTON, CAMPO, ENLACE, ETIQUETA, TITULO } from "../estilos";

type VacancyOption = {
    id: string;
    title: string;
    company: string;
    source: string;
    sourceUrl: string | null;
    location: string | null;
};

type SelectedVacancy = {
    id: string;
    title: string;
    company: string;
    source: string;
    sourceUrl: string | null;
    location: string | null;
    description: string;
};

export default function AnalysisClient({
    cvVersions,
    vacancyOptions,
    selectedVacancy,
    latestAnalysis,
    latestAdaptation,
}: {
    cvVersions: CvVersionOption[];
    vacancyOptions: VacancyOption[];
    selectedVacancy: SelectedVacancy | null;
    latestAnalysis: AnalysisSummary | null;
    latestAdaptation: AdaptationSummary | null;
}) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const id = useId();

    const defaultCv = cvVersions.find((cv) => cv.isDefault) || cvVersions[0];
    const [cvVersionId, setCvVersionId] = useState<string>(defaultCv?.id || "");
    const [mode, setMode] = useState<"ASSISTED" | "AUTO">("ASSISTED");
    const [aiProvider, setAiProvider] = useState<AiProviderChoice>("AUTO");
    const [aiModel, setAiModel] = useState<string>("");

    const [analysis, setAnalysis] = useState<AnalysisSummary | null>(latestAnalysis);
    const [adaptation, setAdaptation] = useState<AdaptationSummary | null>(latestAdaptation);

    const [isRunning, setIsRunning] = useState(false);
    const [isCreatingApp, setIsCreatingApp] = useState(false);

    async function handleRunAnalysis() {
        if (!selectedVacancy) {
            toast.error("Selecciona una vacante primero");
            return;
        }
        if (!cvVersionId) {
            toast.error("Selecciona una versión de CV");
            return;
        }

        setIsRunning(true);
        try {
            const response = await fetch(`/api/jobs/vacancies/${selectedVacancy.id}/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cvVersionId,
                    mode,
                    aiProvider,
                    aiModel: aiModel.trim() || undefined,
                    createAdaptation: true,
                }),
            });
            const data = await parseJsonResponse<{
                analysis: {
                    id: string;
                    matchScore: number;
                    matchedSkills: string[];
                    missingSkills: string[];
                    recommendedSkills: string[];
                    extractedKeywords: string[];
                    summary: string | null;
                    recommendations: string[];
                    learningPlan: string[];
                    createdAt: string;
                };
                adaptation: {
                    id: string;
                    mode: "ASSISTED" | "AUTO";
                    baseCvVersionId: string;
                    adaptedCvVersionId: string | null;
                    appliedChanges: unknown;
                    createdAt: string;
                } | null;
            }>(response);

            if (!response.ok || !data) {
                throw new Error("No se pudo ejecutar el análisis");
            }

            setAnalysis({
                id: data.analysis.id,
                matchScore: data.analysis.matchScore,
                matchedSkills: data.analysis.matchedSkills,
                missingSkills: data.analysis.missingSkills,
                recommendedSkills: data.analysis.recommendedSkills,
                extractedKeywords: data.analysis.extractedKeywords,
                summary: data.analysis.summary,
                recommendations: data.analysis.recommendations,
                learningPlan: data.analysis.learningPlan,
                createdAt: data.analysis.createdAt,
            });

            if (data.adaptation) {
                setAdaptation({
                    id: data.adaptation.id,
                    mode: data.adaptation.mode,
                    baseCvVersionId: data.adaptation.baseCvVersionId,
                    adaptedCvVersionId: data.adaptation.adaptedCvVersionId,
                    appliedChanges: data.adaptation.appliedChanges,
                    createdAt: data.adaptation.createdAt,
                });
            } else {
                setAdaptation(null);
            }

            toast.success(`Análisis listo: ${data.analysis.matchScore} % de coincidencia`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error inesperado");
        } finally {
            setIsRunning(false);
        }
    }

    async function handleCreateApplication() {
        if (!selectedVacancy || !analysis) return;
        setIsCreatingApp(true);
        try {
            const response = await fetch("/api/jobs/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vacancyId: selectedVacancy.id,
                    analysisId: analysis.id,
                    adaptationId: adaptation?.id,
                    cvVersionId: adaptation?.adaptedCvVersionId || cvVersionId,
                }),
            });
            const data = await parseJsonResponse<{ id: string }>(response);
            if (!response.ok || !data) {
                throw new Error("No se pudo crear la postulación");
            }
            toast.success("Postulación creada");
            startTransition(() => router.push("/admin/jobs/pipeline"));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error inesperado");
        } finally {
            setIsCreatingApp(false);
        }
    }

    function handleSelectVacancy(id: string) {
        if (!id) return;
        router.push(`/admin/jobs/analysis?vacancyId=${id}`);
    }

    // Sin vacante elegida: solo el selector
    if (!selectedVacancy) {
        return (
            <div className="max-w-2xl space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--txt)]">Análisis y adaptación</h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">
                        Elige una vacante para medir cuánto calza con tu CV.
                    </p>
                </div>

                {vacancyOptions.length === 0 ? (
                    <p className="border-t border-[var(--linea)] py-6 text-[var(--mut)]">
                        No tienes vacantes activas.{" "}
                        <Link href="/admin/jobs/search" className={`${ENLACE} underline`}>
                            Buscar vacantes
                        </Link>
                    </p>
                ) : (
                    <div>
                        <label htmlFor={`${id}-vacante`} className={ETIQUETA}>Vacante</label>
                        <select
                            id={`${id}-vacante`}
                            onChange={(e) => handleSelectVacancy(e.target.value)}
                            defaultValue=""
                            className={CAMPO}
                        >
                            <option value="" disabled>
                                Elige una vacante…
                            </option>
                            {vacancyOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.title}, {v.company}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <header className="flex flex-col gap-4 border-b border-[var(--linea)] pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                        <SourceBadge source={selectedVacancy.source} />
                        {selectedVacancy.sourceUrl && (
                            <a
                                href={selectedVacancy.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`${ENLACE} text-sm`}
                            >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                                Ver publicación
                                <span className="sr-only">(se abre en otra pestaña)</span>
                            </a>
                        )}
                    </div>
                    <h2 className="text-xl font-semibold leading-snug text-[var(--txt)]">{selectedVacancy.title}</h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">
                        {selectedVacancy.company}
                        {selectedVacancy.location ? `, ${selectedVacancy.location}` : ""}
                    </p>
                </div>
                <div className="w-full lg:w-72">
                    <label htmlFor={`${id}-cambiar`} className={ETIQUETA}>Cambiar de vacante</label>
                    <select
                        id={`${id}-cambiar`}
                        onChange={(e) => handleSelectVacancy(e.target.value)}
                        value={selectedVacancy.id}
                        className={CAMPO}
                    >
                        {vacancyOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.title}, {v.company}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            <AnalysisControls
                cvVersions={cvVersions}
                cvVersionId={cvVersionId}
                mode={mode}
                aiProvider={aiProvider}
                aiModel={aiModel}
                isRunning={isRunning}
                disabled={isRunning}
                onCvVersionChange={setCvVersionId}
                onModeChange={setMode}
                onAiProviderChange={setAiProvider}
                onAiModelChange={setAiModel}
                onRun={handleRunAnalysis}
            />

            <div>
                {analysis ? (
                    <div className="space-y-10">
                        <section aria-labelledby={`${id}-resultado`}>
                            <h3 id={`${id}-resultado`} className={`${TITULO} mb-3 flex flex-wrap items-baseline justify-between gap-x-3`}>
                                Resultado del análisis
                                <time dateTime={analysis.createdAt} className="font-mono text-xs font-medium">
                                    {formatDate(analysis.createdAt)}
                                </time>
                            </h3>
                            <div className="border-t border-[var(--linea)] pt-5">
                                <MatchScoreGauge score={analysis.matchScore} />
                                {analysis.summary && (
                                    <p className="mt-5 max-w-[70ch] text-sm leading-relaxed text-[var(--mut)]">
                                        {analysis.summary}
                                    </p>
                                )}
                            </div>
                        </section>

                        <SkillsComparison
                            matched={analysis.matchedSkills}
                            recommended={analysis.recommendedSkills}
                            missing={analysis.missingSkills}
                        />

                        {adaptation && (
                            <AdaptationPreview
                                mode={adaptation.mode}
                                appliedChanges={adaptation.appliedChanges}
                                adaptedCvVersionId={adaptation.adaptedCvVersionId}
                            />
                        )}

                        <LearningPlanCard
                            learningPlan={analysis.learningPlan}
                            recommendations={analysis.recommendations}
                        />

                        <div className="border-t border-[var(--linea)] pt-6">
                            <button
                                type="button"
                                onClick={handleCreateApplication}
                                disabled={isCreatingApp}
                                className={`${BOTON} w-full sm:w-auto`}
                            >
                                {isCreatingApp ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Creando postulación…
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4" aria-hidden="true" />
                                        Crear postulación y pasar a seguimiento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="border-t border-[var(--linea)] py-6 text-[var(--mut)]">
                        Ejecuta el análisis para ver la compatibilidad con tu CV.
                    </p>
                )}
            </div>
        </div>
    );
}
