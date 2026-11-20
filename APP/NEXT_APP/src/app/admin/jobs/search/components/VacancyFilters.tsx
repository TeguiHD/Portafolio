"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { SOURCE_LABELS, WORK_MODE_LABELS } from "../../types";
import type { WorkMode } from "../../types";
import { BOTON, BOTON_SEC, INTERRUPTOR } from "../../estilos";

const WORK_MODES: WorkMode[] = ["REMOTE", "HYBRID", "ONSITE"];

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

/** Filtros de la búsqueda en un <dialog> nativo; se aplican en vivo y «Ver resultados» solo cierra. */
export function AdvancedFiltersModal({ isOpen, onClose, filters, availableSources, onFiltersChange }: Props) {
    if (!isOpen) return null;
    return (
        <DialogoFormulario titulo="Filtros" descripcion="Los cambios se aplican al instante." alCerrar={onClose} ancho="max-w-2xl">
            {(cerrar) => (
                <Filtros filters={filters} availableSources={availableSources} onFiltersChange={onFiltersChange} cerrar={cerrar} />
            )}
        </DialogoFormulario>
    );
}

function Filtros({
    filters,
    availableSources,
    onFiltersChange,
    cerrar,
}: Pick<Props, "filters" | "availableSources" | "onFiltersChange"> & { cerrar: () => void }) {
    const id = useId();

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
        <div className="space-y-6">
            <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-sm font-medium text-[var(--txt)]">Portal de origen</legend>
                {availableSources.length === 0 ? (
                    <p className="text-sm text-[var(--mut)]">Aún no hay vacantes para filtrar.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {availableSources.map((src) => (
                            <button
                                key={src}
                                type="button"
                                aria-pressed={filters.sources.includes(src)}
                                onClick={() => toggleSource(src)}
                                className={INTERRUPTOR}
                            >
                                {filters.sources.includes(src) && <Check className="size-3.5" aria-hidden="true" />}
                                {SOURCE_LABELS[src] || src}
                            </button>
                        ))}
                    </div>
                )}
            </fieldset>

            <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-sm font-medium text-[var(--txt)]">Modalidad</legend>
                <div className="flex flex-wrap gap-2">
                    {WORK_MODES.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            aria-pressed={filters.workModes.includes(mode)}
                            onClick={() => toggleWorkMode(mode)}
                            className={INTERRUPTOR}
                        >
                            {filters.workModes.includes(mode) && <Check className="size-3.5" aria-hidden="true" />}
                            {WORK_MODE_LABELS[mode]}
                        </button>
                    ))}
                </div>
            </fieldset>

            <div>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                    <label htmlFor={`${id}-min`} className="text-sm font-medium text-[var(--txt)]">
                        Coincidencia mínima
                    </label>
                    <output htmlFor={`${id}-min`} className="font-mono text-base font-semibold tabular-nums text-[var(--txt)]">
                        {filters.minMatch}%
                    </output>
                </div>
                <input
                    id={`${id}-min`}
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={filters.minMatch}
                    onChange={(e) => onFiltersChange({ ...filters, minMatch: parseInt(e.target.value, 10) })}
                    aria-describedby={`${id}-min-ayuda`}
                    className="h-11 w-full cursor-pointer accent-[var(--acento)] sm:h-8"
                />
                <p id={`${id}-min-ayuda`} className="mt-1 flex justify-between text-xs text-[var(--mut)]">
                    <span>0 %: todas</span>
                    <span>100 %: calce total</span>
                </p>
                <p className="mt-2 text-xs text-[var(--mut)]">Las vacantes sin análisis cuentan como 0 %.</p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--linea)] pt-4 sm:flex-row sm:justify-between">
                <button type="button" onClick={clearAll} className={BOTON_SEC}>
                    Limpiar filtros
                </button>
                <button type="button" onClick={cerrar} className={BOTON} autoFocus>
                    Ver resultados
                    <Check className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
