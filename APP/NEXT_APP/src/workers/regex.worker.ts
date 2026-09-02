/**
 * Ejecuta la expresión regular fuera del hilo principal. Devuelve también los
 * rangos de cada coincidencia para que el resaltado no vuelva a ejecutar la
 * regex en el render. Si un patrón catastrófico (ReDoS) se cuelga, el hilo
 * principal termina este worker: ese es el único timeout real en JavaScript.
 */
import type { RegexRunResult } from "@/lib/regex-client";

const ctx = self as unknown as Worker;
const MAX_MATCHES = 10000;

ctx.addEventListener("message", (event: MessageEvent<{ id: number; pattern: string; flags: string; text: string }>) => {
    const { id, pattern, flags, text } = event.data;
    try {
        const start = performance.now();
        const re = new RegExp(pattern, flags);
        const matches: string[] = [];
        const ranges: [number, number][] = [];
        if (flags.includes("g")) {
            for (const m of text.matchAll(re)) {
                matches.push(m[0]);
                if (m.index !== undefined) ranges.push([m.index, m.index + m[0].length]);
                if (matches.length >= MAX_MATCHES) break;
            }
        } else {
            const m = re.exec(text);
            if (m) {
                matches.push(m[0]);
                ranges.push([m.index, m.index + m[0].length]);
            }
        }
        const result: RegexRunResult = { matches, ranges, execMs: performance.now() - start, truncated: matches.length >= MAX_MATCHES };
        ctx.postMessage({ id, ok: true, result });
    } catch (err) {
        ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : "Error en la expresión regular" });
    }
});
