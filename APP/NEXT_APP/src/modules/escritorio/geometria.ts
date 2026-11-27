/**
 * Geometría de las ventanas del modo escritorio, como en Windows 11: el área sobre la barra de tareas, el acople al
 * soltar en un borde (mitades) o en una esquina (cuartos), los diseños de acople (tercios y dos tercios) y los límites
 * que impiden que una ventana quede fuera de alcance. Funciones puras (tests/e2e/escritorio-logica.spec.ts).
 */
export interface Rect { x: number; y: number; w: number; h: number }
/** Mitades, cuartos (superior/inferior, izquierda/derecha), tercios, dos tercios y pantalla completa. */
export type Zona = "izq" | "der" | "si" | "sd" | "ii" | "id" | "t1" | "t2" | "t3" | "t12" | "t23" | "max";
export const ZONAS: Zona[] = ["izq", "der", "si", "sd", "ii", "id", "t1", "t2", "t3", "t12", "t23", "max"];

export const MIN_ANCHO = 360;
export const MIN_ALTO = 240;
/** La barra de tareas (px), como en Windows 11. */
export const ALTO_BARRA = 48;
/** La barra de abajo del celular (px). */
export const RESERVA_CELULAR = 56;
/** A esta distancia del borde de la pantalla (px), soltar una ventana la acopla. */
const BORDE = 4;
/** Cerca de una esquina (px), el acople es a un cuarto. */
const ESQUINA = 48;
/** Lo que una ventana deja siempre a la vista si se la arrastra hacia un costado (px). */
const ASOMA = 120;
/** El alto de la barra de título: nunca queda bajo la barra de tareas (px). */
const TITULO = 32;

const entre = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** El espacio para las ventanas: la pantalla menos la barra de tareas. */
export function areaUtil(ancho: number, alto: number, celular = false): Rect {
    return { x: 0, y: 0, w: Math.max(0, ancho), h: Math.max(0, alto - (celular ? RESERVA_CELULAR : ALTO_BARRA)) };
}

/** Dónde se acopla una ventana que se suelta con el puntero en (x, y), o en ninguna parte. */
export function zonaEncaje(x: number, y: number, ancho: number, alto = Infinity): Zona | null {
    const izq = x <= BORDE, der = x >= ancho - 1 - BORDE;
    if (izq || der) {
        if (y <= ESQUINA) return izq ? "si" : "sd";
        if (y >= alto - ALTO_BARRA - ESQUINA) return izq ? "ii" : "id";
        return izq ? "izq" : "der";
    }
    if (y <= BORDE) return x <= ESQUINA ? "si" : x >= ancho - ESQUINA ? "sd" : "max";
    return null;
}

/** El rectángulo de cada zona. Las piezas se tocan sin huecos y suman el área completa. */
export function rectZona(zona: Zona, a: Rect): Rect {
    const mitad = Math.floor(a.w / 2), medioAlto = Math.floor(a.h / 2), tercio = Math.floor(a.w / 3);
    const { x, y, w, h } = a;
    switch (zona) {
        case "max": return { ...a };
        case "izq": return { x, y, w: mitad, h };
        case "der": return { x: x + mitad, y, w: w - mitad, h };
        case "si": return { x, y, w: mitad, h: medioAlto };
        case "sd": return { x: x + mitad, y, w: w - mitad, h: medioAlto };
        case "ii": return { x, y: y + medioAlto, w: mitad, h: h - medioAlto };
        case "id": return { x: x + mitad, y: y + medioAlto, w: w - mitad, h: h - medioAlto };
        case "t1": return { x, y, w: tercio, h };
        case "t2": return { x: x + tercio, y, w: tercio, h };
        case "t3": return { x: x + 2 * tercio, y, w: w - 2 * tercio, h };
        case "t12": return { x, y, w: 2 * tercio, h };
        case "t23": return { x: x + tercio, y, w: w - tercio, h };
    }
}

/** Los diseños de acople que aparecen al pasar por maximizar, como en Windows 11. */
export const DISENOS: { nombre: string; zonas: Zona[] }[] = [
    { nombre: "Dos mitades", zonas: ["izq", "der"] },
    { nombre: "Dos tercios y un tercio", zonas: ["t12", "t3"] },
    { nombre: "Tres tercios", zonas: ["t1", "t2", "t3"] },
    { nombre: "Cuatro cuartos", zonas: ["si", "sd", "ii", "id"] },
];

export const NOMBRE_ZONA: Record<Zona, string> = {
    izq: "la mitad izquierda", der: "la mitad derecha", si: "el cuarto superior izquierdo", sd: "el cuarto superior derecho",
    ii: "el cuarto inferior izquierdo", id: "el cuarto inferior derecho", t1: "el tercio izquierdo", t2: "el tercio del medio",
    t3: "el tercio derecho", t12: "los dos tercios de la izquierda", t23: "los dos tercios de la derecha", max: "la pantalla completa",
};

/** La misma ventana, con un tamaño posible y siempre alcanzable: el título dentro del área y un trozo a la vista. */
export function contener(r: Rect, a: Rect): Rect {
    const w = entre(r.w, MIN_ANCHO, a.w), h = entre(r.h, MIN_ALTO, a.h);
    return { w, h, x: entre(r.x, a.x - w + ASOMA, a.x + a.w - ASOMA), y: entre(r.y, a.y, a.y + a.h - TITULO) };
}

/** Dónde aparece la ventana número n: centrada, un poco más arriba que el medio y en cascada con las anteriores. */
export function posicionInicial(n: number, w: number, h: number, a: Rect): Rect {
    const ancho = Math.min(w, a.w - 24), alto = Math.min(h, a.h - 24), paso = n % 7;
    const x = Math.round(a.x + (a.w - ancho) / 2 + (paso - 3) * 26), y = Math.round(a.y + Math.max(12, (a.h - alto) / 3) + paso * 26);
    return { w: ancho, h: alto, x: entre(x, a.x, a.x + a.w - ancho), y: entre(y, a.y, a.y + a.h - alto) };
}
