"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

const ACCENT = "#F59E0B";

// ICO sizes commonly needed
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

/**
 * Generates an ICO file from a canvas.
 * ICO format: Header + Directory Entries + Image Data (PNG embedded)
 * SECURITY: No external dependencies, pure binary construction.
 */
async function generateIco(imageSrc: string, sizes: number[]): Promise<Blob> {
    const pngBlobs: { size: number; data: ArrayBuffer }[] = [];

    for (const size of sizes) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = imageSrc;
        });

        // Draw image scaled to the target size with high-quality interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, size, size);

        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), "image/png");
        });
        const buffer = await blob.arrayBuffer();
        pngBlobs.push({ size, data: buffer });
    }

    // Build ICO file
    // Header: 6 bytes
    // Directory entries: 16 bytes each
    // Image data: PNG blobs
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * pngBlobs.length;
    let dataOffset = headerSize + dirSize;

    const totalSize = dataOffset + pngBlobs.reduce((acc, b) => acc + b.data.byteLength, 0);
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // ICONDIR header
    view.setUint16(0, 0, true);     // Reserved
    view.setUint16(2, 1, true);     // Type: 1 = ICO
    view.setUint16(4, pngBlobs.length, true); // Number of images

    // ICONDIRENTRY for each size
    for (let i = 0; i < pngBlobs.length; i++) {
        const entry = pngBlobs[i];
        const offset = headerSize + i * dirEntrySize;
        const w = entry.size >= 256 ? 0 : entry.size;
        const h = entry.size >= 256 ? 0 : entry.size;

        view.setUint8(offset + 0, w);          // Width
        view.setUint8(offset + 1, h);          // Height
        view.setUint8(offset + 2, 0);          // Color palette
        view.setUint8(offset + 3, 0);          // Reserved
        view.setUint16(offset + 4, 1, true);   // Color planes
        view.setUint16(offset + 6, 32, true);  // Bits per pixel
        view.setUint32(offset + 8, entry.data.byteLength, true);  // Image data size
        view.setUint32(offset + 12, dataOffset, true);             // Offset to image data

        dataOffset += entry.data.byteLength;
    }

    // Write image data
    let currentOffset = headerSize + dirSize;
    for (const entry of pngBlobs) {
        const src = new Uint8Array(entry.data);
        const dst = new Uint8Array(buffer, currentOffset, entry.data.byteLength);
        dst.set(src);
        currentOffset += entry.data.byteLength;
    }

    return new Blob([buffer], { type: "image/x-icon" });
}

export default function IcoConverterPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("convertir-ico");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<number[]>([16, 32, 48]);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const resultUrlRef = useRef<string | null>(null);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setResultUrl(null);
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setResultUrl(null);
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    }, []);

    const toggleSize = (size: number) => {
        setSelectedSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size].sort((a, b) => a - b)
        );
        setResultUrl(null);
    };

    const handleConvert = useCallback(async () => {
        if (!sourceImage || selectedSizes.length === 0) return;
        setIsConverting(true);

        try {
            const blob = await generateIco(sourceImage, selectedSizes);
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
            const url = URL.createObjectURL(blob);
            resultUrlRef.current = url;
            setResultUrl(url);
        } catch {
            // Error handled
        } finally {
            setIsConverting(false);
        }
    }, [sourceImage, selectedSizes]);

    const handleDownload = useCallback(() => {
        if (!resultUrl || !sourceFile) return;
        const baseName = sourceFile.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
        const link = document.createElement("a");
        link.href = resultUrl;
        link.download = `${baseName}.ico`;
        link.click();
    }, [resultUrl, sourceFile]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Conversor a ICO"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Conversor a ICO</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Convierte imágenes a formato .ico para favicons. Elige los tamaños.
                    </p>
                </div>

                <ImageDropzone
                    onImageLoad={handleImageLoad}
                    currentImage={sourceImage}
                    onClear={handleClear}
                    accentColor={ACCENT}
                    label="Arrastra tu imagen"
                    sublabel="PNG, JPG, WebP → ICO"
                />

                {sourceImage && (
                    <div className="mt-6 space-y-4">
                        {/* Size Selection */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h3 className="text-sm text-neutral-300 mb-3">Tamaños incluidos en el .ico:</h3>
                            <div className="flex flex-wrap gap-2">
                                {ICO_SIZES.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => toggleSize(size)}
                                        className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${selectedSizes.includes(size)
                                            ? "text-white ring-2"
                                            : "bg-white/5 text-neutral-500 border border-white/10 hover:bg-white/10"
                                            }`}
                                        style={selectedSizes.includes(size) ? {
                                            background: `${ACCENT}20`,
                                            boxShadow: `0 0 0 2px ${ACCENT}`,
                                        } : undefined}
                                    >
                                        {size}×{size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h3 className="text-sm text-neutral-300 mb-3">Vista previa de tamaños:</h3>
                            <div className="flex items-end gap-4 flex-wrap">
                                {selectedSizes.map(size => {
                                    const displaySize = Math.min(size, 64);
                                    return (
                                        <div key={size} className="flex flex-col items-center gap-1">
                                            <img
                                                src={sourceImage}
                                                alt={`${size}px`}
                                                style={{ width: displaySize, height: displaySize }}
                                                className="rounded border border-white/20 object-cover"
                                            />
                                            <span className="text-[10px] text-neutral-500 font-mono">{size}px</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Convert */}
                        <button
                            onClick={handleConvert}
                            disabled={isConverting || selectedSizes.length === 0}
                            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}
                        >
                            {isConverting ? "Generando ICO..." : `Generar .ico (${selectedSizes.length} tamaños)`}
                        </button>

                        {/* Result */}
                        {resultUrl && (
                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 text-center space-y-3">
                                <p className="text-white font-medium">✅ Archivo .ico generado</p>
                                <button
                                    onClick={handleDownload}
                                    className="w-full py-2.5 rounded-xl font-medium text-white transition-all hover:scale-[1.01]"
                                    style={{ background: `${ACCENT}30`, border: `1px solid ${ACCENT}50` }}
                                >
                                    ⬇️ Descargar .ico
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
