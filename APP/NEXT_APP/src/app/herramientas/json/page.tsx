"use client";

import { useState, useCallback, useMemo } from "react";
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

    const result = useMemo(() => {
        if (!input.trim()) return null;
        const { data, error } = safeJsonParse(input);
        if (error) return { error, formatted: null, minified: null, tokens: [] };

        const formatted = JSON.stringify(data, null, indentation);
        const minified = JSON.stringify(data);
        const tokens = tokenizeJson(formatted);

        return { error: null, formatted, minified, tokens };
    }, [input, indentation]);

    const handleFormat = useCallback(() => {
        if (result?.formatted) setInput(result.formatted);
    }, [result]);

    const handleMinify = useCallback(() => {
        if (result?.minified) setInput(result.minified);
    }, [result]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, []);

    const stats = useMemo(() => {
        if (!result?.formatted) return null;
        const { data } = safeJsonParse(input);
        if (!data) return null;

        let keys = 0, arrays = 0, objects = 0;
        const count = (obj: unknown) => {
            if (Array.isArray(obj)) { arrays++; obj.forEach(count); }
            else if (obj && typeof obj === "object") {
                objects++;
                const entries = Object.entries(obj as Record<string, unknown>);
                keys += entries.length;
                entries.forEach(([, v]) => count(v));
            }
        };
        count(data);

        return {
            chars: input.length,
            formattedChars: result.formatted.length,
            minifiedChars: result.minified?.length || 0,
            keys, arrays, objects,
        };
    }, [input, result]);

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
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Formateador JSON</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Formatea, valida y embellece JSON con colores y detección de errores.
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
                    <button onClick={handleFormat} disabled={!result?.formatted}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all">
                        ✨ Formatear
                    </button>
                    <button onClick={handleMinify} disabled={!result?.minified}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all">
                        📦 Minificar
                    </button>
                    <button onClick={() => result?.formatted && handleCopy(result.formatted)} disabled={!result?.formatted}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all">
                        {copied ? "✓ Copiado" : "📋 Copiar"}
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Espacios:</span>
                        {[2, 4].map(n => (
                            <button key={n} onClick={() => setIndentation(n)}
                                className={`w-7 h-7 rounded text-xs font-mono ${indentation === n ? "bg-white/15 text-white" : "bg-white/5 text-neutral-500"}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Input */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <span className="text-sm text-neutral-400">Entrada</span>
                            <button onClick={() => setInput("")} className="text-xs text-neutral-600 hover:text-white">Limpiar</button>
                        </div>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='{"ejemplo": "Pega tu JSON aquí"}'
                            rows={20}
                            className="w-full bg-transparent px-4 py-3 text-white font-mono text-sm outline-none resize-none"
                            spellCheck={false}
                        />
                    </div>

                    {/* Output */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/5">
                            <span className="text-sm" style={{ color: result?.error ? "#EF4444" : ACCENT }}>
                                {result?.error ? "❌ Error" : result?.formatted ? "✅ Válido" : "Resultado"}
                            </span>
                        </div>
                        <div className="px-4 py-3 overflow-auto max-h-[500px]">
                            {result?.error ? (
                                <div className="text-red-400 text-sm space-y-2">
                                    <p>{result.error.message}</p>
                                    {result.error.line && (
                                        <p className="text-xs text-red-500">Línea ~{result.error.line}, Columna ~{result.error.column}</p>
                                    )}
                                </div>
                            ) : result?.tokens ? (
                                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                                    {result.tokens.map((t, i) => (
                                        <span key={i} style={{ color: TOKEN_COLORS[t.type] }}>{t.text}</span>
                                    ))}
                                </pre>
                            ) : (
                                <p className="text-neutral-600 text-sm">Pega JSON en la entrada...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs text-neutral-500">
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
