"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { BOTON_ICONO } from "../estilos";

interface Props {
    /** Título visible (h2): también es el nombre accesible de la ventana. */
    titulo: ReactNode;
    descripcion?: ReactNode;
    /** Ícono de lucide junto al título. */
    icono?: ReactNode;
    /** Corre cada vez que se cierra (X, Escape, gesto atrás): el padre la desmonta ahí. */
    alCerrar: () => void;
    /** Antes de cerrar con Escape o con la X: devuelve false para seguir abierta (cambios sin guardar). */
    antesDeCerrar?: () => boolean | Promise<boolean>;
    /** Ancho máximo, como clase de Tailwind. */
    ancho?: string;
    /** Ocupa toda la pantalla (editor a pantalla completa). */
    pantallaCompleta?: boolean;
    /** Clases extra del <dialog> que no choquen con las de base (p. ej. un alto fijo). */
    clase?: string;
    /** Sin cabecera: el contenido trae la suya. El título queda solo para lectores de pantalla. */
    sinCabecera?: boolean;
    /** Relleno del cuerpo. */
    cuerpo?: string;
    /** En ventanas de varios pasos: al cambiar, el foco va al campo con `data-autofocus` del paso nuevo o al título. */
    paso?: string;
    children: ReactNode | ((cerrar: () => void) => ReactNode);
}

/**
 * Ventana modal de Propuestas y Clientes con <dialog> nativo, como DialogoFormulario de Comercial pero con cabecera y
 * botón de cerrar: se abre al montarse con showModal(), deja el resto inerte, atrapa el foco, Escape la cierra y al
 * cerrarse el foco vuelve a quien la abrió. Un campo con `data-autofocus` recibe el foco al abrir.
 */
export default function Ventana({
    titulo,
    descripcion,
    icono,
    alCerrar,
    antesDeCerrar,
    ancho = "max-w-lg",
    pantallaCompleta = false,
    clase = "",
    sinCabecera = false,
    cuerpo = "p-4 sm:p-6",
    paso,
    children,
}: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();

    useLayoutEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (!d.open) d.showModal();
        d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        // Si el padre la desmonta sin cerrarla (por ejemplo tras guardar), se cierra igual para que el foco vuelva.
        return () => {
            if (d.open) d.close();
        };
    }, []);

    const pasoAnterior = useRef(paso);
    useEffect(() => {
        if (paso === pasoAnterior.current) return;
        pasoAnterior.current = paso;
        const d = ref.current;
        if (!d?.open) return;
        // El botón que llevó al paso nuevo ya no existe: sin esto el foco quedaría perdido en el documento.
        (d.querySelector<HTMLElement>("[data-autofocus]") ?? document.getElementById(`${id}-t`))?.focus();
    }, [paso, id]);

    const cerrar = useCallback(async () => {
        if (antesDeCerrar && !(await antesDeCerrar())) return;
        ref.current?.close();
    }, [antesDeCerrar]);

    return (
        <dialog
            ref={ref}
            aria-labelledby={`${id}-t`}
            aria-describedby={descripcion ? `${id}-d` : undefined}
            // React hace subir «cancel» y «close» por su árbol: los de una ventana anidada no son de esta.
            onCancel={(e) => {
                if (e.target !== e.currentTarget || !antesDeCerrar) return;
                e.preventDefault();
                void cerrar();
            }}
            // En el doble montaje de desarrollo llega un «close» atrasado con la ventana ya reabierta: se ignora.
            onClose={(e) => {
                if (e.target === e.currentTarget && !ref.current?.open) alCerrar();
            }}
            className={`${pantallaCompleta
                ? "m-0 h-full max-h-none w-full max-w-none rounded-none border-0"
                : `m-auto w-[calc(100%-24px)] ${ancho} max-h-[min(92dvh,900px)] rounded-2xl border border-[var(--linea-2)]`
                } flex-col overflow-hidden bg-[var(--sup)] p-0 text-[var(--txt)] shadow-2xl overscroll-contain open:flex backdrop:bg-black/60 backdrop:overflow-hidden backdrop:overscroll-contain ${clase}`}
        >
            {sinCabecera ? (
                <>
                    <h2 id={`${id}-t`} tabIndex={-1} className="sr-only">{titulo}</h2>
                    {descripcion && <p id={`${id}-d`} className="sr-only">{descripcion}</p>}
                </>
            ) : (
                <header className="flex shrink-0 items-start gap-3 border-b border-[var(--linea)] py-3 pl-4 pr-2 sm:py-4 sm:pl-6 sm:pr-4">
                    {icono && <span aria-hidden="true" className="mt-1 text-[var(--mut)]">{icono}</span>}
                    <div className="min-w-0 flex-1 pt-0.5">
                        <h2 id={`${id}-t`} tabIndex={-1} className="text-lg font-semibold leading-snug text-[var(--txt)] outline-none">{titulo}</h2>
                        {descripcion && <p id={`${id}-d`} className="mt-0.5 text-sm text-[var(--mut)]">{descripcion}</p>}
                    </div>
                    <button type="button" onClick={() => void cerrar()} aria-label="Cerrar" className={BOTON_ICONO}>
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>
            )}
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${cuerpo}`}>
                {typeof children === "function" ? children(() => void cerrar()) : children}
            </div>
        </dialog>
    );
}
