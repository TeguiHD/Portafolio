"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

const ACCENT = "#F97316";

type WatermarkPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tile";
type WatermarkMode = "text" | "logo";

const POSITIONS: { id: WatermarkPosition; name: string }[] = [
    { id: "center", name: "Centro" },
    { id: "top-left", name: "↖ Arriba-izq" },
    { id: "top-right", name: "↗ Arriba-der" },
    { id: "bottom-left", name: "↙ Abajo-izq" },
    { id: "bottom-right", name: "↘ Abajo-der" },
    { id: "tile", name: "🔁 Mosaico" },
];

function getPlacement(
    canvasWidth: number,
    canvasHeight: number,
    elementWidth: number,
    elementHeight: number,
    position: Exclude<WatermarkPosition, "tile">
) {
    const padding = Math.max(24, Math.round(Math.min(canvasWidth, canvasHeight) * 0.035));

    switch (position) {
        case "top-left":
            return { x: padding, y: padding };
        case "top-right":
            return { x: canvasWidth - padding - elementWidth, y: padding };
        case "bottom-left":
            return { x: padding, y: canvasHeight - padding - elementHeight };
        case "bottom-right":
            return { x: canvasWidth - padding - elementWidth, y: canvasHeight - padding - elementHeight };
        default:
            return { x: (canvasWidth - elementWidth) / 2, y: (canvasHeight - elementHeight) / 2 };
    }
}

export default function WatermarkPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("marca-agua");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [mode, setMode] = useState<WatermarkMode>("text");
    const [text, setText] = useState("© Tu Marca");
    const [fontSize, setFontSize] = useState(32);
    const [opacity, setOpacity] = useState(40);
    const [color, setColor] = useState("#ffffff");
    const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
    const [rotation, setRotation] = useState(-12);
    const [spacing, setSpacing] = useState(160);
    const [logoImage, setLogoImage] = useState<string | null>(null);
    const [logoScale, setLogoScale] = useState(22);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isRenderingPreview, setIsRenderingPreview] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const resultUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            revokeObjectUrl(resultUrlRef.current);
        };
    }, []);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setError(null);
    }, []);

    const handleLogoLoad = useCallback((_file: File, dataUrl: string) => {
        setLogoImage(dataUrl);
        setError(null);
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setLogoImage(null);
        setError(null);
        setResultUrl(null);
        revokeObjectUrl(resultUrlRef.current);
        resultUrlRef.current = null;
    }, []);

    useEffect(() => {
        if (!sourceImage || !canvasRef.current) {
            setResultUrl(null);
            return;
        }

        if (mode === "text" && !text.trim()) {
            setResultUrl(null);
            return;
        }

        if (mode === "logo" && !logoImage) {
            setResultUrl(null);
            return;
        }

        let isActive = true;

        const renderPreview = async () => {
            setIsRenderingPreview(true);
            setError(null);

            try {
                const image = await loadImageSource(sourceImage);
                const logo = mode === "logo" && logoImage ? await loadImageSource(logoImage) : null;
                const canvas = canvasRef.current;

                if (!canvas) return;

                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("No se pudo inicializar la previsualización");
                }

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);
                context.globalAlpha = opacity / 100;

                if (mode === "text") {
                    const sanitizedText = text.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, "").slice(0, 200);
                    context.fillStyle = color;
                    context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
                    context.textBaseline = "middle";
                    context.textAlign = "center";

                    if (position === "tile") {
                        const metrics = context.measureText(sanitizedText);
                        const tileWidth = metrics.width + spacing;
                        const tileHeight = fontSize + spacing * 0.5;

                        context.save();
                        context.translate(canvas.width / 2, canvas.height / 2);
                        context.rotate((rotation * Math.PI) / 180);
                        context.translate(-canvas.width / 2, -canvas.height / 2);

                        for (let y = -canvas.height; y < canvas.height * 2; y += tileHeight) {
                            for (let x = -canvas.width; x < canvas.width * 2; x += tileWidth) {
                                context.fillText(sanitizedText, x, y);
                            }
                        }
                        context.restore();
                    } else {
                        const metrics = context.measureText(sanitizedText);
                        const placement = getPlacement(canvas.width, canvas.height, metrics.width, fontSize, position);

                        context.save();
                        context.translate(placement.x + metrics.width / 2, placement.y + fontSize / 2);
                        context.rotate((rotation * Math.PI) / 180);
                        context.fillText(sanitizedText, 0, 0);
                        context.restore();
                    }
                } else if (logo) {
                    const logoWidth = Math.max(48, Math.round(canvas.width * (logoScale / 100)));
                    const logoHeight = Math.round((logoWidth / logo.naturalWidth) * logo.naturalHeight);

                    if (position === "tile") {
                        context.save();
                        context.translate(canvas.width / 2, canvas.height / 2);
                        context.rotate((rotation * Math.PI) / 180);
                        context.translate(-canvas.width / 2, -canvas.height / 2);

                        for (let y = -canvas.height; y < canvas.height * 2; y += logoHeight + spacing) {
                            for (let x = -canvas.width; x < canvas.width * 2; x += logoWidth + spacing) {
                                context.drawImage(logo, x, y, logoWidth, logoHeight);
                            }
                        }
                        context.restore();
                    } else {
                        const placement = getPlacement(canvas.width, canvas.height, logoWidth, logoHeight, position);

                        context.save();
                        context.translate(placement.x + logoWidth / 2, placement.y + logoHeight / 2);
                        context.rotate((rotation * Math.PI) / 180);
                        context.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
                        context.restore();
                    }
                }

                context.globalAlpha = 1;

                const previewUrl = await canvasToObjectUrl(canvas, "image/png", 1);
                if (!isActive) {
                    revokeObjectUrl(previewUrl);
                    return;
                }

                revokeObjectUrl(resultUrlRef.current);
                resultUrlRef.current = previewUrl;
                setResultUrl(previewUrl);
            } catch (renderError) {
                if (isActive) {
                    setError(renderError instanceof Error ? renderError.message : "No se pudo renderizar la marca de agua");
                }
            } finally {
                if (isActive) {
                    setIsRenderingPreview(false);
                }
            }
        };

        renderPreview();

        return () => {
            isActive = false;
        };
    }, [color, fontSize, logoImage, logoScale, mode, opacity, position, rotation, sourceImage, spacing, text]);

    const handleDownload = useCallback(() => {
        if (!resultUrl || !sourceFile) return;
        triggerDownload(resultUrl, `${sanitizeFileBaseName(sourceFile.name)}_watermark.png`);
    }, [resultUrl, sourceFile]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Marca de Agua"} />;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#5b2a0c_0%,#0F1724_42%,#08111f_100%)]">
            <canvas ref={canvasRef} className="hidden" />
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
                <div className="mb-8 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">Marca de agua</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Marca de agua con texto o logo</h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                        Previsualiza en tiempo real texto o logotipo antes de exportar. El PNG final replica el resultado que ves en pantalla.
                    </p>
                </div>

                <StudioCard
                    title="Imagen base"
                    description="Sube la imagen principal y, si quieres, un logotipo para usarlo como marca de agua visual."
                    eyebrow="Entrada"
                    accentColor={ACCENT}
                >
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <ImageDropzone
                            onImageLoad={handleImageLoad}
                            currentImage={sourceImage}
                            onClear={handleClear}
                            accentColor={ACCENT}
                            label="Arrastra la imagen a proteger"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <StudioMetric label="Modo" value={mode === "text" ? "Texto" : "Logo"} accentColor={ACCENT} />
                            <StudioMetric label="Vista previa" value={isRenderingPreview ? "actualizando" : "lista"} accentColor={ACCENT} />
                            <StudioMetric label="Exportación" value="PNG" accentColor={ACCENT} />
                            <StudioMetric label="Composición" value="Texto o logotipo" accentColor={ACCENT} />
                        </div>
                    </div>
                </StudioCard>

                {sourceImage && (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <StudioCard
                            title="Comparativa"
                            description="La derecha muestra la composición final con la marca aplicada."
                            eyebrow="Preview"
                            accentColor={ACCENT}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <StudioStage title="Original" subtitle="Sin marca" accentColor={ACCENT}>
                                    <img src={sourceImage} alt="Original" className="max-h-[360px] w-full rounded-2xl object-contain" />
                                </StudioStage>
                                <StudioStage title="Salida final" subtitle="Vista previa" accentColor={ACCENT} badge={mode === "text" ? "texto" : "logo"}>
                                    {resultUrl ? (
                                        <img src={resultUrl} alt="Imagen con marca" className="max-h-[360px] w-full rounded-2xl object-contain" />
                                    ) : (
                                        <div className="flex min-h-[260px] w-full flex-col items-center justify-center text-center">
                                            {isRenderingPreview ? (
                                                <>
                                                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                                                    <p className="text-sm text-orange-300">Actualizando vista previa...</p>
                                                </>
                                            ) : (
                                                <p className="text-sm text-neutral-500">Define texto o sube un logo para activar la vista previa.</p>
                                            )}
                                        </div>
                                    )}
                                </StudioStage>
                            </div>
                        </StudioCard>

                        <div className="space-y-6">
                            <StudioCard
                                title="Tipo de marca"
                                description="Alterna entre marca textual o sello gráfico."
                                eyebrow="Modo"
                                accentColor={ACCENT}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    {(["text", "logo"] as const).map(item => (
                                        <button
                                            key={item}
                                            onClick={() => setMode(item)}
                                            className="rounded-2xl border px-4 py-3 text-left transition-all"
                                            style={mode === item
                                                ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                        >
                                            <p className="text-sm font-semibold text-white">{item === "text" ? "Texto" : "Logo"}</p>
                                            <p className="mt-1 text-xs text-neutral-500">{item === "text" ? "Texto sobre la imagen" : "Logotipo con transparencia"}</p>
                                        </button>
                                    ))}
                                </div>

                                {mode === "text" ? (
                                    <div className="mt-4 space-y-4">
                                        <label className="block rounded-2xl border border-white/10 bg-black/20 p-4">
                                            <span className="mb-2 block text-sm font-medium text-white">Texto</span>
                                            <input
                                                type="text"
                                                value={text}
                                                maxLength={200}
                                                onChange={(event) => setText(event.target.value)}
                                                className="w-full bg-transparent text-white outline-none"
                                                placeholder="© Tu Marca"
                                            />
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <label className="text-sm font-medium text-white">Tamaño</label>
                                                    <span className="font-mono text-sm text-orange-300">{fontSize}px</span>
                                                </div>
                                                <input type="range" min={12} max={120} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-3 w-full" />
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <label className="text-sm font-medium text-white">Color</label>
                                                    <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-12 rounded-xl border border-white/10 bg-transparent" />
                                                </div>
                                                <p className="mt-3 font-mono text-sm text-neutral-400">{color.toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-4">
                                        <ImageDropzone
                                            onImageLoad={handleLogoLoad}
                                            currentImage={logoImage}
                                            onClear={() => setLogoImage(null)}
                                            accentColor={ACCENT}
                                            label="Arrastra el logo o isotipo"
                                            sublabel="PNG recomendado para conservar transparencia"
                                            maxSize={10 * 1024 * 1024}
                                        />
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="text-sm font-medium text-white">Escala del logo</label>
                                                <span className="font-mono text-sm text-orange-300">{logoScale}%</span>
                                            </div>
                                            <input type="range" min={8} max={45} value={logoScale} onChange={(event) => setLogoScale(Number(event.target.value))} className="mt-3 w-full" />
                                        </div>
                                    </div>
                                )}
                            </StudioCard>

                            <StudioCard
                                title="Composición"
                                description="Controla visibilidad, rotación y patrón de repetición."
                                eyebrow="Ajustes"
                                accentColor={ACCENT}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Opacidad</label>
                                            <span className="font-mono text-sm text-orange-300">{opacity}%</span>
                                        </div>
                                        <input type="range" min={5} max={100} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="mt-3 w-full" />
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Rotación</label>
                                            <span className="font-mono text-sm text-orange-300">{rotation}°</span>
                                        </div>
                                        <input type="range" min={-45} max={45} value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="mt-3 w-full" />
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-2">
                                    {POSITIONS.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setPosition(item.id)}
                                            className="rounded-2xl border px-4 py-3 text-left transition-all"
                                            style={position === item.id
                                                ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                                : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-white">{item.name}</p>
                                                <StudioChip accentColor={ACCENT} active={position === item.id}>{position === item.id ? "activo" : "posición"}</StudioChip>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {position === "tile" && (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-white">Espaciado del mosaico</label>
                                            <span className="font-mono text-sm text-orange-300">{spacing}px</span>
                                        </div>
                                        <input type="range" min={40} max={280} value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} className="mt-3 w-full" />
                                    </div>
                                )}
                            </StudioCard>

                            <StudioCard
                                title="Exportación"
                                description="Descarga la versión final cuando la vista previa quede como necesitas."
                                eyebrow="Salida"
                                accentColor={ACCENT}
                            >
                                <button
                                    onClick={handleDownload}
                                    disabled={!resultUrl}
                                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #FB923C)` }}
                                >
                                    Descargar PNG con marca de agua
                                </button>
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
