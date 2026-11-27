import type { App } from "./apps";
import { contener, rectZona, type Rect, type Zona } from "./geometria";
import type { Args, VentanaAbierta } from "./tipos";

/**
 * Las ventanas abiertas y cómo cambian (abrir, enfocar, acoplar, minimizar, cerrar…). Funciones puras: las usa el
 * escritorio con useReducer y las prueba tests/e2e/escritorio-logica.spec.ts.
 */
export interface Estado { wins: VentanaAbierta[]; z: number }
export type Accion =
    /** `lanzar`: se abrió de nuevo (un ícono, el inicio, un enlace) y no solo se trajo al frente (la barra de tareas). */
    | { t: "abrir"; app: App; args: Args; r: Rect; zona: Zona | null; foco: boolean; lanzar?: boolean }
    | { t: "enfocar"; id: string }
    | { t: "args"; id: string; args: Args }
    | { t: "mover"; id: string; r: Rect }
    | { t: "encajar"; id: string; zona: Zona; desde: Rect; area: Rect }
    | { t: "alternarMax"; id: string; area: Rect }
    | { t: "minimizar"; id: string }
    | { t: "minimizarOtras"; id: string }
    | { t: "minimizarTodas" }
    | { t: "restaurarVarias"; ids: string[] }
    | { t: "cerrar"; id: string }
    | { t: "quitar"; id: string }
    | { t: "acomodar"; area: Rect; celular: boolean }
    | { t: "restaurar"; wins: VentanaAbierta[] }
    | { t: "vaciar" };

/**
 * Las ventanas se apilan desde 11 y cada una que pasa al frente toma el número siguiente. Pasado el tope se renumeran
 * en el mismo orden: así nunca llegan a la guía de acople (9000), la barra de tareas (9500) ni el bloqueo (9900).
 */
const BASE_Z = 10, TOPE_Z = 1000;
function compactar(wins: VentanaAbierta[]): Estado {
    const puesto = new Map([...wins].sort((x, y) => x.z - y.z).map((w, i) => [w.id, BASE_Z + 1 + i]));
    return { wins: wins.map((w) => ({ ...w, z: puesto.get(w.id) ?? BASE_Z + 1 })), z: BASE_Z + wins.length };
}

export function reducir(antes: Estado, a: Accion): Estado {
    const e = (a.t === "abrir" || a.t === "enfocar") && antes.z >= TOPE_Z ? compactar(antes.wins) : antes;
    const cambiar = (id: string, f: (w: VentanaAbierta) => VentanaAbierta) => e.wins.map((w) => (w.id === id ? f(w) : w));
    switch (a.t) {
        case "abrir": {
            const z = e.z + 1;
            const pedido = { ...(a.app.args ?? {}), ...a.args };
            if (e.wins.some((w) => w.id === a.app.id)) {
                return { z, wins: cambiar(a.app.id, (w) => ({ ...w, args: { ...w.args, ...a.args }, min: false, cerrando: false, z, foco: a.foco, ...(a.lanzar === false ? {} : { pedido, vez: w.vez + 1 }) })) };
            }
            return { z, wins: [...e.wins, { id: a.app.id, app: a.app, args: pedido, pedido, vez: 0, r: a.r, previo: null, zona: a.zona, min: false, z, cerrando: false, foco: a.foco }] };
        }
        case "enfocar": { const z = e.z + 1; return { z, wins: cambiar(a.id, (w) => ({ ...w, min: false, z })) }; }
        case "args": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, args: { ...w.args, ...a.args } })) };
        case "mover": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, r: a.r, zona: null, previo: null })) };
        case "encajar": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, previo: w.zona ? (w.previo ?? a.desde) : a.desde, zona: a.zona, r: rectZona(a.zona, a.area) })) };
        case "alternarMax": return {
            ...e, wins: cambiar(a.id, (w) => (w.zona
                ? { ...w, zona: null, previo: null, r: contener(w.previo ?? { ...w.r, x: w.r.x + 40, y: w.r.y + 40, w: Math.round(w.r.w * 0.7), h: Math.round(w.r.h * 0.7) }, a.area) }
                : { ...w, previo: w.r, zona: "max", r: rectZona("max", a.area) })),
        };
        case "minimizar": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, min: true })) };
        case "minimizarOtras": return { ...e, wins: e.wins.map((w) => (w.id === a.id ? w : { ...w, min: true })) };
        case "minimizarTodas": return { ...e, wins: e.wins.map((w) => ({ ...w, min: true })) };
        case "restaurarVarias": return { ...e, wins: e.wins.map((w) => (a.ids.includes(w.id) ? { ...w, min: false } : w)) };
        case "cerrar": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, cerrando: true })) };
        case "quitar": return { ...e, wins: e.wins.filter((w) => !(w.id === a.id && w.cerrando)) };
        case "acomodar": return {
            ...e, wins: e.wins.map((w) => (a.celular ? { ...w, zona: "max" as const, r: { ...a.area } } : w.zona ? { ...w, r: rectZona(w.zona, a.area) } : { ...w, r: contener(w.r, a.area) })),
        };
        // La sesión guardada vuelve en su orden, con los números desde abajo (una de antes del tope pudo traerlos enormes).
        case "restaurar": return compactar(a.wins);
        case "vaciar": return { ...e, wins: [] };
    }
}

/** La ventana activa: la de más arriba entre las que se ven. */
export const activaDe = (e: Estado) => e.wins.filter((w) => !w.min && !w.cerrando).reduce<VentanaAbierta | null>((m, w) => (!m || w.z > m.z ? w : m), null);
