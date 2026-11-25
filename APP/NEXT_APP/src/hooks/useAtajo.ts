"use client";

import { useSyncExternalStore } from "react";
import { esApple, textoAtajo } from "@/lib/atajo";

const sinCambios = () => () => {};
const plataforma = () => {
    const datos = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    return esApple(datos?.platform || navigator.platform || "");
};

/**
 * El texto del atajo Ctrl/⌘ + tecla para este equipo. El servidor no sabe el sistema y escribe «Ctrl K», lo que ve
 * la mayoría; en Mac, iPhone y iPad cambia a «⌘K» al hidratar, sin descalce entre servidor y navegador.
 */
export function useAtajo(tecla: string): string {
    const apple = useSyncExternalStore(sinCambios, plataforma, () => false);
    return textoAtajo(tecla, apple);
}
