import type { App } from "./apps";
import type { Rect, Zona } from "./geometria";

export interface VentanaAbierta {
    id: string;
    app: App;
    r: Rect;
    /** El tamaño y lugar antes de encajarla o maximizarla, para volver a él. */
    previo: Rect | null;
    zona: Zona | null;
    min: boolean;
    /** Orden de apilado: la de z más alto (sin minimizar) es la activa. */
    z: number;
    /** Mientras la materia escribe su nombre, todavía no se ve. */
    naciendo: boolean;
    cerrando: boolean;
    /** Si al aparecer se lleva el foco (abierta por la persona, no restaurada de la sesión). */
    foco: boolean;
}

export interface ProyectoEscritorio {
    id: string;
    titulo: string;
    tipo: string;
    texto: string;
    imagen: string;
    imagenAlt: string;
    cta: string;
    href: string;
    externo: boolean;
}

export type Fondo = "olas" | "clima" | "firma" | "quieto";

export const FONDOS: { id: Fondo; nombre: string }[] = [
    { id: "olas", nombre: "Materia en olas" }, { id: "clima", nombre: "Clima de Santiago" }, { id: "firma", nombre: "Firma" }, { id: "quieto", nombre: "Quieto" },
];

/** Lo que una ventana le pide al escritorio. */
export interface AccionesVentana {
    area(): Rect;
    enfocar(id: string): void;
    mover(id: string, r: Rect): void;
    encajar(id: string, zona: Zona, desde: Rect): void;
    alternarMax(id: string): void;
    minimizar(id: string): void;
    cerrar(id: string): void;
    cerrada(id: string): void;
    cargar(id: string, marco: HTMLIFrameElement): void;
    sacudida(id: string): void;
    guia(z: Zona | null): void;
    moviendo(v: boolean): void;
}
