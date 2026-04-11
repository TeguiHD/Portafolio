"use client";

import { Sparkles, FileText, Briefcase, FolderGit2, Tag, ExternalLink } from "lucide-react";
import Link from "next/link";

type ExperiencePatch = {
    sortOrder: number;
    description?: string;
    achievements?: string[];
};

type ProjectPatch = {
    sortOrder: number;
    description?: string;
    technologies?: string[];
};

type AdaptationPlan = {
    title?: string;
    summary?: string;
    experiencePatches?: ExperiencePatch[];
    projectPatches?: ProjectPatch[];
    keywordHighlights?: string[];
    rationale?: string[];
};

type AppliedChanges = {
    ai?: {
        used?: boolean;
        provider?: string | null;
        model?: string | null;
        error?: string | null;
        plan?: AdaptationPlan | null;
    };
    titleUpdated?: boolean;
    summaryUpdated?: boolean;
    keywordHighlights?: string[];
    rationale?: string[];
};

export function AdaptationPreview({
    mode,
    appliedChanges,
    adaptedCvVersionId,
}: {
    mode: "ASSISTED" | "AUTO";
    appliedChanges: unknown;
    adaptedCvVersionId: string | null;
}) {
    const changes = (appliedChanges || {}) as AppliedChanges;
    const plan = changes.ai?.plan || null;
    const aiUsed = changes.ai?.used;
    const aiError = changes.ai?.error;

    const hasPlan =
        plan &&
        (plan.title ||
            plan.summary ||
            (plan.experiencePatches && plan.experiencePatches.length > 0) ||
            (plan.projectPatches && plan.projectPatches.length > 0) ||
            (plan.keywordHighlights && plan.keywordHighlights.length > 0));

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <h3 className="text-sm font-bold text-white">Adaptacion de CV</h3>
                    <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                            mode === "AUTO"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
                        }`}
                    >
                        {mode}
                    </span>
                </div>
                {mode === "AUTO" && adaptedCvVersionId && (
                    <Link
                        href={`/admin/cv-editor?versionId=${adaptedCvVersionId}`}
                        className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Abrir en editor
                    </Link>
                )}
            </div>

            {aiError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                    La IA no pudo generar el plan: {aiError}. Se aplicaron solo ajustes deterministicos.
                </div>
            )}

            {!hasPlan && !aiError && (
                <p className="text-xs text-neutral-500 italic">
                    {aiUsed === false
                        ? "No se ejecuto adaptacion IA (modo solo determinista)."
                        : "Sin cambios propuestos por la IA."}
                </p>
            )}

            {hasPlan && (
                <div className="space-y-3">
                    {plan?.title && (
                        <ChangeItem
                            icon={<FileText className="w-3.5 h-3.5" />}
                            label="Titulo"
                            newValue={plan.title}
                        />
                    )}

                    {plan?.summary && (
                        <ChangeItem
                            icon={<FileText className="w-3.5 h-3.5" />}
                            label="Resumen profesional"
                            newValue={plan.summary}
                        />
                    )}

                    {plan?.experiencePatches && plan.experiencePatches.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                                <Briefcase className="w-3.5 h-3.5" />
                                Experiencias adaptadas ({plan.experiencePatches.length})
                            </div>
                            {plan.experiencePatches.map((patch, idx) => (
                                <div
                                    key={`exp-${idx}`}
                                    className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 space-y-2"
                                >
                                    <div className="text-[10px] font-mono text-cyan-400/70">
                                        Experiencia #{patch.sortOrder + 1}
                                    </div>
                                    {patch.description && (
                                        <p className="text-xs text-cyan-100 whitespace-pre-wrap">
                                            {patch.description}
                                        </p>
                                    )}
                                    {patch.achievements && patch.achievements.length > 0 && (
                                        <ul className="space-y-1 mt-1">
                                            {patch.achievements.map((ach, aIdx) => (
                                                <li
                                                    key={aIdx}
                                                    className="text-xs text-cyan-100/90 flex gap-1.5"
                                                >
                                                    <span className="text-cyan-300">&rarr;</span>
                                                    <span>{ach}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {plan?.projectPatches && plan.projectPatches.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                                <FolderGit2 className="w-3.5 h-3.5" />
                                Proyectos adaptados ({plan.projectPatches.length})
                            </div>
                            {plan.projectPatches.map((patch, idx) => (
                                <div
                                    key={`proj-${idx}`}
                                    className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 space-y-2"
                                >
                                    <div className="text-[10px] font-mono text-cyan-400/70">
                                        Proyecto #{patch.sortOrder + 1}
                                    </div>
                                    {patch.description && (
                                        <p className="text-xs text-cyan-100 whitespace-pre-wrap">
                                            {patch.description}
                                        </p>
                                    )}
                                    {patch.technologies && patch.technologies.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {patch.technologies.map((tech) => (
                                                <span
                                                    key={tech}
                                                    className="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {plan?.keywordHighlights && plan.keywordHighlights.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                                <Tag className="w-3.5 h-3.5" />
                                Keywords resaltadas
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {plan.keywordHighlights.map((kw) => (
                                    <span
                                        key={kw}
                                        className="text-xs px-2 py-0.5 rounded-md border border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
                                    >
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {plan?.rationale && plan.rationale.length > 0 && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1.5">
                            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                                Justificacion IA
                            </div>
                            <ul className="space-y-1">
                                {plan.rationale.map((reason, idx) => (
                                    <li
                                        key={idx}
                                        className="text-xs text-neutral-300 flex gap-2"
                                    >
                                        <span className="text-neutral-500">{idx + 1}.</span>
                                        <span>{reason}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ChangeItem({
    icon,
    label,
    newValue,
}: {
    icon: React.ReactNode;
    label: string;
    newValue: string;
}) {
    return (
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-cyan-400/70 font-semibold">
                {icon}
                {label}
            </div>
            <p className="text-xs text-cyan-100 whitespace-pre-wrap">{newValue}</p>
        </div>
    );
}
