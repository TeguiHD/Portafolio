"use client";

import { useId } from "react";
import { FileText, Briefcase, FolderGit2, Tag, ExternalLink, CircleX } from "lucide-react";
import Link from "next/link";
import { CHIP, ENLACE, TITULO } from "../../estilos";

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
    const id = useId();
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
        <section aria-labelledby={`${id}-t`} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--linea)] pb-2">
                <h3 id={`${id}-t`} className={`${TITULO} flex items-baseline gap-2`}>
                    Adaptación del CV
                    <span className="rounded-md border border-[var(--linea)] px-1.5 py-0.5 text-xs font-medium text-[var(--mut)]">
                        {mode === "AUTO" ? "Automática" : "Asistida"}
                    </span>
                </h3>
                {mode === "AUTO" && adaptedCvVersionId && (
                    <Link href={`/admin/cv-editor?versionId=${adaptedCvVersionId}`} className={`${ENLACE} text-sm`}>
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        Abrir la versión adaptada en Currículum
                    </Link>
                )}
            </div>

            {aiError && (
                <p className="flex items-start gap-2.5 text-sm text-[var(--txt)]">
                    <CircleX className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>La IA no pudo generar el plan ({aiError}). Se aplicaron solo los ajustes fijos, sin IA.</span>
                </p>
            )}

            {!hasPlan && !aiError && (
                <p className="text-sm text-[var(--mut)]">
                    {aiUsed === false
                        ? "No se usó IA en esta adaptación (solo ajustes fijos)."
                        : "La IA no propuso cambios."}
                </p>
            )}

            {hasPlan && (
                <div className="space-y-6">
                    {plan?.title && (
                        <ChangeItem
                            icon={<FileText className="size-4" aria-hidden="true" />}
                            label="Título"
                            newValue={plan.title}
                        />
                    )}

                    {plan?.summary && (
                        <ChangeItem
                            icon={<FileText className="size-4" aria-hidden="true" />}
                            label="Resumen profesional"
                            newValue={plan.summary}
                        />
                    )}

                    {plan?.experiencePatches && plan.experiencePatches.length > 0 && (
                        <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--txt)]">
                                <Briefcase className="size-4 text-[var(--mut)]" aria-hidden="true" />
                                Experiencias adaptadas
                                <span className="font-mono text-xs text-[var(--mut)]">{plan.experiencePatches.length}</span>
                            </h4>
                            <ul className="border-t border-[var(--linea)]">
                                {plan.experiencePatches.map((patch, idx) => (
                                    <li key={`exp-${idx}`} className="space-y-2 border-b border-[var(--linea)] py-3">
                                        <p className="font-mono text-xs text-[var(--mut)]">Experiencia n.º {patch.sortOrder + 1}</p>
                                        {patch.description && (
                                            <p className="whitespace-pre-wrap text-sm text-[var(--txt)]">{patch.description}</p>
                                        )}
                                        {patch.achievements && patch.achievements.length > 0 && (
                                            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--txt)] marker:text-[var(--mut)]">
                                                {patch.achievements.map((ach, aIdx) => (
                                                    <li key={aIdx}>{ach}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {plan?.projectPatches && plan.projectPatches.length > 0 && (
                        <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--txt)]">
                                <FolderGit2 className="size-4 text-[var(--mut)]" aria-hidden="true" />
                                Proyectos adaptados
                                <span className="font-mono text-xs text-[var(--mut)]">{plan.projectPatches.length}</span>
                            </h4>
                            <ul className="border-t border-[var(--linea)]">
                                {plan.projectPatches.map((patch, idx) => (
                                    <li key={`proj-${idx}`} className="space-y-2 border-b border-[var(--linea)] py-3">
                                        <p className="font-mono text-xs text-[var(--mut)]">Proyecto n.º {patch.sortOrder + 1}</p>
                                        {patch.description && (
                                            <p className="whitespace-pre-wrap text-sm text-[var(--txt)]">{patch.description}</p>
                                        )}
                                        {patch.technologies && patch.technologies.length > 0 && (
                                            <ul className="flex flex-wrap gap-1.5">
                                                {patch.technologies.map((tech) => (
                                                    <li key={tech} className={CHIP}>{tech}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {plan?.keywordHighlights && plan.keywordHighlights.length > 0 && (
                        <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--txt)]">
                                <Tag className="size-4 text-[var(--mut)]" aria-hidden="true" />
                                Palabras clave resaltadas
                            </h4>
                            <ul className="flex flex-wrap gap-1.5">
                                {plan.keywordHighlights.map((kw) => (
                                    <li key={kw} className="rounded-md bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] px-2 py-0.5 text-xs text-[var(--txt)]">
                                        {kw}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {plan?.rationale && plan.rationale.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-medium text-[var(--txt)]">Por qué se adaptó así</h4>
                            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--txt)] marker:font-mono marker:text-xs marker:text-[var(--mut)]">
                                {plan.rationale.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}
        </section>
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
        <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--txt)]">
                <span className="text-[var(--mut)]">{icon}</span>
                {label}
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--mut)]">{newValue}</p>
        </div>
    );
}
