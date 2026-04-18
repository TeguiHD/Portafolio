"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { StudioCard, StudioChip, StudioMetric, StudioStage } from "@/components/tools/ImageStudio";
import {
    canvasToObjectUrl,
    fillCanvasSurface,
    loadImageSource,
    revokeObjectUrl,
    sanitizeFileBaseName,
    triggerDownload,
    type StageFill,
} from "@/lib/tools/image-processing";

const ACCENT = "#10B981";
const PREVIEW_MAX_EDGE = 760;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

type ProcessingState = "idle" | "loading-model" | "processing" | "done" | "error";
type BackgroundPresetId = "transparent" | "porcelain" | "charcoal" | "studio" | "custom";
type BrushMode = "erase" | "restore";
type PreviewMode = "result" | "mask";

interface BrushPoint {
    x: number;
    y: number;
}

interface EditorStats {
    width: number;
    height: number;
    coverage: number;
}

const BACKGROUND_PRESETS: Array<{
    id: BackgroundPresetId;
    label: string;
    description: string;
    fill: StageFill | null;
}> = [
    {
        id: "transparent",
        label: "Transparente",
        description: "Mantiene el PNG listo para diseño o edición posterior.",
        fill: null,
    },
    {
        id: "porcelain",
        label: "Claro",
        description: "Fondo claro para catálogo y producto.",
        fill: { type: "solid", color: "#F8F5EF" },
    },
    {
        id: "charcoal",
        label: "Oscuro",
        description: "Fondo oscuro para contraste o presentación.",
        fill: { type: "solid", color: "#0B1220" },
    },
    {
        id: "studio",
        label: "Degradado",
        description: "Degradado suave para retrato, portada o mockup.",
        fill: { type: "gradient", from: "#FEF3C7", to: "#DBEAFE", direction: "diagonal" },
    },
    {
        id: "custom",
        label: "Personalizado",
        description: "Usa un color exacto para la salida final.",
        fill: null,
    },
];

function cloneImageData(imageData: ImageData) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function calculateMaskCoverage(maskData: Uint8ClampedArray) {
    let alphaSum = 0;

    for (let index = 3; index < maskData.length; index += 4) {
        alphaSum += maskData[index];
    }

    const totalPixels = maskData.length / 4;
    return Math.round((alphaSum / (totalPixels * 255)) * 100);
}

function getBackgroundFill(backgroundPreset: BackgroundPresetId, customBackground: string): StageFill | undefined {
    if (backgroundPreset === "transparent") {
        return undefined;
    }

    if (backgroundPreset === "custom") {
        return { type: "solid", color: customBackground };
    }

    return BACKGROUND_PRESETS.find(option => option.id === backgroundPreset)?.fill ?? undefined;
}

function getPreviewDimensions(width: number, height: number) {
    const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(width, height));

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

function dataUrlToBlob(dataUrl: string) {
    const [header, payload] = dataUrl.split(",", 2);

    if (!header || !payload) {
        throw new Error("La imagen cargada no tiene un formato válido");
    }

    const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
}

function createMaskCanvasFromResult(resultImage: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = resultImage.naturalWidth;
    canvas.height = resultImage.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
        throw new Error("No se pudo preparar la máscara del recorte");
    }

    context.drawImage(resultImage, 0, 0);
    const resultImageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const maskImageData = context.createImageData(canvas.width, canvas.height);

    for (let index = 0; index < resultImageData.data.length; index += 4) {
        const alpha = resultImageData.data[index + 3];
        maskImageData.data[index] = 255;
        maskImageData.data[index + 1] = 255;
        maskImageData.data[index + 2] = 255;
        maskImageData.data[index + 3] = alpha;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.putImageData(maskImageData, 0, 0);

    return {
        canvas,
        snapshot: cloneImageData(maskImageData),
    };
}

function stampBrush(
    context: CanvasRenderingContext2D,
    point: BrushPoint,
    brushSize: number,
    brushStrength: number,
    brushMode: BrushMode
) {
    const radius = Math.max(6, brushSize / 2);
    const opacity = Math.min(1, Math.max(0.05, brushStrength / 100));
    const gradient = context.createRadialGradient(point.x, point.y, radius * 0.18, point.x, point.y, radius);
    const colorBase = brushMode === "restore" ? "255,255,255" : "0,0,0";

    gradient.addColorStop(0, `rgba(${colorBase},${opacity})`);
    gradient.addColorStop(0.55, `rgba(${colorBase},${opacity * 0.72})`);
    gradient.addColorStop(1, `rgba(${colorBase},0)`);

    context.save();
    context.globalCompositeOperation = brushMode === "restore" ? "source-over" : "destination-out";
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function paintBrushStroke(
    maskCanvas: HTMLCanvasElement,
    from: BrushPoint,
    to: BrushPoint,
    brushSize: number,
    brushStrength: number,
    brushMode: BrushMode
) {
    const context = maskCanvas.getContext("2d");

    if (!context) {
        return;
    }

    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const distance = Math.hypot(deltaX, deltaY);
    const step = Math.max(1, brushSize * 0.22);
    const steps = Math.max(1, Math.ceil(distance / step));

    for (let stepIndex = 0; stepIndex <= steps; stepIndex += 1) {
        const progress = stepIndex / steps;
        stampBrush(
            context,
            {
                x: from.x + deltaX * progress,
                y: from.y + deltaY * progress,
            },
            brushSize,
            brushStrength,
            brushMode
        );
    }
}

function renderPreviewCanvas({
    previewCanvas,
    originalImage,
    maskCanvas,
    background,
    previewMode,
}: {
    previewCanvas: HTMLCanvasElement;
    originalImage: HTMLImageElement;
    maskCanvas: HTMLCanvasElement;
    background?: StageFill;
    previewMode: PreviewMode;
}) {
    const { width, height } = getPreviewDimensions(maskCanvas.width, maskCanvas.height);
    const pixelRatio = window.devicePixelRatio || 1;
    previewCanvas.width = Math.max(1, Math.round(width * pixelRatio));
    previewCanvas.height = Math.max(1, Math.round(height * pixelRatio));
    previewCanvas.style.width = `${width}px`;
    previewCanvas.style.height = `${height}px`;

    const context = previewCanvas.getContext("2d");

    if (!context) {
        throw new Error("No se pudo preparar el editor visual");
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    if (previewMode === "mask") {
        context.fillStyle = "#020817";
        context.fillRect(0, 0, width, height);
        context.drawImage(maskCanvas, 0, 0, width, height);
        return;
    }

    if (background) {
        fillCanvasSurface(context, width, height, background);
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext("2d");

    if (!tempContext) {
        throw new Error("No se pudo componer la vista previa");
    }

    tempContext.drawImage(originalImage, 0, 0, width, height);
    tempContext.globalCompositeOperation = "destination-in";
    tempContext.drawImage(maskCanvas, 0, 0, width, height);
    tempContext.globalCompositeOperation = "source-over";

    context.drawImage(tempCanvas, 0, 0);
}

async function exportTransparentResult(originalImage: HTMLImageElement, maskCanvas: HTMLCanvasElement) {
    const canvas = document.createElement("canvas");
    canvas.width = maskCanvas.width;
    canvas.height = maskCanvas.height;
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("No se pudo exportar el recorte");
    }

    context.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(maskCanvas, 0, 0);
    context.globalCompositeOperation = "source-over";

    return canvasToObjectUrl(canvas, "image/png", 1);
}

export default function BackgroundRemoverPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("quitar-fondo");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [compositedUrl, setCompositedUrl] = useState<string | null>(null);
    const [state, setState] = useState<ProcessingState>("idle");
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("Esperando imagen");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [backgroundPreset, setBackgroundPreset] = useState<BackgroundPresetId>("transparent");
    const [customBackground, setCustomBackground] = useState("#E2E8F0");
    const [brushMode, setBrushMode] = useState<BrushMode>("erase");
    const [previewMode, setPreviewMode] = useState<PreviewMode>("result");
    const [brushSize, setBrushSize] = useState(34);
    const [brushStrength, setBrushStrength] = useState(82);
    const [editorStats, setEditorStats] = useState<EditorStats | null>(null);
    const [hasManualEdits, setHasManualEdits] = useState(false);
    const resultUrlRef = useRef<string | null>(null);
    const compositedUrlRef = useRef<string | null>(null);
    const editorCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);
    const initialMaskDataRef = useRef<ImageData | null>(null);
    const isPaintingRef = useRef(false);
    const lastPointRef = useRef<BrushPoint | null>(null);

    useEffect(() => {
        return () => {
            revokeObjectUrl(resultUrlRef.current);
            revokeObjectUrl(compositedUrlRef.current);
        };
    }, []);

    const updateEditorStats = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;

        if (!maskCanvas) {
            setEditorStats(null);
            return;
        }

        const context = maskCanvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
            return;
        }

        const maskData = context.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
        setEditorStats({
            width: maskCanvas.width,
            height: maskCanvas.height,
            coverage: calculateMaskCoverage(maskData),
        });
    }, []);

    const renderEditorPreview = useCallback(() => {
        const previewCanvas = editorCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const originalImage = originalImageRef.current;

        if (!previewCanvas || !maskCanvas || !originalImage) {
            return;
        }

        renderPreviewCanvas({
            previewCanvas,
            originalImage,
            maskCanvas,
            background: previewMode === "result" ? getBackgroundFill(backgroundPreset, customBackground) : undefined,
            previewMode,
        });
    }, [backgroundPreset, customBackground, previewMode]);

    const syncTransparentPreview = useCallback(async () => {
        const maskCanvas = maskCanvasRef.current;
        const originalImage = originalImageRef.current;

        if (!maskCanvas || !originalImage) {
            return;
        }

        const nextUrl = await exportTransparentResult(originalImage, maskCanvas);
        revokeObjectUrl(resultUrlRef.current);
        resultUrlRef.current = nextUrl;
        setResultUrl(nextUrl);
        updateEditorStats();
    }, [updateEditorStats]);

    useEffect(() => {
        renderEditorPreview();
    }, [renderEditorPreview, resultUrl, editorStats]);

    useEffect(() => {
        if (!resultUrl) {
            revokeObjectUrl(compositedUrlRef.current);
            compositedUrlRef.current = null;
            setCompositedUrl(null);
            return;
        }

        const backgroundFill = getBackgroundFill(backgroundPreset, customBackground);
        if (!backgroundFill) {
            revokeObjectUrl(compositedUrlRef.current);
            compositedUrlRef.current = null;
            setCompositedUrl(null);
            return;
        }

        let isActive = true;

        const buildCompositePreview = async () => {
            const subject = await loadImageSource(resultUrl);
            const canvas = document.createElement("canvas");
            canvas.width = subject.naturalWidth;
            canvas.height = subject.naturalHeight;
            const context = canvas.getContext("2d");

            if (!context) {
                throw new Error("No se pudo preparar la composición");
            }

            fillCanvasSurface(context, canvas.width, canvas.height, backgroundFill);
            context.drawImage(subject, 0, 0);

            const previewUrl = await canvasToObjectUrl(canvas, "image/png", 1);
            if (!isActive) {
                revokeObjectUrl(previewUrl);
                return;
            }

            revokeObjectUrl(compositedUrlRef.current);
            compositedUrlRef.current = previewUrl;
            setCompositedUrl(previewUrl);
        };

        buildCompositePreview().catch(() => {
            if (isActive) {
                setErrorMsg("No se pudo generar la vista previa con fondo.");
            }
        });

        return () => {
            isActive = false;
        };
    }, [backgroundPreset, customBackground, resultUrl]);

    const resetEditorState = useCallback(() => {
        maskCanvasRef.current = null;
        originalImageRef.current = null;
        initialMaskDataRef.current = null;
        isPaintingRef.current = false;
        lastPointRef.current = null;
        setPreviewMode("result");
        setBrushMode("erase");
        setBrushSize(34);
        setBrushStrength(82);
        setEditorStats(null);
        setHasManualEdits(false);
    }, []);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setResultUrl(null);
        setCompositedUrl(null);
        setState("idle");
        setErrorMsg(null);
        setProgress(0);
        setProgressLabel("Imagen cargada. Lista para procesar.");
        setBackgroundPreset("transparent");
        revokeObjectUrl(resultUrlRef.current);
        revokeObjectUrl(compositedUrlRef.current);
        resultUrlRef.current = null;
        compositedUrlRef.current = null;
        resetEditorState();

        void loadImageSource(dataUrl).then((image) => {
            originalImageRef.current = image;
        }).catch(() => {
            originalImageRef.current = null;
        });
    }, [resetEditorState]);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setResultUrl(null);
        setCompositedUrl(null);
        setState("idle");
        setErrorMsg(null);
        setProgress(0);
        setProgressLabel("Esperando imagen");
        setBackgroundPreset("transparent");
        revokeObjectUrl(resultUrlRef.current);
        revokeObjectUrl(compositedUrlRef.current);
        resultUrlRef.current = null;
        compositedUrlRef.current = null;
        resetEditorState();
    }, [resetEditorState]);

    const initializeEditorFromResult = useCallback(async (transparentUrl: string) => {
        if (!sourceImage) {
            return;
        }

        const [originalImage, resultImage] = await Promise.all([
            loadImageSource(sourceImage),
            loadImageSource(transparentUrl),
        ]);

        originalImageRef.current = originalImage;
        const { canvas, snapshot } = createMaskCanvasFromResult(resultImage);
        maskCanvasRef.current = canvas;
        initialMaskDataRef.current = cloneImageData(snapshot);
        setHasManualEdits(false);
        updateEditorStats();
        await syncTransparentPreview();
    }, [sourceImage, syncTransparentPreview, updateEditorStats]);

    const handleRemoveBackground = useCallback(async () => {
        if (!sourceImage) {
            return;
        }

        setState("loading-model");
        setProgress(0);
        setProgressLabel("Cargando motor local...");
        setErrorMsg(null);
        setResultUrl(null);
        setCompositedUrl(null);
        revokeObjectUrl(resultUrlRef.current);
        revokeObjectUrl(compositedUrlRef.current);
        resultUrlRef.current = null;
        compositedUrlRef.current = null;
        resetEditorState();

        try {
            const { removeBackground } = await import("@imgly/background-removal");
            setState("processing");
            setProgressLabel("Preparando imagen...");
            const inputBlob = sourceFile ?? dataUrlToBlob(sourceImage);

            const resultBlob = await removeBackground(inputBlob, {
                progress: (key: string, current: number, total: number) => {
                    const labels: Record<string, string> = {
                        "compute:decode": "Leyendo imagen",
                        "compute:inference": "Detectando sujeto",
                        "compute:mask": "Generando máscara",
                        "compute:encode": "Preparando PNG",
                    };

                    setProgressLabel(labels[key] ?? "Procesando imagen...");

                    if (total > 0) {
                        setProgress(Math.round((current / total) * 100));
                    }
                },
            });

            const tempUrl = URL.createObjectURL(resultBlob);

            try {
                await initializeEditorFromResult(tempUrl);
            } finally {
                URL.revokeObjectURL(tempUrl);
            }

            setState("done");
            setProgress(100);
            setProgressLabel("Recorte automático listo. Puedes refinarlo en el canvas.");
        } catch (processingError) {
            setState("error");
            setErrorMsg(processingError instanceof Error ? processingError.message : "Error al procesar la imagen");
        }
    }, [initializeEditorFromResult, resetEditorState, sourceFile, sourceImage]);

    const getMaskPointFromEvent = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        const maskCanvas = maskCanvasRef.current;

        if (!maskCanvas) {
            return null;
        }

        const bounds = event.currentTarget.getBoundingClientRect();

        if (bounds.width === 0 || bounds.height === 0) {
            return null;
        }

        return {
            x: ((event.clientX - bounds.left) / bounds.width) * maskCanvas.width,
            y: ((event.clientY - bounds.top) / bounds.height) * maskCanvas.height,
        } satisfies BrushPoint;
    }, []);

    const applyBrushStroke = useCallback((from: BrushPoint, to: BrushPoint) => {
        const maskCanvas = maskCanvasRef.current;

        if (!maskCanvas) {
            return;
        }

        paintBrushStroke(maskCanvas, from, to, brushSize, brushStrength, brushMode);
        renderEditorPreview();
    }, [brushMode, brushSize, brushStrength, renderEditorPreview]);

    const finishBrushStroke = useCallback(async (event?: React.PointerEvent<HTMLCanvasElement>) => {
        if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (!isPaintingRef.current) {
            return;
        }

        isPaintingRef.current = false;
        lastPointRef.current = null;
        await syncTransparentPreview();
    }, [syncTransparentPreview]);

    const handleEditorPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        if (state !== "done") {
            return;
        }

        const point = getMaskPointFromEvent(event);

        if (!point) {
            return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        isPaintingRef.current = true;
        lastPointRef.current = point;
        setHasManualEdits(true);
        setErrorMsg(null);
        applyBrushStroke(point, point);
    }, [applyBrushStroke, getMaskPointFromEvent, state]);

    const handleEditorPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPaintingRef.current) {
            return;
        }

        const point = getMaskPointFromEvent(event);

        if (!point || !lastPointRef.current) {
            return;
        }

        event.preventDefault();
        applyBrushStroke(lastPointRef.current, point);
        lastPointRef.current = point;
    }, [applyBrushStroke, getMaskPointFromEvent]);

    const handleResetMask = useCallback(async () => {
        const maskCanvas = maskCanvasRef.current;
        const initialMask = initialMaskDataRef.current;

        if (!maskCanvas || !initialMask) {
            return;
        }

        const context = maskCanvas.getContext("2d");

        if (!context) {
            return;
        }

        context.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        context.putImageData(cloneImageData(initialMask), 0, 0);
        setHasManualEdits(false);
        renderEditorPreview();
        await syncTransparentPreview();
    }, [renderEditorPreview, syncTransparentPreview]);

    const handleTransparentDownload = useCallback(() => {
        if (!resultUrl || !sourceFile) {
            return;
        }

        triggerDownload(resultUrl, `${sanitizeFileBaseName(sourceFile.name)}_sin_fondo.png`);
    }, [resultUrl, sourceFile]);

    const handleCompositeDownload = useCallback(() => {
        if (!compositedUrl || !sourceFile) {
            return;
        }

        triggerDownload(compositedUrl, `${sanitizeFileBaseName(sourceFile.name)}_fondo_compuesto.png`);
    }, [compositedUrl, sourceFile]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Quitar Fondo"} />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#154532_0%,#0F1724_38%,#08111f_100%)]">
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
                <div className="mb-8 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Quitar fondo</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Quitar fondo con ajuste manual sobre canvas</h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                        El recorte automático se procesa en tu navegador y luego puedes refinarlo con pincel para borrar restos o restaurar bordes antes de exportar.
                    </p>
                </div>

                <StudioCard
                    title="Sube tu imagen"
                    description="El motor corre en local con el flujo de IMG.LY para segmentación en navegador. Luego puedes revisar y corregir la máscara manualmente."
                    eyebrow="Procesamiento local"
                    accentColor={ACCENT}
                >
                    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                        <ImageDropzone
                            onImageLoad={handleImageLoad}
                            currentImage={sourceImage}
                            onClear={handleClear}
                            accentColor={ACCENT}
                            label="Arrastra la imagen para recortar el fondo"
                            sublabel="PNG, JPG, WebP · 20 MB máx. · procesamiento local"
                            maxSize={MAX_IMAGE_SIZE}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <StudioMetric label="Salida" value="PNG transparente" accentColor={ACCENT} />
                            <StudioMetric label="Edición" value="Pincel sobre máscara" accentColor={ACCENT} />
                            <StudioMetric label="Modo" value="En navegador" accentColor={ACCENT} />
                            <StudioMetric label="Ideal para" value="Producto y retrato" accentColor={ACCENT} />
                        </div>
                    </div>
                </StudioCard>

                {sourceImage && (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <StudioCard
                            title="Comparativa y ajuste"
                            description="El panel derecho ya es editable. Arrastra sobre el canvas para quitar restos o restaurar zonas del sujeto."
                            eyebrow="Canvas"
                            accentColor={ACCENT}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <StudioStage title="Original" subtitle="Referencia completa" accentColor={ACCENT}>
                                    <img src={sourceImage} alt="Original" className="max-h-[360px] w-full rounded-2xl object-contain" />
                                </StudioStage>
                                <StudioStage
                                    title={previewMode === "result" ? "Resultado editable" : "Máscara editable"}
                                    subtitle={resultUrl ? (previewMode === "result" ? "Pinta para quitar o restaurar" : "Vista de la máscara alfa") : "Esperando ejecución"}
                                    accentColor={ACCENT}
                                    badge={resultUrl ? (hasManualEdits ? "ajustado" : "automático") : undefined}
                                    checkerboard={previewMode === "result" && backgroundPreset === "transparent"}
                                >
                                    {resultUrl ? (
                                        <div className="flex w-full flex-col items-center gap-3">
                                            <canvas
                                                ref={editorCanvasRef}
                                                onPointerDown={handleEditorPointerDown}
                                                onPointerMove={handleEditorPointerMove}
                                                onPointerUp={(event) => { void finishBrushStroke(event); }}
                                                onPointerCancel={(event) => { void finishBrushStroke(event); }}
                                                className="max-w-full rounded-2xl border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.38)]"
                                                style={{
                                                    cursor: brushMode === "erase" ? "crosshair" : "copy",
                                                    touchAction: "none",
                                                }}
                                            />
                                            <p className="text-center text-xs text-neutral-500">
                                                {previewMode === "result"
                                                    ? "Pinta directamente sobre el canvas para corregir el recorte."
                                                    : "Cambia a vista de resultado para revisar la composición final."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex h-full min-h-[260px] w-full flex-col items-center justify-center text-center">
                                            {(state === "loading-model" || state === "processing") && (
                                                <>
                                                    <div className="mb-4 h-11 w-11 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                                                    <p className="text-sm font-medium" style={{ color: ACCENT }}>
                                                        {progressLabel}
                                                    </p>
                                                    <div className="mt-3 h-2 w-56 overflow-hidden rounded-full bg-white/10">
                                                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: ACCENT }} />
                                                    </div>
                                                </>
                                            )}
                                            {state === "idle" && <p className="text-sm text-neutral-500">Ejecuta el recorte para crear la máscara editable.</p>}
                                            {state === "error" && <p className="max-w-sm text-sm text-red-300">{errorMsg}</p>}
                                        </div>
                                    )}
                                </StudioStage>
                            </div>
                        </StudioCard>

                        <div className="space-y-6">
                            {resultUrl && editorStats && (
                                <StudioCard
                                    title="Refinar máscara"
                                    description="Usa el pincel para limpiar bordes difíciles, cabellos o zonas mal detectadas por el recorte automático."
                                    eyebrow="Editor"
                                    accentColor={ACCENT}
                                >
                                    <div className="grid grid-cols-2 gap-3">
                                        <StudioMetric label="Resolución" value={`${editorStats.width} × ${editorStats.height}`} accentColor={ACCENT} />
                                        <StudioMetric label="Cobertura" value={`${editorStats.coverage}% visible`} accentColor={ACCENT} />
                                        <StudioMetric label="Pincel" value={`${brushSize}px`} accentColor={ACCENT} />
                                        <StudioMetric label="Modo" value={brushMode === "erase" ? "Quitar" : "Restaurar"} accentColor={ACCENT} />
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        {([
                                            { id: "erase", label: "Quitar restos" },
                                            { id: "restore", label: "Restaurar sujeto" },
                                        ] as const).map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => setBrushMode(option.id)}
                                                className="rounded-2xl border px-4 py-3 text-left transition-all"
                                                style={brushMode === option.id
                                                    ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                    : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-white">{option.label}</p>
                                                    <StudioChip accentColor={ACCENT} active={brushMode === option.id}>{brushMode === option.id ? "activo" : "modo"}</StudioChip>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Tamaño del pincel</label>
                                            <span className="font-mono text-sm text-emerald-300">{brushSize}px</span>
                                        </div>
                                        <input type="range" min={12} max={140} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} className="mt-3 w-full" />
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Intensidad</label>
                                            <span className="font-mono text-sm text-emerald-300">{brushStrength}%</span>
                                        </div>
                                        <input type="range" min={20} max={100} value={brushStrength} onChange={(event) => setBrushStrength(Number(event.target.value))} className="mt-3 w-full" />
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        {([
                                            { id: "result", label: "Vista resultado" },
                                            { id: "mask", label: "Vista máscara" },
                                        ] as const).map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => setPreviewMode(option.id)}
                                                className="rounded-2xl border px-4 py-3 text-left transition-all"
                                                style={previewMode === option.id
                                                    ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                    : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-white">{option.label}</p>
                                                    <StudioChip accentColor={ACCENT} active={previewMode === option.id}>{previewMode === option.id ? "activa" : "vista"}</StudioChip>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => { void handleResetMask(); }}
                                        disabled={!hasManualEdits}
                                        className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Restablecer máscara automática
                                    </button>
                                </StudioCard>
                            )}

                            <StudioCard
                                title="Fondo de salida"
                                description="Puedes dejar transparencia o preparar una composición directa para catálogo, portada o ficha de producto."
                                eyebrow="Fondo"
                                accentColor={ACCENT}
                            >
                                <div className="grid gap-3">
                                    {BACKGROUND_PRESETS.map(option => {
                                        const active = backgroundPreset === option.id;

                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => setBackgroundPreset(option.id)}
                                                className="rounded-2xl border px-4 py-3 text-left transition-all hover:border-white/20"
                                                style={active
                                                    ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                    : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{option.label}</p>
                                                        <p className="mt-1 text-xs leading-5 text-neutral-500">{option.description}</p>
                                                    </div>
                                                    <StudioChip accentColor={ACCENT} active={active}>{active ? "activo" : "fondo"}</StudioChip>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {backgroundPreset === "custom" && (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <label className="block text-sm font-medium text-white">Color de fondo</label>
                                        <div className="mt-3 flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={customBackground}
                                                onChange={(event) => setCustomBackground(event.target.value)}
                                                className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent"
                                            />
                                            <span className="font-mono text-sm text-neutral-400">{customBackground.toUpperCase()}</span>
                                        </div>
                                    </div>
                                )}
                            </StudioCard>

                            <StudioCard
                                title="Acciones"
                                description="Primero genera el recorte automático; después puedes ajustarlo en el canvas y exportar transparente o con fondo."
                                eyebrow="Salida"
                                accentColor={ACCENT}
                            >
                                <div className="space-y-3">
                                    <button
                                        onClick={() => { void handleRemoveBackground(); }}
                                        disabled={state === "loading-model" || state === "processing"}
                                        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${ACCENT}, #34D399)` }}
                                    >
                                        {state === "loading-model" || state === "processing"
                                            ? progressLabel
                                            : resultUrl
                                                ? "Reprocesar recorte automático"
                                                : "Quitar fondo"}
                                    </button>
                                    <button
                                        onClick={handleTransparentDownload}
                                        disabled={!resultUrl}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Descargar PNG transparente
                                    </button>
                                    <button
                                        onClick={handleCompositeDownload}
                                        disabled={!compositedUrl}
                                        className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                                        style={{ borderColor: `${ACCENT}40`, color: "white", backgroundColor: `${ACCENT}16` }}
                                    >
                                        Descargar composición con fondo
                                    </button>
                                    <button
                                        onClick={handleClear}
                                        className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-300 transition-all hover:bg-white/5"
                                    >
                                        Empezar otra imagen
                                    </button>
                                </div>
                            </StudioCard>
                        </div>
                    </div>
                )}

                {errorMsg && state !== "error" && (
                    <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                        {errorMsg}
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
