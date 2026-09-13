export type ExportMimeType = "image/png" | "image/jpeg" | "image/webp";
export type DrawFitMode = "contain" | "cover" | "stretch";
export type StageFill =
    | { type: "solid"; color: string }
    | { type: "gradient"; from: string; to: string; direction?: "horizontal" | "vertical" | "diagonal" };

interface DrawImageOptions {
    width: number;
    height: number;
    fitMode?: DrawFitMode;
    background?: StageFill;
    anchorX?: number;
    anchorY?: number;
}

export function sanitizeFileBaseName(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "imagen";
}

export function triggerDownload(url: string, fileName: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

export function revokeObjectUrl(url?: string | null) {
    if (url) {
        URL.revokeObjectURL(url);
    }
}

export function isLossyFormat(mimeType: ExportMimeType) {
    return mimeType === "image/jpeg" || mimeType === "image/webp";
}

export async function loadImageSource(src: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("No se pudo cargar la imagen"));
        image.src = src;
    });

    return image;
}

export async function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: ExportMimeType,
    quality = 0.92
): Promise<Blob> {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, quality));

    if (!blob) {
        throw new Error("No se pudo exportar la imagen");
    }

    return blob;
}

export async function canvasToObjectUrl(
    canvas: HTMLCanvasElement,
    mimeType: ExportMimeType,
    quality = 0.92
) {
    const blob = await canvasToBlob(canvas, mimeType, quality);
    return URL.createObjectURL(blob);
}

export function fillCanvasSurface(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    background?: StageFill
) {
    if (!background) return;

    if (background.type === "solid") {
        ctx.fillStyle = background.color;
    } else {
        const gradient = ctx.createLinearGradient(
            0,
            0,
            background.direction === "vertical" ? 0 : width,
            background.direction === "horizontal" ? 0 : height
        );
        gradient.addColorStop(0, background.from);
        gradient.addColorStop(1, background.to);
        ctx.fillStyle = gradient;
    }

    ctx.fillRect(0, 0, width, height);
}

/** Fuente dibujable: <img> decodificado o ImageBitmap (decodificación nativa única). */
export type DrawableImage = HTMLImageElement | ImageBitmap;

export function drawableWidth(image: DrawableImage): number {
    return "naturalWidth" in image ? image.naturalWidth : image.width;
}

export function drawableHeight(image: DrawableImage): number {
    return "naturalHeight" in image ? image.naturalHeight : image.height;
}

export function drawImageToCanvas(
    ctx: CanvasRenderingContext2D,
    image: DrawableImage,
    options: DrawImageOptions
) {
    const {
        width,
        height,
        fitMode = "contain",
        background,
        anchorX = 0.5,
        anchorY = 0.5,
    } = options;

    fillCanvasSurface(ctx, width, height, background);

    if (fitMode === "stretch") {
        ctx.drawImage(image, 0, 0, width, height);
        return { x: 0, y: 0, width, height };
    }

    const imageRatio = drawableWidth(image) / drawableHeight(image);
    const targetRatio = width / height;
    const useCover = fitMode === "cover";

    let drawWidth = width;
    let drawHeight = height;

    if ((imageRatio > targetRatio && !useCover) || (imageRatio < targetRatio && useCover)) {
        drawWidth = width;
        drawHeight = width / imageRatio;
    } else {
        drawHeight = height;
        drawWidth = height * imageRatio;
    }

    const drawX = (width - drawWidth) * anchorX;
    const drawY = (height - drawHeight) * anchorY;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
}
/**
 * Decodifica la imagen UNA sola vez como ImageBitmap (decodificación nativa,
 * fuera del hilo de layout) para reutilizarla en varios tamaños o formatos.
 * Prefiere el File original; si no está, reconstruye el Blob desde el data URL
 * sin pasar por fetch (la CSP no permite connect-src data:).
 */
export async function imageBitmapFromSource(
    file: File | Blob | null | undefined,
    dataUrl?: string | null
): Promise<ImageBitmap> {
    if (file) return createImageBitmap(file);
    if (!dataUrl) throw new Error("No hay imagen que decodificar");
    const comma = dataUrl.indexOf(",");
    const meta = dataUrl.slice(0, comma);
    const payload = dataUrl.slice(comma + 1);
    const mime = /^data:([^;,]+)/.exec(meta)?.[1] ?? "application/octet-stream";
    const bytes = meta.includes(";base64")
        ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(payload));
    return createImageBitmap(new Blob([bytes], { type: mime }));
}
