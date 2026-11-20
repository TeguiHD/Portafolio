"use client";

/**
 * Piezas comunes de las pestañas del editor de Currículum: encabezado de sección, estado vacío y elemento
 * plegable (experiencia, educación, proyecto…). Filas con líneas divisorias, sin tarjetas.
 */

import { useId, type ReactNode } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";
import { FILA_HOVER, FOCO } from "./estilos";

export function SeccionEditor({
    titulo,
    descripcion,
    acciones,
    children,
}: {
    titulo: string;
    descripcion?: string;
    acciones?: ReactNode;
    children: ReactNode;
}) {
    const id = useId();
    return (
        <section aria-labelledby={id} className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id={id} className="text-xl font-semibold text-[var(--txt)]">{titulo}</h2>
                    {descripcion && <p className="mt-1 text-sm text-[var(--mut)]">{descripcion}</p>}
                </div>
                {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
            </div>
            {children}
        </section>
    );
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
    return (
        <div className="border-t border-[var(--linea)] py-10">
            <p className="font-medium text-[var(--txt)]">{titulo}</p>
            {detalle && <p className="mt-1 text-sm text-[var(--mut)]">{detalle}</p>}
        </div>
    );
}

/** Un elemento de la lista: la cabecera abre y cierra sus campos; el botón de al lado lo quita. */
export function ElementoPlegable({
    numero,
    titulo,
    subtitulo,
    abierto,
    alAlternar,
    alEliminar,
    etiquetaEliminar,
    marca,
    children,
}: {
    numero: number;
    titulo: string;
    subtitulo?: ReactNode;
    abierto: boolean;
    alAlternar: () => void;
    alEliminar: () => void;
    /** Nombre accesible del botón de eliminar, p. ej. «Eliminar experiencia 2». */
    etiquetaEliminar: string;
    /** Algo corto en lugar del número (un ícono de premio, por ejemplo). */
    marca?: ReactNode;
    children: ReactNode;
}) {
    const id = useId();
    return (
        <li className="border-b border-[var(--linea)]">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-expanded={abierto}
                    aria-controls={`${id}-panel`}
                    onClick={alAlternar}
                    className={`flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-lg px-1 py-3 text-left ${FILA_HOVER} ${FOCO}`}
                >
                    <span className="flex w-6 shrink-0 justify-center font-mono text-sm tabular-nums text-[var(--mut)]">
                        {marca ?? numero}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[var(--txt)]">{titulo}</span>
                        {subtitulo && <span className="mt-0.5 block truncate text-sm text-[var(--mut)]">{subtitulo}</span>}
                    </span>
                    <ChevronDown
                        className={`size-[18px] shrink-0 text-[var(--mut)] transition-transform duration-150 motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}
                        aria-hidden="true"
                    />
                </button>
                <button
                    type="button"
                    onClick={alEliminar}
                    aria-label={etiquetaEliminar}
                    className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 sm:size-10 ${FOCO}`}
                >
                    <Trash2 className="size-4" aria-hidden="true" />
                </button>
            </div>
            <div id={`${id}-panel`} hidden={!abierto} className="space-y-4 px-1 pb-5 pt-2 sm:pl-11">
                {children}
            </div>
        </li>
    );
}

/** Ficha de una etiqueta con botón para quitarla (logros, tecnologías, habilidades). */
export function Ficha({ texto, alQuitar, etiquetaQuitar }: { texto: string; alQuitar: () => void; etiquetaQuitar: string }) {
    return (
        <li className="inline-flex items-center gap-1 rounded-md border border-[var(--linea-2)] py-0.5 pl-2.5 pr-0.5 text-sm text-[var(--txt)]">
            {texto}
            <button
                type="button"
                onClick={alQuitar}
                aria-label={etiquetaQuitar}
                className={`inline-flex size-11 items-center justify-center rounded text-[var(--mut)] sm:size-8 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 ${FOCO}`}
            >
                <X className="size-3.5" aria-hidden="true" />
            </button>
        </li>
    );
}
