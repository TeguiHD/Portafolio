"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brush, Crop, Download, Eraser, Grid2X2, ImagePlus, LoaderCircle, RotateCcw, RotateCw, Scan, ZoomIn } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

import { SubjectBrush, type SubjectBrushHandle } from "@/components/tools/SubjectBrush";
import { getSubjectAlpha } from "@/lib/subject-mask";
import { bboxFromAlpha, bboxFromMask, fitCropToSubject, scaleRect, type Rect } from "@/lib/crop-geometry";
import {
    canvasToObjectUrl,
    loadImageSource,
    revokeObjectUrl,
    sanitizeFileBaseName,
    triggerDownload,
} from "@/lib/tools/image-processing";

const ACCENT = "#EC4899";

const PRESETS: { name: string; aspect: number; label: string }[] = [
    { name: "Original", aspect: 0, label: "Proporción original" },
    { name: "1:1", aspect: 1, label: "Cuadrado" },
    { name: "16:9", aspect: 16 / 9, label: "YouTube" },
    { name: "9:16", aspect: 9 / 16, label: "Stories" },
    { name: "4:3", aspect: 4 / 3, label: "Foto" },
    { name: "3:2", aspect: 3 / 2, label: "Paisaje" },
    { name: "4:5", aspect: 4 / 5, label: "Instagram" },
];

function getRadianAngle(rotation: number) {
    return (rotation * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
    const radians = getRadianAngle(rotation);

    return {
        width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
        height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
    };
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number) {
    const image = await loadImageSource(imageSrc);
    const safeWidth = Math.max(1, Math.round(pixelCrop.width));
    const safeHeight = Math.max(1, Math.round(pixelCrop.height));
    const rotatedBounds = rotateSize(image.naturalWidth, image.naturalHeight, rotation);
    const workingCanvas = document.createElement("canvas");
    const workingContext = workingCanvas.getContext("2d");

    if (!workingContext) {
        throw new Error("No se pudo preparar el recorte");
    }

    workingCanvas.width = Math.ceil(rotatedBounds.width);
    workingCanvas.height = Math.ceil(rotatedBounds.height);

    workingContext.translate(workingCanvas.width / 2, workingCanvas.height / 2);
    workingContext.rotate(getRadianAngle(rotation));
    workingContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
    workingContext.drawImage(image, 0, 0);

    const outputCanvas = document.createElement("canvas");
    const outputContext = outputCanvas.getContext("2d");

    if (!outputContext) {
        throw new Error("No se pudo exportar el recorte");
    }

    outputCanvas.width = safeWidth;
    outputCanvas.height = safeHeight;
    outputContext.drawImage(
        workingCanvas,
        pixelCrop.x,
        pixelCrop.y,
        safeWidth,
        safeHeight,
        0,
        0,
        safeWidth,
        safeHeight
    );

    return canvasToObjectUrl(outputCanvas, "image/png", 1);
}

export default function ImageCropperPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("recortar-imagen");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const croppedUrlRef = useRef<string | null>(null);
    const sourceVersion = useRef(0);
    const [showGrid, setShowGrid] = useState(true);

    // Modo "Marcar sujeto": pincel + segmentación para encajar el recorte al objeto.
    const [mode, setMode] = useState<"crop" | "subject">("crop");
    const [brushSize, setBrushSize] = useState(0.06);
    const [paddingRatio, setPaddingRatio] = useState(0.08);
    const [subjectBusy, setSubjectBusy] = useState(false);
    const [subjectLabel, setSubjectLabel] = useState<string | null>(null);
    const [snapKey, setSnapKey] = useState(0);
    const [initialArea, setInitialArea] = useState<Area | null>(null);
    const brushRef = useRef<SubjectBrushHandle | null>(null);

    const aspect = PRESETS[selectedPreset].aspect || (imageDimensions ? imageDimensions.width / imageDimensions.height : 4 / 3);

    useEffect(() => {
        return () => {
            sourceVersion.current += 1;
            revokeObjectUrl(croppedUrlRef.current);
        };
    }, []);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        const version = ++sourceVersion.current;
        revokeObjectUrl(croppedUrlRef.current);
        croppedUrlRef.current = null;
        setImageDimensions(null);
        setSubjectBusy(false);
        setSourceImage(dataUrl);
        setSourceFile(file);
        setCroppedUrl(null);
        setCroppedAreaPixels(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setError(null);
        setMode("crop");
        setInitialArea(null);
        setSubjectLabel(null);

        void loadImageSource(dataUrl).then((image) => {
            if (version === sourceVersion.current) setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
        }).catch(() => { if (version === sourceVersion.current) setError("No se pudo leer la imagen"); });
    }, []);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        setSubjectBusy(false);
        setSourceImage(null);
        setSourceFile(null);
        setCroppedUrl(null);
        setCroppedAreaPixels(null);
        setImageDimensions(null);
        setError(null);
        revokeObjectUrl(croppedUrlRef.current);
        croppedUrlRef.current = null;
    }, []);

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Export only the latest settled frame; changing or clearing the image cancels stale work.
    useEffect(() => {
        if (!sourceImage || !croppedAreaPixels || mode !== "crop") return;
        let cancelled = false;
        setCroppedUrl(null);
        setIsCropping(true);
        const timer = window.setTimeout(async () => {
            try {
                const url = await getCroppedImg(sourceImage, croppedAreaPixels, rotation);
                if (cancelled) { revokeObjectUrl(url); return; }
                revokeObjectUrl(croppedUrlRef.current);
                croppedUrlRef.current = url;
                setCroppedUrl(url);
                setError(null);
            } catch (cropError) {
                if (!cancelled) setError(cropError instanceof Error ? cropError.message : "No se pudo generar el recorte");
            } finally {
                if (!cancelled) setIsCropping(false);
            }
        }, 180);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [croppedAreaPixels, rotation, sourceImage, mode, crop.x, crop.y, zoom, aspect]);

    const handleDownload = useCallback(() => {
        if (!croppedUrl || !sourceFile) return;
        triggerDownload(croppedUrl, `${sanitizeFileBaseName(sourceFile.name)}_recorte.png`);
    }, [croppedUrl, sourceFile]);

    const handleResetCrop = useCallback(() => {
        setInitialArea(null);
        setCroppedUrl(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setSelectedPreset(0);
        setError(null);
    }, []);

    const handleSnapToSubject = useCallback(async () => {
        if (!sourceImage || !imageDimensions) return;
        const version = sourceVersion.current;
        setSubjectBusy(true);
        setError(null);
        setSubjectLabel("Preparando imagen");
        const brush = brushRef.current;
        let bbox: Rect | null = null;
        let usedFallback = false;

        try {
            try {
                const subject = await getSubjectAlpha(sourceImage, 512, (label) => { if (version === sourceVersion.current) setSubjectLabel(label); });
                if (version !== sourceVersion.current) return;
                const mask = brush?.hasStrokes() ? brush.getMask(subject.width, subject.height) : null;
                // Pincel ∩ segmentación; si la segmentación no ve nada dentro del
                // trazo, vale la pincelada sola.
                const found =
                    bboxFromAlpha(subject.alpha, subject.width, subject.height, 64, mask) ??
                    (mask ? bboxFromMask(mask, subject.width, subject.height) : null);
                if (found) bbox = scaleRect(found, 1 / subject.scale);
            } catch (segmentationError) {
                console.warn("Segmentación no disponible; se usa la pincelada", segmentationError);
                usedFallback = true;
            }

            if (version !== sourceVersion.current) return;
            if (!bbox && brush?.hasStrokes()) {
                const gw = Math.min(512, imageDimensions.width);
                const gh = Math.max(1, Math.round((gw * imageDimensions.height) / imageDimensions.width));
                const mask = brush.getMask(gw, gh);
                const found = mask ? bboxFromMask(mask, gw, gh) : null;
                if (found) bbox = scaleRect(found, imageDimensions.width / gw);
                usedFallback = true;
            }

            if (!bbox) {
                setError("No se detectó ningún sujeto. Pinta por encima de lo que quieres conservar e inténtalo de nuevo.");
                setSubjectLabel(null);
                return;
            }

            const fitted = fitCropToSubject(bbox, imageDimensions, { aspect, paddingRatio });
            setInitialArea(fitted);
            setSnapKey((k) => k + 1);
            setCroppedUrl(null);
            setRotation(0);
            setMode("crop");
            setSubjectLabel(usedFallback ? "Encaje por pincelada (segmentación no disponible)" : "Encaje ajustado al sujeto");
        } finally {
            if (version === sourceVersion.current) setSubjectBusy(false);
        }
    }, [sourceImage, imageDimensions, aspect, paddingRatio]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Recortador de Imágenes"} />;
    }

    const iconButton = "group inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:cursor-not-allowed disabled:opacity-40";

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
                <ToolPageHeader slug="recortar-imagen" title="Recortar imagen" description="Encuadra, gira y descarga. Tu recorte se actualiza al instante." />
                {!sourceImage ? (
                    <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a recortar" sublabel="PNG, JPG o WebP · procesamiento local" />
                ) : (
                    <section aria-label="Editor de recorte" className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c131d] shadow-2xl shadow-black/20">
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 p-2 sm:px-4">
                            <div className="flex items-center gap-1" role="group" aria-label="Modo de edición">
                                <button type="button" aria-label="Recortar" title="Recortar" aria-pressed={mode === "crop"} onClick={() => setMode("crop")} className={`${iconButton} ${mode === "crop" ? "bg-pink-400/10 text-pink-300" : ""}`}><Crop className="h-5 w-5" /></button>
                                <button type="button" aria-label="Marcar sujeto" title="Marcar sujeto" aria-pressed={mode === "subject"} onClick={() => setMode("subject")} className={`${iconButton} ${mode === "subject" ? "bg-pink-400/10 text-pink-300" : ""}`}><Brush className="h-5 w-5 motion-safe:transition-transform motion-safe:group-hover:-rotate-12" /></button>
                                <span className="mx-1 h-5 w-px bg-white/10" />
                                <button type="button" aria-label="Restablecer encuadre" title="Restablecer encuadre" onClick={handleResetCrop} className={iconButton}><RotateCcw className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:-rotate-45" /></button>
                                <button type="button" aria-label="Cambiar imagen" title="Cambiar imagen" onClick={handleClear} className={iconButton}><ImagePlus className="h-4 w-4" /></button>
                            </div>
                            <button type="button" aria-label="Descargar recorte PNG" onClick={handleDownload} disabled={!croppedUrl || isCropping || mode !== "crop"} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-pink-300 px-3 text-sm font-semibold text-[#26101e] transition-colors hover:bg-pink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 sm:px-4">
                                {isCropping && mode === "crop" ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">Descargar</span> PNG
                            </button>
                        </div>
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="min-w-0">
                                <div className="relative h-[min(52vh,460px)] min-h-[280px] overflow-hidden bg-[#070b11] sm:min-h-[340px]" aria-label={mode === "subject" ? "Pinta sobre el sujeto" : "Área de recorte interactiva"}>
                                    {mode === "subject" ? (
                                        <SubjectBrush ref={brushRef} imageSrc={sourceImage} brushSize={brushSize} accentColor={ACCENT} />
                                    ) : imageDimensions ? (
                                        <Cropper key={snapKey} image={sourceImage} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} initialCroppedAreaPixels={initialArea ?? undefined} maxZoom={5} showGrid={showGrid}
                                            onCropChange={(value) => { setCrop(value); setCroppedUrl(null); }}
                                            onZoomChange={(value) => { setZoom(value); setCroppedUrl(null); }}
                                            onRotationChange={(value) => { setRotation(value); setCroppedUrl(null); }}
                                            onCropComplete={onCropComplete} />
                                    ) : <div className="flex h-full items-center justify-center"><LoaderCircle className="h-6 w-6 text-pink-300 motion-safe:animate-spin" /></div>}
                                </div>
                                <div className="flex min-h-12 items-center justify-between gap-3 border-t border-white/10 px-4 text-xs text-slate-400">
                                    <span className="min-w-0 truncate">{mode === "subject" ? "Pinta sobre lo que quieres conservar" : "Arrastra para encuadrar · usa las flechas para ajustar"}</span>
                                    {mode === "crop" && <button type="button" onClick={() => setShowGrid(!showGrid)} aria-label="Mostrar cuadrícula" title="Mostrar cuadrícula" aria-pressed={showGrid} className={iconButton}><Grid2X2 className="h-4 w-4" /></button>}
                                </div>
                            </div>
                            <aside aria-label="Ajustes del recorte" className="space-y-5 border-t border-white/10 bg-white/[0.02] p-4 lg:border-l lg:border-t-0 lg:p-5">
                                <fieldset>
                                    <legend className="mb-3 text-xs font-medium text-slate-300">Proporción</legend>
                                    <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-3">
                                        {PRESETS.map((preset, index) => <button key={preset.name} type="button" title={preset.label} aria-label={`${preset.name}: ${preset.label}`} aria-pressed={selectedPreset === index} onClick={() => { setSelectedPreset(index); setInitialArea(null); setCroppedUrl(null); }} className={`min-h-10 cursor-pointer rounded-lg border px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${selectedPreset === index ? "border-pink-300/50 bg-pink-300/10 text-pink-200" : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"}`}>{preset.name}</button>)}
                                    </div>
                                </fieldset>
                                {mode === "crop" ? <>
                                    <label className="block text-xs text-slate-300"><span className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2"><ZoomIn className="h-4 w-4 text-slate-500" />Zoom</span><output className="font-mono text-pink-200">{zoom.toFixed(1)}×</output></span><input type="range" min={1} max={5} step={0.01} value={zoom} onChange={(event) => { setZoom(Number(event.target.value)); setCroppedUrl(null); }} className="h-5 w-full cursor-pointer accent-pink-300" /></label>
                                    <label className="block text-xs text-slate-300"><span className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2"><RotateCw className="h-4 w-4 text-slate-500" />Rotación</span><output className="font-mono text-pink-200">{rotation}°</output></span><input type="range" min={0} max={360} step={1} value={rotation} onChange={(event) => { setRotation(Number(event.target.value)); setCroppedUrl(null); }} className="h-5 w-full cursor-pointer accent-pink-300" /></label>
                                    <button type="button" onClick={() => { setRotation((rotation + 90) % 360); setCroppedUrl(null); }} className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 text-xs text-slate-300 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-pink-300"><RotateCw className="h-4 w-4" />Girar 90°</button>
                                    <div className="border-t border-white/10 pt-4">
                                        <div className="mb-3 flex items-center justify-between text-xs"><span className="text-slate-400">Resultado</span><span className="font-mono text-slate-300">{croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)} × ${Math.round(croppedAreaPixels.height)}` : "—"}</span></div>
                                        <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-black/20" aria-live="polite">
                                            {croppedUrl ? <img src={croppedUrl} alt="Recorte listo para descargar" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-500">Actualizando recorte…</span>}
                                        </div>
                                    </div>
                                </> : <>
                                    <label className="block text-xs text-slate-300">Tamaño del pincel<input type="range" min={0.02} max={0.15} step={0.01} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} className="mt-3 h-5 w-full cursor-pointer accent-pink-300" /></label>
                                    <label className="block text-xs text-slate-300">Margen <span className="float-right font-mono text-pink-200">{Math.round(paddingRatio * 100)}%</span><input type="range" min={0} max={0.3} step={0.01} value={paddingRatio} onChange={(event) => setPaddingRatio(Number(event.target.value))} className="mt-3 h-5 w-full cursor-pointer accent-pink-300" /></label>
                                    <button type="button" onClick={handleSnapToSubject} disabled={subjectBusy || !imageDimensions} className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-pink-300 px-3 text-sm font-semibold text-[#26101e] hover:bg-pink-200 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40">{subjectBusy ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : <Scan className="h-4 w-4" />}Ajustar al sujeto</button>
                                    <button type="button" onClick={() => brushRef.current?.clear()} disabled={subjectBusy} className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"><Eraser className="h-4 w-4" />Limpiar trazos</button>
                                </>}
                                {subjectLabel && <p role="status" className="text-xs leading-5 text-slate-400">{subjectLabel}</p>}
                            </aside>
                        </div>
                    </section>
                )}
                {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            </main>
        </div>
    );
}
