"use client";

import { Search, Filter } from "lucide-react";

export function PipelineFilters({
    search,
    vacancyFilter,
    minMatch,
    vacancies,
    onSearchChange,
    onVacancyChange,
    onMinMatchChange,
}: {
    search: string;
    vacancyFilter: string;
    minMatch: string;
    vacancies: Array<{ id: string; title: string; company: string }>;
    onSearchChange: (value: string) => void;
    onVacancyChange: (value: string) => void;
    onMinMatchChange: (value: string) => void;
}) {
    return (
        <div className="glass-panel rounded-2xl border border-white/10 p-4 bg-[#0a0f1c]/60 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-300">Filtros del tablero</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar empresa, rol, notas..."
                        className="w-full rounded-xl bg-[#0f172a] border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-accent-1/40 focus:outline-none"
                    />
                </div>

                <select
                    value={vacancyFilter}
                    onChange={(e) => onVacancyChange(e.target.value)}
                    className="w-full rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white focus:border-accent-1/40 focus:outline-none"
                >
                    <option value="ALL">Todas las vacantes</option>
                    {vacancies.map((v) => (
                        <option key={v.id} value={v.id}>
                            {v.title.slice(0, 40)} - {v.company}
                        </option>
                    ))}
                </select>

                <select
                    value={minMatch}
                    onChange={(e) => onMinMatchChange(e.target.value)}
                    className="w-full rounded-xl bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white focus:border-accent-1/40 focus:outline-none"
                >
                    <option value="0">Cualquier match</option>
                    <option value="40">Match &ge; 40%</option>
                    <option value="60">Match &ge; 60%</option>
                    <option value="75">Match &ge; 75%</option>
                </select>
            </div>
        </div>
    );
}
