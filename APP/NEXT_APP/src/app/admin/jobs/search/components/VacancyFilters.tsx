"use client";

import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { SOURCE_LABELS } from "../../types";

export function VacancyFilters({
    search,
    sources,
    minMatch,
    availableSources,
    onSearchChange,
    onSourcesChange,
    onMinMatchChange,
}: {
    search: string;
    sources: string[];
    minMatch: number;
    availableSources: string[];
    onSearchChange: (value: string) => void;
    onSourcesChange: (sources: string[]) => void;
    onMinMatchChange: (value: number) => void;
}) {
    const activeFilterCount = sources.length + (minMatch > 0 ? 1 : 0);

    function toggleSource(src: string) {
        if (sources.includes(src)) {
            onSourcesChange(sources.filter((s) => s !== src));
        } else {
            onSourcesChange([...sources, src]);
        }
    }

    function clearFilters() {
        onSourcesChange([]);
        onMinMatchChange(0);
    }

    return (
        <div className="space-y-3">
            {/* Top bar: search + filter toggle */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar título, empresa, ubicación..."
                        className="w-full rounded-xl bg-[#0f172a] border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-accent-1/40 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Inline advanced filters */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/60 backdrop-blur-xl p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-200">Filtros avanzados</span>
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-accent-1 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </div>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3 h-3" /> Limpiar
                        </button>
                    )}
                </div>

                {/* Source chips */}
                {availableSources.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                            Plataforma
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {availableSources.map((src) => {
                                const active = sources.includes(src);
                                return (
                                    <button
                                        key={src}
                                        onClick={() => toggleSource(src)}
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                            active
                                                ? "bg-accent-1/15 border-accent-1/40 text-accent-1 shadow-sm"
                                                : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-neutral-200 hover:border-white/20"
                                        }`}
                                    >
                                        {active && <Check className="w-3 h-3" />}
                                        {SOURCE_LABELS[src] || src}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Match score slider */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                            Match mínimo
                        </p>
                        <span
                            className={`text-sm font-bold tabular-nums ${
                                minMatch >= 70
                                    ? "text-emerald-400"
                                    : minMatch >= 40
                                    ? "text-amber-400"
                                    : "text-neutral-400"
                            }`}
                        >
                            {minMatch > 0 ? `${minMatch}%` : "Cualquiera"}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={minMatch}
                        onChange={(e) => onMinMatchChange(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-accent-1 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-600 font-medium">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
