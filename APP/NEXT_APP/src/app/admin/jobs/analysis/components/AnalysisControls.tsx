"use client";

import { useId } from "react";
import { Play, Loader2, Star, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { AI_MODEL_OPTIONS } from "../../types";
import type { CvVersionOption, AiProviderChoice } from "../../types";
import { timeAgo } from "../../utils";
import { BOTON, CAMPO, ENLACE, ETIQUETA, FOCO, TITULO } from "../../estilos";

const OPCION = `flex min-h-11 flex-col items-start justify-center rounded-lg border border-[var(--linea-2)] px-3 py-2 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] aria-pressed:border-[var(--acento)] aria-pressed:bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`;

export function AnalysisControls({
    cvVersions,
    cvVersionId,
    mode,
    aiProvider,
    aiModel,
    isRunning,
    disabled,
    onCvVersionChange,
    onModeChange,
    onAiProviderChange,
    onAiModelChange,
    onRun,
}: {
    cvVersions: CvVersionOption[];
    cvVersionId: string;
    mode: "ASSISTED" | "AUTO";
    aiProvider: AiProviderChoice;
    aiModel: string;
    isRunning: boolean;
    disabled: boolean;
    onCvVersionChange: (value: string) => void;
    onModeChange: (value: "ASSISTED" | "AUTO") => void;
    onAiProviderChange: (value: AiProviderChoice) => void;
    onAiModelChange: (value: string) => void;
    onRun: () => void;
}) {
    const id = useId();
    const filteredModels = AI_MODEL_OPTIONS.filter(
        (m) => aiProvider === "AUTO" || m.provider === aiProvider
    );

    return (
        <section aria-labelledby={`${id}-t`} className="space-y-6">
            <h3 id={`${id}-t`} className={`${TITULO} border-b border-[var(--linea)] pb-2`}>Configuración del análisis</h3>

            <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-x-3 text-sm font-medium text-[var(--txt)]">
                    Versión del CV
                    <span className="flex items-baseline gap-3 text-xs font-normal text-[var(--mut)]">
                        Últimas 5
                        <Link href="/admin/cv-editor" className={ENLACE}>Abrir Currículum</Link>
                    </span>
                </legend>

                {cvVersions.length === 0 ? (
                    <p className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-[var(--txt)]">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
                        <span>
                            No tienes versiones de CV.{" "}
                            <Link href="/admin/cv-editor" className={`${ENLACE} underline`}>Crea una en Currículum</Link>.
                        </span>
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {cvVersions.map((cv) => (
                            <button
                                key={cv.id}
                                type="button"
                                disabled={disabled}
                                aria-pressed={cvVersionId === cv.id}
                                onClick={() => onCvVersionChange(cv.id)}
                                className={OPCION}
                            >
                                <span className="flex w-full min-w-0 items-center gap-1.5 text-sm font-medium text-[var(--txt)]">
                                    {cv.isDefault && (
                                        <>
                                            <Star className="size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                                            <span className="sr-only">Principal:</span>
                                        </>
                                    )}
                                    <span className="truncate">{cv.name}</span>
                                </span>
                                <span className="font-mono text-xs text-[var(--mut)]">{timeAgo(cv.updatedAt)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </fieldset>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <fieldset className="m-0 border-0 p-0">
                    <legend className={ETIQUETA}>Modo</legend>
                    <div className="grid grid-cols-2 gap-2">
                        <ModeButton
                            active={mode === "ASSISTED"}
                            disabled={disabled}
                            onClick={() => onModeChange("ASSISTED")}
                            label="Asistido"
                            hint="Análisis y plan"
                        />
                        <ModeButton
                            active={mode === "AUTO"}
                            disabled={disabled}
                            onClick={() => onModeChange("AUTO")}
                            label="Automático"
                            hint="Crea una versión del CV"
                        />
                    </div>
                </fieldset>

                <div>
                    <label htmlFor={`${id}-prov`} className={ETIQUETA}>Proveedor de IA</label>
                    <select
                        id={`${id}-prov`}
                        value={aiProvider}
                        onChange={(e) => onAiProviderChange(e.target.value as AiProviderChoice)}
                        disabled={disabled}
                        className={CAMPO}
                    >
                        <option value="AUTO">Automático (reparte la carga)</option>
                        <option value="GROQ">Groq</option>
                        <option value="OPENROUTER">OpenRouter</option>
                    </select>
                </div>

                <div>
                    <label htmlFor={`${id}-modelo`} className={ETIQUETA}>Modelo de IA</label>
                    <select
                        id={`${id}-modelo`}
                        value={aiModel}
                        onChange={(e) => onAiModelChange(e.target.value)}
                        disabled={disabled}
                        className={CAMPO}
                    >
                        <option value="">Modelo por defecto</option>
                        {filteredModels.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <button
                type="button"
                onClick={onRun}
                disabled={disabled || isRunning || !cvVersionId}
                className={`${BOTON} w-full sm:w-auto`}
            >
                {isRunning ? (
                    <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        Ejecutando análisis…
                    </>
                ) : (
                    <>
                        <Play className="size-4" aria-hidden="true" />
                        Ejecutar análisis
                    </>
                )}
            </button>
        </section>
    );
}

function ModeButton({
    active,
    disabled,
    onClick,
    label,
    hint,
}: {
    active: boolean;
    disabled: boolean;
    onClick: () => void;
    label: string;
    hint: string;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={OPCION}>
            <span className="text-sm font-medium text-[var(--txt)]">{label}</span>
            <span className="text-xs text-[var(--mut)]">{hint}</span>
        </button>
    );
}
