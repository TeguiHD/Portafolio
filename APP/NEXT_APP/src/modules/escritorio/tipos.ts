import type { App } from "./apps";
import type { Rect, Zona } from "./geometria";

/** Lo que una app recibe al abrirse (la carpeta del Explorador, la foto de Fotos…). */
export type Args = Record<string, string | number>;

export interface VentanaAbierta {
    id: string;
    app: App;
    /** Con qué está abierta (la foto que muestra Fotos…): lo pedido al abrirla más lo que la app fue guardando. */
    args: Args;
    /** Lo pedido la última vez que se abrió (la carpeta de un acceso, la sección de Configuración), y cuántas veces se
     * volvió a abrir ya abierta: con cada pedido nuevo la app va a lo que se pidió, aunque sea lo mismo de antes. */
    pedido: Args;
    vez: number;
    r: Rect;
    /** El tamaño y lugar antes de acoplarla o maximizarla, para volver a él. */
    previo: Rect | null;
    zona: Zona | null;
    min: boolean;
    /** Orden de apilado: la de z más alto (sin minimizar) es la activa. */
    z: number;
    cerrando: boolean;
    /** Si al aparecer se lleva el foco (abierta por la persona, no restaurada de la sesión). */
    foco: boolean;
}

export interface HerramientaEscritorio { slug: string; nombre: string; familia: string; ancho?: "estrecha" | "ancha"; descripcion?: string; donde?: string }
export interface ServicioEscritorio { slug: string; nombre: string; resumen: string }
export interface VistaProyecto { nombre: string; escritorio: string; celular?: string }
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
    /** El dominio, para el acceso directo al sitio real. */
    direccion?: string;
    vistas?: VistaProyecto[];
}

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
    acerca(id: string): void;
}
