"use client";

import type { RegexReplaceResult } from "@/lib/regex-run";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarTexto } from "@/lib/tools/descargar";

export const MAX_REPLACEMENT_LENGTH = 500;

interface SubstitutionPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    replacement: string;
    onReplacementChange: (value: string) => void;
    /** Resultado que calculó el worker con el `replace` nativo; null si aún no hay. */
    result: RegexReplaceResult | null;
    /** Coincidencias reemplazadas. */
    count: number;
    countTruncated: boolean;
    global: boolean;
    ready: boolean;
}

export function SubstitutionPanel({ open, onOpenChange, replacement, onReplacementChange, result, count, countTruncated, global, ready }: SubstitutionPanelProps) {
    const { copiado, fallo, copiar } = useCopiar();
    const countText = countTruncated ? `Más de ${count.toLocaleString("es-CL")} reemplazos` : `${count.toLocaleString("es-CL")} reemplazo${count !== 1 ? "s" : ""}`;

    return (
        <details open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)} className="bg-white/5 rounded-2xl border border-white/10 mb-4">
            <summary className="cursor-pointer p-4 min-h-11 text-sm font-medium text-white">
                Buscar y reemplazar
                <span className="ml-2 text-[11px] font-normal text-neutral-500">usa $1, $&lt;nombre&gt; y $&amp;</span>
            </summary>

            <div className="px-4 pb-4 space-y-3">
                <div>
                    <label htmlFor="regex-reemplazo" className="block text-xs text-neutral-400 mb-1.5">Reemplazar con</label>
                    <input
                        id="regex-reemplazo"
                        type="text"
                        value={replacement}
                        onChange={(e) => onReplacementChange(e.target.value)}
                        placeholder="Ej: $<anio>/$2 o [$&]"
                        maxLength={MAX_REPLACEMENT_LENGTH}
                        spellCheck={false}
                        autoComplete="off"
                        aria-describedby="regex-reemplazo-ayuda"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder:text-neutral-600 focus:ring-2 focus:ring-orange-500/50 outline-none"
                    />
                    <p id="regex-reemplazo-ayuda" className="text-[11px] text-neutral-500 mt-1.5">
                        <code className="text-orange-300">$1</code>, <code className="text-orange-300">$2</code>… grupo por número ·{" "}
                        <code className="text-orange-300">$&lt;nombre&gt;</code> grupo con nombre ·{" "}
                        <code className="text-orange-300">$&amp;</code> la coincidencia completa ·{" "}
                        <code className="text-orange-300">$$</code> un signo $. Vacío borra las coincidencias.
                        {!global && " Sin la bandera g solo se cambia la primera coincidencia."}
                    </p>
                </div>

                {!ready ? (
                    <p className="text-xs text-neutral-500">Escribe una regex y un texto de prueba para ver el resultado.</p>
                ) : result && (
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <p className="text-xs text-neutral-400" aria-live="polite">
                                Resultado <span className="text-green-400 ml-1">{countText}</span>
                                {result.cut && <span className="text-orange-400 ml-1">· recortado a 2 millones de caracteres</span>}
                            </p>
                            <div className="flex gap-1">
                                <span role="status" className="sr-only">{copiado === "reemplazo" ? "Resultado copiado" : fallo === "reemplazo" ? "No se pudo copiar" : ""}</span>
                                <button
                                    type="button"
                                    onClick={() => void copiar(result.text, "reemplazo")}
                                    className={`min-h-11 px-3 rounded-lg text-xs transition-colors ${copiado === "reemplazo" ? "text-green-400" : fallo === "reemplazo" ? "text-red-400" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
                                >
                                    {copiado === "reemplazo" ? "✓ Copiado" : fallo === "reemplazo" ? "No se pudo copiar" : "Copiar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => descargarTexto(result.text, "reemplazo.txt")}
                                    className="min-h-11 px-3 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Descargar .txt
                                </button>
                            </div>
                        </div>
                        <pre role="region" aria-label="Texto con los reemplazos" tabIndex={0} className="bg-black/40 border border-white/10 rounded-lg p-3 max-h-48 overflow-auto text-sm text-white font-mono whitespace-pre-wrap break-all">
                            {result.text}
                        </pre>
                    </div>
                )}
            </div>
        </details>
    );
}
