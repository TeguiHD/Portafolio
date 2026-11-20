import type { ReactNode } from "react";
import { BAJADA, GIRA, TITULO } from "./estilos";

/**
 * Piezas de presentación que repiten todas las pantallas de Finanzas (sin estado ni efectos: sirven en servidor y
 * en cliente). Las clases sueltas están en ./estilos.
 */

/** Cabecera de una página: título, frase y acciones (a la derecha en escritorio, debajo en celular). */
export function CabeceraFinanzas({ titulo, bajada, children }: { titulo: ReactNode; bajada?: ReactNode; children?: ReactNode }) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className={TITULO}>{titulo}</h1>
                {bajada ? <p className={BAJADA}>{bajada}</p> : null}
            </div>
            {children ? <div className="flex flex-wrap gap-2 sm:shrink-0">{children}</div> : null}
        </header>
    );
}

export interface Cifra {
    nombre: string;
    valor: ReactNode;
    /** Texto pequeño junto al valor (variación, cantidad…). */
    nota?: ReactNode;
    /** Pinta el valor con el color de sube o baja del tema. */
    tono?: "sube" | "baja";
}

/**
 * Franja de cifras como la de «Hoy»: valor grande arriba, nombre debajo y líneas entre ellas.
 * En celular van de a dos por fila.
 */
export function CifrasFinanzas({ cifras, etiqueta }: { cifras: Cifra[]; etiqueta?: string }) {
    return (
        <dl aria-label={etiqueta} className="m-0 grid grid-cols-2 border-y border-[var(--linea)] md:flex">
            {cifras.map((c) => (
                <div
                    key={c.nombre}
                    className="flex min-w-0 flex-1 flex-col-reverse justify-end gap-1 border-[var(--linea)] py-3.5 pr-3 pl-4 max-md:odd:pl-0.5 max-md:even:border-l max-md:[&:nth-child(n+3)]:border-t md:pr-5 md:pl-5 md:first:pl-0.5 md:[&:not(:first-child)]:border-l"
                >
                    <dt className="text-[13.5px] text-[var(--mut)]">{c.nombre}</dt>
                    <dd className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2">
                        <span className={`truncate text-2xl font-bold tracking-[-0.03em] tabular-nums sm:text-[28px] ${c.tono === "baja" ? "text-[var(--baja)]" : c.tono === "sube" ? "text-[var(--sube)]" : "text-[var(--txt)]"}`}>
                            {c.valor}
                        </span>
                        {c.nota ? <small className="text-[13px] font-medium text-[var(--mut)] tabular-nums">{c.nota}</small> : null}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Aviso de carga de una lista o pantalla. */
export function CargandoFinanzas({ texto }: { texto: string }) {
    return (
        <p role="status" className="flex min-h-[240px] items-center justify-center gap-3 text-[var(--mut)]">
            <span aria-hidden="true" className={GIRA} />
            {texto}
        </p>
    );
}
