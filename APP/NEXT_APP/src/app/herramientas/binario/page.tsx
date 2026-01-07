"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";
import { sanitizeInput } from "@/lib/security";

type ModeType = "text-to-binary" | "binary-to-text";

// Security: Input limits to prevent DoS
const MAX_TEXT_LENGTH = 10000;
const MAX_BINARY_LENGTH = 100000; // Binary is ~8x longer than text

// Security: Validate binary string (only 0, 1, and spaces)
const isValidBinary = (input: string): boolean => {
    return /^[01\s]*$/.test(input);
};

// Security: Sanitize and limit input
const sanitizeText = (input: string): string => {
    return sanitizeInput(input).slice(0, MAX_TEXT_LENGTH);
};

const sanitizeBinary = (input: string): string => {
    // Only allow 0, 1, and whitespace
    return input.replace(/[^01\s]/g, "").slice(0, MAX_BINARY_LENGTH);
};

// Convert text to binary
const textToBinary = (text: string): string => {
    return text
        .split("")
        .map((char) => {
            const binary = char.charCodeAt(0).toString(2);
            return binary.padStart(8, "0"); // Ensure 8 bits per character
        })
        .join(" ");
};

// Convert binary to text
const binaryToText = (binary: string): string => {
    // Split by spaces or into 8-bit chunks
    const bytes = binary.trim().split(/\s+/);

    try {
        return bytes
            .filter((byte) => byte.length > 0)
            .map((byte) => {
                const charCode = parseInt(byte, 2);
                // Security: Validate charCode is in valid range
                if (isNaN(charCode) || charCode < 0 || charCode > 1114111) {
                    return "?";
                }
                return String.fromCharCode(charCode);
            })
            .join("");
    } catch {
        return "";
    }
};

export default function BinaryTranslatorPage() {
    const { isLoading } = useToolAccess("binario");
    const { trackImmediate } = useToolTracking("binario", { trackViewOnMount: true, debounceMs: 2000 });

    const [mode, setMode] = useState<ModeType>("text-to-binary");
    const [inputText, setInputText] = useState("");
    const [copied, setCopied] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
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

    // Handle input change with sanitization
    const handleInputChange = useCallback((value: string) => {
        if (mode === "text-to-binary") {
            setInputText(sanitizeText(value));
        } else {
            setInputText(sanitizeBinary(value));
        }
    }, [mode]);

    // Copy to clipboard with throttled tracking
    const copyToClipboard = useCallback(async () => {
        if (!output || output.startsWith("⚠️")) return;

        // Anti-spam: cooldown
        setIsConverting(true);
        setTimeout(() => setIsConverting(false), 300);

        try {
            await navigator.clipboard.writeText(output);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            // Throttle tracking: max 1 request per 2 seconds
            const now = Date.now();
            if (now - lastTrackRef.current > 2000) {
                lastTrackRef.current = now;
                trackImmediate("use", { action: "copy", mode, inputLength: inputText.length });
            }
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, [output, mode, inputText.length, trackImmediate]);

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
        setCopied(false);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const inputLimit = mode === "text-to-binary" ? MAX_TEXT_LENGTH : MAX_BINARY_LENGTH;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Traductor Binario</h1>
                            <p className="text-sm text-neutral-400">Convierte texto a binario y viceversa</p>
                        </div>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                        onClick={() => { setMode("text-to-binary"); setInputText(""); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "text-to-binary"
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span>📝</span>
                        Texto → Binario
                    </button>
                    <button
                        onClick={() => { setMode("binary-to-text"); setInputText(""); }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "binary-to-text"
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        <span>🔢</span>
                        Binario → Texto
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-neutral-400">
                                {mode === "text-to-binary" ? "Texto de entrada" : "Binario de entrada"}
                            </label>
                            <span className="text-xs text-neutral-500">
                                {inputText.length} / {inputLimit.toLocaleString()}
                            </span>
                        </div>
                        <textarea
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

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={swapMode}
                                disabled={!output || output.startsWith("⚠️")}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-all text-sm"
                                title="Intercambiar entrada/salida"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                                Intercambiar
                            </button>
                            <button
                                onClick={clearAll}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white transition-all text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Output */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-neutral-400">
                                {mode === "text-to-binary" ? "Resultado en binario" : "Resultado en texto"}
                            </label>
                            {output && !output.startsWith("⚠️") && (
                                <span className="text-xs text-neutral-500">
                                    {output.length.toLocaleString()} caracteres
                                </span>
                            )}
                        </div>

                        <div className="relative">
                            <div
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
                                    onClick={copyToClipboard}
                                    disabled={isConverting}
                                    className={`absolute top-3 right-3 p-2 rounded-lg transition-all ${copied
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20"
                                        }`}
                                >
                                    {copied ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <span>📝</span>
                            Texto a Binario
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Cada carácter se convierte a su representación binaria de 8 bits (ASCII/UTF-8).
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <span>🔢</span>
                            Binario a Texto
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Decodifica secuencias de 8 bits (separadas por espacios) a sus caracteres correspondientes.
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

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <Link
                        href="/herramientas"
                        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
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
