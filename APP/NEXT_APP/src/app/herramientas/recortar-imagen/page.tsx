"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Cropper, { type Area } from "react-easy-crop";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { StudioCard, StudioChip, StudioMetric, StudioStage } from "@/components/tools/ImageStudio";
import {
    canvasToObjectUrl,
    loadImageSource,
    revokeObjectUrl,
    sanitizeFileBaseName,
    triggerDownload,
} from "@/lib/tools/image-processing";

const ACCENT = "#EC4899";

const PRESETS: { name: string; aspect: number; label: string }[] = [
    { name: "Libre", aspect: 0, label: "Libre" },
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

    const aspect = PRESETS[selectedPreset].aspect || undefined;

    useEffect(() => {
        return () => {
            revokeObjectUrl(croppedUrlRef.current);
        };
    }, []);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setCroppedUrl(null);
        setCroppedAreaPixels(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setError(null);

        void loadImageSource(dataUrl).then((image) => {
            setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
        });
    }, []);

    const handleClear = useCallback(() => {
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

    const handleCrop = useCallback(async () => {
        if (!sourceImage || !croppedAreaPixels) return;
        setIsCropping(true);
        setError(null);

        try {
            const url = await getCroppedImg(sourceImage, croppedAreaPixels, rotation);
            revokeObjectUrl(croppedUrlRef.current);
            croppedUrlRef.current = url;
            setCroppedUrl(url);
        } catch (cropError) {
            setError(cropError instanceof Error ? cropError.message : "No se pudo generar el recorte");
        } finally {
            setIsCropping(false);
        }
    }, [croppedAreaPixels, rotation, sourceImage]);

    const handleDownload = useCallback(() => {
        if (!croppedUrl || !sourceFile) return;
        triggerDownload(croppedUrl, `${sanitizeFileBaseName(sourceFile.name)}_recorte.png`);
    }, [croppedUrl, sourceFile]);

    const handleResetCrop = useCallback(() => {
        setCroppedUrl(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setSelectedPreset(0);
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
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Recortador de Imágenes"} />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#4f1238_0%,#0F1724_40%,#08111f_100%)]">
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
                <div className="mb-8 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-pink-300">Recorte</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Recortar imagen con vista previa fiel</h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                        Ajusta proporción, encuadre y rotación y exporta exactamente el resultado que ves en pantalla.
                    </p>
                </div>

                {!sourceImage ? (
                    <StudioCard
                        title="Carga tu imagen"
                        description="Sube una imagen y empieza a recortar con formatos listos para redes, producto o uso libre."
                        eyebrow="Entrada"
                        accentColor={ACCENT}
                    >
                        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                            <ImageDropzone
                                onImageLoad={handleImageLoad}
                                accentColor={ACCENT}
                                label="Arrastra la imagen a recortar"
                                sublabel="PNG, JPG, WebP · trabajo local en el navegador"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <StudioMetric label="Formatos" value={`${PRESETS.length} opciones`} accentColor={ACCENT} />
                                <StudioMetric label="Salida" value="PNG" accentColor={ACCENT} />
                                <StudioMetric label="Controles" value="Zoom y rotación" accentColor={ACCENT} />
                                <StudioMetric label="Modo" value="Vista previa" accentColor={ACCENT} />
                            </div>
                        </div>
                    </StudioCard>
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                        <StudioCard
                            title="Área de recorte"
                            description="Mueve el encuadre libremente. La exportación usa el mismo cálculo de rotación que ves aquí."
                            eyebrow="Composición"
                            accentColor={ACCENT}
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <StudioMetric
                                    label="Original"
                                    value={imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height}` : "Cargando"}
                                    accentColor={ACCENT}
                                />
                                <StudioMetric
                                    label="Salida estimada"
                                    value={croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)} × ${Math.round(croppedAreaPixels.height)}` : "Define el marco"}
                                    accentColor={ACCENT}
                                />
                                <StudioMetric label="Zoom" value={`${zoom.toFixed(1)}x`} accentColor={ACCENT} />
                                <StudioMetric label="Rotación" value={`${rotation}°`} accentColor={ACCENT} />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {PRESETS.map((preset, index) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => setSelectedPreset(index)}
                                        className="rounded-2xl border px-3 py-2 text-left transition-all"
                                        style={selectedPreset === index
                                            ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                            : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                    >
                                        <p className="text-xs font-semibold text-white">{preset.name}</p>
                                        <p className="mt-1 text-[11px] text-neutral-500">{preset.label}</p>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4">
                                <StudioStage
                                    title="Área interactiva"
                                    subtitle={aspect ? `${PRESETS[selectedPreset].name} · ${PRESETS[selectedPreset].label}` : "Aspecto libre"}
                                    accentColor={ACCENT}
                                    badge={croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)}×${Math.round(croppedAreaPixels.height)}` : undefined}
                                >
                                    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl bg-black sm:h-[520px]">
                                        <Cropper
                                            image={sourceImage}
                                            crop={crop}
                                            zoom={zoom}
                                            rotation={rotation}
                                            aspect={aspect}
                                            minZoom={1}
                                            maxZoom={5}
                                            showGrid
                                            onCropChange={setCrop}
                                            onZoomChange={setZoom}
                                            onRotationChange={setRotation}
                                            onCropComplete={onCropComplete}
                                        />
                                    </div>
                                </StudioStage>
                            </div>
                        </StudioCard>

                        <div className="space-y-6">
                            <StudioCard
                                title="Ajustes finos"
                                description="Define el encuadre final antes de exportar."
                                eyebrow="Controles"
                                accentColor={ACCENT}
                            >
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Zoom</label>
                                            <StudioChip accentColor={ACCENT} active>{zoom.toFixed(1)}x</StudioChip>
                                        </div>
                                        <input
                                            type="range"
                                            min={1}
                                            max={5}
                                            step={0.1}
                                            value={zoom}
                                            onChange={(event) => setZoom(Number(event.target.value))}
                                            className="mt-3 w-full"
                                        />
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Rotación</label>
                                            <StudioChip accentColor={ACCENT} active>{rotation}°</StudioChip>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={360}
                                            step={1}
                                            value={rotation}
                                            onChange={(event) => setRotation(Number(event.target.value))}
                                            className="mt-3 w-full"
                                        />
                                    </div>
                                </div>
                            </StudioCard>

                            <StudioCard
                                title="Preview de salida"
                                description="La tarjeta usa un fondo checkerboard para revisar bordes y transparencia del PNG."
                                eyebrow="Exportación"
                                accentColor={ACCENT}
                            >
                                <StudioStage
                                    title="Último recorte"
                                    subtitle={croppedUrl ? "Listo para descargar" : "Genera una exportación para revisar el resultado"}
                                    accentColor={ACCENT}
                                    badge={croppedUrl ? "PNG" : undefined}
                                    checkerboard
                                >
                                    {croppedUrl ? (
                                        <img src={croppedUrl} alt="Recorte exportado" className="max-h-[320px] w-full rounded-2xl object-contain" />
                                    ) : (
                                        <div className="flex min-h-[240px] w-full flex-col items-center justify-center text-center">
                                            <p className="text-sm text-neutral-500">Tu resultado aparecerá aquí cuando exportes.</p>
                                        </div>
                                    )}
                                </StudioStage>

                                <div className="mt-4 space-y-3">
                                    <button
                                        onClick={handleCrop}
                                        disabled={isCropping || !croppedAreaPixels}
                                        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${ACCENT}, #F472B6)` }}
                                    >
                                        {isCropping ? "Exportando recorte..." : "Generar recorte"}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={!croppedUrl}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Descargar PNG
                                    </button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleResetCrop}
                                            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-300 transition-all hover:bg-white/5"
                                        >
                                            Resetear encuadre
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-300 transition-all hover:bg-white/5"
                                        >
                                            Otra imagen
                                        </button>
                                    </div>
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
