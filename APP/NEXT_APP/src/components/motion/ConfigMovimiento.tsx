"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * `reducedMotion="user"` hace que framer-motion respete la preferencia del sistema sin
 * tocar componente por componente.
 *
 * Cuelga de cada zona que ya carga framer (panel, herramientas, secciones diferidas de la
 * portada) y no del layout raíz. Arriba del todo tenía dos caras malas: importarlo de
 * forma normal metía la biblioteca en el paquete inicial de todas las páginas, y traerlo
 * más tarde cambiaba el tipo del elemento que envuelve la página entera, así que React
 * desmontaba y volvía a montar el árbol completo —lienzos, líneas de tiempo y estado—
 * unos segundos después de cargar.
 */
export function ConfigMovimiento({ children }: { children: ReactNode }) {
    return (
        <MotionConfig
            reducedMotion="user"
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        >
            {children}
        </MotionConfig>
    );
}
