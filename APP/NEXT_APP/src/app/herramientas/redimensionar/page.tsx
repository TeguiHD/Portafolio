"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { StudioCard, StudioChip, StudioMetric, StudioStage } from "@/components/tools/ImageStudio";
import {
    canvasToObjectUrl,
    drawImageToCanvas,
    isLossyFormat,
    loadImageSource,
    revokeObjectUrl,
    sanitizeFileBaseName,
    triggerDownload,
    type DrawFitMode,
    type ExportMimeType,
    type StageFill,
} from "@/lib/tools/image-processing";

const ACCENT = "#8B5CF6";

const PRESETS = [
    { name: "Personalizado", w: 0, h: 0 },
    { name: "Banner YouTube", w: 2560, h: 1440 },
    { name: "Miniatura YouTube", w: 1280, h: 720 },
    { name: "Publicación Instagram", w: 1080, h: 1080 },
    { name: "Historia Instagram", w: 1080, h: 1920 },
    { name: "Portada Facebook", w: 820, h: 312 },
    { name: "Banner LinkedIn", w: 1584, h: 396 },
    { name: "Fondo HD", w: 1920, h: 1080 },
    { name: "Fondo 4K", w: 3840, h: 2160 },
];

const FIT_MODES: Array<{ id: DrawFitMode; label: string; description: string }> = [
    { id: "contain", label: "Ajustar", description: "Mantiene toda la imagen y rellena el espacio libre" },
    { id: "cover", label: "Cubrir", description: "Llena el lienzo aunque recorte los bordes" },
    { id: "stretch", label: "Estirar", description: "Fuerza el tamaño exacto sin mantener la proporción" },
];

const EXPORT_FORMATS: Array<{ mime: ExportMimeType; label: string; extension: string }> = [
    { mime: "image/png", label: "PNG", extension: "png" },
    { mime: "image/jpeg", label: "JPG", extension: "jpg" },
    { mime: "image/webp", label: "WebP", extension: "webp" },
];

function getObjectFit(fitMode: DrawFitMode) {
    if (fitMode === "cover") return "object-cover";
    if (fitMode === "stretch") return "object-fill";
    return "object-contain";
}

function getFitModeLabel(fitMode: DrawFitMode) {
    return FIT_MODES.find(mode => mode.id === fitMode)?.label || fitMode;
}

export default function ImageResizerPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("redimensionar");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [keepAspect, setKeepAspect] = useState(true);
    const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });
    const [resizedUrl, setResizedUrl] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [fitMode, setFitMode] = useState<DrawFitMode>("contain");
    const [exportFormat, setExportFormat] = useState<ExportMimeType>("image/png");
    const [quality, setQuality] = useState(92);
    const [backgroundColor, setBackgroundColor] = useState("#0F1724");
    const [useBackgroundFill, setUseBackgroundFill] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const resizedUrlRef = useRef<string | null>(null);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setResizedUrl(null);
        setError(null);
        revokeObjectUrl(resizedUrlRef.current);
        resizedUrlRef.current = null;

        const img = new Image();
        img.onload = () => {
            setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
            setWidth(img.naturalWidth);
            setHeight(img.naturalHeight);
        };
        img.src = dataUrl;
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setResizedUrl(null);
        setError(null);
        revokeObjectUrl(resizedUrlRef.current);
        resizedUrlRef.current = null;
    }, []);

    const updateWidth = useCallback((nextWidth: number) => {
        setWidth(nextWidth);
        if (keepAspect && originalDimensions.w > 0) {
            setHeight(Math.max(1, Math.round(nextWidth * originalDimensions.h / originalDimensions.w)));
        }
        setResizedUrl(null);
    }, [keepAspect, originalDimensions.h, originalDimensions.w]);

    const updateHeight = useCallback((nextHeight: number) => {
        setHeight(nextHeight);
        if (keepAspect && originalDimensions.h > 0) {
            setWidth(Math.max(1, Math.round(nextHeight * originalDimensions.w / originalDimensions.h)));
        }
        setResizedUrl(null);
    }, [keepAspect, originalDimensions.h, originalDimensions.w]);

    const handlePreset = useCallback((index: number) => {
        setSelectedPreset(index);
        const preset = PRESETS[index];
        if (preset.w > 0 && preset.h > 0) {
            setWidth(preset.w);
            setHeight(preset.h);
            setKeepAspect(false);
        }
        setResizedUrl(null);
    }, []);

    const handleResize = useCallback(async () => {
        if (!sourceImage || !canvasRef.current) return;
        setIsResizing(true);
        setError(null);

        try {
            const image = await loadImageSource(sourceImage);
            const canvas = canvasRef.current;
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");

            if (!context) {
                throw new Error("No se pudo inicializar el canvas");
            }

            context.clearRect(0, 0, width, height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";

            const background = useBackgroundFill
                ? ({ type: "solid", color: backgroundColor } satisfies StageFill)
                : undefined;

            drawImageToCanvas(context, image, {
                width,
                height,
                fitMode,
                background: exportFormat === "image/png" && !useBackgroundFill ? undefined : background,
            });

            const nextUrl = await canvasToObjectUrl(
                canvas,
                exportFormat,
                isLossyFormat(exportFormat) ? quality / 100 : 1
            );
            revokeObjectUrl(resizedUrlRef.current);
            resizedUrlRef.current = nextUrl;
            setResizedUrl(nextUrl);
        } catch (resizeError) {
            setError(resizeError instanceof Error ? resizeError.message : "No se pudo redimensionar la imagen");
        } finally {
            setIsResizing(false);
        }
    }, [backgroundColor, exportFormat, fitMode, height, quality, sourceImage, useBackgroundFill, width]);

    const handleDownload = useCallback(() => {
        if (!resizedUrl || !sourceFile) return;

        const selectedFormat = EXPORT_FORMATS.find(format => format.mime === exportFormat) || EXPORT_FORMATS[0];
        triggerDownload(
            resizedUrl,
            `${sanitizeFileBaseName(sourceFile.name)}_${width}x${height}.${selectedFormat.extension}`
        );
    }, [exportFormat, height, resizedUrl, sourceFile, width]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Redimensionar Imágenes"} />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#2a1854_0%,#0F1724_40%,#08111f_100%)]">
            <canvas ref={canvasRef} className="hidden" />
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
                <div className="mb-8 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-violet-300">Redimensionar</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Redimensionar imagen con control de lienzo</h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                        Define tamaño, ajuste, fondo y formato antes de exportar la imagen final.
                    </p>
                </div>

                <StudioCard
                    title="Carga la imagen base"
                    description="La vista previa usa el mismo ajuste que se aplicará en la exportación final."
                    eyebrow="Entrada"
                    accentColor={ACCENT}
                >
                    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                        <ImageDropzone
                            onImageLoad={handleImageLoad}
                            currentImage={sourceImage}
                            onClear={handleClear}
                            accentColor={ACCENT}
                            label="Arrastra la imagen a redimensionar"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <StudioMetric label="Original" value={originalDimensions.w > 0 ? `${originalDimensions.w} × ${originalDimensions.h}` : "Sin cargar"} accentColor={ACCENT} />
                            <StudioMetric label="Destino" value={`${width} × ${height}`} accentColor={ACCENT} />
                            <StudioMetric label="Salida" value={EXPORT_FORMATS.find(item => item.mime === exportFormat)?.label || "PNG"} accentColor={ACCENT} />
                            <StudioMetric label="Ajuste" value={getFitModeLabel(fitMode)} accentColor={ACCENT} />
                        </div>
                    </div>
                </StudioCard>

                {sourceImage && (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <StudioCard
                            title="Vista previa"
                            description="La columna derecha representa el lienzo final con el ajuste elegido."
                            eyebrow="Comparación"
                            accentColor={ACCENT}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <StudioStage title="Original" subtitle="Referencia" accentColor={ACCENT}>
                                    <img src={sourceImage} alt="Original" className="max-h-[360px] w-full rounded-2xl object-contain" />
                                </StudioStage>
                                <StudioStage title="Salida prevista" subtitle={`${width} × ${height}px`} accentColor={ACCENT} badge={resizedUrl ? "exportada" : "preview"}>
                                    <div className="flex w-full items-center justify-center">
                                        <div
                                            className="overflow-hidden rounded-[24px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                                            style={{
                                                width: "100%",
                                                maxWidth: 340,
                                                aspectRatio: `${Math.max(width, 1)} / ${Math.max(height, 1)}`,
                                                backgroundColor: useBackgroundFill ? backgroundColor : "transparent",
                                                backgroundImage: useBackgroundFill ? undefined : "linear-gradient(45deg, rgba(15,23,36,0.95) 25%, transparent 25%), linear-gradient(-45deg, rgba(15,23,36,0.95) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(15,23,36,0.95) 75%), linear-gradient(-45deg, transparent 75%, rgba(15,23,36,0.95) 75%)",
                                                backgroundSize: "18px 18px",
                                            }}
                                        >
                                            <img
                                                src={resizedUrl || sourceImage}
                                                alt="Vista previa de salida"
                                                className={`h-full w-full ${getObjectFit(fitMode)}`}
                                            />
                                        </div>
                                    </div>
                                </StudioStage>
                            </div>
                        </StudioCard>

                        <div className="space-y-6">
                            <StudioCard
                                title="Tamaño y presets"
                                description="Elige un preset o trabaja en dimensiones exactas."
                                eyebrow="Lienzo"
                                accentColor={ACCENT}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map((preset, index) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => handlePreset(index)}
                                            className="rounded-2xl border px-3 py-2 text-left transition-all"
                                            style={selectedPreset === index
                                                ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                        >
                                            <p className="text-xs font-semibold text-white">{preset.name}</p>
                                            {preset.w > 0 && <p className="mt-1 text-[11px] text-neutral-500">{preset.w} × {preset.h}</p>}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <label className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-500">Ancho</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10000}
                                            value={width}
                                            onChange={(event) => updateWidth(Number(event.target.value) || 1)}
                                            className="w-full bg-transparent text-lg font-semibold text-white outline-none"
                                        />
                                    </label>
                                    <label className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-500">Alto</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10000}
                                            value={height}
                                            onChange={(event) => updateHeight(Number(event.target.value) || 1)}
                                            className="w-full bg-transparent text-lg font-semibold text-white outline-none"
                                        />
                                    </label>
                                </div>
                                <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
                                    <input type="checkbox" checked={keepAspect} onChange={(event) => setKeepAspect(event.target.checked)} className="h-4 w-4 rounded" />
                                    Mantener relación de aspecto al editar manualmente
                                </label>
                            </StudioCard>

                            <StudioCard
                                title="Comportamiento de la imagen"
                                description="Define cómo se adapta la imagen dentro del nuevo lienzo."
                                eyebrow="Ajuste"
                                accentColor={ACCENT}
                            >
                                <div className="grid gap-3">
                                    {FIT_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setFitMode(mode.id)}
                                            className="rounded-2xl border px-4 py-3 text-left transition-all"
                                            style={fitMode === mode.id
                                                ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-white">{mode.label}</p>
                                                <StudioChip accentColor={ACCENT} active={fitMode === mode.id}>{fitMode === mode.id ? "activo" : "modo"}</StudioChip>
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-neutral-500">{mode.description}</p>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-sm font-medium text-white">Color del lienzo</label>
                                        <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="h-10 w-12 rounded-xl border border-white/10 bg-transparent" />
                                    </div>
                                    <label className="mt-4 flex items-center gap-3 text-sm text-neutral-300">
                                        <input type="checkbox" checked={useBackgroundFill} onChange={(event) => setUseBackgroundFill(event.target.checked)} className="h-4 w-4 rounded" />
                                        Rellenar áreas vacías con color de fondo
                                    </label>
                                </div>
                            </StudioCard>

                            <StudioCard
                                title="Exportación"
                                description="Ajusta formato y compresión antes de generar la salida final."
                                eyebrow="Salida"
                                accentColor={ACCENT}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {EXPORT_FORMATS.map(format => (
                                        <button
                                            key={format.mime}
                                            onClick={() => setExportFormat(format.mime)}
                                            className="rounded-full px-3 py-2 text-xs font-semibold transition-all"
                                            style={exportFormat === format.mime
                                                ? { backgroundColor: `${ACCENT}24`, color: "white", boxShadow: `0 0 0 1px ${ACCENT}` }
                                                : { backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
                                        >
                                            {format.label}
                                        </button>
                                    ))}
                                </div>
                                {isLossyFormat(exportFormat) && (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Calidad</label>
                                            <span className="font-mono text-sm text-violet-300">{quality}%</span>
                                        </div>
                                        <input type="range" min={40} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-3 w-full" />
                                    </div>
                                )}
                                <div className="mt-4 space-y-3">
                                    <button
                                        onClick={handleResize}
                                        disabled={isResizing}
                                        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${ACCENT}, #A78BFA)` }}
                                    >
                                        {isResizing ? "Redimensionando..." : `Generar ${width} × ${height}`}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={!resizedUrl}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Descargar exportación
                                    </button>
                                </div>
                            </StudioCard>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link href="/herramientas" className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white">
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
