"use client";

import { X, SlidersHorizontal, Briefcase, MapPin, BrainCircuit, Check } from "lucide-react";
import { SOURCE_LABELS, WORK_MODE_LABELS } from "../../types";
import type { WorkMode } from "../../types";

const WORK_MODES: WorkMode[] = ["REMOTE", "HYBRID", "ONSITE"];

const WORK_MODE_ACTIVE: Record<WorkMode, string> = {
    REMOTE:      "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    HYBRID:      "bg-amber-500/20  border-amber-500/50  text-amber-300",
    ONSITE:      "bg-sky-500/20    border-sky-500/50    text-sky-300",
    UNSPECIFIED: "bg-white/10 border-white/20 text-white",
};

export type VacancyFiltersState = {
    search: string;
    sources: string[];
    workModes: WorkMode[];
    minMatch: number;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    filters: VacancyFiltersState;
    availableSources: string[];
    onFiltersChange: (f: VacancyFiltersState) => void;
}

export function AdvancedFiltersModal({ isOpen, onClose, filters, availableSources, onFiltersChange }: Props) {
    if (!isOpen) return null;

    function toggleSource(src: string) {
        const next = filters.sources.includes(src)
            ? filters.sources.filter((s) => s !== src)
            : [...filters.sources, src];
        onFiltersChange({ ...filters, sources: next });
    }

    function toggleWorkMode(mode: WorkMode) {
        const next = filters.workModes.includes(mode)
            ? filters.workModes.filter((m) => m !== mode)
            : [...filters.workModes, mode];
        onFiltersChange({ ...filters, workModes: next });
    }

    function clearAll() {
        onFiltersChange({ ...filters, sources: [], workModes: [], minMatch: 0 });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="bg-[#05080f] border border-white/10 rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                        Filtros Avanzados
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-7 overflow-y-auto max-h-[60vh]">

                    {/* Sources */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                            <Briefcase className="w-4 h-4 text-indigo-400" />
                            Plataforma de Origen
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableSources.map((src) => (
                                <button
                                    key={src}
                                    onClick={() => toggleSource(src)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                        filters.sources.includes(src)
                                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                            : "bg-white/[0.04] border-white/10 text-neutral-400 hover:bg-white/10 hover:text-slate-200"
                                    }`}
                                >
                                    {SOURCE_LABELS[src] || src}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Work mode */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            Modalidad de Trabajo
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {WORK_MODES.map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => toggleWorkMode(mode)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                        filters.workModes.includes(mode)
                                            ? WORK_MODE_ACTIVE[mode]
                                            : "bg-white/[0.04] border-white/10 text-neutral-400 hover:bg-white/10 hover:text-slate-200"
                                    }`}
                                >
                                    {WORK_MODE_LABELS[mode]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Score slider */}
                    <div className="space-y-3 bg-white/[0.03] p-5 rounded-xl border border-white/[0.06]">
                        <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                                <BrainCircuit className="w-4 h-4 text-purple-400" />
                                Match Score Mínimo
                            </label>
                            <span className="text-lg font-bold text-purple-400">{filters.minMatch}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={filters.minMatch}
                            onChange={(e) => onFiltersChange({ ...filters, minMatch: parseInt(e.target.value) })}
                            className="w-full h-2 bg-[#0a0f1c] rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-600 font-medium px-0.5">
                            <span>0% (Todas)</span>
                            <span>50% (Media)</span>
                            <span>100% (Perfectas)</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 bg-[#05080f] flex justify-between items-center">
                    <button
                        onClick={clearAll}
                        className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                    >
                        Limpiar filtros
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all flex items-center gap-2"
                    >
                        Ver Resultados <Check className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
