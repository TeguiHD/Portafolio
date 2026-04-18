"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

const ACCENT = "#10B981";

/**
 * EMOJI STEGANOGRAPHY
 * ===================
 * Hides text inside emoji sequences using zero-width characters (ZWC).
 * Each character of the secret message is encoded into a binary representation
 * using two invisible Unicode characters:
 *   - Zero-Width Space        (U+200B) → bit 0
 *   - Zero-Width Non-Joiner   (U+200C) → bit 1
 * Characters are separated by Zero-Width Joiner (U+200D).
 *
 * SECURITY (OWASP/MITRE):
 * - Input length limits prevent DoS
 * - No eval() or dynamic code execution
 * - Output is pure text, not executable
 * - Decode sanitizes by only extracting known ZWC characters
 * - XSS-safe: decoded text is rendered as textContent, not innerHTML
 */

const ZWS = "\u200B";  // Zero-Width Space → 0
const ZWNJ = "\u200C"; // Zero-Width Non-Joiner → 1
const ZWJ = "\u200D";  // Zero-Width Joiner → separator

const MAX_SECRET_LEN = 2000;
const MAX_CARRIER_LEN = 10000;
const MAX_DECODE_LEN = 100000;

/** Encode a string into zero-width characters */
function encodeToZWC(text: string): string {
    return Array.from(text)
        .map(char => {
            const code = char.codePointAt(0)!;
            // Use 21 bits to support full Unicode (up to U+10FFFF)
            const binary = code.toString(2).padStart(21, "0");
            return binary
                .split("")
                .map(bit => (bit === "0" ? ZWS : ZWNJ))
                .join("");
        })
        .join(ZWJ);
}

/** Decode zero-width characters back to text */
function decodeFromZWC(encoded: string): string {
    // SECURITY: Extract only known ZWC characters, ignore everything else
    const zwcOnly = encoded.split("").filter(c => c === ZWS || c === ZWNJ || c === ZWJ).join("");

    if (!zwcOnly) return "";

    const chars = zwcOnly.split(ZWJ);
    return chars
        .map(charBits => {
            const binary = charBits
                .split("")
                .map(c => (c === ZWS ? "0" : "1"))
                .join("");
            if (binary.length === 0) return "";
            const code = parseInt(binary, 2);
            // SECURITY: Validate code point range
            if (code < 0 || code > 0x10FFFF) return "?";
            return String.fromCodePoint(code);
        })
        .join("");
}

/** Hide ZWC-encoded text inside carrier emojis */
function hideInEmojis(secret: string, carrier: string): string {
    const encoded = encodeToZWC(secret);
    const segments = Array.from(carrier);

    if (segments.length < 2) return carrier + encoded;

    const gapCount = segments.length - 1;
    const baseChunkSize = Math.floor(encoded.length / gapCount);
    const remainder = encoded.length % gapCount;
    let cursor = 0;
    let output = segments[0];

    for (let gapIndex = 0; gapIndex < gapCount; gapIndex++) {
        const chunkSize = baseChunkSize + (gapIndex < remainder ? 1 : 0);
        output += encoded.slice(cursor, cursor + chunkSize);
        cursor += chunkSize;
        output += segments[gapIndex + 1];
    }

    return output;
}

/** Extract hidden ZWC text from emoji string */
function extractFromEmojis(text: string): string {
    return decodeFromZWC(text);
}

export default function SteganographyPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("esteganografia");
    const [mode, setMode] = useState<"encode" | "decode">("encode");

    // Encode state
    const [secret, setSecret] = useState("");
    const [carrier, setCarrier] = useState("🔒🛡️🔑✨");
    const [encodedResult, setEncodedResult] = useState("");

    // Decode state
    const [decodeInput, setDecodeInput] = useState("");
    const [decodedResult, setDecodedResult] = useState("");

    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEncode = useCallback(() => {
        setError(null);
        if (!secret.trim()) {
            setError("Introduce un mensaje secreto para ocultar.");
            return;
        }
        if (secret.length > MAX_SECRET_LEN) {
            setError(`El mensaje secreto no puede exceder ${MAX_SECRET_LEN} caracteres.`);
            return;
        }
        if (carrier.length > MAX_CARRIER_LEN) {
            setError(`El texto portador no puede exceder ${MAX_CARRIER_LEN} caracteres.`);
            return;
        }
        if (!carrier.trim()) {
            setError("Introduce emojis o texto portador.");
            return;
        }

        const result = hideInEmojis(secret, carrier);
        setEncodedResult(result);
    }, [secret, carrier]);

    const handleDecode = useCallback(() => {
        setError(null);
        if (!decodeInput.trim()) {
            setError("Pega el texto con el mensaje oculto.");
            return;
        }
        if (decodeInput.length > MAX_DECODE_LEN) {
            setError(`El texto no puede exceder ${MAX_DECODE_LEN} caracteres.`);
            return;
        }

        const result = extractFromEmojis(decodeInput);
        if (!result) {
            setError("No se encontró ningún mensaje oculto en el texto.");
            return;
        }
        setDecodedResult(result);
    }, [decodeInput]);

    const handleCopy = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Esteganografía Emoji"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Esteganografía Emoji</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Oculta texto dentro de emojis o texto visible mediante caracteres invisibles
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10 mb-6">
                    {(["encode", "decode"] as const).map(m => (
                        <button key={m} onClick={() => { setMode(m); setError(null); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? "text-white" : "text-neutral-400"}`}
                            style={mode === m ? { background: `${ACCENT}20`, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}>
                            {m === "encode" ? "🔒 Codificar" : "🔓 Decodificar"}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        ❌ {error}
                    </div>
                )}

                {mode === "encode" ? (
                    <div className="space-y-4">
                        {/* Secret Message */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <label className="block">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Mensaje Secreto</span>
                                    <span className="text-xs text-neutral-500">{secret.length}/{MAX_SECRET_LEN}</span>
                                </div>
                                <textarea
                                    value={secret}
                                    onChange={e => setSecret(e.target.value)}
                                    placeholder="Escribe el mensaje que deseas ocultar..."
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-2 resize-none"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                    rows={3}
                                    maxLength={MAX_SECRET_LEN}
                                    spellCheck={false}
                                />
                            </label>
                        </div>

                        {/* Carrier Emojis */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <label className="block">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Texto portador</span>
                                    <span className="text-xs text-neutral-500">Texto visible donde se reparte el mensaje oculto</span>
                                </div>
                                <input
                                    type="text"
                                    value={carrier}
                                    onChange={e => setCarrier(e.target.value)}
                                    placeholder="Usa emojis o una frase corta"
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-lg text-white outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                    maxLength={MAX_CARRIER_LEN}
                                    spellCheck={false}
                                />
                            </label>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {["🔒🛡️🔑✨", "👋😊🎉", "🌍🏔️🌊🌅", "💻🔥🚀", "❤️💛💚💙"].map(preset => (
                                    <button key={preset} onClick={() => setCarrier(preset)}
                                        className="px-3 py-1 rounded-lg bg-white/5 text-sm hover:bg-white/10 transition-colors">
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleEncode}
                            disabled={!secret.trim()}
                            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.005] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}>
                            🔒 Ocultar Mensaje
                        </button>

                        {/* Encoded Result */}
                        {encodedResult && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Resultado (copia y comparte)</span>
                                    <button onClick={() => handleCopy(encodedResult)}
                                        className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        {copied ? "✓ Copiado" : "Copiar"}
                                    </button>
                                </div>
                                <div className="bg-[#0F1724] rounded-lg p-4 text-2xl text-center select-all">
                                    {encodedResult}
                                </div>
                                <p className="text-xs text-neutral-500 mt-2 text-center">
                                    El texto visible se mantiene, pero ahora lleva caracteres invisibles repartidos entre sus elementos.
                                </p>

                                {/* Proof it works */}
                                <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-xs text-emerald-300">
                                        <strong>✓ Verificación:</strong> Se insertaron{" "}
                                        {encodedResult.split("").filter(c => c === ZWS || c === ZWNJ || c === ZWJ).length}{" "}
                                        caracteres invisibles en {Math.max(Array.from(carrier).length - 1, 1)} puntos del texto visible.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Decode Input */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <label className="block">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Texto con Mensaje Oculto</span>
                                </div>
                                <textarea
                                    value={decodeInput}
                                    onChange={e => setDecodeInput(e.target.value)}
                                    placeholder="Pega aquí el texto con emojis que contiene un mensaje oculto..."
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-lg text-white outline-none focus:ring-2 resize-none"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                    rows={3}
                                    maxLength={MAX_DECODE_LEN}
                                    spellCheck={false}
                                />
                            </label>
                        </div>

                        <button onClick={handleDecode}
                            disabled={!decodeInput.trim()}
                            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.005] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}>
                            🔓 Revelar Mensaje
                        </button>

                        {/* Decoded Result */}
                        {decodedResult && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Mensaje Descubierto</span>
                                    <button onClick={() => handleCopy(decodedResult)}
                                        className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        {copied ? "✓ Copiado" : "Copiar"}
                                    </button>
                                </div>
                                <div className="bg-[#0F1724] rounded-lg p-4 text-sm text-white whitespace-pre-wrap break-words">
                                    {decodedResult}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* How it works */}
                <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">Cómo se oculta el texto</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-400">
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">📝</span>
                            <p>Cada carácter del mensaje se convierte a binario (21 bits Unicode)</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">👻</span>
                            <p>Los bits se representan con caracteres invisibles de ancho cero (U+200B y U+200C)</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">🔒</span>
                            <p>Los caracteres invisibles se insertan entre los emojis visibles del portador</p>
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                    <p className="text-xs text-emerald-300">
                        <strong>Privacidad local:</strong> Todo el procesamiento ocurre en tu navegador y no se envía a servidores externos.
                        Esto oculta el texto, pero no lo cifra. Si el contenido es sensible, conviene cifrarlo antes.
                    </p>
                </div>

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
