/**
 * Punto de entrada del navegador para la esteganografía. Usa el Web Worker
 * cuando existe OffscreenCanvas; si no, procesa en el hilo principal con el
 * mismo núcleo puro.
 */
import { decodeMessage, encodeMessage } from "./stego-lsb";

export type StegoRequest = { op: "encode"; blob: Blob; message: string } | { op: "decode"; blob: Blob };
export type StegoResponse =
    | { ok: true; op: "encode"; blob: Blob }
    | { ok: true; op: "decode"; message: string; messageBytes: number }
    | { ok: false; error: string };

let worker: Worker | null = null;
let seq = 0;

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL("../workers/stego.worker.ts", import.meta.url), { type: "module" });
    }
    return worker;
}

function viaWorker(req: StegoRequest): Promise<StegoResponse> {
    return new Promise((resolve, reject) => {
        const w = getWorker();
        const id = ++seq;
        const onMessage = (e: MessageEvent<{ id: number } & StegoResponse>) => {
            if (e.data.id !== id) return;
            cleanup();
            const { id: _ignored, ...rest } = e.data;
            void _ignored;
            resolve(rest as StegoResponse);
        };
        const onError = (e: ErrorEvent) => {
            cleanup();
            reject(new Error(e.message || "Fallo del worker"));
        };
        const cleanup = () => {
            w.removeEventListener("message", onMessage);
            w.removeEventListener("error", onError);
        };
        w.addEventListener("message", onMessage);
        w.addEventListener("error", onError);
        w.postMessage({ id, ...req });
    });
}

async function onMainThread(req: StegoRequest): Promise<StegoResponse> {
    const bitmap = await createImageBitmap(req.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const c2d = canvas.getContext("2d", { willReadFrequently: true });
    if (!c2d) return { ok: false, error: "Canvas no disponible" };
    c2d.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { data } = c2d.getImageData(0, 0, canvas.width, canvas.height);
    const image = { data, width: canvas.width, height: canvas.height };

    if (req.op === "decode") {
        const result = decodeMessage(image);
        return "error" in result ? { ok: false, error: result.error } : { ok: true, op: "decode", ...result };
    }
    const encoded = encodeMessage(image, req.message);
    if (!(encoded instanceof Uint8ClampedArray)) return { ok: false, error: encoded.error };
    c2d.putImageData(new ImageData(encoded, image.width, image.height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? { ok: true, op: "encode", blob } : { ok: false, error: "No se pudo generar el PNG" };
}

export function runStego(req: { op: "encode"; blob: Blob; message: string }): Promise<Extract<StegoResponse, { op: "encode" } | { ok: false }>>;
export function runStego(req: { op: "decode"; blob: Blob }): Promise<Extract<StegoResponse, { op: "decode" } | { ok: false }>>;
export async function runStego(req: StegoRequest): Promise<StegoResponse> {
    if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
        try {
            return await viaWorker(req);
        } catch (err) {
            console.warn("Worker de esteganografía no disponible; se procesa en el hilo principal", err);
            worker?.terminate();
            worker = null;
        }
    }
    return onMainThread(req);
}
