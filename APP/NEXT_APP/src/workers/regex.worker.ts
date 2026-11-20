/**
 * Ejecuta la expresión regular fuera del hilo principal: coincidencias, rangos para el resaltado,
 * grupos de cada coincidencia y, si se pide, el reemplazo. Así el render nunca vuelve a ejecutar la
 * regex. Si un patrón catastrófico (ReDoS) se cuelga, el hilo principal termina este worker: ese es
 * el único tiempo máximo real en JavaScript.
 */
import { runRegexCore } from "@/lib/regex-run";

const ctx = self as unknown as Worker;

interface RegexRequest {
    id: number;
    pattern: string;
    flags: string;
    text: string;
    replacement: string | null;
}

ctx.addEventListener("message", (event: MessageEvent<RegexRequest>) => {
    const { id, pattern, flags, text, replacement } = event.data;
    try {
        ctx.postMessage({ id, ok: true, result: runRegexCore(pattern, flags, text, replacement) });
    } catch (err) {
        ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : "Error en la expresión regular" });
    }
});

// Aviso de arranque: el cliente empieza a contar el plazo recién después de esto (ver regex-client.ts).
ctx.postMessage({ listo: true });
