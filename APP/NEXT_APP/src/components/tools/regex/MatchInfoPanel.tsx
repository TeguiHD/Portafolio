"use client";

import type { RegexMatchDetail } from "@/lib/regex-run";
import { useCopiar } from "@/lib/tools/copiar";

interface MatchInfoPanelProps {
    /** Coincidencias con sus grupos, ya calculadas en el worker (aquí no se ejecuta ninguna regex). */
    details: RegexMatchDetail[];
    groupNames: (string | null)[];
    /** Total de coincidencias (puede ser mayor que `details`). */
    total: number;
    /** Hay más coincidencias de las que se contaron. */
    truncated: boolean;
    /** Todavía no hay patrón o texto. */
    empty: boolean;
    /** Texto de todas las coincidencias contadas, para «Copiar lista». */
    matches: string[];
    /** Si la regex falló, qué decir en vez de «No hay coincidencias». */
    blockedMessage?: string | null;
}

function Valor({ value }: { value: string | null }) {
    if (value === null) return <span className="text-neutral-500 italic">no participó</span>;
    if (value === "") return <span className="text-neutral-500 italic">vacío</span>;
    return <span className="font-mono text-green-400 bg-green-500/10 rounded px-1.5 py-0.5 break-all whitespace-pre-wrap">{value}</span>;
}

export function MatchInfoPanel({ details, groupNames, total, truncated, empty, matches, blockedMessage }: MatchInfoPanelProps) {
    const { copiado, fallo, copiar } = useCopiar();
    const copyState = copiado === "lista" ? "ok" : fallo === "lista" ? "fail" : "idle";
    const totalText = `${total.toLocaleString("es-CL")}${truncated ? "+" : ""}`;

    return (
        <section aria-labelledby="regex-grupos" className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">📊</span>
                    <h3 id="regex-grupos" className="text-sm font-medium text-white">Coincidencias y grupos</h3>
                </div>
                <span role="status" className="sr-only">{copyState === "ok" ? "Lista copiada" : copyState === "fail" ? "No se pudo copiar" : ""}</span>
                {total > 0 && (
                    <button
                        type="button"
                        onClick={() => void copiar(matches.join("\n"), "lista")}
                        className={`min-h-11 px-3 rounded-lg text-xs transition-colors ${copyState === "ok" ? "text-green-400" : copyState === "fail" ? "text-red-400" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
                    >
                        {copyState === "ok" ? "✓ Lista copiada" : copyState === "fail" ? "No se pudo copiar" : "Copiar lista"}
                    </button>
                )}
            </div>

            {empty ? (
                <p className="text-xs text-neutral-500">Escribe una regex y un texto para ver cada coincidencia con sus grupos.</p>
            ) : blockedMessage ? (
                <p className="text-xs text-neutral-500">{blockedMessage}</p>
            ) : total === 0 ? (
                <p className="text-xs text-neutral-500">No hay coincidencias.</p>
            ) : (
                <>
                    <ol aria-label="Coincidencias" className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        {details.map((match, i) => (
                            <li key={`${i}-${match.index}`} className="bg-black/30 rounded-lg p-3 border border-white/5">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-xs font-medium text-blue-400">Coincidencia {i + 1}</span>
                                    <span className="text-[11px] text-neutral-500">posición {match.index}–{match.end}</span>
                                </div>
                                <div className="text-sm">
                                    {match.text === "" ? <span className="text-xs text-neutral-500 italic">coincidencia vacía</span> : <span className="font-mono text-white bg-blue-500/10 rounded px-2 py-1 break-all whitespace-pre-wrap">{match.text}</span>}
                                </div>
                                {match.groups.length > 0 && (
                                    <dl className="mt-2 pt-2 border-t border-white/5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                        {match.groups.map((value, gi) => (
                                            <div key={gi} className="contents">
                                                <dt className="text-neutral-500">
                                                    Grupo {gi + 1}
                                                    {groupNames[gi] && <span className="text-cyan-400"> «{groupNames[gi]}»</span>}
                                                </dt>
                                                <dd className="min-w-0"><Valor value={value} /></dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                                {match.hiddenGroups > 0 && <p className="mt-1 text-[11px] text-neutral-500">Y {match.hiddenGroups} grupos más.</p>}
                            </li>
                        ))}
                    </ol>
                    {total > details.length && (
                        <p className="mt-2 text-[11px] text-neutral-500">
                            Se detallan las primeras {details.length.toLocaleString("es-CL")} de {totalText} coincidencias.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
