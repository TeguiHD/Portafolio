"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { LoaderCircle } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";

import { SubjectBrush, type SubjectBrushHandle } from "@/components/tools/SubjectBrush";
import { getSubjectAlpha } from "@/lib/subject-mask";
import { bboxFromAlpha, bboxFromMask, fitCropToSubject, scaleRect, type Rect } from "@/lib/crop-geometry";
import { MesaBoton, MesaGrupo, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCuadricula, IconoDescargar, IconoEncuadre, IconoGirar, IconoGoma, IconoImagen, IconoPincel, IconoRestablecer, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import {
    canvasToObjectUrl,
    loadImageSource,
    revokeObjectUrl,
    sanitizeFileBaseName,
    triggerDownload,
} from "@/lib/tools/image-processing";

const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "encuadrar", etiqueta: "Encuadrar", icono: <IconoEncuadre /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

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
    const [descargado, setDescargado] = useState(false);

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
        setDescargado(false);

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
        setDescargado(false);
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
        setDescargado(true);
    }, [croppedUrl, sourceFile]);

    const handleResetCrop = useCallback(() => {
        setInitialArea(null);
        setDescargado(false);
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

    const estadosPasos: EstadoPaso[] = !imageDimensions ? ["activo", "pendiente", "pendiente"]
        : croppedUrl && mode === "crop" ? ["listo", "listo", "listo"]
        : ["listo", "activo", "pendiente"];
    const pista = mode === "subject" ? "Pinta sobre lo que quieres conservar" : subjectLabel ?? "Arrastra para encuadrar · flechas para ajustar";
    const rotacionVisible = rotation > 180 ? rotation - 360 : rotation;

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
                <ToolPageHeader slug="recortar-imagen" title="Recortar imagen" description="Encuadra, gira y descarga. Tu recorte se actualiza al instante." />
                {!sourceImage ? (
                    <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a recortar" sublabel="PNG, JPG o WebP · procesamiento local" />
                ) : (
                    <section aria-label="Editor de recorte" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={sourceFile?.name ?? "Imagen"} detalle={croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)} × ${Math.round(croppedAreaPixels.height)} px` : imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px` : undefined}>
                            <button type="button" aria-label="Descargar recorte PNG" onClick={handleDownload} disabled={!croppedUrl || isCropping || mode !== "crop"} className="studio-button studio-button-primary">
                                {isCropping && mode === "crop" ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={descargado} />}<span><span className="hidden sm:inline">Descargar </span>PNG</span>
                            </button>
                        </MesaCabecera>
                        <div className="mesa-cuerpo">
                            <div className="mesa-columna">
                                <MesaEscenario fondo="dark" pista={pista} className="h-[min(50vh,520px)] min-h-[280px] sm:min-h-[360px]">
                                    {mode === "subject" ? (
                                        <SubjectBrush ref={brushRef} imageSrc={sourceImage} brushSize={brushSize} accentColor={ACCENT} />
                                    ) : imageDimensions ? (
                                        <Cropper key={snapKey} image={sourceImage} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} initialCroppedAreaPixels={initialArea ?? undefined} maxZoom={5} showGrid={showGrid}
                                            onCropChange={(value) => { setCrop(value); setCroppedUrl(null); }}
                                            onZoomChange={(value) => { setZoom(value); setCroppedUrl(null); }}
                                            onRotationChange={(value) => { setRotation(value); setCroppedUrl(null); }}
                                            onCropComplete={onCropComplete} />
                                    ) : <div className="flex h-full items-center justify-center"><LoaderCircle className="h-6 w-6 text-pink-300 motion-safe:animate-spin" /></div>}
                                </MesaEscenario>
                                <MesaPasos etiqueta="Progreso del recorte" pasos={PASOS} estados={estadosPasos} />
                                <div className="mesa-pie">
                                    <div className="mesa-chips" role="group" aria-label="Proporción">
                                        {PRESETS.map((preset, index) => <button key={preset.name} type="button" className="mesa-chip" title={preset.label} aria-label={`${preset.name}: ${preset.label}`} aria-pressed={selectedPreset === index} onClick={() => { setSelectedPreset(index); setCroppedUrl(null); }}>{preset.name}</button>)}
                                    </div>
                                    {mode === "crop" ? <>
                                        <div className="mesa-rango"><label htmlFor="crop-zoom">Zoom</label><input id="crop-zoom" type="range" min={1} max={5} step={0.05} value={zoom} onChange={(event) => { setZoom(Number(event.target.value)); setCroppedUrl(null); }} /><output htmlFor="crop-zoom">{zoom.toFixed(1)}×</output></div>
                                        <div className="mesa-rango"><label htmlFor="crop-rotation">Rotación</label><input id="crop-rotation" type="range" min={-180} max={180} step={1} value={rotacionVisible} onChange={(event) => { setRotation((Number(event.target.value) + 360) % 360); setCroppedUrl(null); }} /><output htmlFor="crop-rotation">{rotacionVisible}°</output></div>
                                    </> : <>
                                        <div className="mesa-rango"><label htmlFor="subject-brush">Tamaño del pincel</label><input id="subject-brush" type="range" min={0.02} max={0.15} step={0.01} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /><output htmlFor="subject-brush">{Math.round(brushSize * 100)}</output></div>
                                        <div className="mesa-rango"><label htmlFor="subject-padding">Margen</label><input id="subject-padding" type="range" min={0} max={0.3} step={0.01} value={paddingRatio} onChange={(event) => setPaddingRatio(Number(event.target.value))} /><output htmlFor="subject-padding">{Math.round(paddingRatio * 100)}%</output></div>
                                    </>}
                                    <span className="mesa-pie-estado" role="status">{subjectBusy ? <><LoaderCircle className="h-3 w-3 motion-safe:animate-spin" aria-hidden="true" />{subjectLabel}</> : croppedUrl ? "Recorte listo" : isCropping ? "Actualizando…" : ""}</span>
                                </div>
                            </div>
                            <MesaRail etiqueta="Herramientas de recorte">
                                <MesaGrupo etiqueta="Modo de edición">
                                    <MesaBoton pista="Recortar" pulsado={mode === "crop"} onClick={() => setMode("crop")}><IconoEncuadre /></MesaBoton>
                                    <MesaBoton pista="Marcar sujeto" pulsado={mode === "subject"} onClick={() => setMode("subject")}><IconoPincel /></MesaBoton>
                                </MesaGrupo>
                                <MesaSeparador />
                                {mode === "crop" ? <>
                                    <MesaBoton pista="Mostrar cuadrícula" pulsado={showGrid} onClick={() => setShowGrid(!showGrid)}><IconoCuadricula /></MesaBoton>
                                    <MesaBoton pista="Girar 90°" onClick={() => { setRotation((rotation + 90) % 360); setCroppedUrl(null); }}><IconoGirar /></MesaBoton>
                                    <MesaBoton pista="Restablecer encuadre" onClick={handleResetCrop}><IconoRestablecer /></MesaBoton>
                                </> : <>
                                    <MesaBoton pista="Encajar al sujeto" disabled={subjectBusy || !imageDimensions} onClick={() => { void handleSnapToSubject(); }}><IconoVarita /></MesaBoton>
                                    <MesaBoton pista="Limpiar trazos" disabled={subjectBusy} onClick={() => brushRef.current?.clear()}><IconoGoma /></MesaBoton>
                                </>}
                                <MesaSeparador />
                                <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                            </MesaRail>
                        </div>
                    </section>
                )}
                {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            </main>
        </div>
    );
}
