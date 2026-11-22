"use client";

import { useCallback, useRef } from "react";
import { useCopiar } from "@/lib/tools/copiar";
import { useToolTracking } from "@/hooks/useDebounce";

/** Copiar con aviso y registro de uso (una vez cada 2 s). La visita la registra la carcasa del catálogo, no esto. */
export function useCopiarHerramienta(slug: string) {
    const { copiado, fallo, copiar } = useCopiar(1800);
    const { trackImmediate } = useToolTracking(slug, { trackViewOnMount: false });
    const ultimo = useRef(0);
    const copiarYContar = useCallback(async (texto: string, clave: string) => {
        if (!(await copiar(texto, clave))) return;
        if (Date.now() - ultimo.current > 2000) { ultimo.current = Date.now(); trackImmediate("use", { action: "copy", label: clave }); }
    }, [copiar, trackImmediate]);
    return { copiado, fallo, copiar: copiarYContar };
}

export function IconoCopiar({ hecho }: { hecho: boolean }) {
    return hecho ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
    ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
    );
}

/** Lee un monto escrito a la chilena: «1.250.000», «1250000», «$ 1.250.000», «41.384,81». Null si no es un número ≥ 0. */
export function leerMonto(texto: string): number | null {
    const limpio = texto.replace(/[$\s]/g, "");
    if (!limpio || !/^[\d.,]+$/.test(limpio)) return null;
    // Con coma: la coma es el decimal y los puntos son miles. Sin coma: los puntos son miles.
    const n = Number(limpio.includes(",") ? limpio.replace(/\./g, "").replace(",", ".") : limpio.replace(/\./g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
}
