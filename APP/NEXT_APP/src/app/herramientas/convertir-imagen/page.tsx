"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

type OutputFormat = "webp" | "png" | "jpeg";

const FORMATS: { id: OutputFormat; name: string; mime: string; ext: string; color: string }[] = [
    { id: "webp", name: "WebP", mime: "image/webp", ext: ".webp", color: "#FF8A00" },
    { id: "png", name: "PNG", mime: "image/png", ext: ".png", color: "#00B8A9" },
    { id: "jpeg", name: "JPEG", mime: "image/jpeg", ext: ".jpg", color: "#6366F1" },
];

export default function ImageConverterPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("convertir-imagen");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>("webp");
    const [quality, setQuality] = useState(85);
    const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [outputSize, setOutputSize] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setConvertedUrl(null);
        setOutputSize(null);
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setConvertedUrl(null);
        setOutputSize(null);
        // SECURITY: Revoke any existing object URLs to prevent memory leaks
        if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    }, [convertedUrl]);

    const handleConvert = useCallback(async () => {
        if (!sourceImage || !canvasRef.current) return;
        setIsConverting(true);

        try {
            const img = new Image();
            img.crossOrigin = "anonymous";

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Error al cargar la imagen"));
                img.src = sourceImage;
            });

            const canvas = canvasRef.current;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("No se pudo crear contexto 2D");

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const format = FORMATS.find(f => f.id === outputFormat)!;
            const qualityParam = outputFormat === "png" ? undefined : quality / 100;

            canvas.toBlob((blob) => {
                if (!blob) {
                    setIsConverting(false);
                    return;
                }

                // SECURITY: Revoke previous URL
                if (convertedUrl) URL.revokeObjectURL(convertedUrl);

                const url = URL.createObjectURL(blob);
                setConvertedUrl(url);
                setOutputSize(blob.size);
                setIsConverting(false);
            }, format.mime, qualityParam);
        } catch {
            setIsConverting(false);
        }
    }, [sourceImage, outputFormat, quality, convertedUrl]);

    const handleDownload = useCallback(() => {
        if (!convertedUrl || !sourceFile) return;
        const format = FORMATS.find(f => f.id === outputFormat)!;
        // SECURITY: Sanitize filename - remove path traversal chars
        const baseName = sourceFile.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
        const link = document.createElement("a");
        link.href = convertedUrl;
        link.download = `${baseName}${format.ext}`;
        link.click();
    }, [convertedUrl, sourceFile, outputFormat]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Conversor de Imágenes"} />;
    }

    const activeFormat = FORMATS.find(f => f.id === outputFormat)!;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <canvas ref={canvasRef} className="hidden" />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Conversor de Imágenes</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Convierte entre PNG, JPG, WebP y más. 100% en tu navegador.
                    </p>
                </div>

                {/* Format Selection */}
                <div className="flex justify-center gap-3 mb-8">
                    {FORMATS.map((fmt) => (
                        <button
                            key={fmt.id}
                            onClick={() => { setOutputFormat(fmt.id); setConvertedUrl(null); }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${outputFormat === fmt.id
                                ? "text-white ring-2 scale-[1.02]"
                                : "bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/10"
                                }`}
                            style={outputFormat === fmt.id ? {
                                background: `${fmt.color}20`,
                                boxShadow: `0 0 0 2px ${fmt.color}`,
                            } : undefined}
                        >
                            {fmt.name}
                        </button>
                    ))}
                </div>

                {/* Dropzone or Image */}
                <ImageDropzone
                    onImageLoad={handleImageLoad}
                    currentImage={sourceImage}
                    onClear={handleClear}
                    accentColor={activeFormat.color}
                    label="Arrastra tu imagen aquí"
                    sublabel="PNG, JPG, WebP, GIF, BMP"
                />

                {sourceImage && (
                    <div className="mt-6 space-y-4">
                        {/* Quality Slider (not for PNG) */}
                        {outputFormat !== "png" && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-neutral-300">Calidad</label>
                                    <span className="text-sm font-mono font-bold" style={{ color: activeFormat.color }}>
                                        {quality}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={10}
                                    max={100}
                                    value={quality}
                                    onChange={(e) => { setQuality(Number(e.target.value)); setConvertedUrl(null); }}
                                    className="w-full accent-[var(--accent-color)]"
                                    style={{ "--accent-color": activeFormat.color } as React.CSSProperties}
                                />
                                <div className="flex justify-between text-xs text-neutral-600 mt-1">
                                    <span>Menor peso</span>
                                    <span>Mayor calidad</span>
                                </div>
                            </div>
                        )}

                        {/* Convert Button */}
                        <button
                            onClick={handleConvert}
                            disabled={isConverting}
                            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${activeFormat.color}, ${activeFormat.color}CC)` }}
                        >
                            {isConverting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Convirtiendo...
                                </span>
                            ) : (
                                `Convertir a ${activeFormat.name}`
                            )}
                        </button>

                        {/* Result */}
                        {convertedUrl && (
                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-medium">✅ Conversión completada</h3>
                                    {outputSize && sourceFile && (
                                        <div className="text-xs text-neutral-400">
                                            {(sourceFile.size / 1024).toFixed(0)} KB → {(outputSize / 1024).toFixed(0)} KB
                                            <span className={`ml-1 ${outputSize < sourceFile.size ? "text-green-400" : "text-yellow-400"}`}>
                                                ({outputSize < sourceFile.size ? "-" : "+"}{Math.abs(Math.round((1 - outputSize / sourceFile.size) * 100))}%)
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <img src={convertedUrl} alt="Resultado" className="max-h-[300px] rounded-lg mx-auto object-contain bg-[#0A0A0F]" />

                                <button
                                    onClick={handleDownload}
                                    className="w-full py-2.5 rounded-xl font-medium text-white transition-all hover:scale-[1.01]"
                                    style={{ background: `${activeFormat.color}30`, border: `1px solid ${activeFormat.color}50` }}
                                >
                                    ⬇️ Descargar {activeFormat.name}
                                </button>
                            </div>
                        )}
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
