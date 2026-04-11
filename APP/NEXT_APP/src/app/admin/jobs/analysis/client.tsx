"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { GitCompareArrows, ExternalLink, Send, Loader2, Target } from "lucide-react";
import { MatchScoreGauge } from "./components/MatchScoreGauge";
import { SkillsComparison } from "./components/SkillsComparison";
import { LearningPlanCard } from "./components/LearningPlanCard";
import { AdaptationPreview } from "./components/AdaptationPreview";
import { AnalysisControls } from "./components/AnalysisControls";
import { SourceBadge } from "../components/SourceBadge";
import { parseJsonResponse, formatDate } from "../utils";
import type { CvVersionOption, AiProviderChoice } from "../types";
import type { AnalysisSummary, AdaptationSummary } from "./page";

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
            toast.error("Selecciona una version de CV");
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
                throw new Error("No se pudo ejecutar el analisis");
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

            toast.success(`Analisis listo - Match ${data.analysis.matchScore}%`);
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
                throw new Error("No se pudo crear la postulacion");
            }
            toast.success("Postulacion creada");
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

    // No vacancy selected: show vacancy picker
    if (!selectedVacancy) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <GitCompareArrows className="w-5 h-5 text-accent-1" />
                    <h2 className="text-lg font-semibold text-white">Analisis & Adaptacion</h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-6 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-white mb-1">Selecciona una vacante</h3>
                        <p className="text-xs text-neutral-500">
                            Elige una vacante para ejecutar un analisis de compatibilidad contra tu CV.
                        </p>
                    </div>

                    {vacancyOptions.length === 0 ? (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                            <p className="text-sm text-neutral-400 mb-3">
                                No tienes vacantes activas.
                            </p>
                            <Link
                                href="/admin/jobs/search"
                                className="inline-flex items-center gap-1 text-sm text-accent-1 hover:text-accent-1/80"
                            >
                                Ir a Buscar Vacantes
                            </Link>
                        </div>
                    ) : (
                        <select
                            onChange={(e) => handleSelectVacancy(e.target.value)}
                            defaultValue=""
                            className="w-full rounded-lg border border-white/10 bg-[#0a0f1c] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-1/50"
                        >
                            <option value="" disabled>
                                Elige una vacante...
                            </option>
                            {vacancyOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.title} - {v.company}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Vacancy header */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <SourceBadge source={selectedVacancy.source} />
                            {selectedVacancy.sourceUrl && (
                                <a
                                    href={selectedVacancy.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-accent-1"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Ver publicacion
                                </a>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-white truncate">
                            {selectedVacancy.title}
                        </h2>
                        <p className="text-sm text-neutral-400">
                            {selectedVacancy.company}
                            {selectedVacancy.location ? ` · ${selectedVacancy.location}` : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            onChange={(e) => handleSelectVacancy(e.target.value)}
                            value={selectedVacancy.id}
                            className="rounded-lg border border-white/10 bg-[#0a0f1c] px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-1/50 max-w-[240px]"
                        >
                            {vacancyOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.title} - {v.company}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Controls */}
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

            {/* Results */}
            {analysis ? (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-accent-1" />
                                <h3 className="text-sm font-bold text-white">Resultado del analisis</h3>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono">
                                {formatDate(analysis.createdAt)}
                            </span>
                        </div>
                        <MatchScoreGauge score={analysis.matchScore} />
                        {analysis.summary && (
                            <p className="text-xs text-neutral-400 mt-4 pt-4 border-t border-white/5">
                                {analysis.summary}
                            </p>
                        )}
                    </div>

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

                    <button
                        type="button"
                        onClick={handleCreateApplication}
                        disabled={isCreatingApp}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 px-4 py-3 text-sm font-bold text-emerald-300 transition-colors"
                    >
                        {isCreatingApp ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creando postulacion...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Crear postulacion y mover al pipeline
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/40 backdrop-blur-xl p-8 text-center">
                    <p className="text-sm text-neutral-400">
                        Ejecuta el analisis para ver el resultado de compatibilidad.
                    </p>
                </div>
            )}
        </div>
    );
}
