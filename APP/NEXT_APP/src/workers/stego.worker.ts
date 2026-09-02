/**
 * Web Worker de esteganografía: decodifica la imagen, aplica/lee los LSB y
 * vuelve a codificar el PNG con OffscreenCanvas. El hilo principal no toca
 * ni un píxel, así que la pestaña sigue respondiendo con imágenes de 20 MB.
 */
import { decodeMessage, encodeMessage } from "@/lib/stego-lsb";
import type { StegoRequest, StegoResponse } from "@/lib/stego-client";

const ctx = self as unknown as Worker;

async function readPixels(blob: Blob): Promise<{ data: Uint8ClampedArray; width: number; height: number; canvas: OffscreenCanvas; c2d: OffscreenCanvasRenderingContext2D }> {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const c2d = canvas.getContext("2d", { willReadFrequently: true });
    if (!c2d) throw new Error("Canvas no disponible en el worker");
    c2d.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { data } = c2d.getImageData(0, 0, canvas.width, canvas.height);
    return { data, width: canvas.width, height: canvas.height, canvas, c2d };
}

async function handle(req: StegoRequest): Promise<StegoResponse> {
    const { data, width, height, canvas, c2d } = await readPixels(req.blob);
    if (req.op === "decode") {
        const result = decodeMessage({ data, width, height });
        return "error" in result ? { ok: false, error: result.error } : { ok: true, op: "decode", ...result };
    }
    const encoded = encodeMessage({ data, width, height }, req.message);
    if (!(encoded instanceof Uint8ClampedArray)) return { ok: false, error: encoded.error };
    c2d.putImageData(new ImageData(encoded, width, height), 0, 0);
    return { ok: true, op: "encode", blob: await canvas.convertToBlob({ type: "image/png" }) };
}

ctx.addEventListener("message", async (event: MessageEvent<{ id: number } & StegoRequest>) => {
    const { id, ...req } = event.data;
    try {
        ctx.postMessage({ id, ...(await handle(req as StegoRequest)) });
    } catch (err) {
        ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : "Error al procesar la imagen" });
    }
});
