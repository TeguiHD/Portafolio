"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Copia al portapapeles. Devuelve false si el navegador lo niega (permiso, iframe sin permiso, contexto inseguro). */
export async function copiarTexto(texto: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch {
        return false;
    }
}

/**
 * Estado de «copiado» para botones: `copiado` guarda la clave del último botón que copió y `fallo` la del que no pudo.
 * Ambos vuelven a null pasado `ms`.
 */
export function useCopiar(ms = 1600) {
    const [copiado, setCopiado] = useState<string | null>(null);
    const [fallo, setFallo] = useState<string | null>(null);
    const reloj = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(reloj.current), []);
    const copiar = useCallback(async (texto: string, clave = "texto") => {
        const ok = await copiarTexto(texto);
        window.clearTimeout(reloj.current);
        setCopiado(ok ? clave : null);
        setFallo(ok ? null : clave);
        reloj.current = window.setTimeout(() => { setCopiado(null); setFallo(null); }, ms);
        return ok;
    }, [ms]);
    return { copiado, fallo, copiar };
}
