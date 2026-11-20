"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Ventana modal de Usuarios con <dialog> nativo (foco atrapado, Escape, fondo inerte, el foco vuelve a quien la abrió).
 * La controla `abierto`, como los modales de antes: Escape o «Cerrar» llaman a `alCerrar` y el padre la cierra.
 * Si el padre la cierra por su cuenta (tras guardar), `close()` corre aquí y no se vuelve a llamar a `alCerrar`.
 */
export function Dialogo({
    abierto,
    alCerrar,
    titulo,
    subtitulo,
    ancho = "max-w-md",
    children,
}: {
    abierto: boolean;
    alCerrar: () => void;
    titulo: string;
    subtitulo?: string;
    /** Clase de ancho máximo de Tailwind. */
    ancho?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();

    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (abierto && !d.open) d.showModal();
        else if (!abierto && d.open) d.close();
    }, [abierto]);

    return (
        <dialog
            ref={ref}
            aria-labelledby={`${id}-t`}
            onClose={() => { if (abierto) alCerrar(); }}
            className={`m-auto w-[calc(100%-24px)] ${ancho} max-h-[min(92dvh,900px)] overflow-hidden rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl overscroll-contain backdrop:bg-[rgb(4_6_10/0.55)] backdrop:overflow-hidden backdrop:overscroll-contain`}
        >
            {abierto ? (
                <div className="flex max-h-[min(92dvh,900px)] flex-col">
                    <header className="flex items-start justify-between gap-3 border-b border-[var(--linea)] px-5 py-4">
                        <div className="min-w-0">
                            <h2 id={`${id}-t`} className="text-lg font-semibold">{titulo}</h2>
                            {subtitulo ? <p className="mt-0.5 truncate text-sm text-[var(--mut)]">{subtitulo}</p> : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => ref.current?.close()}
                            aria-label="Cerrar"
                            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:size-11"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </header>
                    <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
                </div>
            ) : null}
        </dialog>
    );
}

/** Clases comunes de Usuarios (las mismas del vocabulario del panel). */
export const cls = {
    principal: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--acento-tinta)] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:min-h-11",
    secundario: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--linea-2)] px-4 text-sm font-medium text-[var(--txt)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:min-h-11",
    peligro: "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:min-h-11",
    icono: "grid size-10 shrink-0 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none max-sm:size-11",
    campo: "w-full min-h-10 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-3 text-sm text-[var(--txt)] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] max-sm:min-h-11",
    etiqueta: "mb-1.5 block text-sm font-medium text-[var(--txt)]",
    insignia: "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
} as const;
