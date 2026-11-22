"use client";

import { useSyncExternalStore } from "react";

/**
 * Instalar la app desde el sitio. Chrome ya casi no muestra su aviso automático en Android y en iPhone no existe:
 * se guarda el evento `beforeinstallprompt` para ofrecer un botón propio (menú, pie e InvitacionInstalar), y en iPhone se
 * explica cómo agregarla al inicio. El evento se anula: la invitación propia reemplaza la barrita de Chrome y así no salen
 * dos avisos. Donde exista `navigator.install()` (Web Install API) se prefiere ese.
 */
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let evento: EventoInstalar | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); evento = e as EventoInstalar; avisar(); });
    addEventListener("appinstalled", () => { evento = null; avisar(); });
}

const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };

/** "instalar": hay botón; "ios": iPhone/iPad en Safari sin instalar (se explica el paso a paso); null: nada que ofrecer. */
export type ModoInstalar = "instalar" | "ios" | null;

/** Web Install API: todavía no la trae ningún navegador estable; cuando llegue, se usa sin cambiar nada más. */
const conWebInstall = () => typeof (Navigator.prototype as { install?: unknown }).install === "function";

function modoActual(): ModoInstalar {
    const nav = navigator as Navigator & { standalone?: boolean };
    const instalada = nav.standalone === true || matchMedia("(display-mode: standalone)").matches;
    if (evento || (conWebInstall() && !instalada)) return "instalar";
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // El navegador interno de Instagram, Facebook, LinkedIn o LINE no tiene «Agregar a inicio»: ofrecerlo era un paso imposible.
    const enApp = /FBAN|FBAV|Instagram|LinkedInApp|\bLine\//.test(navigator.userAgent);
    return ios && !instalada && !enApp ? "ios" : null;
}

export function useInstalar(): ModoInstalar {
    return useSyncExternalStore(suscribir, modoActual, () => null);
}

/** Abre el diálogo del navegador. Se usa una sola vez por evento: después el botón desaparece. */
export async function instalar(): Promise<void> {
    if (conWebInstall()) {
        // Se llama dentro del clic (sin esperar nada antes): fuera de él, el navegador lo rechaza.
        try { await (navigator as Navigator & { install: () => Promise<unknown> }).install(); } catch { /* cancelado o sin permiso */ }
        evento = null; avisar(); return;
    }
    const e = evento; if (!e) return;
    evento = null; avisar();
    try { await e.prompt(); await e.userChoice; } catch { /* el navegador lo rechazó: no hay nada más que hacer */ }
}
