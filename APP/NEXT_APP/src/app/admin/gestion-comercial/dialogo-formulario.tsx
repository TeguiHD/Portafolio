"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Ventana modal de los formularios de Comercial, con <dialog> nativo: se abre al montarse, atrapa el foco,
 * Escape la cierra y al cerrar devuelve el foco a quien la abrió. `alCerrar` corre siempre que se cierra
 * (botón, Escape o gesto atrás); el padre la desmonta ahí.
 */
export default function DialogoFormulario({
    titulo,
    descripcion,
    alCerrar,
    ancho = "max-w-lg",
    children,
}: {
    titulo: string;
    descripcion?: string;
    alCerrar: () => void;
    /** Clase de ancho máximo de Tailwind. */
    ancho?: string;
    children: (cerrar: () => void) => ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();

    useEffect(() => {
        const d = ref.current;
        if (d && !d.open) d.showModal();
    }, []);

    const cerrar = useCallback(() => ref.current?.close(), []);

    return (
        <dialog
            ref={ref}
            onClose={alCerrar}
            aria-labelledby={`${id}-t`}
            aria-describedby={descripcion ? `${id}-d` : undefined}
            className={`m-auto w-[calc(100%-24px)] ${ancho} max-h-[min(92dvh,900px)] rounded-2xl border border-[var(--linea-2)] bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl overscroll-contain backdrop:bg-black/60 backdrop:overflow-hidden backdrop:overscroll-contain`}
        >
            <div className="p-4 sm:p-6">
                <h2 id={`${id}-t`} className="text-lg font-semibold mb-1">{titulo}</h2>
                {descripcion && <p id={`${id}-d`} className="text-sm text-[var(--mut)] mb-3">{descripcion}</p>}
                <div className={descripcion ? "" : "mt-3"}>{children(cerrar)}</div>
            </div>
        </dialog>
    );
}
