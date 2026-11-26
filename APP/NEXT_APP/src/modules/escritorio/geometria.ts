/**
 * Geometría de las ventanas del modo escritorio: el área libre, el encaje en los bordes y los límites que impiden que
 * una ventana quede fuera de alcance. Funciones puras (tests/e2e/escritorio-logica.spec.ts).
 */
export interface Rect { x: number; y: number; w: number; h: number }
export type Zona = "izq" | "der" | "max";

export const MIN_ANCHO = 360;
export const MIN_ALTO = 240;
/** Lo que ocupa la cápsula de tareas de abajo, con sus márgenes (px). */
export const RESERVA_CAPSULA = 84;
/** La barra de tareas del celular (px). */
export const RESERVA_CELULAR = 64;
/** A esta distancia del borde de la pantalla (px), soltar una ventana la encaja. */
const BORDE = 4;
/** Lo que una ventana deja siempre a la vista si se la arrastra hacia un costado (px). */
const ASOMA = 120;
/** El alto del título: nunca queda bajo la barra de tareas (px). */
const TITULO = 44;

const entre = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** El espacio para las ventanas: la pantalla menos la barra de tareas. */
export function areaUtil(ancho: number, alto: number, celular = false): Rect {
    if (celular) return { x: 0, y: 0, w: ancho, h: Math.max(0, alto - RESERVA_CELULAR) };
    return { x: 10, y: 10, w: Math.max(0, ancho - 20), h: Math.max(0, alto - 10 - RESERVA_CAPSULA) };
}

/** Dónde se encaja una ventana que se suelta con el puntero en (x, y): a un costado, arriba (maximizada) o en ninguna parte. */
export function zonaEncaje(x: number, y: number, ancho: number): Zona | null {
    if (x <= BORDE) return "izq";
    if (x >= ancho - 1 - BORDE) return "der";
    if (y <= BORDE) return "max";
    return null;
}

/** El rectángulo de cada zona: la mitad izquierda, la derecha (con un hueco entre ambas) o toda el área. */
export function rectZona(zona: Zona, a: Rect, hueco = 8): Rect {
    if (zona === "max") return { ...a };
    const w = Math.floor((a.w - hueco) / 2);
    return zona === "izq" ? { x: a.x, y: a.y, w, h: a.h } : { x: a.x + a.w - w, y: a.y, w, h: a.h };
}

/** La misma ventana, con un tamaño posible y siempre alcanzable: el título dentro del área y un trozo a la vista. */
export function contener(r: Rect, a: Rect): Rect {
    const w = entre(r.w, MIN_ANCHO, a.w), h = entre(r.h, MIN_ALTO, a.h);
    return { w, h, x: entre(r.x, a.x - w + ASOMA, a.x + a.w - ASOMA), y: entre(r.y, a.y, a.y + a.h - TITULO) };
}

/** Dónde aparece la ventana número n: centrada, un poco más arriba que el medio y escalonada con las anteriores. */
export function posicionInicial(n: number, w: number, h: number, a: Rect): Rect {
    const ancho = Math.min(w, a.w), alto = Math.min(h, a.h), paso = n % 6;
    const x = Math.round(a.x + (a.w - ancho) / 2 + (paso - 2) * 28), y = Math.round(a.y + Math.max(0, (a.h - alto) / 3) + paso * 24);
    return { w: ancho, h: alto, x: entre(x, a.x, a.x + a.w - ancho), y: entre(y, a.y, a.y + a.h - alto) };
}
