"use client";

import { Play, Loader2, Cpu, FileText, Settings2, Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AI_MODEL_OPTIONS } from "../../types";
import type { CvVersionOption, AiProviderChoice } from "../../types";
import { timeAgo } from "../../utils";

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
    const filteredModels = AI_MODEL_OPTIONS.filter(
        (m) => aiProvider === "AUTO" || m.provider === aiProvider
    );

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-5 space-y-5">
            <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-accent-1" />
                <h3 className="text-sm font-bold text-white">Configuracion del analisis</h3>
            </div>

            {/* CV Version History */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                        <FileText className="w-3.5 h-3.5" />
                        Historial de CV (ultimas 5 versiones)
                    </span>
                    <Link
                        href="/admin/cv-editor"
                        className="inline-flex items-center gap-1 text-[10px] text-accent-1 hover:text-accent-1/80"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Editor CV
                    </Link>
                </div>

                {cvVersions.length === 0 ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                        No tienes versiones de CV.{" "}
                        <Link href="/admin/cv-editor" className="underline font-semibold">
                            Crea una aqui
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {cvVersions.map((cv) => (
                            <button
                                key={cv.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onCvVersionChange(cv.id)}
                                className={`text-left rounded-xl border px-3 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                    cvVersionId === cv.id
                                        ? "border-accent-1/50 bg-accent-1/10"
                                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                                }`}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    {cv.isDefault && (
                                        <Star className="w-3 h-3 text-amber-300 shrink-0" />
                                    )}
                                    <span
                                        className={`text-xs font-semibold truncate ${
                                            cvVersionId === cv.id ? "text-accent-1" : "text-white"
                                        }`}
                                    >
                                        {cv.name}
                                    </span>
                                </div>
                                <div className="text-[10px] text-neutral-500">
                                    {timeAgo(cv.updatedAt)}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Mode + AI settings row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Modo" icon={<Cpu className="w-3.5 h-3.5" />}>
                    <div className="grid grid-cols-2 gap-2">
                        <ModeButton
                            active={mode === "ASSISTED"}
                            disabled={disabled}
                            onClick={() => onModeChange("ASSISTED")}
                            label="ASSISTED"
                            hint="Analisis + plan"
                        />
                        <ModeButton
                            active={mode === "AUTO"}
                            disabled={disabled}
                            onClick={() => onModeChange("AUTO")}
                            label="AUTO"
                            hint="Crea version CV"
                        />
                    </div>
                </Field>

                <Field label="Proveedor IA">
                    <select
                        value={aiProvider}
                        onChange={(e) => onAiProviderChange(e.target.value as AiProviderChoice)}
                        disabled={disabled}
                        className="w-full rounded-lg border border-white/10 bg-[#0a0f1c] px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-1/50 disabled:opacity-50"
                    >
                        <option value="AUTO">Auto (load-balanced)</option>
                        <option value="GROQ">Groq</option>
                        <option value="OPENROUTER">OpenRouter</option>
                    </select>
                </Field>

                <Field label="Modelo IA">
                    <select
                        value={aiModel}
                        onChange={(e) => onAiModelChange(e.target.value)}
                        disabled={disabled}
                        className="w-full rounded-lg border border-white/10 bg-[#0a0f1c] px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-1/50 disabled:opacity-50"
                    >
                        <option value="">Modelo por defecto</option>
                        {filteredModels.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <button
                type="button"
                onClick={onRun}
                disabled={disabled || isRunning || !cvVersionId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent-1 hover:bg-accent-1/90 disabled:bg-accent-1/30 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold text-[#0a0f1c] transition-colors shadow-lg shadow-accent-1/10"
            >
                {isRunning ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Ejecutando analisis...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4" />
                        Ejecutar analisis
                    </>
                )}
            </button>
        </div>
    );
}

function Field({
    label,
    icon,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                {icon}
                {label}
            </span>
            {children}
        </label>
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
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                    ? "border-accent-1/50 bg-accent-1/10 text-accent-1"
                    : "border-white/10 bg-[#0a0f1c] text-neutral-400 hover:border-white/20"
            }`}
        >
            <div className="text-xs font-bold">{label}</div>
            <div className="text-[10px] text-neutral-500">{hint}</div>
        </button>
    );
}
