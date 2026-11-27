"use client";

import type { Ref } from "react";
import { imagenFondo, srcsetFondo, type FondoId } from "./fondos";

/**
 * El fondo de pantalla: una imagen propia (AVIF o WebP del tamaño justo para la pantalla), un color sólido o la materia
 * viva (el lienzo donde corre el motor de partículas, que monta el escritorio solo si se eligió).
 */
export function Fondo({ id, solido, lienzo, frente, prioridad = false }: { id: FondoId; solido: string; lienzo?: Ref<HTMLCanvasElement>; frente?: Ref<HTMLDivElement>; prioridad?: boolean }) {
    if (id === "solido") return <div className="es-fondo" style={{ background: solido }} aria-hidden="true" />;
    if (id === "materia-viva") {
        return (
            <div className="es-fondo es-fondo-vivo" aria-hidden="true">
                <canvas ref={lienzo} className="es-lienzo" />
                <div ref={frente} className="es-frente" />
            </div>
        );
    }
    return (
        <picture className="es-fondo" aria-hidden="true">
            <source type="image/avif" srcSet={srcsetFondo(id, "avif")} sizes="100vw" />
            <source type="image/webp" srcSet={srcsetFondo(id, "webp")} sizes="100vw" />
            <img src={imagenFondo(id, 1920, "webp")} alt="" decoding="async" fetchPriority={prioridad ? "high" : "auto"} />
        </picture>
    );
}
