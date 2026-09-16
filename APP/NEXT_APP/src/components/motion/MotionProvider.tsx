"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

type Config = ComponentType<{ reducedMotion?: "user" | "always" | "never"; transition?: object; children: ReactNode }>;

/**
 * `reducedMotion="user"` hace que todo framer-motion del sitio respete la preferencia
 * del sistema sin tocar cada componente.
 *
 * El envoltorio llega tarde a propósito: está en el layout raíz, así que importarlo de
 * forma normal metía framer-motion (129 KB en crudo) en el paquete inicial de todas las
 * páginas, aunque la mayoría no anime nada antes de hidratar. Los hijos se pintan
 * enseguida y, cuando la biblioteca llega, quedan envueltos por su configuración.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    const [Config, setConfig] = useState<Config | null>(null);

    useEffect(() => {
        let vivo = true;
        const pedir = () => {
            import("framer-motion")
                .then((m) => { if (vivo) setConfig(() => m.MotionConfig as unknown as Config); })
                .catch(() => { /* sin la configuración global, cada componente sigue su camino */ });
        };
        let ocioso: number | null = null;
        let reloj: number | null = null;
        if (typeof window.requestIdleCallback === "function") ocioso = window.requestIdleCallback(pedir, { timeout: 2500 });
        else reloj = window.setTimeout(pedir, 400);
        return () => {
            vivo = false;
            if (ocioso !== null) window.cancelIdleCallback(ocioso);
            if (reloj !== null) window.clearTimeout(reloj);
        };
    }, []);

    if (!Config) return <>{children}</>;
    return (
        <Config reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}>
            {children}
        </Config>
    );
}
