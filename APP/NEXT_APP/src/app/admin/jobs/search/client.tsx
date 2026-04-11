"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Briefcase, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { ImportForm } from "./components/ImportForm";
import { ManualVacancyForm } from "./components/ManualVacancyForm";
import { VacancyFilters } from "./components/VacancyFilters";
import { VacancyCard } from "./components/VacancyCard";
import { matchSearch } from "../utils";
import { SOURCE_LABELS } from "../types";
import type { CvVersionOption, VacancyItem } from "../types";

const PAGE_SIZE = 9;

export default function SearchClient({
    initialVacancies,
    cvVersions,
}: {
    initialVacancies: VacancyItem[];
    cvVersions: CvVersionOption[];
}) {
    const router = useRouter();
    const [vacancies] = useState<VacancyItem[]>(initialVacancies);

    const [search, setSearch] = useState("");
    const [sourcesFilter, setSourcesFilter] = useState<string[]>([]);
    const [minMatch, setMinMatch] = useState(0);
    const [page, setPage] = useState(1);

    const availableSources = useMemo(
        () => Array.from(new Set(vacancies.map((v) => v.source))).sort(),
        [vacancies]
    );

    const filteredVacancies = useMemo(() => {
        return vacancies.filter((vacancy) => {
            if (sourcesFilter.length > 0 && !sourcesFilter.includes(vacancy.source)) return false;
            const score = vacancy.analyses[0]?.matchScore ?? 0;
            if (score < minMatch) return false;
            return matchSearch(search, [
                vacancy.title,
                vacancy.company,
                vacancy.location,
                SOURCE_LABELS[vacancy.source] || vacancy.source,
            ]);
        });
    }, [vacancies, search, sourcesFilter, minMatch]);

    const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
    const handleSourcesChange = useCallback((v: string[]) => { setSourcesFilter(v); setPage(1); }, []);
    const handleMinMatchChange = useCallback((v: number) => { setMinMatch(v); setPage(1); }, []);

    const totalPages = Math.max(1, Math.ceil(filteredVacancies.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedVacancies = filteredVacancies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const reload = useCallback(() => { router.refresh(); }, [router]);

    const hasCv = cvVersions.length > 0;

    return (
        <div className="space-y-6">
            {!hasCv && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
                    No tienes versiones de CV. Crea una en el{" "}
                    <a href="/admin/cv-editor" className="underline font-semibold">
                        Editor CV
                    </a>{" "}
                    antes de ejecutar un análisis.
                </div>
            )}

            {/* Import + Manual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ImportForm onImported={reload} />
                <ManualVacancyForm onCreated={reload} />
            </div>

            {/* Filters */}
            <VacancyFilters
                search={search}
                sources={sourcesFilter}
                minMatch={minMatch}
                availableSources={availableSources}
                onSearchChange={handleSearchChange}
                onSourcesChange={handleSourcesChange}
                onMinMatchChange={handleMinMatchChange}
            />

            {/* Vacancies list */}
            <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-accent-1" />
                        Vacantes
                    </h2>
                    <span className="text-xs text-neutral-500 font-mono">
                        {filteredVacancies.length} resultado{filteredVacancies.length !== 1 ? "s" : ""}
                        {filteredVacancies.length !== vacancies.length && ` de ${vacancies.length}`}
                    </span>
                </div>

                {filteredVacancies.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/40 p-12 text-center">
                        <Inbox className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                        <p className="text-sm text-neutral-400">
                            {vacancies.length === 0
                                ? "Aún no tienes vacantes. Importa una desde una URL o crea una manualmente."
                                : "No hay vacantes que coincidan con los filtros actuales."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            <AnimatePresence mode="popLayout">
                                {pagedVacancies.map((vacancy) => (
                                    <VacancyCard key={vacancy.id} vacancy={vacancy} />
                                ))}
                            </AnimatePresence>
                        </div>

                        {totalPages > 1 && (
                            <Pagination
                                page={safePage}
                                totalPages={totalPages}
                                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                                onPage={setPage}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    onPrev,
    onNext,
    onPage,
}: {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    onPage: (p: number) => void;
}) {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex items-center justify-center gap-1.5 pt-2">
            <button
                onClick={onPrev}
                disabled={page === 1}
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-9 text-center text-xs text-neutral-600">
                        …
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPage(p as number)}
                        className={`w-9 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                            p === page
                                ? "border-accent-1/50 bg-accent-1/10 text-accent-1"
                                : "border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20"
                        }`}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                onClick={onNext}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
