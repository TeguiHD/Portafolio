"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Search, Filter, Import, Inbox, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ImportForm } from "./components/ImportForm";
import { ManualVacancyForm } from "./components/ManualVacancyForm";
import { AdvancedFiltersModal } from "./components/VacancyFilters";
import { VacancyCard } from "./components/VacancyCard";
import { matchSearch } from "../utils";
import { SOURCE_LABELS } from "../types";
import type { WorkMode, CvVersionOption, VacancyItem } from "../types";

const PAGE_SIZE = 9;

type ModalState = "none" | "import" | "manual";

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
    const [sources, setSources] = useState<string[]>([]);
    const [workModes, setWorkModes] = useState<WorkMode[]>([]);
    const [minMatch, setMinMatch] = useState(0);
    const [page, setPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [modal, setModal] = useState<ModalState>("none");

    const reload = useCallback(() => router.refresh(), [router]);

    const availableSources = useMemo(
        () => Array.from(new Set(vacancies.map((v) => v.source))).sort(),
        [vacancies]
    );

    const filtered = useMemo(() => {
        return vacancies.filter((v) => {
            if (sources.length > 0 && !sources.includes(v.source)) return false;
            if (workModes.length > 0 && !workModes.includes(v.workMode)) return false;
            const score = v.analyses[0]?.matchScore ?? 0;
            if (score < minMatch) return false;
            return matchSearch(search, [
                v.title,
                v.company,
                v.location,
                SOURCE_LABELS[v.source] || v.source,
            ]);
        });
    }, [vacancies, search, sources, workModes, minMatch]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const activeFilterCount =
        sources.length + workModes.length + (minMatch > 0 ? 1 : 0);

    const hasCv = cvVersions.length > 0;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

            {/* CV warning */}
            {!hasCv && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
                    No tienes versiones de CV. Crea una en el{" "}
                    <a href="/admin/cv-editor" className="underline font-semibold">Editor CV</a>{" "}
                    antes de ejecutar un análisis.
                </div>
            )}

            {/* Page header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-white/10">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Explorador de Vacantes</h2>
                    <p className="text-slate-400 mt-1">Busca ofertas y evalúa compatibilidad determinística.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModal("manual")}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] text-neutral-300 border border-white/10 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Manual
                    </button>
                    <button
                        onClick={() => setModal("import")}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-sm font-semibold hover:bg-cyan-500/25 transition-colors"
                    >
                        <Import className="w-4 h-4" />
                        Importar URL
                    </button>
                </div>
            </div>

            {/* Search + filters row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Buscar rol o empresa..."
                        className="w-full bg-[#05080f] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    />
                </div>
                <button
                    onClick={() => setFiltersOpen(true)}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                        activeFilterCount > 0
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                            : "bg-white/[0.05] border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-cyan-500 text-cyan-950 text-[10px] font-bold">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Count */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-neutral-500 font-mono">
                    {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                    {filtered.length !== vacancies.length && ` de ${vacancies.length}`}
                </span>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c]/40 p-16 text-center">
                    <Inbox className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                    <p className="text-neutral-400 text-lg mb-1">
                        {vacancies.length === 0
                            ? "Aún no tienes vacantes."
                            : "No hay vacantes que coincidan."}
                    </p>
                    <p className="text-neutral-600 text-sm">
                        {vacancies.length === 0
                            ? "Importa una desde una URL o créala manualmente."
                            : "Prueba ajustando los filtros o importa nuevas ofertas."}
                    </p>
                    {vacancies.length === 0 && (
                        <button
                            onClick={() => setModal("import")}
                            className="mt-6 px-5 py-2.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-sm font-semibold hover:bg-cyan-500/25 transition-colors"
                        >
                            Importar primera vacante
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                            {paged.map((vacancy) => (
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

            {/* Advanced filters modal */}
            <AdvancedFiltersModal
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={{ search, sources, workModes, minMatch }}
                availableSources={availableSources}
                onFiltersChange={(f) => {
                    setSources(f.sources);
                    setWorkModes(f.workModes);
                    setMinMatch(f.minMatch);
                    setPage(1);
                }}
            />

            {/* Import modal */}
            {modal === "import" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setModal("none")}>
                    <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <ImportForm onImported={() => { setModal("none"); reload(); }} />
                    </div>
                </div>
            )}

            {/* Manual modal */}
            {modal === "manual" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setModal("none")}>
                    <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <ManualVacancyForm onCreated={() => { setModal("none"); reload(); }} />
                    </div>
                </div>
            )}
        </div>
    );
}

function Pagination({ page, totalPages, onPrev, onNext, onPage }: {
    page: number; totalPages: number;
    onPrev: () => void; onNext: () => void; onPage: (p: number) => void;
}) {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex items-center justify-center gap-1.5 pt-2">
            <button onClick={onPrev} disabled={page === 1}
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
            </button>
            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`e-${i}`} className="w-9 text-center text-xs text-neutral-600">…</span>
                ) : (
                    <button key={p} onClick={() => onPage(p as number)}
                        className={`w-9 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                            p === page
                                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                                : "border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20"
                        }`}>
                        {p}
                    </button>
                )
            )}
            <button onClick={onNext} disabled={page === totalPages}
                className="p-2 rounded-lg border border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
