/**
 * Alfa del sujeto de una imagen, en el navegador, vía @imgly/background-removal
 * (la misma librería y configuración que usa "quitar fondo"). Se trabaja sobre
 * una copia reducida (≤ maxSide px): la inferencia tarda segundos en vez de
 * decenas, y una caja de recorte no necesita más resolución. `scale` permite
 * devolver la caja a píxeles de la imagen original. Resultado cacheado por
 * imagen: el usuario puede pintar y reajustar sin volver a segmentar.
 */

export interface SubjectAlpha {
    alpha: Uint8ClampedArray;
    width: number;
    height: number;
    /** reducida / original */
    scale: number;
}

export type SubjectProgress = (label: string, ratio: number | null) => void;

const PROGRESS_LABELS: Record<string, string> = {
    "fetch:model": "Descargando modelo (solo la primera vez)",
    "compute:decode": "Leyendo imagen",
    "compute:inference": "Detectando sujeto",
    "compute:mask": "Generando máscara",
    "compute:encode": "Preparando resultado",
};

const cache = new Map<string, Promise<SubjectAlpha>>();

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo leer la imagen"));
        img.src = src;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo preparar la imagen"))), "image/png");
    });
}

export function getSubjectAlpha(imageSrc: string, maxSide = 512, onProgress?: SubjectProgress): Promise<SubjectAlpha> {
    const key = `${maxSide}:${imageSrc}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const job = (async (): Promise<SubjectAlpha> => {
        const img = await loadImage(imageSrc);
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const input = document.createElement("canvas");
        input.width = width;
        input.height = height;
        const ictx = input.getContext("2d");
        if (!ictx) throw new Error("Canvas no disponible");
        ictx.drawImage(img, 0, 0, width, height);

        const { removeBackground } = await import("@imgly/background-removal");
        const result = await removeBackground(await canvasToBlob(input), {
            progress: (stage: string, current: number, total: number) => {
                onProgress?.(PROGRESS_LABELS[stage] ?? "Procesando imagen", total > 0 ? current / total : null);
            },
        });

        const bitmap = await createImageBitmap(result);
        const out = document.createElement("canvas");
        out.width = width;
        out.height = height;
        const octx = out.getContext("2d", { willReadFrequently: true });
        if (!octx) throw new Error("Canvas no disponible");
        octx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const data = octx.getImageData(0, 0, width, height).data;
        const alpha = new Uint8ClampedArray(width * height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        return { alpha, width, height, scale };
    })();

    // Un fallo no se cachea: el siguiente intento vuelve a probar (p. ej. sin red).
    cache.set(key, job);
    job.catch(() => cache.delete(key));
    return job;
}
