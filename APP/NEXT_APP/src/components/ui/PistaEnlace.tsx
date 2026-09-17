"use client";

import { useLinkStatus } from "next/link";

/**
 * Señal de «voy» dentro de un enlace de navegación.
 *
 * El blog se arma en el servidor con sus fuentes, así que entre el clic y el cambio de
 * página puede pasar más de un segundo. Sin nada que lo indique, la sensación es que el
 * clic no ha llegado y se acaba pulsando varias veces. Este punto aparece mientras la
 * navegación está en marcha y desaparece sola al llegar.
 *
 * Va dentro del `<Link>` a propósito: `useLinkStatus` lee el estado del enlace que la
 * contiene.
 */
export function PistaEnlace() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="pista-enlace" aria-hidden="true" />;
}
