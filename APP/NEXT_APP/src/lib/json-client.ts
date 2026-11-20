/**
 * Cliente del worker de JSON. Un pedido nuevo termina el anterior (el worker se reemplaza), así al
 * escribir en un documento grande solo se analiza la última versión. Sin workers, se analiza aquí.
 */
import { analizarJson, type AnalisisJson } from "./json-analisis";

/** Desde este tamaño (en caracteres) el análisis va al worker. */
export const UMBRAL_WORKER_JSON = 200_000;
const TIEMPO_MAXIMO_MS = 30_000;

let worker: Worker | null = null;
let seq = 0;
let cancelarPendiente: (() => void) | null = null;

function crearWorker(): Worker {
    return new Worker(new URL("../workers/json.worker.ts", import.meta.url), { type: "module" });
}

/** Corta el análisis pendiente, si lo hay. */
export function cancelarAnalisisJson(): void {
    cancelarPendiente?.();
}

/** Resuelve con el análisis, o con null si un pedido más nuevo lo canceló. */
export function analizarJsonEnWorker(texto: string, indentacion: number): Promise<AnalisisJson | null> {
    if (typeof Worker === "undefined") return Promise.resolve(analizarJson(texto, indentacion));

    cancelarPendiente?.();

    return new Promise((resolve) => {
        const id = ++seq;
        const w = worker ?? (worker = crearWorker());

        const terminar = (resultado: AnalisisJson | null) => {
            clearTimeout(reloj);
            w.removeEventListener("message", alMensaje);
            w.removeEventListener("error", alError);
            if (cancelarPendiente === cancelar) cancelarPendiente = null;
            resolve(resultado);
        };
        const alMensaje = (e: MessageEvent<{ id: number; resultado: AnalisisJson }>) => {
            if (e.data.id === id) terminar(e.data.resultado);
        };
        const alError = (e: ErrorEvent) => terminar({ ok: false, error: { message: e.message || "Falló el análisis en segundo plano." } });
        const descartarWorker = () => {
            w.terminate();
            if (worker === w) worker = null;
        };
        const reloj = setTimeout(() => {
            descartarWorker();
            terminar({ ok: false, error: { message: "El análisis tardó demasiado. Prueba con un archivo más chico." } });
        }, TIEMPO_MAXIMO_MS);
        const cancelar = () => {
            descartarWorker();
            terminar(null);
        };
        cancelarPendiente = cancelar;

        w.addEventListener("message", alMensaje);
        w.addEventListener("error", alError);
        w.postMessage({ id, texto, indentacion });
    });
}
