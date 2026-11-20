import type { ExportMimeType } from "./image-processing";

/** Formatos que el lienzo del navegador sabe codificar. */
export interface FormatoSalida {
    tipo: ExportMimeType;
    nombre: string;
    extension: string;
    conPerdida: boolean;
}

export const FORMATOS_SALIDA: readonly FormatoSalida[] = [
    { tipo: "image/png", nombre: "PNG", extension: "png", conPerdida: false },
    { tipo: "image/jpeg", nombre: "JPEG", extension: "jpg", conPerdida: true },
    { tipo: "image/webp", nombre: "WebP", extension: "webp", conPerdida: true },
];

/**
 * Formato para un tipo MIME. Lo que el lienzo no codifica (GIF, BMP, AVIF…) sale en PNG.
 * Sirve también para leer `blob.type` tras exportar: si el navegador no sabe WebP, entrega PNG.
 */
export function formatoSalida(tipo: string | null | undefined): FormatoSalida {
    const limpio = (tipo ?? "").toLowerCase().split(";")[0].trim();
    const normal = limpio === "image/jpg" || limpio === "image/pjpeg" ? "image/jpeg" : limpio;
    return FORMATOS_SALIDA.find((formato) => formato.tipo === normal) ?? FORMATOS_SALIDA[0];
}

/** Aviso cuando el navegador entregó otro formato que el pedido; null si coincide. */
export function avisoFormato(pedido: FormatoSalida, recibido: FormatoSalida): string | null {
    return pedido.tipo === recibido.tipo ? null : `Tu navegador no exporta ${pedido.nombre}; se descargó en ${recibido.nombre}.`;
}
