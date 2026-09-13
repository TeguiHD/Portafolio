"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, ImagePlus, Link2, LoaderCircle, Maximize2, SlidersHorizontal, Unlink2 } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { useToolAccess } from "@/hooks/useToolAccess";
import { canvasToBlob, drawImageToCanvas, loadImageSource, revokeObjectUrl, sanitizeFileBaseName, triggerDownload, type DrawFitMode, type ExportMimeType } from "@/lib/tools/image-processing";

type StudioMode = "convertir-imagen" | "comprimir-imagen" | "redimensionar";
const CONFIG = {
    "convertir-imagen": { title: "Convertir imagen", description: "PNG, WebP o JPEG. Elige el formato y tu archivo estará listo.", accent: "#FBBF24", suffix: "convertida" },
    "comprimir-imagen": { title: "Comprimir imagen", description: "Menos peso. La misma imagen. Ajusta la calidad y compara.", accent: "#60A5FA", suffix: "comprimida" },
    redimensionar: { title: "Redimensionar imagen", description: "El tamaño exacto, con una vista previa que responde a tus ajustes.", accent: "#C4B5FD", suffix: "redimensionada" },
};
const FORMATS: { value: ExportMimeType; label: string; ext: string }[] = [
    { value: "image/webp", label: "WebP", ext: "webp" },
    { value: "image/png", label: "PNG", ext: "png" },
    { value: "image/jpeg", label: "JPEG", ext: "jpg" },
];
const PRESETS = [
    { label: "Instagram · publicación", width: 1080, height: 1080 },
    { label: "Instagram · historia", width: 1080, height: 1920 },
    { label: "YouTube · miniatura", width: 1280, height: 720 },
    { label: "YouTube · banner", width: 2560, height: 1440 },
    { label: "Facebook · portada", width: 820, height: 312 },
    { label: "LinkedIn · banner", width: 1584, height: 396 },
    { label: "Full HD", width: 1920, height: 1080 },
    { label: "4K", width: 3840, height: 2160 },
];
const fieldClass = "min-h-11 w-full rounded-lg border border-white/10 bg-[#0a111b] px-3 text-sm text-slate-200 outline-none transition-colors focus:border-white/40 focus-visible:ring-2 focus-visible:ring-white/30";
const actionClass = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40";

function formatBytes(bytes: number) {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function ImageTransformStudio({ mode }: { mode: StudioMode }) {
    const config = CONFIG[mode];
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess(mode);
    const [source, setSource] = useState<{ id: number; file: File; url: string; image: HTMLImageElement } | null>(null);
    const [decoding, setDecoding] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [format, setFormat] = useState<ExportMimeType>(mode === "redimensionar" ? "image/png" : "image/webp");
    const [quality, setQuality] = useState(mode === "comprimir-imagen" ? 75 : 90);
    const [maxEdge, setMaxEdge] = useState(0);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [locked, setLocked] = useState(true);
    const [fit, setFit] = useState<DrawFitMode>("contain");
    const [fill, setFill] = useState(false);
    const [background, setBackground] = useState("#ffffff");
    const [original, setOriginal] = useState(false);
    const [result, setResult] = useState<{ key: string; url: string; size: number; width: number; height: number; mime: string } | null>(null);
    const [exportError, setExportError] = useState<{ key: string; message: string } | null>(null);
    const sourceVersion = useRef(0);
    const resultUrl = useRef<string | null>(null);
    const key = JSON.stringify([source?.id, mode, format, quality, maxEdge, width, height, fit, fill, background]);
    const currentResult = result?.key === key ? result : null;
    const error = exportError?.key === key ? exportError.message : loadError;
    const processing = !!source && !currentResult && !error;

    const handleLoad = useCallback((file: File, url: string) => {
        const version = ++sourceVersion.current;
        setDecoding(true);
        setLoadError(null);
        setSource(null);
        setResult(null);
        setExportError(null);
        setOriginal(false);
        revokeObjectUrl(resultUrl.current);
        resultUrl.current = null;
        void loadImageSource(url).then((image) => {
            if (version !== sourceVersion.current) return;
            setSource({ id: version, file, url, image });
            setWidth(image.naturalWidth);
            setHeight(image.naturalHeight);
        }).catch(() => {
            if (version === sourceVersion.current) setLoadError("No se pudo abrir esta imagen. Prueba con PNG, JPEG o WebP.");
        }).finally(() => { if (version === sourceVersion.current) setDecoding(false); });
    }, []);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        setSource(null);
        setResult(null);
        setDecoding(false);
        setLoadError(null);
        setExportError(null);
        revokeObjectUrl(resultUrl.current);
        resultUrl.current = null;
    }, []);

    useEffect(() => () => {
        sourceVersion.current += 1;
        revokeObjectUrl(resultUrl.current);
    }, []);

    useEffect(() => {
        if (!source) return;
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                let outputWidth = source.image.naturalWidth;
                let outputHeight = source.image.naturalHeight;
                if (mode === "redimensionar") {
                    outputWidth = width;
                    outputHeight = height;
                } else if (mode === "comprimir-imagen" && maxEdge > 0) {
                    const scale = Math.min(1, maxEdge / Math.max(outputWidth, outputHeight));
                    outputWidth = Math.max(1, Math.round(outputWidth * scale));
                    outputHeight = Math.max(1, Math.round(outputHeight * scale));
                }
                if (!Number.isInteger(outputWidth) || !Number.isInteger(outputHeight) || outputWidth < 1 || outputHeight < 1 || outputWidth > 16000 || outputHeight > 16000 || outputWidth * outputHeight > 40_000_000) {
                    throw new Error("Usa dimensiones entre 1 y 16.000 px, hasta 40 megapíxeles.");
                }
                const canvas = document.createElement("canvas");
                canvas.width = outputWidth;
                canvas.height = outputHeight;
                const context = canvas.getContext("2d");
                if (!context) throw new Error("No se pudo preparar la imagen.");
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
                drawImageToCanvas(context, source.image, {
                    width: outputWidth,
                    height: outputHeight,
                    fitMode: mode === "redimensionar" ? fit : "contain",
                    background: (mode === "redimensionar" && fill) || format === "image/jpeg" ? { type: "solid", color: background } : undefined,
                });
                const blob = await canvasToBlob(canvas, format, quality / 100);
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                revokeObjectUrl(resultUrl.current);
                resultUrl.current = url;
                setResult({ key, url, size: blob.size, width: outputWidth, height: outputHeight, mime: blob.type });
                setExportError(null);
            } catch (cause) {
                if (!cancelled) setExportError({ key, message: cause instanceof Error ? cause.message : "No se pudo exportar la imagen." });
            }
        }, 220);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [source, mode, format, quality, maxEdge, width, height, fit, fill, background, key]);

    const updateDimension = (dimension: "width" | "height", value: number) => {
        const next = Math.max(0, Math.round(value));
        if (dimension === "width") {
            setWidth(next);
            if (locked && source) setHeight(Math.max(1, Math.round(next * source.image.naturalHeight / source.image.naturalWidth)));
        } else {
            setHeight(next);
            if (locked && source) setWidth(Math.max(1, Math.round(next * source.image.naturalWidth / source.image.naturalHeight)));
        }
    };
    const download = () => {
        if (!currentResult || !source) return;
        const extension = FORMATS.find((item) => item.value === currentResult.mime)?.ext ?? "png";
        triggerDownload(currentResult.url, `${sanitizeFileBaseName(source.file.name)}_${config.suffix}.${extension}`);
    };
    const savings = source && currentResult ? Math.round((1 - currentResult.size / source.file.size) * 100) : null;

    if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Cargando herramienta"><LoaderCircle className="h-6 w-6 text-slate-400 motion-safe:animate-spin" /></div>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || config.title} />;

    return <div className="tool-page">
        <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
            <ToolPageHeader slug={mode} title={config.title} description={config.description} />
            {!source ? <>
                <ImageDropzone onImageLoad={handleLoad} accentColor={config.accent} label="Arrastra tu imagen aquí" sublabel="PNG, JPG o WebP · tus archivos permanecen en tu dispositivo" />
                {decoding && <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />Abriendo imagen…</p>}
            </> : <section aria-label="Editor de imagen" className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c131d] shadow-2xl shadow-black/20">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3 sm:px-4">
                    <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Cambiar imagen" title="Cambiar imagen" className={actionClass} onClick={handleClear}><ImagePlus className="h-4 w-4" /></button><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200 sm:text-sm">{source.file.name}</p><p className="mt-1 text-[11px] font-mono text-slate-500">{source.image.naturalWidth} × {source.image.naturalHeight} · {formatBytes(source.file.size)}</p></div></div>
                    <button type="button" onClick={download} disabled={!currentResult} className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#0a111b] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 sm:px-4" style={{ backgroundColor: config.accent }}><ArrowDownToLine className="h-4 w-4" /><span className="hidden sm:inline">Descargar</span><span className="sm:hidden">Guardar</span></button>
                </div>
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="min-w-0">
                        <div className="relative flex h-[min(50vh,480px)] min-h-[270px] items-center justify-center overflow-hidden bg-[#070b11] p-6" style={{ backgroundImage: "repeating-conic-gradient(#ffffff05 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px" }}>
                            <img src={original || !currentResult ? source.url : currentResult.url} alt={original ? "Imagen original" : "Vista previa del resultado"} className="max-h-full max-w-full object-contain shadow-lg" />
                            <div className="absolute left-3 top-3 flex rounded-lg border border-white/10 bg-[#0a111b]/90 p-1 backdrop-blur-sm" role="group" aria-label="Comparar imagen">
                                {[[true, "Original"], [false, "Resultado"]].map(([value, label]) => <button key={String(label)} type="button" aria-pressed={original === value} onClick={() => setOriginal(value as boolean)} className={`min-h-9 cursor-pointer rounded-md px-3 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-white/50 ${original === value ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>{label}</button>)}
                            </div>
                            {processing && <span role="status" className="absolute bottom-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0a111b]/90 px-3 py-2 text-xs text-slate-300"><LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" />Actualizando…</span>}
                        </div>
                        <div aria-live="polite" className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-2">{currentResult ? <Check className="h-4 w-4" style={{ color: config.accent }} /> : <SlidersHorizontal className="h-4 w-4" />}{currentResult ? `${currentResult.width} × ${currentResult.height} · ${formatBytes(currentResult.size)}` : "La vista previa se actualiza automáticamente"}</span>
                            {savings !== null && <span style={{ color: savings > 0 ? config.accent : "#94a3b8" }}>{savings > 0 ? `${savings}% menos peso` : savings === 0 ? "Mismo peso" : `${Math.abs(savings)}% más peso`}</span>}
                        </div>
                    </div>
                    <aside aria-label="Ajustes de imagen" className="space-y-5 border-t border-white/10 bg-white/[0.02] p-5 lg:border-l lg:border-t-0">
                        {mode === "redimensionar" && <>
                            <label className="block text-xs text-slate-300"><span className="mb-2 block">Tamaños rápidos</span><select className={fieldClass} value="" onChange={(event) => { const preset = PRESETS[Number(event.target.value)]; setWidth(preset.width); setHeight(preset.height); setLocked(false); }}><option value="" disabled>Elegir un formato</option>{PRESETS.map((preset, index) => <option key={preset.label} value={index}>{preset.label} · {preset.width} × {preset.height}</option>)}</select></label>
                            <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-xs text-slate-400"><span className="mb-2 block">Ancho (px)</span><input className={fieldClass} type="number" min={1} max={16000} value={width || ""} onChange={(event) => updateDimension("width", Number(event.target.value))} /></label><button type="button" title="Mantener proporción" aria-label="Mantener proporción" aria-pressed={locked} onClick={() => { const next = !locked; setLocked(next); if (next) setHeight(Math.max(1, Math.round(width * source.image.naturalHeight / source.image.naturalWidth))); }} className={actionClass} style={locked ? { color: config.accent } : undefined}>{locked ? <Link2 className="h-4 w-4" /> : <Unlink2 className="h-4 w-4" />}</button><label className="min-w-0 flex-1 text-xs text-slate-400"><span className="mb-2 block">Alto (px)</span><input className={fieldClass} type="number" min={1} max={16000} value={height || ""} onChange={(event) => updateDimension("height", Number(event.target.value))} /></label></div>
                            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Ajuste de imagen">{([['contain', 'Ajustar'], ['cover', 'Cubrir'], ['stretch', 'Estirar']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={fit === value} onClick={() => setFit(value)} className={actionClass} style={fit === value ? { color: config.accent, borderColor: `${config.accent}60`, background: `${config.accent}10` } : undefined}>{label}</button>)}</div>
                        </>}
                        <fieldset><legend className="mb-3 text-xs font-medium text-slate-300">Formato de salida</legend><div className="grid grid-cols-3 gap-1.5">{FORMATS.map((item) => <button key={item.value} type="button" aria-pressed={format === item.value} onClick={() => setFormat(item.value)} className={actionClass} style={format === item.value ? { color: config.accent, borderColor: `${config.accent}60`, background: `${config.accent}10` } : undefined}>{item.label}</button>)}</div></fieldset>
                        {format !== "image/png" ? <label className="block text-xs text-slate-300"><span className="mb-3 flex justify-between"><span>Calidad</span><output className="font-mono" style={{ color: config.accent }}>{quality}%</output></span><input type="range" min={10} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="h-5 w-full cursor-pointer" style={{ accentColor: config.accent }} /><span className="mt-1 flex justify-between text-[11px] text-slate-500"><span>Menor peso</span><span>Más detalle</span></span></label> : <p className="text-xs leading-5 text-slate-400">PNG conserva la transparencia y el detalle. Puede generar un archivo más grande.</p>}
                        {mode === "comprimir-imagen" && <label className="block text-xs text-slate-300"><span className="mb-2 flex items-center gap-2"><Maximize2 className="h-4 w-4 text-slate-500" />Lado máximo (px)</span><input className={fieldClass} type="number" min={0} max={16000} placeholder="Tamaño original" value={maxEdge || ""} onChange={(event) => setMaxEdge(Math.max(0, Math.round(Number(event.target.value))))} /><span className="mt-2 block text-[11px] text-slate-500">Conserva la proporción. No amplía imágenes.</span></label>}
                        {(mode === "redimensionar" || format === "image/jpeg") && <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">{format !== "image/jpeg" && <input type="checkbox" checked={fill} onChange={(event) => setFill(event.target.checked)} className="h-4 w-4" style={{ accentColor: config.accent }} />}{format === "image/jpeg" ? "Fondo JPEG" : "Rellenar fondo"}</label><input type="color" value={background} aria-label="Color de fondo" disabled={format !== "image/jpeg" && !fill} onChange={(event) => setBackground(event.target.value)} className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent disabled:opacity-40" /></div>}
                    </aside>
                </div>
            </section>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
        </main>
    </div>;
}
