"use client";

import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export function MesaRail({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
    return <div role="toolbar" aria-label={etiqueta} className={clsx("mesa-rail", className)}>{children}</div>;
}

export function MesaSeparador() { return <span className="mesa-sep" aria-hidden="true" />; }

export function MesaGrupo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return <div role="group" aria-label={etiqueta} className="mesa-seg">{children}</div>;
}

export interface MesaBotonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    /** Nombre accesible. Es lo que leen las pruebas y el lector de pantalla. */
    pista: string;
    /** Se muestra en el tooltip, nunca en el nombre accesible. */
    atajo?: string;
    pulsado?: boolean;
    tono?: "borrar" | "restaurar";
    /** Marca el botón como hecho (el icono de descarga dibuja el check). */
    listo?: boolean;
    /** Pulsar y mantener: true al bajar, false al soltar, salir o perder el foco. */
    onMantener?: (activo: boolean) => void;
}

/** Botón de icono del carril. El tooltip es CSS (data-tip); no se usa title para no duplicarlo. */
export function MesaBoton({ pista, atajo, pulsado, tono, listo, onMantener, className, children, onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur, onClick, ...rest }: MesaBotonProps) {
    const tip = atajo ? `${pista} · ${atajo}` : pista;
    const sostenido = useRef(false);
    const cambiar = (activo: boolean) => {
        if (!onMantener || sostenido.current === activo) return;
        sostenido.current = activo;
        onMantener(activo);
    };
    return (
        <button
            type="button"
            className={clsx("mesa-ib", tono && `mesa-ib-${tono}`, className)}
            aria-label={pista}
            data-tip={tip}
            aria-pressed={pulsado}
            data-listo={listo ? "true" : undefined}
            onPointerDown={event => { onPointerDown?.(event); if (event.button === 0) cambiar(true); }}
            onPointerUp={event => { onPointerUp?.(event); cambiar(false); }}
            onPointerCancel={event => { onPointerCancel?.(event); cambiar(false); }}
            onPointerLeave={event => { onPointerLeave?.(event); cambiar(false); }}
            onKeyDown={event => { onKeyDown?.(event); if (onMantener && (event.key === " " || event.key === "Enter")) { event.preventDefault(); if (!event.repeat) cambiar(true); } }}
            onKeyUp={event => { onKeyUp?.(event); if (event.key === " " || event.key === "Enter") cambiar(false); }}
            onBlur={event => { onBlur?.(event); cambiar(false); }}
            onClick={event => { if (onMantener) { event.preventDefault(); return; } onClick?.(event); }}
            {...rest}
        >
            {children}
        </button>
    );
}

export interface MesaMuestra { id: string; etiqueta: string; css: string }

export function MesaMuestras({ etiqueta, opciones, valor, onCambio, children }: { etiqueta: string; opciones: MesaMuestra[]; valor: string; onCambio: (id: string) => void; children?: ReactNode }) {
    return (
        <div role="group" aria-label={etiqueta} className="mesa-muestras">
            {opciones.map(opcion => (
                <button key={opcion.id} type="button" className={clsx("mesa-muestra", opcion.css === "transparent" && "mesa-muestra-transparente")} style={opcion.css === "transparent" ? undefined : { background: opcion.css }} aria-label={opcion.etiqueta} title={opcion.etiqueta} aria-pressed={valor === opcion.id} onClick={() => onCambio(opcion.id)} />
            ))}
            {children}
        </div>
    );
}
