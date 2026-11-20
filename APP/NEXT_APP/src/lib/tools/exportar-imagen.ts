/**
 * Exportación de convertir, comprimir y redimensionar: la misma para una imagen y para un lote.
 */

import { canvasToBlob, drawImageToCanvas, drawableHeight, drawableWidth, type DrawableImage, type DrawFitMode, type ExportMimeType } from "./image-processing";
import { buscarPesoObjetivo } from "./peso-objetivo";
import { etiquetaFormato } from "./firmas-imagen";

export type ModoEstudio = "convertir-imagen" | "comprimir-imagen" | "redimensionar";

export interface AjustesImagen {
    modo: ModoEstudio;
    formato: ExportMimeType;
    /** 10–100. */
    calidad: number;
    /** Comprimir: lado largo máximo en px; 0 = tamaño original. */
    ladoMaximo: number;
    /** Redimensionar. */
    ancho: number;
    alto: number;
    /** En un lote: cada imagen cabe en ancho × alto sin deformarse (si no, todas salen de ancho × alto). */
    proporcionFija: boolean;
    encaje: DrawFitMode;
    rellenar: boolean;
    fondo: string;
    /** Comprimir: peso objetivo en KB (1 KB = 1024 bytes); 0 = sin objetivo. */
    objetivoKb: number;
}

export interface ImagenExportada {
    blob: Blob;
    ancho: number;
    alto: number;
    /** Calidad usada en %, o null si el formato no la tiene (PNG). */
    calidad: number | null;
    objetivo: { bytes: number; logrado: boolean; reducida: boolean } | null;
}

const LADO_MAXIMO = 16_000;
const PIXELES_MAXIMOS = 40_000_000;

export function formatearPeso(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

/** Extensión según el tipo que de verdad entregó el navegador (puede no ser el pedido). */
export function extensionDe(tipo: string): string {
    return tipo === "image/webp" ? "webp" : tipo === "image/jpeg" ? "jpg" : "png";
}

/** Medidas que se pueden exportar (además, el producto no puede pasar de 40 MP). */
export function medidasValidas(ancho: number, alto: number): boolean {
    return Number.isInteger(ancho) && Number.isInteger(alto) && ancho >= 1 && alto >= 1 && ancho <= LADO_MAXIMO && alto <= LADO_MAXIMO;
}

/** El peso objetivo solo aplica al comprimir a un formato con calidad. */
export function usaPesoObjetivo(ajustes: AjustesImagen): boolean {
    return ajustes.modo === "comprimir-imagen" && ajustes.objetivoKb > 0 && ajustes.formato !== "image/png";
}

export function medidasDeSalida(anchoOriginal: number, altoOriginal: number, ajustes: AjustesImagen, enLote: boolean): { ancho: number; alto: number } {
    if (ajustes.modo === "redimensionar") {
        if (!enLote || !ajustes.proporcionFija || !(ajustes.ancho >= 1) || !(ajustes.alto >= 1)) return { ancho: ajustes.ancho, alto: ajustes.alto };
        const escala = Math.min(ajustes.ancho / anchoOriginal, ajustes.alto / altoOriginal);
        return { ancho: Math.max(1, Math.round(anchoOriginal * escala)), alto: Math.max(1, Math.round(altoOriginal * escala)) };
    }
    if (ajustes.modo === "comprimir-imagen" && ajustes.ladoMaximo > 0) {
        const escala = Math.min(1, ajustes.ladoMaximo / Math.max(anchoOriginal, altoOriginal));
        return { ancho: Math.max(1, Math.round(anchoOriginal * escala)), alto: Math.max(1, Math.round(altoOriginal * escala)) };
    }
    return { ancho: anchoOriginal, alto: altoOriginal };
}

/** Mayor lado largo (px) con el que esa imagen, achicada sin deformarse, cabe en 16.000 px por lado y 40 MP. */
export function ladoMaximoPosible(anchoOriginal: number, altoOriginal: number): number {
    const largo = Math.max(anchoOriginal, altoOriginal);
    const corto = Math.min(anchoOriginal, altoOriginal);
    let lado = Math.min(LADO_MAXIMO, largo, Math.floor(Math.sqrt(PIXELES_MAXIMOS * largo / corto)));
    while (lado > 1 && lado * Math.max(1, Math.round(corto * lado / largo)) > PIXELES_MAXIMOS) lado -= 1;
    return lado;
}

/** El aviso dice qué hacer en cada herramienta: Convertir y Comprimir no tienen campos de ancho y alto. */
export function mensajeMedidas(ancho: number, alto: number, ajustes: AjustesImagen, anchoOriginal: number, altoOriginal: number): string | null {
    if (medidasValidas(ancho, alto) && ancho * alto <= PIXELES_MAXIMOS) return null;
    if (ajustes.modo === "redimensionar" || !(ancho >= 1 && alto >= 1)) return "Usa medidas entre 1 y 16.000 px, hasta 40 megapíxeles en total.";
    const megapixeles = (ancho * alto / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 });
    const medida = `La imagen sale de ${ancho} × ${alto} px (${megapixeles} megapíxeles) y el máximo es 16.000 px por lado y 40 megapíxeles.`;
    // Sin punto de miles: es un número para escribir en un campo numérico, donde «6.324» se leería como 6.
    const lado = ladoMaximoPosible(anchoOriginal, altoOriginal);
    return ajustes.modo === "comprimir-imagen"
        ? `${medida} Escribe un lado máximo de ${lado} px o menos.`
        : `${medida} Achícala primero en Redimensionar, o usa Comprimir con un lado máximo de ${lado} px: ahí también eliges el formato.`;
}

/** Suelta la memoria del lienzo al tiro (iOS limita la memoria total de lienzos y no espera al recolector). */
function liberarLienzo(lienzo: HTMLCanvasElement) {
    lienzo.width = 0;
    lienzo.height = 0;
}

function dibujar(imagen: DrawableImage, ancho: number, alto: number, ajustes: AjustesImagen, enLote: boolean): HTMLCanvasElement {
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new Error("No se pudo preparar la imagen.");
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = "high";
    const exacta = ajustes.modo === "redimensionar" && !(enLote && ajustes.proporcionFija);
    drawImageToCanvas(contexto, imagen, {
        width: ancho,
        height: alto,
        fitMode: exacta ? ajustes.encaje : "contain",
        background: (ajustes.modo === "redimensionar" && ajustes.rellenar) || ajustes.formato === "image/jpeg" ? { type: "solid", color: ajustes.fondo } : undefined,
    });
    return lienzo;
}

export async function exportarImagen(
    imagen: DrawableImage,
    ajustes: AjustesImagen,
    { enLote = false, signal }: { enLote?: boolean; signal?: AbortSignal } = {},
): Promise<ImagenExportada> {
    signal?.throwIfAborted();
    const anchoOriginal = drawableWidth(imagen);
    const altoOriginal = drawableHeight(imagen);
    const { ancho, alto } = medidasDeSalida(anchoOriginal, altoOriginal, ajustes, enLote);
    const problema = mensajeMedidas(ancho, alto, ajustes, anchoOriginal, altoOriginal);
    if (problema) throw new Error(problema);
    const lienzos: { actual: HTMLCanvasElement | null } = { actual: null };
    try {
        if (usaPesoObjetivo(ajustes)) {
            const objetivoBytes = Math.round(ajustes.objetivoKb * 1024);
            const busqueda = await buscarPesoObjetivo({
                objetivoBytes,
                ancho,
                alto,
                signal,
                codificar: async (anchoPrueba, altoPrueba, calidad) => {
                    let lienzo = lienzos.actual;
                    if (!lienzo || lienzo.width !== anchoPrueba || lienzo.height !== altoPrueba) {
                        if (lienzo) liberarLienzo(lienzo);
                        lienzo = dibujar(imagen, anchoPrueba, altoPrueba, ajustes, enLote);
                        lienzos.actual = lienzo;
                    }
                    const blob = await canvasToBlob(lienzo, ajustes.formato, calidad);
                    // Si el navegador no sabe codificar el formato, entrega PNG y la calidad deja de importar.
                    if (blob.type && blob.type !== ajustes.formato) throw new Error(`Tu navegador no sabe crear ${etiquetaFormato(ajustes.formato)}. Prueba con JPEG.`);
                    return blob;
                },
            });
            return {
                blob: busqueda.blob,
                ancho: busqueda.ancho,
                alto: busqueda.alto,
                calidad: busqueda.calidad,
                objetivo: { bytes: objetivoBytes, logrado: busqueda.logrado, reducida: busqueda.reducida },
            };
        }
        const lienzo = dibujar(imagen, ancho, alto, ajustes, enLote);
        lienzos.actual = lienzo;
        const blob = await canvasToBlob(lienzo, ajustes.formato, ajustes.calidad / 100);
        signal?.throwIfAborted();
        return { blob, ancho, alto, calidad: blob.type === "image/png" ? null : ajustes.calidad, objetivo: null };
    } finally {
        if (lienzos.actual) liberarLienzo(lienzos.actual);
    }
}
