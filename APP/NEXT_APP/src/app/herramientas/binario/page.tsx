"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useMemo, useRef } from "react";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";

type ModeType = "text-to-binary" | "binary-to-text";

// Security: Input limits to prevent DoS
const MAX_TEXT_LENGTH = 10000;
// Cabe el binario de cualquier texto permitido (hasta 3 bytes por carácter, 9 caracteres por byte): «Intercambiar» no lo corta.
const MAX_BINARY_LENGTH = 270_000;

// Security: Validate binary string (only 0, 1, and spaces)
const isValidBinary = (input: string): boolean => {
    return /^[01\s]*$/.test(input);
};

// El texto se limita en largo; no se escapa como HTML (React ya escapa al mostrar, y escapar dentro del campo
// convertía «&» en «&amp;» y lo volvía a escapar con cada tecla).
const sanitizeText = (input: string): string => input.slice(0, MAX_TEXT_LENGTH);

const sanitizeBinary = (input: string): string => {
    // Only allow 0, 1, and whitespace
    return input.replace(/[^01\s]/g, "").slice(0, MAX_BINARY_LENGTH);
};

/** Bytes de la entrada: separados por espacios (de 1 a 8 bits cada uno) o una tira seguida, de a 8. */
const gruposBinarios = (binary: string): { bytes: number[]; largos: number; sobran: number } => {
    const limpio = binary.trim();
    if (!limpio) return { bytes: [], largos: 0, sobran: 0 };
    if (!/\s/.test(limpio)) {
        const sobran = limpio.length % 8;
        const enteros = limpio.slice(0, limpio.length - sobran);
        return { bytes: (enteros.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)), largos: 0, sobran };
    }
    const grupos = limpio.split(/\s+/).filter(Boolean);
    return { bytes: grupos.filter((g) => g.length <= 8).map((b) => parseInt(b, 2)), largos: grupos.filter((g) => g.length > 8).length, sobran: 0 };
};

/** Qué se dejó fuera o no se pudo leer, para no entregar un texto incompleto en silencio. */
const avisoBinario = (binary: string, texto: string): string | null => {
    const { largos, sobran } = gruposBinarios(binary);
    const partes: string[] = [];
    if (sobran) partes.push(`Sobran ${sobran} ${sobran === 1 ? "bit" : "bits"} al final: una tira seguida se lee de a 8.`);
    if (largos) partes.push(`${largos === 1 ? "Un grupo tiene" : `${largos} grupos tienen`} más de 8 bits y se ${largos === 1 ? "omitió" : "omitieron"}.`);
    if (texto.includes("\uFFFD")) partes.push("Algunos bytes no forman UTF-8 válido y salen como «�».");
    return partes.length ? partes.join(" ") : null;
};

// Texto → binario en UTF-8 real: «ñ» son dos bytes (11000011 10110001) y un emoji, cuatro. Antes se usaba el código
// UTF-16 de cada unidad, que daba «11110001» para la ñ y partía los emojis aunque la página dijera UTF-8.
const textToBinary = (text: string): string =>
    Array.from(new TextEncoder().encode(text), (b) => b.toString(2).padStart(8, "0")).join(" ");

// Binario → texto. Acepta bytes separados por espacios o una tira continua (se corta de a 8 bits).
// Bytes que no forman UTF-8 válido salen como «�» en vez de romper la conversión (y se avisa).
const binaryToText = (binary: string): string =>
    new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(gruposBinarios(binary).bytes));

export default function BinaryTranslatorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("binario");
    const { trackImmediate } = useToolTracking("binario", { trackViewOnMount: true, debounceMs: 2000 });

    const [mode, setMode] = useState<ModeType>("text-to-binary");
    const [inputText, setInputText] = useState("");
    const [recortado, setRecortado] = useState(false);
    const { copiado, fallo, copiar } = useCopiar(2000);
    const lastTrackRef = useRef<number>(0);

    // Convert based on mode
    const output = useMemo(() => {
        if (!inputText.trim()) return "";

        if (mode === "text-to-binary") {
            return textToBinary(inputText);
        } else {
            if (!isValidBinary(inputText)) {
                return "⚠️ Entrada inválida: solo se permiten 0, 1 y espacios";
            }
            return binaryToText(inputText);
        }
    }, [inputText, mode]);

    const aviso = useMemo(
        () => (mode === "binary-to-text" && output && !output.startsWith("⚠️") ? avisoBinario(inputText, output) : null),
        [mode, inputText, output],
    );

    // Handle input change with sanitization
    const handleInputChange = useCallback((value: string) => {
        const limpio = mode === "text-to-binary" ? sanitizeText(value) : sanitizeBinary(value);
        // Pegar algo más largo que el límite lo corta: se avisa en vez de perder el final sin decir nada.
        setRecortado(value.length > (mode === "text-to-binary" ? MAX_TEXT_LENGTH : MAX_BINARY_LENGTH));
        setInputText(limpio);
    }, [mode]);

    // Copy to clipboard with throttled tracking
    const copyToClipboard = useCallback(async () => {
        if (!output || output.startsWith("⚠️")) return;
        if (!(await copiar(output, "salida"))) return;
        const now = Date.now();
        if (now - lastTrackRef.current > 2000) {
            lastTrackRef.current = now;
            trackImmediate("use", { action: "copy", mode, inputLength: inputText.length });
        }
    }, [output, mode, inputText.length, copiar, trackImmediate]);

    // Swap mode and content
    const swapMode = useCallback(() => {
        if (output && !output.startsWith("⚠️")) {
            setInputText(output);
        } else {
            setInputText("");
        }
        setMode(mode === "text-to-binary" ? "binary-to-text" : "text-to-binary");
    }, [mode, output]);

    // Clear all
    const clearAll = useCallback(() => {
        setInputText("");
        setRecortado(false);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Traductor binario"} />;
    }

    const inputLimit = mode === "text-to-binary" ? MAX_TEXT_LENGTH : MAX_BINARY_LENGTH;

    return (
        <div className="tool-page">
            <main className="tool-main pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <ToolPageHeader slug="binario" />

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 border border-white/10" role="group" aria-label="Dirección">
                    <button
                        type="button"
                        aria-pressed={mode === "text-to-binary"}
                        onClick={() => { setMode("text-to-binary"); setInputText(""); setRecortado(false); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "text-to-binary"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span aria-hidden="true">📝</span>
                        Texto → Binario
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === "binary-to-text"}
                        onClick={() => { setMode("binary-to-text"); setInputText(""); setRecortado(false); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "binary-to-text"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span aria-hidden="true">🔢</span>
                        Binario → Texto
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="binario-entrada" className="text-sm text-neutral-400">
                                {mode === "text-to-binary" ? "Texto de entrada" : "Binario de entrada"}
                            </label>
                            <span className="text-xs text-neutral-500">
                                {inputText.length.toLocaleString("es-CL")} / {inputLimit.toLocaleString("es-CL")}
                            </span>
                        </div>
                        <textarea
                            id="binario-entrada"
                            value={inputText}
                            onChange={(e) => handleInputChange(e.target.value)}
                            placeholder={mode === "text-to-binary"
                                ? "Escribe tu texto aquí..."
                                : "Ingresa código binario (ej: 01001000 01101111 01101100 01100001)"
                            }
                            rows={8}
                            className="w-full px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 placeholder-neutral-500 resize-none font-mono"
                            spellCheck={false}
                        />
                        {recortado && <p role="alert" className="mt-2 text-xs text-amber-300">Lo pegado pasaba el máximo de {inputLimit.toLocaleString("es-CL")} caracteres: se cortó el final.</p>}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                            <button
                                type="button"
                                onClick={swapMode}
                                disabled={!output || output.startsWith("⚠️")}
                                className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-all text-sm"
                                title="Intercambiar entrada/salida"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                                Intercambiar
                            </button>
                            <button
                                type="button"
                                onClick={clearAll}
                                className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white transition-all text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Output */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p id="binario-salida-titulo" className="text-sm text-neutral-400">
                                {mode === "text-to-binary" ? "Resultado en binario" : "Resultado en texto"}
                            </p>
                            {output && !output.startsWith("⚠️") && (
                                <span className="text-xs text-neutral-500" aria-live="polite">
                                    {mode === "text-to-binary"
                                        ? `${((output.length + 1) / 9).toLocaleString("es-CL")} bytes`
                                        : `${Array.from(output).length.toLocaleString("es-CL")} caracteres`}
                                </span>
                            )}
                        </div>

                        <div className="relative">
                            <div
                                role="region"
                                aria-labelledby="binario-salida-titulo"
                                className={`w-full min-h-[200px] px-4 py-3 rounded-xl bg-[#0F1724] border border-white/10 text-sm font-mono overflow-auto whitespace-pre-wrap break-all ${output.startsWith("⚠️") ? "text-yellow-400" : "text-cyan-400"
                                    }`}
                            >
                                {output || (
                                    <span className="text-neutral-500">
                                        {mode === "text-to-binary"
                                            ? "El resultado binario aparecerá aquí..."
                                            : "El texto decodificado aparecerá aquí..."
                                        }
                                    </span>
                                )}
                            </div>

                            {/* Copy Button */}
                            {output && !output.startsWith("⚠️") && (
                                <button
                                    type="button"
                                    onClick={() => { void copyToClipboard(); }}
                                    aria-label="Copiar resultado"
                                    className={`absolute top-3 right-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-all ${copiado === "salida"
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20"
                                        }`}
                                >
                                    {copiado === "salida" ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                        {aviso && <p role="status" className="mt-2 text-xs text-amber-300">{aviso}</p>}
                        <p role="status" className="mt-2 min-h-4 text-xs text-teal-200">{copiado === "salida" ? "Copiado." : fallo === "salida" ? "No se pudo copiar. Selecciona el resultado y cópialo a mano." : ""}</p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <span aria-hidden="true">📝</span>
                            Texto a Binario
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Cada carácter se convierte a sus bytes en UTF-8, de 8 bits cada uno: «A» es un byte; «ñ», dos; un emoji, cuatro.
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <span aria-hidden="true">🔢</span>
                            Binario a Texto
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Lee bytes separados por espacios (de hasta 8 bits) o una tira seguida, de a 8 bits, y los decodifica como UTF-8.
                        </p>
                    </div>
                </div>

                {/* Example */}
                <div className="mt-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <p className="text-xs text-cyan-400 mb-2">💡 Ejemplo:</p>
                    <p className="text-xs text-neutral-400 font-mono">
                        <span className="text-white">Hola</span> → <span className="text-cyan-400">01001000 01101111 01101100 01100001</span>
                    </p>
                </div>

            </main>
        </div>
    );
}
