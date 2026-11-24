"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useMemo, useDeferredValue, useRef, useEffect } from "react";
import { AlignLeft, Minimize2, Copy, Check, Download, Upload, Braces, X, CircleCheck, CircleAlert } from "lucide-react";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ArbolJson } from "@/components/tools/json/ArbolJson";
import { analizarJson, MAX_JSON_CHARS, type AnalisisJson, type AvisosJson } from "@/lib/json-analisis";
import { analizarJsonEnWorker, cancelarAnalisisJson, UMBRAL_WORKER_JSON } from "@/lib/json-client";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarTexto } from "@/lib/tools/descargar";
import { TOOL_COUNT } from "@/lib/tool-count";

const ACCENT = "#10B981";

function plural(n: number, uno: string, varios: string): string {
    return `${n.toLocaleString("es-CL")} ${n === 1 ? uno : varios}`;
}

/** Lo que JSON.parse cambia sin avisar, dicho en una línea por tipo. */
function textosAvisos(avisos: AvisosJson): string[] {
    const lineas: string[] = [];
    const { enterosGrandes: g, fueraDeRango: f, duplicadas: d } = avisos;
    if (g.total > 0) {
        const ej = g.ejemplos[0];
        const base = `Hay ${plural(g.total, "entero mayor", "enteros mayores")} que 9.007.199.254.740.991, el máximo que JavaScript guarda exacto`;
        lineas.push(g.alterados > 0
            ? `${base}: al formatear o minificar cambian ${g.alterados === g.total ? "todos" : g.alterados.toLocaleString("es-CL")}. Por ejemplo, ${ej.texto} queda como ${ej.quedaria} (línea ${ej.linea}). Si son identificadores, envíalos como texto.`
            : `${base}. Aquí se conservan, pero cualquier cálculo con ellos en JavaScript puede fallar.`);
    }
    if (f.total > 0) {
        const ej = f.ejemplos[0];
        lineas.push(`${plural(f.total, "número no cabe", "números no caben")} en JavaScript y queda${f.total === 1 ? "" : "n"} como null al formatear (por ejemplo ${ej.texto}, línea ${ej.linea}).`);
    }
    if (d.total > 0) {
        const ej = d.ejemplos[0];
        lineas.push(`${plural(d.total, "clave repetida", "claves repetidas")} en un mismo objeto: al formatear solo queda el último valor (por ejemplo «${ej.clave}», línea ${ej.linea}).`);
    }
    return lineas;
}

const TOKEN_COLORS: Record<string, string> = {
    key: "#EC4899",
    string: "#10B981",
    number: "#F59E0B",
    boolean: "#6366F1",
    null: "#EF4444",
    bracket: "#9CA3AF",
    other: "#6B7280",
};

export default function JsonFormatterPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("json");
    const [input, setInput] = useState("");
    const [indentation, setIndentation] = useState(2);
    const [vista, setVista] = useState<"texto" | "arbol">("texto");
    const [feedback, setFeedback] = useState<string | null>(null);
    const { copiado, fallo, copiar } = useCopiar();
    const fileRef = useRef<HTMLInputElement>(null);
    const deferredInput = useDeferredValue(input);
    const vacio = !deferredInput.trim();
    // Los textos grandes se analizan en un worker; los chicos, aquí mismo (más rápido que ir y volver).
    const enWorker = deferredInput.length > UMBRAL_WORKER_JSON;

    const resultadoLocal = useMemo<AnalisisJson | null>(
        () => (vacio || enWorker ? null : analizarJson(deferredInput, indentation)),
        [deferredInput, indentation, vacio, enWorker],
    );
    const [resultadoWorker, setResultadoWorker] = useState<{ texto: string; indentacion: number; r: AnalisisJson } | null>(null);
    useEffect(() => {
        if (vacio || !enWorker) { cancelarAnalisisJson(); return; }
        let vigente = true;
        void analizarJsonEnWorker(deferredInput, indentation).then((r) => {
            if (vigente && r) setResultadoWorker({ texto: deferredInput, indentacion: indentation, r });
        });
        return () => { vigente = false; };
    }, [deferredInput, indentation, vacio, enWorker]);
    useEffect(() => () => cancelarAnalisisJson(), []);

    const workerAlDia = resultadoWorker !== null && resultadoWorker.texto === deferredInput && resultadoWorker.indentacion === indentation;
    // Mientras el worker trabaja se sigue viendo el resultado anterior, con el estado «Analizando en segundo plano…».
    const analisis = vacio ? null : enWorker ? resultadoWorker?.r ?? null : resultadoLocal;
    const pending = input !== deferredInput || (enWorker && !vacio && !workerAlDia);
    const result = analisis?.ok ? analisis : null;
    const errorJson = analisis && !analisis.ok ? analisis.error : null;
    const canExport = Boolean(result && !pending);

    // Un ejemplo real para ver qué hace sin tener un JSON a mano (los sitios grandes muestran un resultado antes de pedir nada).
    const cargarEjemplo = useCallback(() => {
        setInput(JSON.stringify({ sitio: "nicoholas.dev", herramientas: TOOL_COUNT, gratis: true, familias: ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes", "chile"] }));
        setFeedback(null);
    }, []);

    const handleFormat = useCallback(() => {
        if (result) setInput(result.formatted);
    }, [result]);

    const handleMinify = useCallback(() => {
        if (result) setInput(result.minified);
    }, [result]);

    const download = () => {
        if (!canExport || !result) return;
        descargarTexto(result.formatted, "documento.json", "application/json");
    };

    const stats = result?.stats ?? null;
    const avisos = useMemo(() => {
        if (!result) return [];
        const lineas = textosAvisos(result.avisos);
        if (result.bom) lineas.unshift("El texto empieza con una marca BOM invisible (la dejan algunos editores de Windows): se ignoró. Formatear o Minificar la quitan.");
        return lineas;
    }, [result]);
    // La entrada tiene tope: si se pega algo más largo, el navegador lo corta sin avisar y el error sería «termina antes de tiempo».
    const enElTope = input.length >= MAX_JSON_CHARS;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Formateador JSON"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="json" />

                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111923] p-2">
                    <button type="button" onClick={handleFormat} disabled={!canExport} className="studio-button"><AlignLeft size={16} aria-hidden="true" />Formatear</button>
                    <button type="button" onClick={handleMinify} disabled={!canExport} className="studio-button"><Minimize2 size={16} aria-hidden="true" />Minificar</button>
                    <div role="group" aria-label="Indentación" className="flex items-center gap-1 border-l border-white/10 pl-2">
                        {[2, 4].map(n => <button type="button" key={n} onClick={() => setIndentation(n)} aria-pressed={indentation === n} aria-label={`${n} espacios`} className="studio-segment font-mono">{n}</button>)}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Abrir archivo JSON" title="Abrir archivo JSON" className="studio-icon-button"><Upload size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => { cargarEjemplo(); }} aria-label="Cargar ejemplo" title="Cargar ejemplo" className="studio-icon-button"><Braces size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => { if (result) void copiar(result.formatted, "resultado"); }} disabled={!canExport} aria-label={copiado === "resultado" ? "Resultado copiado" : "Copiar resultado"} title="Copiar resultado" className="studio-icon-button">{copiado === "resultado" ? <Check size={17} aria-hidden="true" className="text-teal-300" /> : <Copy size={17} aria-hidden="true" />}</button>
                        <button type="button" onClick={download} disabled={!canExport} className="studio-button studio-button-primary"><Download size={16} aria-hidden="true" />JSON</button>
                    </div>
                    <input ref={fileRef} type="file" accept=".json,application/json,text/plain" aria-label="Archivo JSON" className="sr-only" tabIndex={-1} onChange={async event => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > MAX_JSON_CHARS) { setFeedback("El archivo supera el límite de 5 MB."); return; }
                        try { setInput(await file.text()); setFeedback(null); } catch { setFeedback("No se pudo leer el archivo JSON."); }
                    }} />
                </div>
                {feedback && <p role="alert" className="mb-3 text-xs text-amber-200">{feedback}</p>}
                {enElTope && <p role="alert" className="mb-3 text-xs text-amber-200">La entrada llegó al límite de 5 MB: si pegaste algo más largo, quedó cortado. Para un JSON más grande no alcanza esta herramienta.</p>}
                {fallo === "resultado" && <p role="alert" className="mb-3 text-xs text-amber-200">No se pudo copiar. Selecciona el resultado y cópialo con Ctrl / ⌘ C.</p>}
                <span role="status" className="sr-only">{copiado === "resultado" ? "Resultado copiado" : ""}</span>
                {avisos.length > 0 && (
                    <ul aria-label="Avisos sobre el JSON" className="mb-3 space-y-1 text-xs text-amber-200">
                        {avisos.map((linea) => <li key={linea}>{linea}</li>)}
                    </ul>
                )}

                {/* Editor Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                    {/* Input */}
                    <div className="studio-panel min-w-0 overflow-hidden">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <label htmlFor="json-input" className="text-xs font-medium text-slate-300">Entrada</label><span className="ml-auto mr-3 font-mono text-[10px] text-slate-400">JSON</span>
                            <button type="button" onClick={() => { setInput(""); setFeedback(null); }} aria-label="Limpiar entrada" title="Limpiar entrada" className="studio-icon-button"><X size={16} aria-hidden="true" /></button>
                        </div>
                        <textarea
                            id="json-input"
                            aria-label="Entrada JSON"
                            maxLength={MAX_JSON_CHARS}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='{"ejemplo": "Pega tu JSON aquí"}'
                            rows={18}
                            className="w-full bg-transparent px-4 py-3 text-white font-mono text-sm outline-none resize-y min-h-[280px]"
                            spellCheck={false}
                        />
                    </div>

                    {/* Output */}
                    <div className="studio-panel min-w-0 overflow-hidden">
                        <div className="flex min-h-[61px] flex-wrap items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
                            <span role="status" className="inline-flex items-center gap-2 text-xs" style={{ color: errorJson ? "#fda4af" : ACCENT }}>
                                {pending ? (enWorker ? "Analizando en segundo plano…" : "Actualizando…") : errorJson ? <><CircleAlert size={14} aria-hidden="true" />Revisa el JSON</> : result ? <><CircleCheck size={14} aria-hidden="true" />JSON válido</> : "Resultado"}
                            </span>
                            <div role="group" aria-label="Vista del resultado" className="ml-auto flex items-center gap-1">
                                <button type="button" onClick={() => setVista("texto")} aria-pressed={vista === "texto"} className="studio-segment">Texto</button>
                                <button type="button" onClick={() => setVista("arbol")} aria-pressed={vista === "arbol"} className="studio-segment">Árbol</button>
                            </div>
                        </div>
                        <div className="px-4 py-3 overflow-auto max-h-[500px]">
                            {errorJson ? (
                                <div role="alert" className="text-rose-300 text-sm space-y-2">
                                    <p>{errorJson.message}</p>
                                    {errorJson.line !== undefined && (
                                        <p className="text-xs text-red-500">Línea {errorJson.line}, columna {errorJson.column}</p>
                                    )}
                                </div>
                            ) : result && vista === "arbol" ? (
                                <ArbolJson data={result.data} />
                            ) : result ? (
                                <pre role="region" aria-label="Resultado JSON" tabIndex={0} className="text-sm font-mono whitespace-pre-wrap break-words">
                                    {result.tokens ? result.tokens.map((t, i) => (
                                        <span key={i} style={{ color: TOKEN_COLORS[t.type] }}>{t.text}</span>
                                    )) : result.formatted}
                                </pre>
                            ) : (
                                <div>
                                    <p className="text-slate-400 text-sm">{vacio ? "Pega un JSON o abre un archivo para empezar." : "Analizando…"}</p>
                                    {vacio ? <button type="button" onClick={cargarEjemplo} className="studio-button mt-3">Probar con un ejemplo</button> : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs text-slate-400">
                        <span>{plural(stats.keys, "clave", "claves")}</span>
                        <span aria-hidden="true">•</span>
                        <span>{plural(stats.objects, "objeto", "objetos")}</span>
                        <span aria-hidden="true">•</span>
                        <span>{plural(stats.arrays, "arreglo", "arreglos")}</span>
                        <span aria-hidden="true">•</span>
                        <span>Formateado: {plural(stats.formattedChars, "carácter", "caracteres")}</span>
                        <span aria-hidden="true">•</span>
                        <span>Minificado: {plural(stats.minifiedChars, "carácter", "caracteres")}</span>
                    </div>
                )}

            </main>
        </div>
    );
}
