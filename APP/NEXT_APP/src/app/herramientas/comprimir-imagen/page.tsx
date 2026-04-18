"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

const ACCENT = "#3B82F6";

export default function ImageCompressorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("comprimir-imagen");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [quality, setQuality] = useState(75);
    const [maxWidth, setMaxWidth] = useState(0); // 0 = no resize
    const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
    const [compressedSize, setCompressedSize] = useState<number | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [outputFormat, setOutputFormat] = useState<"original" | "webp" | "jpeg">("original");

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setCompressedUrl(null);
        setCompressedSize(null);
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setCompressedUrl(null);
        setCompressedSize(null);
        if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    }, [compressedUrl]);

    const handleCompress = useCallback(async () => {
        if (!sourceImage || !sourceFile) return;
        setIsCompressing(true);

        try {
            const { default: imageCompression } = await import("browser-image-compression");

            let mimeType = sourceFile.type;
            if (outputFormat === "webp") mimeType = "image/webp";
            else if (outputFormat === "jpeg") mimeType = "image/jpeg";

            const options = {
                maxSizeMB: 10,
                maxWidthOrHeight: maxWidth > 0 ? maxWidth : undefined,
                initialQuality: quality / 100,
                useWebWorker: true,
                fileType: mimeType,
            };

            const compressedFile = await imageCompression(sourceFile, options);

            if (compressedUrl) URL.revokeObjectURL(compressedUrl);
            const url = URL.createObjectURL(compressedFile);
            setCompressedUrl(url);
            setCompressedSize(compressedFile.size);
        } catch {
            // Error handled
        } finally {
            setIsCompressing(false);
        }
    }, [sourceImage, sourceFile, quality, maxWidth, outputFormat, compressedUrl]);

    const handleDownload = useCallback(() => {
        if (!compressedUrl || !sourceFile) return;
        const extMap: Record<string, string> = { "original": sourceFile.name.split(".").pop() || "png", "webp": "webp", "jpeg": "jpg" };
        const baseName = sourceFile.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
        const link = document.createElement("a");
        link.href = compressedUrl;
        link.download = `${baseName}_comprimida.${extMap[outputFormat]}`;
        link.click();
    }, [compressedUrl, sourceFile, outputFormat]);

    const savings = sourceFile && compressedSize !== null
        ? Math.round((1 - compressedSize / sourceFile.size) * 100)
        : null;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Compresor de Imágenes"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Compresor de Imágenes</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Reduce el peso de tus imágenes sin perder calidad visible. Ideal para SEO.
                    </p>
                </div>

                <ImageDropzone
                    onImageLoad={handleImageLoad}
                    currentImage={sourceImage}
                    onClear={handleClear}
                    accentColor={ACCENT}
                    label="Arrastra la imagen a comprimir"
                />

                {sourceImage && sourceFile && (
                    <div className="mt-6 space-y-4">
                        {/* Original size info */}
                        <div className="text-center text-sm text-neutral-400">
                            Tamaño original: <span className="text-white font-mono">{(sourceFile.size / 1024).toFixed(0)} KB</span>
                        </div>

                        {/* Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Quality */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-neutral-300">Calidad</label>
                                    <span className="text-sm font-mono font-bold" style={{ color: ACCENT }}>{quality}%</span>
                                </div>
                                <input type="range" min={10} max={100} value={quality}
                                    onChange={(e) => { setQuality(Number(e.target.value)); setCompressedUrl(null); }}
                                    className="w-full" />
                            </div>

                            {/* Max Width */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <label className="text-sm text-neutral-300 block mb-2">Ancho máximo (px)</label>
                                <input type="number" min={0} value={maxWidth || ""}
                                    onChange={(e) => { setMaxWidth(Number(e.target.value) || 0); setCompressedUrl(null); }}
                                    placeholder="Sin límite"
                                    className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2"
                                    style={{ focusRingColor: ACCENT } as React.CSSProperties} />
                            </div>
                        </div>

                        {/* Output Format */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <label className="text-sm text-neutral-300 block mb-2">Formato de salida</label>
                            <div className="flex gap-2">
                                {([["original", "Original"], ["webp", "WebP"], ["jpeg", "JPEG"]] as const).map(([id, name]) => (
                                    <button key={id}
                                        onClick={() => { setOutputFormat(id); setCompressedUrl(null); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${outputFormat === id ? "text-white ring-2" : "bg-white/5 text-neutral-400 border border-white/10"}`}
                                        style={outputFormat === id ? { background: `${ACCENT}20`, boxShadow: `0 0 0 2px ${ACCENT}` } : undefined}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compress Button */}
                        <button onClick={handleCompress} disabled={isCompressing}
                            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}>
                            {isCompressing ? "Comprimiendo..." : "📦 Comprimir imagen"}
                        </button>

                        {/* Result */}
                        {compressedUrl && compressedSize !== null && (
                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white font-medium">✅ Compresión completada</h3>
                                    <span className={`text-sm font-bold ${savings !== null && savings > 0 ? "text-green-400" : "text-yellow-400"}`}>
                                        {savings !== null && savings > 0 ? `-${savings}%` : `+${Math.abs(savings || 0)}%`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-xs text-neutral-500">Original</p>
                                        <p className="text-lg font-bold text-white">{(sourceFile.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <div className="rounded-lg p-3" style={{ background: `${ACCENT}10` }}>
                                        <p className="text-xs" style={{ color: ACCENT }}>Comprimido</p>
                                        <p className="text-lg font-bold text-white">{(compressedSize / 1024).toFixed(0)} KB</p>
                                    </div>
                                </div>
                                <button onClick={handleDownload}
                                    className="w-full py-2.5 rounded-xl font-medium text-white transition-all hover:scale-[1.01]"
                                    style={{ background: `${ACCENT}30`, border: `1px solid ${ACCENT}50` }}>
                                    ⬇️ Descargar
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
