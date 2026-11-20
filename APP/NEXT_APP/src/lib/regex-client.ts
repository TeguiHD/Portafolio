/**
 * Cliente del worker de regex. Un solo worker vivo; si una ejecución supera
 * el límite se termina el worker (timeout real) y se crea otro en la
 * siguiente llamada. Una ejecución nueva cancela la anterior pendiente.
 */
import { runRegexCore, type RegexRunResult } from "./regex-run";

export type { RegexMatchDetail, RegexReplaceResult, RegexRunResult } from "./regex-run";

export type RegexOutcome =
    | { ok: true; result: RegexRunResult }
    | { ok: false; error: string; timedOut?: boolean; cancelled?: boolean };

/**
 * El plazo (timeoutMs) mide solo la ejecución: el worker avisa «listo» al arrancar y recién ahí se le manda trabajo.
 * Antes el reloj incluía descargar y compilar el worker; por internet eso pasaba de 500 ms y cualquier regex
 * «superaba el límite». Tampoco se mata un worker que todavía arranca: solo uno que está ejecutando.
 */
interface Motor { w: Worker; listo: Promise<boolean> }

let motor: Motor | null = null;
let seq = 0;
let cancelPending: (() => void) | null = null;
const ARRANQUE_MS = 15_000;

function crearMotor(): Motor {
    const w = new Worker(new URL("../workers/regex.worker.ts", import.meta.url), { type: "module" });
    const listo = new Promise<boolean>((resolver) => {
        const reloj = setTimeout(() => resolver(false), ARRANQUE_MS);
        const alAvisar = (e: MessageEvent<{ listo?: boolean }>) => {
            if (!e.data?.listo) return;
            clearTimeout(reloj);
            w.removeEventListener("message", alAvisar);
            resolver(true);
        };
        w.addEventListener("message", alAvisar);
        w.addEventListener("error", () => { clearTimeout(reloj); resolver(false); }, { once: true });
    });
    return { w, listo };
}

function descartar(m: Motor) {
    m.w.terminate();
    if (motor === m) motor = null;
}

/** Arranca el worker por adelantado para que la primera ejecución no pague el arranque. */
export function warmRegexWorker(): void {
    if (typeof Worker !== "undefined" && !motor) motor = crearMotor();
}

/** Corta la ejecución pendiente, si la hay (por ejemplo, cuando el patrón queda vacío). */
export function cancelRegex(): void {
    cancelPending?.();
}

export function runRegex(pattern: string, flags: string, text: string, replacement: string | null, timeoutMs: number): Promise<RegexOutcome> {
    if (typeof Worker === "undefined") {
        // Sin workers no hay timeout posible: se ejecuta en el hilo principal.
        try {
            return Promise.resolve({ ok: true, result: runRegexCore(pattern, flags, text, replacement) });
        } catch (err) {
            return Promise.resolve({ ok: false, error: err instanceof Error ? err.message : "Error en la expresión regular" });
        }
    }

    cancelPending?.();

    return new Promise((resolve) => {
        const id = ++seq;
        const m = motor ?? (motor = crearMotor());
        let ejecutando = false;
        let terminado = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const settle = (outcome: RegexOutcome) => {
            if (terminado) return;
            terminado = true;
            clearTimeout(timer);
            m.w.removeEventListener("message", onMessage);
            m.w.removeEventListener("error", onError);
            if (cancelPending === cancel) cancelPending = null;
            resolve(outcome);
        };
        const onMessage = (e: MessageEvent<{ id: number } & RegexOutcome>) => {
            if (e.data?.id !== id) return;
            settle(e.data.ok ? { ok: true, result: e.data.result } : { ok: false, error: e.data.error });
        };
        const onError = (e: ErrorEvent) => settle({ ok: false, error: e.message || "Fallo del worker" });
        const cancel = () => {
            // Si está ejecutando puede estar colgado con esta regex: se reemplaza. Si aún arranca, se conserva.
            if (ejecutando) descartar(m);
            settle({ ok: false, cancelled: true, error: "Cancelado" });
        };
        cancelPending = cancel;

        void m.listo.then((ok) => {
            if (terminado) return;
            if (!ok) {
                descartar(m);
                settle({ ok: false, error: "No se pudo iniciar el motor de expresiones regulares. Recarga la página." });
                return;
            }
            m.w.addEventListener("message", onMessage);
            m.w.addEventListener("error", onError);
            ejecutando = true;
            timer = setTimeout(() => {
                descartar(m);
                settle({ ok: false, timedOut: true, error: `La regex superó ${timeoutMs} ms y se detuvo (posible retroceso catastrófico). Simplifica el patrón.` });
            }, timeoutMs);
            m.w.postMessage({ id, pattern, flags, text, replacement });
        });
    });
}
