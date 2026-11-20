"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Link2, ChevronLeft, ChevronRight, Plus, TriangleAlert } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { ImportForm } from "./components/ImportForm";
import { ManualVacancyForm } from "./components/ManualVacancyForm";
import { AdvancedFiltersModal } from "./components/VacancyFilters";
import { VacancyCard } from "./components/VacancyCard";
import { matchSearch } from "../utils";
import { SOURCE_LABELS } from "../types";
import type { WorkMode, CvVersionOption, VacancyItem } from "../types";
import { BOTON, BOTON_SEC, BOTON_ICONO, CAMPO, ENLACE, FOCO } from "../estilos";

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
    // Se lee de las props (no de un useState) para que router.refresh() muestre la vacante recién importada.
    const vacancies = initialVacancies;
    const id = useId();

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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--txt)]">Buscar vacantes</h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">
                        Reúne ofertas y mide cuánto calzan con tu CV.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setModal("manual")} className={BOTON_SEC}>
                        <Plus className="size-4" aria-hidden="true" />
                        Agregar a mano
                    </button>
                    <button type="button" onClick={() => setModal("import")} className={BOTON}>
                        <Link2 className="size-4" aria-hidden="true" />
                        Importar desde URL
                    </button>
                </div>
            </div>

            {!hasCv && (
                <p className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-[var(--txt)]">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <span>
                        Aún no tienes versiones de CV. Crea una en{" "}
                        <a href="/admin/cv-editor" className={`${ENLACE} underline`}>Currículum</a>{" "}
                        antes de analizar una vacante.
                    </span>
                </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <label htmlFor={`${id}-buscar`} className="sr-only">Buscar por cargo, empresa o lugar</label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mut)]" aria-hidden="true" />
                    <input
                        id={`${id}-buscar`}
                        type="search"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Buscar cargo, empresa o lugar"
                        className={`${CAMPO} pl-9`}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className={BOTON_SEC}
                >
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    Filtros
                    {activeFilterCount > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--acento)] px-1.5 font-mono text-xs font-semibold text-[var(--acento-tinta)]">
                            {activeFilterCount}
                            <span className="sr-only"> activos</span>
                        </span>
                    )}
                </button>
            </div>

            <p aria-live="polite" className="font-mono text-xs text-[var(--mut)]">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                {filtered.length !== vacancies.length && ` de ${vacancies.length}`}
            </p>

            {filtered.length === 0 ? (
                <div className="border-t border-[var(--linea)] py-10">
                    <p className="text-base font-medium text-[var(--txt)]">
                        {vacancies.length === 0 ? "Aún no tienes vacantes." : "Ninguna vacante coincide."}
                    </p>
                    <p className="mt-1 text-sm text-[var(--mut)]">
                        {vacancies.length === 0
                            ? "Importa una desde su URL o agrégala a mano."
                            : "Prueba con otra búsqueda o ajusta los filtros."}
                    </p>
                    {vacancies.length === 0 && (
                        <button type="button" onClick={() => setModal("import")} className={`${BOTON} mt-5`}>
                            Importar la primera vacante
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <ul className="border-t border-[var(--linea)]">
                        {paged.map((vacancy) => (
                            <VacancyCard key={vacancy.id} vacancy={vacancy} />
                        ))}
                    </ul>

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

            {modal === "import" && (
                <DialogoFormulario
                    titulo="Importar desde URL"
                    descripcion="Pega el enlace de una oferta y se extraen sus datos."
                    alCerrar={() => setModal("none")}
                >
                    {(cerrar) => <ImportForm onImported={() => { cerrar(); reload(); }} onCancel={cerrar} />}
                </DialogoFormulario>
            )}

            {modal === "manual" && (
                <DialogoFormulario
                    titulo="Agregar vacante a mano"
                    descripcion="Para ofertas sin enlace, como las que llegan por mensaje."
                    alCerrar={() => setModal("none")}
                >
                    {(cerrar) => <ManualVacancyForm onCreated={() => { cerrar(); reload(); }} onCancel={cerrar} />}
                </DialogoFormulario>
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
        <nav aria-label="Páginas de resultados" className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            <button type="button" onClick={onPrev} disabled={page === 1} aria-label="Página anterior" className={BOTON_ICONO}>
                <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`e-${i}`} aria-hidden="true" className="w-6 text-center text-sm text-[var(--mut)]">…</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onPage(p)}
                        aria-current={p === page ? "page" : undefined}
                        aria-label={`Página ${p}`}
                        className={`inline-flex size-11 items-center justify-center rounded-lg font-mono text-sm tabular-nums transition-colors duration-150 sm:size-10 ${
                            p === page
                                ? "bg-[color-mix(in_srgb,var(--acento)_13%,transparent)] font-semibold text-[var(--txt)]"
                                : "text-[var(--mut)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] hover:text-[var(--txt)]"
                        } ${FOCO}`}
                    >
                        {p}
                    </button>
                )
            )}
            <button type="button" onClick={onNext} disabled={page === totalPages} aria-label="Página siguiente" className={BOTON_ICONO}>
                <ChevronRight className="size-4" aria-hidden="true" />
            </button>
        </nav>
    );
}
