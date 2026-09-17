"use client";

/**
 * Aviso de «llévame a esta sección».
 *
 * Las secciones de la portada se cargan al acercarse a ellas, así que pulsar «Stack» en
 * la barra cuando esa sección todavía es un hueco dejaba a la persona en cualquier sitio.
 * Lo natural sería escuchar `hashchange`, pero la navegación de Next usa `pushState` y
 * ese evento no llega a dispararse nunca. De ahí este aviso explícito: quien pulsa lo
 * lanza y la sección correspondiente se carga y se pone delante.
 */

export const EVENTO_ANCLA = "portada:ancla";

/** El identificador de sección de un `href` como `/#tecnologias`; null si no lleva. */
export function anclaDe(href: string): string | null {
  const i = href.indexOf("#");
  if (i < 0) return null;
  const id = href.slice(i + 1).trim();
  return id.length > 0 ? id : null;
}

export function pedirAncla(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_ANCLA, { detail: id }));
}
