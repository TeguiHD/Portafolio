/**
 * Analiza JSON grandes fuera del hilo principal: parseo, formato, minificado, estadísticas y avisos.
 * Con varios megas, hacer todo eso en la página la deja sin responder mientras escribes.
 */
import { analizarJson } from "@/lib/json-analisis";

const ctx = self as unknown as Worker;

ctx.addEventListener("message", (event: MessageEvent<{ id: number; texto: string; indentacion: number }>) => {
    const { id, texto, indentacion } = event.data;
    try {
        ctx.postMessage({ id, resultado: analizarJson(texto, indentacion) });
    } catch (err) {
        ctx.postMessage({ id, resultado: { ok: false, error: { message: err instanceof Error ? err.message : "No se pudo analizar el JSON." } } });
    }
});
