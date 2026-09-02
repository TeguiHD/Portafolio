"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { runStego } from "@/lib/stego-client";
import { MAX_MESSAGE_LENGTH, calculateCapacity, calculateCapacityBytes } from "@/lib/stego-lsb";

const ACCENT = "#8B5CF6";

/**
 * IMAGE STEGANOGRAPHY — LSB (Least Significant Bit)
 * ==================================================
 * Hides text messages inside PNG images by modifying the least significant
 * bit of each color channel (R, G, B) in the pixel data.
 *
 * Encoding format:
 *   - First 32 bits: message length (in characters) as uint32
 *   - Remaining bits: UTF-8 encoded message, 8 bits per byte
 *   - Each bit is stored in the LSB of one color channel
 *
 * SECURITY ALIGNMENT (OWASP / NIST / MITRE ATT&CK 2026):
 * ─────────────────────────────────────────────────────────
 * • OWASP A04:2021 – Insecure Design → All processing client-side, 
 *   no data leaves the browser. Canvas API used safely with no eval().
 * • OWASP File Upload → Magic bytes validation via ImageDropzone component,
 *   file size limits, only PNG accepted (lossless required for LSB).
 * • NIST SP 800-53 SC-8 – Transmission Confidentiality → No network I/O 
 *   for image processing. Images never uploaded to any server.
 * • NIST SP 800-188 – De-Identification → Tool preserves privacy by keeping
 *   all operations local to the browser sandbox.
 * • MITRE ATT&CK T1027 – Obfuscated Files → Educational tool to understand
 *   steganographic techniques used by adversaries.
 * • MITRE CWE-20 – Improper Input Validation → Strict input length limits,
 *   UTF-8 encoding validation, capacity checking before encoding.
 * • MITRE CWE-400 – Uncontrolled Resource Consumption → Max message length
 *   and image capacity checks prevent DoS via large payloads.
 * • XSS Prevention: Decoded messages rendered as textContent, never innerHTML.
 * • Memory Safety: Object URLs properly revoked on cleanup.
 */

// SECURITY(CWE-400): Prevent resource exhaustion
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB max for steganography

export default function ImageSteganographyPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("esteganografia-imagen");
    const [mode, setMode] = useState<"encode" | "decode">("encode");

    // Encode state
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [message, setMessage] = useState("");
    const [encodedUrl, setEncodedUrl] = useState<string | null>(null);
    const [capacity, setCapacity] = useState<number>(0);
    const [capacityBytes, setCapacityBytes] = useState(0);
    const [sourceDimensions, setSourceDimensions] = useState<{ width: number; height: number } | null>(null);

    // Decode state
    const [decodeImage, setDecodeImage] = useState<string | null>(null);
    const [decodeFile, setDecodeFile] = useState<File | null>(null);
    const [decodedMessage, setDecodedMessage] = useState("");
    const [decodedByteLength, setDecodedByteLength] = useState<number | null>(null);
    const [decodeCapacityBytes, setDecodeCapacityBytes] = useState(0);
    const [decodeDimensions, setDecodeDimensions] = useState<{ width: number; height: number } | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const messageBytes = message ? new TextEncoder().encode(message).length : 0;
    const encodeUsagePercent = capacityBytes > 0 ? Math.min(100, Math.round((messageBytes / capacityBytes) * 100)) : 0;
    const decodedUsagePercent = decodedByteLength !== null && decodeCapacityBytes > 0
        ? Math.min(100, Math.round((decodedByteLength / decodeCapacityBytes) * 100))
        : 0;

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setEncodedUrl(null);
        setError(null);
        setSourceDimensions(null);
        setCapacityBytes(0);

        // Capacidad: una sola decodificación con createImageBitmap
        void createImageBitmap(file)
            .then((bitmap) => {
                setSourceDimensions({ width: bitmap.width, height: bitmap.height });
                setCapacity(calculateCapacity(bitmap.width, bitmap.height));
                setCapacityBytes(calculateCapacityBytes(bitmap.width, bitmap.height));
                bitmap.close();
            })
            .catch((err: unknown) => {
                console.warn("createImageBitmap falló", err);
                setError("No se pudo leer la imagen");
            });
    }, []);

    const handleDecodeImageLoad = useCallback((file: File, dataUrl: string) => {
        setDecodeImage(dataUrl);
        setDecodeFile(file);
        setDecodedMessage("");
        setDecodedByteLength(null);
        setError(null);

        void createImageBitmap(file)
            .then((bitmap) => {
                setDecodeDimensions({ width: bitmap.width, height: bitmap.height });
                setDecodeCapacityBytes(calculateCapacityBytes(bitmap.width, bitmap.height));
                bitmap.close();
            })
            .catch((err: unknown) => {
                console.warn("createImageBitmap falló", err);
                setError("No se pudo leer la imagen");
            });
    }, []);

    const handleEncode = useCallback(async () => {
        if (!sourceFile || !message.trim()) return;
        setIsProcessing(true);
        setError(null);

        try {
            // Decodificación, bucle LSB y PNG corren en un Web Worker: la pestaña
            // sigue respondiendo aunque la imagen pese 20 MB.
            const result = await runStego({ op: "encode", blob: sourceFile, message });
            if (!result.ok) {
                setError(result.error);
                return;
            }
            if (encodedUrl) URL.revokeObjectURL(encodedUrl);
            setEncodedUrl(URL.createObjectURL(result.blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al procesar la imagen");
        } finally {
            setIsProcessing(false);
        }
    }, [sourceFile, message, encodedUrl]);

    const handleDecode = useCallback(async () => {
        if (!decodeFile) return;
        setIsProcessing(true);
        setError(null);

        try {
            const result = await runStego({ op: "decode", blob: decodeFile });
            if (!result.ok) {
                setError(result.error);
            } else {
                setDecodedMessage(result.message);
                setDecodedByteLength(result.messageBytes);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al decodificar");
        } finally {
            setIsProcessing(false);
        }
    }, [decodeFile]);

    const handleDownload = useCallback(() => {
        if (!encodedUrl) return;
        const baseName = sourceFile?.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "") || "imagen";
        const link = document.createElement("a");
        link.href = encodedUrl;
        link.download = `${baseName}_stego.png`;
        link.click();
    }, [encodedUrl, sourceFile]);

    const handleCopy = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    const handleClearEncode = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setMessage("");
        setCapacity(0);
        setCapacityBytes(0);
        setSourceDimensions(null);
        if (encodedUrl) URL.revokeObjectURL(encodedUrl);
        setEncodedUrl(null);
        setError(null);
    }, [encodedUrl]);

    const handleClearDecode = useCallback(() => {
        setDecodeFile(null);
        setDecodeImage(null);
        setDecodedMessage("");
        setDecodedByteLength(null);
        setDecodeCapacityBytes(0);
        setDecodeDimensions(null);
        setError(null);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Esteganografía en Imágenes"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            {/* Hidden canvas for pixel manipulation */}
            <canvas ref={canvasRef} className="hidden" />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Esteganografía en Imágenes
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Oculta y extrae texto en imágenes PNG mediante LSB, sin subir archivos
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10 mb-6">
                    {(["encode", "decode"] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(null); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? "text-white" : "text-neutral-400"}`}
                            style={mode === m ? { background: `${ACCENT}20`, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                        >
                            {m === "encode" ? "🔒 Ocultar Mensaje" : "🔓 Extraer Mensaje"}
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
                        {/* Image Upload */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-white">Imagen PNG</span>
                                {capacity > 0 && (
                                    <span className="text-xs text-neutral-500">
                                        Capacidad aprox.: ~{capacity.toLocaleString()} caracteres
                                    </span>
                                )}
                            </div>
                            <ImageDropzone
                                onImageLoad={handleImageLoad}
                                accept={["image/png"]}
                                maxSize={MAX_IMAGE_SIZE}
                                label="Arrastra una imagen PNG aquí"
                                sublabel="Solo PNG (formato sin pérdida requerido para LSB)"
                                accentColor={ACCENT}
                                currentImage={sourceImage}
                                onClear={handleClearEncode}
                            />
                        </div>

                        {/* Secret Message */}
                        {sourceImage && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <label className="block">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-white">Mensaje Secreto</span>
                                        <span className="text-xs text-neutral-500">
                                            {message.length}/{Math.min(MAX_MESSAGE_LENGTH, capacity)} caracteres
                                        </span>
                                    </div>
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                                        placeholder="Escribe el mensaje que deseas ocultar en la imagen..."
                                        className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-2 resize-none"
                                        style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                        rows={4}
                                        maxLength={Math.min(MAX_MESSAGE_LENGTH, capacity)}
                                        spellCheck={false}
                                    />
                                </label>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg bg-black/20 p-3 text-xs">
                                        <p className="text-neutral-500">Imagen</p>
                                        <p className="mt-1 text-white">{sourceDimensions ? `${sourceDimensions.width} × ${sourceDimensions.height}` : "Pendiente"}</p>
                                    </div>
                                    <div className="rounded-lg bg-black/20 p-3 text-xs">
                                        <p className="text-neutral-500">Mensaje</p>
                                        <p className="mt-1 text-white">{messageBytes.toLocaleString()} bytes</p>
                                    </div>
                                    <div className="rounded-lg bg-black/20 p-3 text-xs">
                                        <p className="text-neutral-500">Uso estimado</p>
                                        <p className="mt-1 text-white">{capacityBytes > 0 ? `${encodeUsagePercent}% de la capacidad` : "Pendiente"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {sourceImage && (
                            <button
                                onClick={handleEncode}
                                disabled={!message.trim() || isProcessing}
                                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.005] disabled:opacity-50"
                                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}
                            >
                                {isProcessing ? "Procesando..." : "🔒 Ocultar en Imagen"}
                            </button>
                        )}

                        {/* Encoded Result */}
                        {encodedUrl && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white">Imagen con Mensaje Oculto</span>
                                    <button
                                        onClick={handleDownload}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}
                                    >
                                        ⬇️ Descargar PNG
                                    </button>
                                </div>
                                <div className="bg-[#0F1724] rounded-lg p-2 flex justify-center">
                                    <img
                                        src={encodedUrl}
                                        alt="Imagen con mensaje oculto"
                                        className="max-w-full max-h-64 object-contain rounded"
                                    />
                                </div>
                                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-purple-300">
                                        <strong>Mensaje oculto correctamente.</strong> Guarda este PNG para conservar el texto embebido.
                                        El mensaje ocupa {messageBytes.toLocaleString()} bytes y usa aproximadamente {encodeUsagePercent}% de la capacidad disponible.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Decode Image Upload */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <span className="text-sm font-medium text-white block mb-3">
                                Imagen con Mensaje Oculto
                            </span>
                            <ImageDropzone
                                onImageLoad={handleDecodeImageLoad}
                                accept={["image/png"]}
                                maxSize={MAX_IMAGE_SIZE}
                                label="Arrastra la imagen PNG con el mensaje oculto"
                                sublabel="Solo PNG"
                                accentColor={ACCENT}
                                currentImage={decodeImage}
                                onClear={handleClearDecode}
                            />
                            {decodeImage && (
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg bg-black/20 p-3 text-xs">
                                        <p className="text-neutral-500">Imagen</p>
                                        <p className="mt-1 text-white">{decodeDimensions ? `${decodeDimensions.width} × ${decodeDimensions.height}` : "Pendiente"}</p>
                                    </div>
                                    <div className="rounded-lg bg-black/20 p-3 text-xs">
                                        <p className="text-neutral-500">Capacidad máxima</p>
                                        <p className="mt-1 text-white">{decodeCapacityBytes > 0 ? `${decodeCapacityBytes.toLocaleString()} bytes` : "Pendiente"}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {decodeImage && (
                            <button
                                onClick={handleDecode}
                                disabled={isProcessing}
                                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.005] disabled:opacity-50"
                                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}
                            >
                                {isProcessing ? "Analizando píxeles..." : "🔓 Extraer Mensaje"}
                            </button>
                        )}

                        {/* Decoded Result */}
                        {decodedMessage && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Mensaje Descubierto</span>
                                    <button
                                        onClick={() => handleCopy(decodedMessage)}
                                        className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                        style={{ background: `${ACCENT}30` }}
                                    >
                                        {copied ? "✓ Copiado" : "Copiar"}
                                    </button>
                                </div>
                                <div className="bg-[#0F1724] rounded-lg p-4 text-sm text-white whitespace-pre-wrap break-words">
                                    {decodedMessage}
                                </div>
                                {decodedByteLength !== null && (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-lg bg-black/20 p-3 text-xs">
                                            <p className="text-neutral-500">Bytes extraídos</p>
                                            <p className="mt-1 text-white">{decodedByteLength.toLocaleString()}</p>
                                        </div>
                                        <div className="rounded-lg bg-black/20 p-3 text-xs">
                                            <p className="text-neutral-500">Uso de la imagen</p>
                                            <p className="mt-1 text-white">{decodedUsagePercent}%</p>
                                        </div>
                                        <div className="rounded-lg bg-black/20 p-3 text-xs">
                                            <p className="text-neutral-500">Tamaño fuente</p>
                                            <p className="mt-1 text-white">{decodeDimensions ? `${decodeDimensions.width} × ${decodeDimensions.height}` : "Pendiente"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* How it works */}
                <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">Cómo funciona la ocultación LSB</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-400">
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">📝</span>
                            <p>El mensaje se convierte a bytes UTF-8 y luego a bits individuales (0 y 1)</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">🎨</span>
                            <p>Cada bit reemplaza el bit menos significativo de un canal de color (R/G/B) de un píxel</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-white/5">
                            <span className="text-2xl">👁️</span>
                            <p>El cambio de ±1 en un valor de 0-255 es imperceptible para el ojo humano</p>
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                    <p className="text-xs text-purple-300">
                        <strong>Privacidad local:</strong> Todo el procesamiento ocurre en tu navegador.
                        Usa PNG para conservar los datos ocultos; los formatos con pérdida como JPEG o WebP destruyen el mensaje.
                        Si el contenido es sensible, conviene cifrarlo antes de ocultarlo.
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <Link href={"/herramientas" as Route} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
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
