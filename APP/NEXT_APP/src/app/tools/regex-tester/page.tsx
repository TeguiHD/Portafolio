"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { useToast } from "@/components/ui/Toast";

// Common patterns library
const COMMON_PATTERNS = [
    { name: "Email", regex: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", desc: "Valida direcciones de correo" },
    { name: "URL", regex: "https?:\\/\\/[\\w\\-._~:/?#[\\]@!$&'()*+,;=]+", desc: "URLs HTTP/HTTPS" },
    { name: "Teléfono (CL)", regex: "\\+?56\\s?9\\s?\\d{4}\\s?\\d{4}", desc: "Móviles chilenos" },
    { name: "IPv4", regex: "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b", desc: "Direcciones IP v4" },
    { name: "Fecha DD/MM/YYYY", regex: "(0[1-9]|[12]\\d|3[01])\\/(0[1-9]|1[0-2])\\/\\d{4}", desc: "Formato día/mes/año" },
    { name: "Hora HH:MM", regex: "([01]\\d|2[0-3]):[0-5]\\d", desc: "Formato 24 horas" },
    { name: "Hexadecimal", regex: "#?[0-9a-fA-F]{6}|#?[0-9a-fA-F]{3}", desc: "Colores hex" },
    { name: "Números", regex: "-?\\d+(\\.\\d+)?", desc: "Enteros y decimales" },
];

// Regex flags with descriptions
const FLAGS = [
    { char: "g", name: "global", desc: "Encuentra todas las coincidencias, no solo la primera" },
    { char: "i", name: "insensitive", desc: "Ignora mayúsculas/minúsculas" },
    { char: "m", name: "multiline", desc: "^ y $ coinciden con inicio/fin de cada línea" },
    { char: "s", name: "dotAll", desc: "El punto (.) también coincide con saltos de línea" },
    { char: "u", name: "unicode", desc: "Habilita soporte completo de Unicode" },
];

// Cheatsheet data
const CHEATSHEET = [
    { cat: "Básicos", items: [[".", "Cualquier carácter"], ["\\d", "Dígito (0-9)"], ["\\w", "Alfanumérico"], ["\\s", "Espacio en blanco"], ["\\n", "Salto de línea"]] },
    { cat: "Cuantificadores", items: [["*", "0 o más"], ["+", "1 o más"], ["?", "0 o 1"], ["{n}", "Exactamente n"], ["{n,m}", "Entre n y m"]] },
    { cat: "Anclas", items: [["^", "Inicio de línea"], ["$", "Fin de línea"], ["\\b", "Límite de palabra"]] },
    { cat: "Grupos", items: [["(abc)", "Grupo captura"], ["(?:abc)", "Grupo sin captura"], ["a|b", "Alternativa"]] },
    { cat: "Clases", items: [["[abc]", "a, b o c"], ["[^abc]", "Excepto a, b, c"], ["[a-z]", "Rango a-z"]] },
];

// Maximum test string length (50KB) for safety
const MAX_TEXT_LENGTH = 50000;
const EXECUTION_TIMEOUT_MS = 100;

export default function RegexTesterPage() {
    const { isLoading } = useToolAccess("regex-tester");
    const toast = useToast();
    const [regex, setRegex] = useState("");
    const [activeFlags, setActiveFlags] = useState({ g: true, i: false, m: true, s: false, u: false });
    const [testString, setTestString] = useState("");
    const [matches, setMatches] = useState<RegExpMatchArray | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [execTime, setExecTime] = useState<number | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [showCheatsheet, setShowCheatsheet] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [timeoutWarning, setTimeoutWarning] = useState(false);
    const cheatsheetRef = useRef<HTMLDivElement>(null);

    // AI generation states
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [aiLatency, setAiLatency] = useState<number | null>(null);
    const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetIn: number } | null>(null);

    // Examples generation states
    const [generatedExamples, setGeneratedExamples] = useState<string[]>([]);
    const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);

    // Generate regex with AI
    const generateWithAI = async () => {
        if (!aiPrompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setAiExplanation(null);

        try {
            const response = await fetch("/api/tools/regex-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt.trim() })
            });

            // Parse rate limit headers
            const remaining = parseInt(response.headers.get("X-RateLimit-Remaining") || "5");
            const resetIn = parseInt(response.headers.get("X-RateLimit-Reset") || "60");
            setRateLimitInfo({ remaining, resetIn });

            const data = await response.json();

            if (!response.ok) {
                toast.error("Error de IA", data.error || "Error al generar regex");
                if (data.suggestion) {
                    toast.info("Sugerencia", data.suggestion);
                }
                return;
            }

            // Success - update regex and flags
            setRegex(data.regex);
            if (data.flags) {
                const newFlags = { g: false, i: false, m: false, s: false, u: false };
                for (const f of data.flags) {
                    if (f in newFlags) newFlags[f as keyof typeof newFlags] = true;
                }
                setActiveFlags(newFlags);
            }
            setAiExplanation(data.explanation);
            setAiLatency(data.latencyMs);

            toast.success("Regex generada", data.explanation || "Expresión regular lista para probar");
            setGeneratedExamples([]);  // Clear previous examples on new regex

        } catch (err) {
            toast.error("Error de conexión", "No se pudo conectar con el servicio de IA");
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate examples with AI
    const generateExamples = async () => {
        if (!regex || isGeneratingExamples) return;

        setIsGeneratingExamples(true);

        try {
            const response = await fetch("/api/tools/regex-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "examples", regex, flags: flagsString })
            });

            // Parse rate limit headers
            const remaining = parseInt(response.headers.get("X-RateLimit-Remaining") || "5");
            const resetIn = parseInt(response.headers.get("X-RateLimit-Reset") || "60");
            setRateLimitInfo({ remaining, resetIn });

            const data = await response.json();

            if (!response.ok) {
                toast.error("Error", data.error || "No se pudieron generar ejemplos");
                return;
            }

            setGeneratedExamples(data.examples || []);
            toast.success("Ejemplos generados", `${data.examples?.length || 0} ejemplos válidos`);

        } catch (err) {
            toast.error("Error de conexión", "No se pudo conectar con el servicio de IA");
        } finally {
            setIsGeneratingExamples(false);
        }
    };

    // Copy examples to test area
    const copyExamplesToTestArea = () => {
        if (generatedExamples.length === 0) return;
        setTestString(generatedExamples.join("\n"));
        toast.success("Copiado", "Ejemplos añadidos al área de prueba");
    };

    // Build flags string
    const flagsString = useMemo(() =>
        Object.entries(activeFlags).filter(([_, v]) => v).map(([k]) => k).join(""),
        [activeFlags]
    );

    // Safe regex execution with timeout
    const executeRegex = useCallback(() => {
        if (!regex) {
            setMatches(null);
            setError(null);
            setExecTime(null);
            setTimeoutWarning(false);
            return;
        }

        // Check text length
        if (testString.length > MAX_TEXT_LENGTH) {
            setError(`Texto demasiado largo. Máximo: ${MAX_TEXT_LENGTH.toLocaleString()} caracteres`);
            return;
        }

        setIsExecuting(true);
        setTimeoutWarning(false);

        const startTime = performance.now();
        let timedOut = false;

        // Create a timeout to abort long-running regex
        const timeoutId = setTimeout(() => {
            timedOut = true;
            setIsExecuting(false);
            setTimeoutWarning(true);
            setError("⚠️ Timeout: La regex tardó demasiado (posible ReDoS). Simplifica el patrón.");
            setMatches(null);
            setExecTime(null);
        }, EXECUTION_TIMEOUT_MS);

        try {
            const re = new RegExp(regex, flagsString);
            const found = testString.match(re);

            if (!timedOut) {
                clearTimeout(timeoutId);
                const endTime = performance.now();
                setExecTime(endTime - startTime);
                setMatches(found);
                setError(null);
                setIsExecuting(false);
            }
        } catch (err: unknown) {
            clearTimeout(timeoutId);
            if (!timedOut) {
                setError(err instanceof Error ? err.message : "Error en la expresión regular");
                setMatches(null);
                setExecTime(null);
                setIsExecuting(false);
            }
        }
    }, [regex, flagsString, testString]);

    // Debounced execution
    useEffect(() => {
        const debounce = setTimeout(executeRegex, 150);
        return () => clearTimeout(debounce);
    }, [executeRegex]);

    // Toggle flag
    const toggleFlag = (flag: string) => {
        setActiveFlags(prev => ({ ...prev, [flag]: !prev[flag as keyof typeof prev] }));
    };

    // Copy to clipboard
    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 1500);
    };

    // Insert pattern
    const insertPattern = (pattern: string) => {
        setRegex(pattern);
    };

    // Highlight matches in text
    const highlightMatches = () => {
        if (!regex || error || !testString) return testString;

        try {
            const re = new RegExp(`(${regex})`, flagsString);
            const parts = testString.split(re);
            return parts.map((part, i) => {
                if (new RegExp(regex, flagsString).test(part)) {
                    return <span key={i} className="bg-blue-500/30 text-white rounded px-0.5 border-b-2 border-blue-400">{part}</span>;
                }
                return part;
            });
        } catch {
            return testString;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 mb-3">
                        <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                        </svg>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Regex Tester</h1>
                    <p className="text-neutral-500 text-sm">Prueba expresiones regulares con protección anti-ReDoS</p>
                </div>

                {/* AI Generation Section */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 sm:p-5 border border-purple-500/30 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-sm">🤖</span>
                        <div>
                            <h3 className="text-white font-medium text-sm">Generar con IA</h3>
                            <p className="text-[10px] text-neutral-500">Describe en español qué quieres buscar</p>
                        </div>
                        {rateLimitInfo && (
                            <span className="ml-auto text-[10px] text-neutral-500">
                                {rateLimitInfo.remaining}/5 restantes
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && generateWithAI()}
                            placeholder="Ej: emails que terminen en .cl, teléfonos con código de país..."
                            maxLength={200}
                            disabled={isGenerating}
                            className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent outline-none disabled:opacity-50"
                        />
                        <button
                            onClick={generateWithAI}
                            disabled={!aiPrompt.trim() || isGenerating}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-w-[120px]"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>✨ Generar</>
                            )}
                        </button>
                    </div>

                    {/* AI Success/Explanation */}
                    {aiExplanation && (
                        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                            <p className="text-green-400 text-xs font-medium mb-1">✓ Regex generada</p>
                            <p className="text-neutral-400 text-xs">{aiExplanation}</p>
                            {aiLatency && <p className="text-[10px] text-neutral-600 mt-1">Generado en {aiLatency}ms</p>}

                            {/* Generate Examples Button */}
                            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={generateExamples}
                                    disabled={isGeneratingExamples || (rateLimitInfo?.remaining === 0)}
                                    className="px-3 py-1.5 rounded-lg text-xs bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    {isGeneratingExamples ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>✨ Generar Ejemplos</>
                                    )}
                                </button>
                                <span className="text-[10px] text-neutral-600">
                                    Genera texto que coincida con tu regex
                                </span>
                            </div>

                            {/* Generated Examples Display */}
                            {generatedExamples.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-neutral-400">Ejemplos generados:</span>
                                        <button
                                            onClick={copyExamplesToTestArea}
                                            className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            ⇩ Copiar al área de prueba
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {generatedExamples.map((ex, i) => (
                                            <span key={i} className="px-2 py-1 rounded bg-black/40 text-xs font-mono text-green-400 border border-green-500/20">
                                                {ex}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Regex Input */}
                <div className="bg-[#0a0e17] rounded-2xl p-4 sm:p-5 border border-white/10 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-mono text-lg">/</span>
                            <input
                                type="text"
                                value={regex}
                                onChange={(e) => setRegex(e.target.value)}
                                placeholder="Escribe tu expresión regular..."
                                className={`w-full bg-black/40 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl pl-7 pr-7 py-3 text-white font-mono focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 font-mono text-lg">/{flagsString}</span>
                        </div>
                        <button
                            onClick={() => copyToClipboard(`/${regex}/${flagsString}`, 'regex')}
                            className={`px-4 py-2 rounded-xl text-sm transition-colors ${copied === 'regex' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            {copied === 'regex' ? '✓ Copiado' : 'Copiar'}
                        </button>
                    </div>

                    {/* Flags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {FLAGS.map((f) => (
                            <button
                                key={f.char}
                                onClick={() => toggleFlag(f.char)}
                                title={f.desc}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${activeFlags[f.char as keyof typeof activeFlags]
                                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                                    : 'bg-white/5 border border-white/10 text-neutral-500 hover:bg-white/10'
                                    }`}
                            >
                                {f.char} <span className="text-[10px] opacity-60">{f.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Error/Warning */}
                    {error && (
                        <div className={`p-2 rounded-lg text-xs ${timeoutWarning ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                            {error}
                        </div>
                    )}

                    {/* Stats */}
                    {!error && matches && (
                        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                            <span className="text-blue-400">{matches.length} coincidencia{matches.length !== 1 ? 's' : ''}</span>
                            {execTime !== null && <span>• {execTime.toFixed(2)}ms</span>}
                        </div>
                    )}
                </div>

                {/* Common Patterns */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">📋</span>
                        Patrones comunes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {COMMON_PATTERNS.map((p) => (
                            <button
                                key={p.name}
                                onClick={() => insertPattern(p.regex)}
                                title={p.desc}
                                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-neutral-400 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400 transition-all"
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Test & Results */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Texto de prueba</label>
                        <textarea
                            value={testString}
                            onChange={(e) => setTestString(e.target.value)}
                            placeholder="Ingresa el texto para probar tu regex..."
                            className="w-full h-48 bg-[#0a0e17] border border-white/10 rounded-xl p-3 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                        />
                        <p className="text-[10px] text-neutral-600 mt-1">{testString.length.toLocaleString()}/{MAX_TEXT_LENGTH.toLocaleString()} caracteres</p>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-neutral-400">Resultados</label>
                            {isExecuting && <span className="text-xs text-blue-400 animate-pulse">Ejecutando...</span>}
                        </div>
                        <div className="w-full h-48 bg-[#0a0e17] border border-white/10 rounded-xl p-3 text-neutral-400 font-mono text-sm overflow-auto whitespace-pre-wrap">
                            {testString ? highlightMatches() : <span className="text-neutral-600">Los resultados aparecerán aquí...</span>}
                        </div>
                    </div>
                </div>

                {/* Cheatsheet */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <button onClick={() => setShowCheatsheet(!showCheatsheet)} className="w-full p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm">📖</span>
                            <div className="text-left">
                                <div className="text-white font-medium text-sm">Cheatsheet de Regex</div>
                                <div className="text-[11px] text-neutral-500">Referencia rápida de sintaxis</div>
                            </div>
                        </div>
                        <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${showCheatsheet ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <div
                        ref={cheatsheetRef}
                        className="overflow-hidden transition-all duration-300 ease-out"
                        style={{ maxHeight: showCheatsheet ? '500px' : '0px', opacity: showCheatsheet ? 1 : 0 }}
                    >
                        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {CHEATSHEET.map((cat) => (
                                <div key={cat.cat} className="bg-black/20 rounded-lg p-3">
                                    <h4 className="text-cyan-400 text-xs font-medium mb-2">{cat.cat}</h4>
                                    <div className="space-y-1">
                                        {cat.items.map(([syntax, desc]) => (
                                            <div key={syntax} className="flex justify-between text-[10px]">
                                                <code className="text-white font-mono">{syntax}</code>
                                                <span className="text-neutral-500">{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] text-amber-400/80">
                        <strong>🛡️ Seguridad:</strong> Este tester incluye protección contra ataques ReDoS (regex maliciosas).
                        Las expresiones que tardan más de {EXECUTION_TIMEOUT_MS}ms se abortan automáticamente.
                        Límite de texto: {(MAX_TEXT_LENGTH / 1000).toFixed(0)}KB.
                    </p>
                </div>

                {/* How to Use Guide */}
                <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-2xl border border-blue-500/20 p-5 mt-4">
                    <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">❓</span>
                        ¿Cómo usar esta herramienta?
                    </h3>

                    <div className="space-y-4 text-xs">
                        {/* Step by step */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-black/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                                    <span className="text-white font-medium">Escribe tu regex</span>
                                </div>
                                <p className="text-neutral-400">En el campo superior, escribe el patrón que quieres buscar. Ejemplo: <code className="text-blue-400">\d+</code> busca números.</p>
                            </div>

                            <div className="bg-black/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">2</span>
                                    <span className="text-white font-medium">Selecciona los modificadores</span>
                                </div>
                                <p className="text-neutral-400">Los botones <code className="text-green-400">g</code> <code className="text-green-400">i</code> <code className="text-green-400">m</code> cambian el comportamiento de búsqueda.</p>
                            </div>

                            <div className="bg-black/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">3</span>
                                    <span className="text-white font-medium">Escribe texto de prueba</span>
                                </div>
                                <p className="text-neutral-400">En &quot;Texto de prueba&quot; pega o escribe el texto donde quieres buscar el patrón.</p>
                            </div>

                            <div className="bg-black/20 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold">4</span>
                                    <span className="text-white font-medium">Ve los resultados</span>
                                </div>
                                <p className="text-neutral-400">Las coincidencias se <span className="bg-blue-500/30 text-white px-1 rounded">resaltan en azul</span> automáticamente.</p>
                            </div>
                        </div>

                        {/* Flags explanation */}
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-white font-medium mb-2">¿Qué son los modificadores (g, i, m, s, u)?</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-400">
                                <div><code className="text-green-400">g</code> = Global: encuentra TODAS las coincidencias, no solo la primera</div>
                                <div><code className="text-green-400">i</code> = Insensitive: ignora mayúsculas/minúsculas</div>
                                <div><code className="text-green-400">m</code> = Multiline: busca en cada línea por separado</div>
                                <div><code className="text-green-400">s</code> = DotAll: el punto (.) también coincide con saltos de línea</div>
                            </div>
                        </div>

                        {/* Example */}
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-white font-medium mb-2">💡 Ejemplo rápido</p>
                            <p className="text-neutral-400 mb-2">Para validar un email, usa el patrón de &quot;Patrones comunes&quot; → Email:</p>
                            <code className="text-purple-400 text-[10px] block bg-black/30 p-2 rounded">[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]&#123;2,&#125;</code>
                            <p className="text-neutral-500 mt-2 text-[10px]">Esto encontrará textos como: usuario@ejemplo.com, test.email@dominio.cl</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/tools" className="text-xs text-neutral-500 hover:text-white">← Volver a herramientas</Link>
                </div>
            </main>
        </div>
    );
}
