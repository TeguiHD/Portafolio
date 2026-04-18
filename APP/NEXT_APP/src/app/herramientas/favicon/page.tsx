"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

const ACCENT = "#06B6D4";

const FAVICON_SIZES = [
    { size: 16, name: "favicon-16x16.png", desc: "Favicon estándar" },
    { size: 32, name: "favicon-32x32.png", desc: "Favicon HiDPI" },
    { size: 48, name: "favicon-48x48.png", desc: "Windows" },
    { size: 64, name: "favicon-64x64.png", desc: "Safari" },
    { size: 128, name: "icon-128x128.png", desc: "Chrome Web Store" },
    { size: 180, name: "apple-touch-icon.png", desc: "Apple Touch" },
    { size: 192, name: "android-chrome-192x192.png", desc: "Android Chrome" },
    { size: 512, name: "android-chrome-512x512.png", desc: "PWA Splash" },
];

async function generateFaviconPng(imageSrc: string, size: number): Promise<Blob> {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, size, size);

    return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
    });
}

export default function FaviconGeneratorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("favicon");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPreviews, setGeneratedPreviews] = useState<{ size: number; url: string }[]>([]);
    const zipUrlRef = useRef<string | null>(null);

    const handleImageLoad = useCallback((_: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setGeneratedPreviews([]);
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setGeneratedPreviews([]);
        generatedPreviews.forEach(p => URL.revokeObjectURL(p.url));
        if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    }, [generatedPreviews]);

    const handleGenerate = useCallback(async () => {
        if (!sourceImage) return;
        setIsGenerating(true);

        try {
            // Generate previews
            const previews: { size: number; url: string }[] = [];
            for (const { size } of FAVICON_SIZES) {
                const blob = await generateFaviconPng(sourceImage, size);
                previews.push({ size, url: URL.createObjectURL(blob) });
            }
            setGeneratedPreviews(previews);
        } catch {
            // Error handled
        } finally {
            setIsGenerating(false);
        }
    }, [sourceImage]);

    const handleDownloadZip = useCallback(async () => {
        if (!sourceImage) return;

        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();

            for (const { size, name } of FAVICON_SIZES) {
                const blob = await generateFaviconPng(sourceImage, size);
                zip.file(name, blob);
            }

            // Add manifest.json
            const manifest = {
                name: "App",
                icons: FAVICON_SIZES.filter(s => [192, 512].includes(s.size)).map(s => ({
                    src: `/${s.name}`,
                    sizes: `${s.size}x${s.size}`,
                    type: "image/png",
                })),
            };
            zip.file("site.webmanifest", JSON.stringify(manifest, null, 2));

            // Add HTML snippet
            const htmlSnippet = `<!-- Favicons generados por nicoholas.dev/herramientas/favicon -->
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;
            zip.file("INSTRUCCIONES.html", htmlSnippet);

            const content = await zip.generateAsync({ type: "blob" });
            if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
            const url = URL.createObjectURL(content);
            zipUrlRef.current = url;

            const link = document.createElement("a");
            link.href = url;
            link.download = "favicons.zip";
            link.click();
        } catch {
            // Error handled
        }
    }, [sourceImage]);

    const handleDownloadSingle = useCallback((url: string, name: string) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de Favicons"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Generador de Favicons</h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Genera todos los tamaños de favicon para tu web. Descarga ZIP completo.
                    </p>
                </div>

                <ImageDropzone
                    onImageLoad={handleImageLoad}
                    currentImage={sourceImage}
                    onClear={handleClear}
                    accentColor={ACCENT}
                    label="Arrastra tu logo o ícono"
                    sublabel="Se recomienda imagen cuadrada (512×512 o mayor)"
                />

                {sourceImage && (
                    <div className="mt-6 space-y-4">
                        {/* Sizes Info */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h3 className="text-sm text-neutral-300 mb-3">Se generarán {FAVICON_SIZES.length} tamaños:</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                {FAVICON_SIZES.map(({ size, name, desc }) => (
                                    <div key={size} className="bg-white/5 rounded-lg p-2">
                                        <span className="font-mono" style={{ color: ACCENT }}>{size}×{size}</span>
                                        <p className="text-neutral-500 truncate">{desc}</p>
                                        <p className="text-neutral-600 truncate">{name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Generate */}
                        <button onClick={handleGenerate} disabled={isGenerating}
                            className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}>
                            {isGenerating ? "Generando..." : "⭐ Generar Favicons"}
                        </button>

                        {/* Previews */}
                        {generatedPreviews.length > 0 && (
                            <div className="space-y-4">
                                {/* Preview Row */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h3 className="text-sm text-neutral-300 mb-3">Vista previa:</h3>
                                    <div className="flex items-end gap-4 flex-wrap">
                                        {generatedPreviews.map(({ size, url }) => {
                                            const displaySize = Math.min(size, 80);
                                            const faviconInfo = FAVICON_SIZES.find(f => f.size === size)!;
                                            return (
                                                <button key={size}
                                                    onClick={() => handleDownloadSingle(url, faviconInfo.name)}
                                                    className="flex flex-col items-center gap-1 hover:scale-105 transition-transform cursor-pointer"
                                                    title={`Descargar ${faviconInfo.name}`}>
                                                    <img src={url} alt={`${size}px`}
                                                        style={{ width: displaySize, height: displaySize }}
                                                        className="rounded border border-white/20" />
                                                    <span className="text-[10px] text-neutral-500 font-mono">{size}px</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Download All */}
                                <button onClick={handleDownloadZip}
                                    className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.01]"
                                    style={{ background: `${ACCENT}30`, border: `1px solid ${ACCENT}50` }}>
                                    📦 Descargar ZIP (todos los tamaños + manifest)
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
