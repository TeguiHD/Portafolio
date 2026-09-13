"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useMemo, useDeferredValue, useRef, useEffect } from "react";
import { AlignLeft, Minimize2, Copy, Check, Download, Upload, Braces, X, CircleCheck, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

const ACCENT = "#10B981";

interface JsonError {
    message: string;
    line?: number;
    column?: number;
}

/**
 * SECURITY(OWASP): Parse JSON safely - no eval, no Function constructor.
 * Only JSON.parse is used. Input length is limited.
 */
function safeJsonParse(input: string): { data: unknown; error: JsonError | null } {
    // SECURITY: Limit input to 5MB to prevent DoS
    if (input.length > 5 * 1024 * 1024) {
        return { data: null, error: { message: "Entrada demasiado grande (máx. 5MB)" } };
    }

    try {
        const data = JSON.parse(input);
        return { data, error: null };
    } catch (e) {
        if (e instanceof SyntaxError) {
            // Try to extract line/column from error message
            const match = e.message.match(/position\s+(\d+)/i);
            let line: number | undefined;
            let column: number | undefined;

            if (match) {
                const pos = parseInt(match[1]);
                const lines = input.substring(0, pos).split("\n");
                line = lines.length;
                column = (lines[lines.length - 1]?.length || 0) + 1;
            }

            return { data: null, error: { message: e.message, line, column } };
        }
        return { data: null, error: { message: "Error desconocido al parsear JSON" } };
    }
}

/**
 * Syntax highlighting for JSON using pure string manipulation.
 * SECURITY: All output is text content, not innerHTML. Uses spans for styling.
 */
function tokenizeJson(json: string): { text: string; type: "key" | "string" | "number" | "boolean" | "null" | "bracket" | "other" }[] {
    const tokens: { text: string; type: "key" | "string" | "number" | "boolean" | "null" | "bracket" | "other" }[] = [];
    const regex = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])|(\s+)/g;

    let match;
    while ((match = regex.exec(json)) !== null) {
        if (match[1]) {
            // Key
            tokens.push({ text: match[1], type: "key" });
            tokens.push({ text: ": ", type: "other" });
        } else if (match[2]) {
            tokens.push({ text: match[2], type: "string" });
        } else if (match[3]) {
            tokens.push({ text: match[3], type: "number" });
        } else if (match[4]) {
            tokens.push({ text: match[4], type: "boolean" });
        } else if (match[5]) {
            tokens.push({ text: match[5], type: "null" });
        } else if (match[6]) {
            tokens.push({ text: match[6], type: "bracket" });
        } else if (match[7]) {
            tokens.push({ text: match[7], type: "other" });
        }
    }

    return tokens;
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
    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const deferredInput = useDeferredValue(input);
    const pending = input !== deferredInput;
    useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

    const result = useMemo(() => {
        if (!deferredInput.trim()) return null;
        const { data, error } = safeJsonParse(deferredInput);
        if (error) return { error, formatted: null, minified: null, tokens: [] };
        try {
        const formatted = JSON.stringify(data, null, indentation);
        const minified = JSON.stringify(data);
        // Large documents stay editable without creating hundreds of thousands of spans.
        const tokens = formatted.length <= 100_000 ? tokenizeJson(formatted) : null;

        return { error: null, formatted, minified, tokens, data };
        } catch {
            return { error: { message: "El JSON tiene demasiados niveles para formatearlo. Reduce la profundidad del documento." }, formatted: null, minified: null, tokens: [] };
        }
    }, [deferredInput, indentation]);
    const canExport = Boolean(result?.formatted && !pending);

    const handleFormat = useCallback(() => {
        if (result?.formatted) setInput(result.formatted);
    }, [result]);

    const handleMinify = useCallback(() => {
        if (result?.minified) setInput(result.minified);
    }, [result]);

    const handleCopy = useCallback(async (text: string) => {
        try {
        await navigator.clipboard.writeText(text);
        setFeedback(null);
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1500);
        } catch { setFeedback("No se pudo copiar. Selecciona el resultado y cópialo con Ctrl / ⌘ C."); }
    }, []);

    const download = () => {
        if (!canExport || !result?.formatted) return;
        const url = URL.createObjectURL(new Blob([result.formatted], { type: "application/json;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "documento.json";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const stats = useMemo(() => {
        if (!result?.formatted) return null;
        const data = result.data;
        let keys = 0, arrays = 0, objects = 0;
        const queue: unknown[] = [data];
        while (queue.length) {
            const obj = queue.pop();
            if (Array.isArray(obj)) { arrays++; for (const item of obj) queue.push(item); }
            else if (obj && typeof obj === "object") {
                objects++;
                const entries = Object.entries(obj as Record<string, unknown>);
                keys += entries.length;
                for (const [, value] of entries) queue.push(value);
            }
        }

        return {
            chars: deferredInput.length,
            formattedChars: result.formatted.length,
            minifiedChars: result.minified?.length || 0,
            keys, arrays, objects,
        };
    }, [deferredInput, result]);

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
            <main className="tool-main max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="json" title={<>Formateador JSON</>} description={<>Formatea, valida y embellece JSON con colores y detección de errores.</>} />

                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111923] p-2">
                    <button type="button" onClick={handleFormat} disabled={!canExport} className="studio-button"><AlignLeft size={16} aria-hidden="true" />Formatear</button>
                    <button type="button" onClick={handleMinify} disabled={!canExport} className="studio-button"><Minimize2 size={16} aria-hidden="true" />Minificar</button>
                    <div role="group" aria-label="Indentación" className="flex items-center gap-1 border-l border-white/10 pl-2">
                        {[2, 4].map(n => <button type="button" key={n} onClick={() => setIndentation(n)} aria-pressed={indentation === n} aria-label={`${n} espacios`} className="studio-segment font-mono">{n}</button>)}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Abrir archivo JSON" title="Abrir archivo JSON" className="studio-icon-button"><Upload size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => { setInput(JSON.stringify({ proyecto: "Mi próximo proyecto", herramientas: ["imágenes", "código"], listo: true }, null, 2)); setFeedback(null); }} aria-label="Cargar ejemplo" title="Cargar ejemplo" className="studio-icon-button"><Braces size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => result?.formatted && handleCopy(result.formatted)} disabled={!canExport} aria-label={copied ? "Resultado copiado" : "Copiar resultado"} title="Copiar resultado" className="studio-icon-button">{copied ? <Check size={17} aria-hidden="true" className="text-teal-300" /> : <Copy size={17} aria-hidden="true" />}</button>
                        <button type="button" onClick={download} disabled={!canExport} className="studio-button studio-button-primary"><Download size={16} aria-hidden="true" />JSON</button>
                    </div>
                    <input ref={fileRef} type="file" accept=".json,application/json,text/plain" aria-label="Archivo JSON" className="sr-only" tabIndex={-1} onChange={async event => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { setFeedback("El archivo supera el límite de 5 MB."); return; }
                        try { setInput(await file.text()); setFeedback(null); } catch { setFeedback("No se pudo leer el archivo JSON."); }
                    }} />
                </div>
                {feedback && <p role="alert" className="mb-3 text-xs text-amber-200">{feedback}</p>}

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
                            maxLength={5 * 1024 * 1024}
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
                        <div className="flex min-h-[61px] items-center px-4 py-2 bg-white/5 border-b border-white/5">
                            <span role="status" className="inline-flex items-center gap-2 text-xs" style={{ color: result?.error ? "#fda4af" : ACCENT }}>
                                {pending ? "Actualizando…" : result?.error ? <><CircleAlert size={14} aria-hidden="true" />Revisa el JSON</> : result?.formatted ? <><CircleCheck size={14} aria-hidden="true" />JSON válido</> : "Resultado"}
                            </span>
                        </div>
                        <div className="px-4 py-3 overflow-auto max-h-[500px]">
                            {result?.error ? (
                                <div role="alert" className="text-rose-300 text-sm space-y-2">
                                    <p>{result.error.message}</p>
                                    {result.error.line && (
                                        <p className="text-xs text-red-500">Línea ~{result.error.line}, Columna ~{result.error.column}</p>
                                    )}
                                </div>
                            ) : result?.formatted ? (
                                <pre aria-label="Resultado JSON" tabIndex={0} className="text-sm font-mono whitespace-pre-wrap break-words">
                                    {result.tokens ? result.tokens.map((t, i) => (
                                        <span key={i} style={{ color: TOKEN_COLORS[t.type] }}>{t.text}</span>
                                    )) : result.formatted}
                                </pre>
                            ) : (
                                <p className="text-slate-400 text-sm">Pega un JSON o abre un archivo para empezar.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs text-slate-400">
                        <span>{stats.keys} claves</span>
                        <span>•</span>
                        <span>{stats.objects} objetos</span>
                        <span>•</span>
                        <span>{stats.arrays} arrays</span>
                        <span>•</span>
                        <span>{stats.formattedChars} chars formateado</span>
                        <span>•</span>
                        <span>{stats.minifiedChars} chars minificado</span>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link href="/herramientas" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
