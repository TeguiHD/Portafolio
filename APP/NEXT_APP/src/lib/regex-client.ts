/**
 * Cliente del worker de regex. Un solo worker vivo; si una ejecución supera
 * el límite se termina el worker (timeout real) y se crea otro en la
 * siguiente llamada. Una ejecución nueva cancela la anterior pendiente.
 */

export interface RegexRunResult {
    matches: string[];
    ranges: [number, number][];
    execMs: number;
    truncated: boolean;
}

export type RegexOutcome =
    | { ok: true; result: RegexRunResult }
    | { ok: false; error: string; timedOut?: boolean; cancelled?: boolean };

let worker: Worker | null = null;
let seq = 0;
let cancelPending: (() => void) | null = null;

function createWorker(): Worker {
    return new Worker(new URL("../workers/regex.worker.ts", import.meta.url), { type: "module" });
}

/** Arranca el worker por adelantado para que la primera ejecución no pague el arranque. */
export function warmRegexWorker(): void {
    if (typeof Worker !== "undefined" && !worker) worker = createWorker();
}

export function runRegex(pattern: string, flags: string, text: string, timeoutMs: number): Promise<RegexOutcome> {
    if (typeof Worker === "undefined") {
        // Sin workers no hay timeout posible: se ejecuta en el hilo principal.
        try {
            const start = performance.now();
            const re = new RegExp(pattern, flags);
            const matches = flags.includes("g") ? Array.from(text.matchAll(re), (m) => m[0]) : [re.exec(text)?.[0]].filter((m): m is string => m !== undefined);
            return Promise.resolve({ ok: true, result: { matches, ranges: [], execMs: performance.now() - start, truncated: false } });
        } catch (err) {
            return Promise.resolve({ ok: false, error: err instanceof Error ? err.message : "Error en la expresión regular" });
        }
    }

    cancelPending?.();

    return new Promise((resolve) => {
        const id = ++seq;
        const w = worker ?? (worker = createWorker());

        const settle = (outcome: RegexOutcome) => {
            clearTimeout(timer);
            w.removeEventListener("message", onMessage);
            w.removeEventListener("error", onError);
            if (cancelPending === cancel) cancelPending = null;
            resolve(outcome);
        };
        const onMessage = (e: MessageEvent<{ id: number } & RegexOutcome>) => {
            if (e.data.id !== id) return;
            settle(e.data.ok ? { ok: true, result: e.data.result } : { ok: false, error: e.data.error });
        };
        const onError = (e: ErrorEvent) => settle({ ok: false, error: e.message || "Fallo del worker" });
        const timer = setTimeout(() => {
            w.terminate();
            worker = null;
            settle({ ok: false, timedOut: true, error: `Timeout: la regex superó ${timeoutMs} ms (posible ReDoS). Simplifica el patrón.` });
        }, timeoutMs);
        const cancel = () => {
            // El worker puede estar colgado con la ejecución anterior: se reemplaza.
            w.terminate();
            worker = null;
            settle({ ok: false, cancelled: true, error: "Cancelado" });
        };
        cancelPending = cancel;

        w.addEventListener("message", onMessage);
        w.addEventListener("error", onError);
        w.postMessage({ id, pattern, flags, text });
    });
}
