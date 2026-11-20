import type { BackgroundProcessor } from "@/components/tools/BackgroundProcessor";

/**
 * Máscara del sujeto para «Encajar al sujeto» del recortador.
 *
 * Corre en el worker de quitar-fondo (BackgroundProcessor). En el hilo principal no funciona en producción:
 * la CSP de la página no concede 'wasm-unsafe-eval' (src/proxy.ts solo lo da a las rutas del visor 3D) y el
 * modelo usa onnxruntime en WebAssembly. El worker se sirve desde /_next/static, que el proxy no toca, así que
 * no hereda esa CSP. Se segmenta una copia de 512 px como máximo: basta para una caja de recorte.
 */

export interface MascaraSujeto {
    alfa: Uint8ClampedArray;
    ancho: number;
    alto: number;
    /** ancho reducido / ancho original */
    escala: number;
}

export type ProgresoSujeto = (etiqueta: string, fraccion: number | null) => void;

export class DetectorNoDisponible extends Error {
    constructor() {
        super("Este navegador no permite ejecutar el detector en segundo plano.");
        this.name = "DetectorNoDisponible";
    }
}

const ETAPAS: Record<string, string> = {
    "compute:decode": "Leyendo la imagen",
    "compute:inference": "Detectando el sujeto",
    "compute:mask": "Generando la máscara",
    "compute:encode": "Preparando la máscara",
};

export function etiquetaProgresoSujeto(clave: string): string {
    if (clave.startsWith("fetch:")) {
        return clave.includes("/models/") ? "Descargando el modelo (la primera vez tarda más)" : "Descargando el motor de detección";
    }
    return ETAPAS[clave] ?? "Preparando el detector";
}

export function esCancelacion(causa: unknown): boolean {
    return causa instanceof DOMException && causa.name === "AbortError";
}

export function mensajeErrorDetector(causa: unknown): string {
    if (causa instanceof DetectorNoDisponible) {
        return "Este navegador no puede ejecutar el detector de sujetos. Usa «Marcar sujeto», pinta encima de lo que quieres conservar y pulsa «Encajar al sujeto».";
    }
    const texto = causa instanceof Error ? causa.message : "";
    if (/fetch|network|load|resource|metadata/i.test(texto)) {
        return "No se pudo descargar el modelo de detección. Revisa tu conexión y vuelve a intentarlo, o usa «Marcar sujeto» y pinta encima del sujeto.";
    }
    return "El detector de sujetos falló en este navegador. Vuelve a intentarlo, o usa «Marcar sujeto» y pinta encima del sujeto.";
}

function lienzo(ancho: number, alto: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    return canvas;
}

/**
 * Alfa del sujeto sobre una copia reducida de `imagen`. Usa el <img> ya decodificado (con la orientación EXIF
 * aplicada, igual que el recortador), no la URL: puede ser data: o blob:.
 */
export async function calcularMascaraSujeto(
    imagen: HTMLImageElement,
    procesador: BackgroundProcessor,
    onProgreso?: ProgresoSujeto,
    maxLado = 512
): Promise<MascaraSujeto> {
    // Sin worker, BackgroundProcessor caería al hilo principal, donde la CSP bloquea el modelo.
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") throw new DetectorNoDisponible();

    const anchoOriginal = imagen.naturalWidth;
    const altoOriginal = imagen.naturalHeight;
    const reduccion = Math.min(1, maxLado / Math.max(anchoOriginal, altoOriginal));
    const ancho = Math.max(1, Math.round(anchoOriginal * reduccion));
    const alto = Math.max(1, Math.round(altoOriginal * reduccion));

    const entrada = lienzo(ancho, alto);
    const contexto = entrada.getContext("2d");
    if (!contexto) throw new Error("No se pudo preparar la imagen para el detector.");
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = "high";
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    const copia = await new Promise<Blob>((resolve, reject) => {
        entrada.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo preparar la imagen para el detector."))), "image/png");
    });
    entrada.width = entrada.height = 0;

    const resultado = await procesador.process(copia, (clave, actual, total) => {
        onProgreso?.(etiquetaProgresoSujeto(clave), total > 0 ? Math.min(1, actual / total) : null);
    });

    const bitmap = await createImageBitmap(resultado);
    const salida = lienzo(ancho, alto);
    try {
        const lectura = salida.getContext("2d", { willReadFrequently: true });
        if (!lectura) throw new Error("No se pudo leer la máscara del sujeto.");
        lectura.drawImage(bitmap, 0, 0, ancho, alto);
        const datos = lectura.getImageData(0, 0, ancho, alto).data;
        const alfa = new Uint8ClampedArray(ancho * alto);
        for (let i = 0; i < alfa.length; i++) alfa[i] = datos[i * 4 + 3];
        return { alfa, ancho, alto, escala: ancho / anchoOriginal };
    } finally {
        bitmap.close();
        salida.width = salida.height = 0;
    }
}
