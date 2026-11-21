"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useCallback, useDeferredValue, useMemo } from "react";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";
import { analizarInvisibles, codigoU, nombreInvisible, NOMBRE_TIPO, TIPOS_INVISIBLES, type Hallazgo } from "@/lib/tools/invisibles";

const ACCENT = "#10B981";
type Modo = "encode" | "decode" | "detect";
const MODOS: { valor: Modo; texto: string }[] = [
    { valor: "encode", texto: "Codificar" },
    { valor: "decode", texto: "Decodificar" },
    { valor: "detect", texto: "Detectar" },
];
// Grupos que se listan; con mensajes largos puede haber miles.
const MAX_HALLAZGOS_VISIBLES = 100;
const EJEMPLO_INVISIBLES = "Nos vemos mañana \u{1F469}\u200D\u{1F4BB}\u200B\u200C\u200B en la oficina\u{E0073}\u{E0065}\u{E0063}\u{E0072}\u{E0065}\u{E0074}\u{E006F}";

/** «U+200B espacio de ancho cero (ZWSP) ×3 · U+200C … ×2»: los códigos de un grupo, agrupados. */
function resumenCodigos(h: Hallazgo): string {
    const cuenta = new Map<number, number>();
    for (const cp of h.codigos) cuenta.set(cp, (cuenta.get(cp) ?? 0) + 1);
    return Array.from(cuenta, ([cp, n]) => `${codigoU(cp)} ${nombreInvisible(cp)}${n > 1 ? ` ×${n}` : ""}`).join(" · ");
}

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

/**
 * Formato v2: marca U+2060 y luego 8 invisibles por byte UTF-8 (ZWS = 0, ZWNJ = 1), sin separadores.
 * El formato anterior usaba ZWJ como separador, y los ZWJ propios de emojis compuestos (👩‍💻, banderas) lo corrompían.
 * Además es ~2,7 veces más corto (antes 16 bits + separador por carácter).
 */
const MARCA_V2 = "\u2060";
function encodeV2(text: string): string {
    return MARCA_V2 + Array.from(new TextEncoder().encode(text), (b) => b.toString(2).padStart(8, "0").replace(/0/g, ZWS).replace(/1/g, ZWNJ)).join("");
}
function decodeV2(encoded: string): string {
    const bits = encoded.slice(encoded.indexOf(MARCA_V2) + 1).split("").filter((c) => c === ZWS || c === ZWNJ).map((c) => (c === ZWS ? "0" : "1")).join("");
    const bytes = (bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2));
    return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
}

/** Corta el portador por grafemas: nunca se mete un invisible dentro de un emoji compuesto (🛡️, 👩‍💻, banderas). */
function grafemas(texto: string): string[] {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        return Array.from(new Intl.Segmenter("es", { granularity: "grapheme" }).segment(texto), (x) => x.segment);
    }
    return Array.from(texto);
}

/** Hide ZWC-encoded text inside carrier emojis */
function hideInEmojis(secret: string, carrier: string): string {
    const encoded = encodeV2(secret);
    const segments = grafemas(carrier);

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
    // Los mensajes nuevos llevan la marca v2; los hechos antes se siguen leyendo con el formato anterior.
    const mensaje = text.includes(MARCA_V2) ? decodeV2(text) : decodeFromZWC(text);
    // Un ZWSP suelto (de una página web, de un emoji) se leía como «mensaje» invisible: si no hay nada legible, no hay mensaje.
    return /[^\p{C}\p{Z}\uFFFD]/u.test(mensaje) ? mensaje : "";
}

export default function SteganographyPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("esteganografia");
    const [mode, setMode] = useState<Modo>("encode");

    // Encode state
    const [secret, setSecret] = useState("");
    const [carrier, setCarrier] = useState("🔒🛡️🔑✨");
    const [encodedResult, setEncodedResult] = useState("");

    // Decode state
    const [decodeInput, setDecodeInput] = useState("");
    const [decodedResult, setDecodedResult] = useState("");

    // Detector de invisibles: se analiza mientras escribes, con el valor diferido para no trabar la escritura.
    const [textoRevisar, setTextoRevisar] = useState("");
    const textoDiferido = useDeferredValue(textoRevisar);
    const analisis = useMemo(() => (textoDiferido ? analizarInvisibles(textoDiferido) : null), [textoDiferido]);
    const pareceMensajeV2 = /\u2060[\u200B\u200C]/.test(textoDiferido);
    const totalEmojis = analisis ? analisis.emojis.reduce((suma, e) => suma + e.veces, 0) : 0;

    const { copiado, fallo, copiar } = useCopiar();
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
        // Si esta lectura falla, no debe quedar a la vista el mensaje de la anterior.
        setDecodedResult("");
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

    const textoCopia = (clave: string, normal = "Copiar") => copiado === clave ? "✓ Copiado" : fallo === clave ? "No se pudo copiar" : normal;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full motion-safe:animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Esteganografía con emojis"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="esteganografia" />

                {/* Mode Toggle */}
                <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10 mb-6" role="group" aria-label="Modo">
                    {MODOS.map(({ valor, texto }) => (
                        <button key={valor} type="button" aria-pressed={mode === valor} onClick={() => { setMode(valor); setError(null); }}
                            className={`flex-1 min-h-11 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === valor ? "text-white" : "text-neutral-400"}`}
                            style={mode === valor ? { background: `${ACCENT}20`, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}>
                            {texto}
                        </button>
                    ))}
                </div>

                {error && (
                    <div role="alert" className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {mode === "detect" ? (
                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <label htmlFor="stego-revisar" className="text-sm font-medium text-white">Texto a revisar</label>
                                <button type="button" onClick={() => setTextoRevisar(EJEMPLO_INVISIBLES)}
                                    className="min-h-11 px-3 rounded-md text-xs text-neutral-400 hover:text-white transition-colors">
                                    Probar con un ejemplo
                                </button>
                            </div>
                            <textarea
                                id="stego-revisar"
                                value={textoRevisar}
                                onChange={e => setTextoRevisar(e.target.value)}
                                placeholder="Pega un mensaje, un correo, código o una instrucción para una IA…"
                                aria-describedby="stego-revisar-ayuda"
                                className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-2 resize-y"
                                style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                rows={5}
                                maxLength={MAX_DECODE_LEN}
                                spellCheck={false}
                            />
                            <p id="stego-revisar-ayuda" className="text-xs text-neutral-500 mt-2">
                                Busca espacios de ancho cero, controles de dirección (bidi), selectores de variación sueltos y etiquetas Unicode. Se revisa en tu navegador mientras escribes.
                            </p>
                        </div>

                        <p role="status" className="text-sm text-neutral-300">
                            {!analisis ? "" : analisis.total === 0
                                ? "No hay caracteres invisibles sospechosos."
                                : `Hay ${analisis.total.toLocaleString("es-CL")} ${analisis.total === 1 ? "carácter invisible" : "caracteres invisibles"} en ${analisis.hallazgos.length.toLocaleString("es-CL")} ${analisis.hallazgos.length === 1 ? "lugar" : "lugares"}.`}
                        </p>

                        {analisis && (analisis.total > 0 || analisis.emojis.length > 0 || analisis.deEscritura > 0) && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                                {analisis.total > 0 && (
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <ul className="space-y-1 text-sm text-neutral-300" aria-label="Invisibles por tipo">
                                            {TIPOS_INVISIBLES.filter(t => analisis.porTipo[t] > 0).map(t => (
                                                <li key={t}>{NOMBRE_TIPO[t]}: <span className="font-mono text-white">{analisis.porTipo[t].toLocaleString("es-CL")}</span></li>
                                            ))}
                                        </ul>
                                        <button type="button" onClick={() => { void copiar(analisis.limpio, "limpio"); }}
                                            className="min-h-11 px-4 rounded-lg text-sm font-medium text-white transition-colors"
                                            style={{ background: `${ACCENT}30` }}>
                                            {textoCopia("limpio", "Copiar texto limpio")}
                                        </button>
                                    </div>
                                )}

                                {analisis.emojis.length > 0 && (
                                    <p className="text-xs text-neutral-400">
                                        {totalEmojis === 1 ? "Se conserva 1 emoji compuesto que lleva" : `Se conservan ${totalEmojis.toLocaleString("es-CL")} emojis compuestos que llevan`} invisibles propios ({analisis.emojis.slice(0, 12).map(e => `${e.emoji}${e.veces > 1 ? ` ×${e.veces}` : ""}`).join(" ")}{analisis.emojis.length > 12 ? " …" : ""}). Son parte del emoji, no un mensaje oculto.
                                    </p>
                                )}
                                {analisis.deEscritura > 0 && (
                                    <p className="text-xs text-neutral-400">
                                        Se conservan {analisis.deEscritura.toLocaleString("es-CL")} {analisis.deEscritura === 1 ? "invisible de uso normal" : "invisibles de uso normal"} en una escritura (como el ZWNJ del persa o la variante de un ideograma).
                                    </p>
                                )}
                                {pareceMensajeV2 && (
                                    <p className="text-xs text-neutral-400">
                                        Parece un mensaje hecho con esta herramienta.{" "}
                                        <button type="button" onClick={() => { setDecodeInput(textoRevisar); setDecodedResult(""); setMode("decode"); }}
                                            className="min-h-11 underline underline-offset-2 text-white">
                                            Abrirlo en Decodificar
                                        </button>
                                    </p>
                                )}

                                {analisis.hallazgos.length > 0 && (
                                    <div>
                                        <h2 className="text-sm font-medium text-white mb-2">Dónde están</h2>
                                        <ol className="space-y-2">
                                            {analisis.hallazgos.slice(0, MAX_HALLAZGOS_VISIBLES).map(h => (
                                                <li key={h.posicion} className="rounded-lg bg-[#0F1724] p-3 text-xs">
                                                    <p className="text-neutral-300">
                                                        Línea {h.linea}, columna {h.columna} · {NOMBRE_TIPO[h.tipo].toLowerCase()} · {h.codigos.length === 1 ? "1 carácter" : `${h.codigos.length.toLocaleString("es-CL")} caracteres`}
                                                    </p>
                                                    <p className="mt-1 font-mono text-neutral-400 break-all" dir="ltr">
                                                        {h.antes && <bdi>{h.antes}</bdi>}
                                                        <mark className="mx-0.5 rounded px-1 text-[11px] text-white" style={{ background: `${ACCENT}40` }}><span aria-hidden="true">⟦{h.codigos.length}⟧</span><span className="sr-only">aquí hay {h.codigos.length} invisibles</span></mark>
                                                        {h.despues && <bdi>{h.despues}</bdi>}
                                                    </p>
                                                    <p className="mt-1 text-neutral-500 break-words">{resumenCodigos(h)}</p>
                                                    {h.textoOculto && (
                                                        <p className="mt-1 text-amber-200 break-words">Texto escondido: «{h.textoOculto}»</p>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                        {analisis.hallazgos.length > MAX_HALLAZGOS_VISIBLES && (
                                            <p className="mt-2 text-xs text-neutral-500">
                                                Y {(analisis.hallazgos.length - MAX_HALLAZGOS_VISIBLES).toLocaleString("es-CL")} lugares más. El texto limpio los quita todos.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {analisis.total > 0 && (
                                    <div>
                                        <label htmlFor="stego-limpio" className="block text-sm font-medium text-white mb-2">Texto limpio</label>
                                        <textarea id="stego-limpio" readOnly value={analisis.limpio} rows={4}
                                            className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-2 resize-y"
                                            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : mode === "encode" ? (
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
                                    onChange={e => { setSecret(e.target.value); setEncodedResult(""); setError(null); }}
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
                                    onChange={e => { setCarrier(e.target.value); setEncodedResult(""); setError(null); }}
                                    placeholder="Usa emojis o una frase corta"
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-lg text-white outline-none focus:ring-2"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                    maxLength={MAX_CARRIER_LEN}
                                    spellCheck={false}
                                />
                            </label>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {["🔒🛡️🔑✨", "👋😊🎉", "🌍🏔️🌊🌅", "💻🔥🚀", "❤️💛💚💙"].map(preset => (
                                    <button key={preset} type="button" onClick={() => { setCarrier(preset); setEncodedResult(""); setError(null); }} aria-label={`Usar ${preset} como portador`}
                                        className="min-h-11 px-3 py-1 rounded-lg bg-white/5 text-sm hover:bg-white/10 transition-colors">
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="button" onClick={handleEncode}
                            disabled={!secret.trim()}
                            className="w-full py-3 rounded-xl font-medium bg-[var(--boton)] text-[var(--boton-tinta)] hover:brightness-110 transition disabled:opacity-50">
                            Ocultar Mensaje
                        </button>

                        {/* Encoded Result */}
                        {encodedResult && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Resultado (copia y comparte)</span>
                                    <button type="button" onClick={() => { void copiar(encodedResult, "codificado"); }}
                                        aria-label="Copiar resultado"
                                        className="min-h-11 px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        {textoCopia("codificado")}
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
                                        {Array.from(encodedResult).filter(c => c === ZWS || c === ZWNJ || c === MARCA_V2).length.toLocaleString("es-CL")}{" "}
                                        caracteres invisibles en {Math.max(grafemas(carrier).length - 1, 1)} puntos del texto visible.
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
                                    onChange={e => { setDecodeInput(e.target.value); setDecodedResult(""); setError(null); }}
                                    placeholder="Pega aquí el texto con emojis que contiene un mensaje oculto..."
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-lg text-white outline-none focus:ring-2 resize-none"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                    rows={3}
                                    maxLength={MAX_DECODE_LEN}
                                    spellCheck={false}
                                />
                            </label>
                        </div>

                        <button type="button" onClick={handleDecode}
                            disabled={!decodeInput.trim()}
                            className="w-full py-3 rounded-xl font-medium bg-[var(--boton)] text-[var(--boton-tinta)] hover:brightness-110 transition disabled:opacity-50">
                            Revelar Mensaje
                        </button>

                        {/* Decoded Result */}
                        {decodedResult && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Mensaje Descubierto</span>
                                    <button type="button" onClick={() => { void copiar(decodedResult, "decodificado"); }}
                                        aria-label="Copiar mensaje descubierto"
                                        className="min-h-11 px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}>
                                        {textoCopia("decodificado")}
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
                            <p>Cada byte del mensaje (en UTF-8) se escribe como 8 bits</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <p>Los bits van en caracteres invisibles de ancho cero (U+200B = 0, U+200C = 1), tras una marca U+2060</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <p>Se reparten entre los emojis del portador sin partir los compuestos (<kbd>👩‍💻</kbd>, banderas)</p>
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

            </main>
        </div>
    );
}
