"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Type, Image as ImageIcon, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, Move, Grid2X2 } from "lucide-react";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoDescargar, IconoImagen, IconoOjo, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
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
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "marcar", etiqueta: "Marcar", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

const POSITIONS: { id: WatermarkPosition; name: string; icon: typeof Move }[] = [
    { id: "center", name: "Centro", icon: Move },
    { id: "top-left", name: "Arriba izquierda", icon: ArrowUpLeft },
    { id: "top-right", name: "Arriba derecha", icon: ArrowUpRight },
    { id: "bottom-left", name: "Abajo izquierda", icon: ArrowDownLeft },
    { id: "bottom-right", name: "Abajo derecha", icon: ArrowDownRight },
    { id: "tile", name: "Mosaico", icon: Grid2X2 },
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
    const [urlDescargada, setUrlDescargada] = useState<string | null>(null);
    const [isRenderingPreview, setIsRenderingPreview] = useState(false);
    const [comparando, setComparando] = useState(false);
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
            setIsRenderingPreview(false);
            return;
        }

        if (mode === "text" && !text.trim()) {
            setResultUrl(null);
            setIsRenderingPreview(false);
            return;
        }

        if (mode === "logo" && !logoImage) {
            setResultUrl(null);
            setIsRenderingPreview(false);
            return;
        }

        let isActive = true;

        const renderPreview = async () => {
            setIsRenderingPreview(true);
            setResultUrl(null);
            setError(null);

            try {
                const image = await loadImageSource(sourceImage);
                const logo = mode === "logo" && logoImage ? await loadImageSource(logoImage) : null;
                const canvas = canvasRef.current;

                if (!canvas || !isActive) return;

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
                    const sanitizedText = text.slice(0, 200);
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
        setUrlDescargada(resultUrl);
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

    const field = "studio-field";
    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : resultUrl ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];
    return <div className="tool-page">
        <canvas ref={canvasRef} className="hidden" />
        <main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <ToolPageHeader slug="marca-agua" title="Marca de agua" description="Tu firma, tu logo y el acabado que buscas. Vista previa en vivo." />
            {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a proteger" /> : <section aria-label="Editor de marca de agua" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                <MesaCabecera nombre={sourceFile?.name ?? "Imagen"}>
                    <button type="button" className="studio-button studio-button-primary" aria-label="Descargar PNG con marca de agua" disabled={!resultUrl || isRenderingPreview} onClick={handleDownload}><IconoDescargar listo={!!resultUrl && urlDescargada === resultUrl} /><span><span className="hidden sm:inline">Descargar </span>PNG</span></button>
                </MesaCabecera>
                <div className="mesa-cuerpo mesa-cuerpo-panel">
                    <div className="mesa-columna">
                        <MesaEscenario fondo="dark" pista={comparando ? "Original" : isRenderingPreview ? "Actualizando" : resultUrl ? "Lista para descargar · PNG original" : "Escribe tu marca o añade un logo"} className="flex min-h-[260px] items-center justify-center p-3 sm:min-h-[380px]">
                            <img src={comparando || !resultUrl ? sourceImage : resultUrl} alt={comparando ? "Imagen original" : "Imagen con marca de agua"} className="max-h-[480px] w-full object-contain" />
                        </MesaEscenario>
                        <MesaPasos etiqueta="Progreso de la marca" pasos={PASOS} estados={estadosPasos} />
                    </div>
                    <MesaRail etiqueta="Herramientas de la marca">
                        <MesaBoton pista="Comparar con el original" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                        <MesaSeparador />
                        <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                    </MesaRail>
                    <aside aria-label="Ajustes de marca de agua" className="mesa-panel space-y-5 p-4">
                        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de marca">
                            {(["text", "logo"] as const).map(item => <button type="button" key={item} className="studio-segment inline-flex items-center justify-center gap-2" aria-pressed={mode === item} onClick={() => setMode(item)}>{item === "text" ? <Type size={16} aria-hidden="true" /> : <ImageIcon size={16} aria-hidden="true" />}{item === "text" ? "Texto" : "Logo"}</button>)}
                        </div>
                        {mode === "text" ? <>
                            <label className={field}>Texto de la marca<input type="text" value={text} maxLength={200} onChange={event => setText(event.target.value)} placeholder="Tu marca" /></label>
                            <label className={field}><span className="flex justify-between">Tamaño del texto<output>{fontSize}px</output></span><input type="range" aria-label="Tamaño del texto" min={12} max={120} value={fontSize} onChange={event => setFontSize(Number(event.target.value))} /></label>
                            <label className="flex items-center justify-between text-xs text-slate-300">Color del texto<input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-11 w-12 cursor-pointer rounded-lg bg-transparent" /></label>
                        </> : <>
                            <ImageDropzone onImageLoad={handleLogoLoad} currentImage={logoImage} onClear={() => setLogoImage(null)} accentColor={ACCENT} label="Añade tu logo" sublabel="PNG con transparencia" maxSize={10 * 1024 * 1024} />
                            <label className={field}><span className="flex justify-between">Escala del logo<output>{logoScale}%</output></span><input type="range" aria-label="Escala del logo" min={8} max={45} value={logoScale} onChange={event => setLogoScale(Number(event.target.value))} /></label>
                        </>}
                        <label className={field}><span className="flex justify-between">Opacidad<output>{opacity}%</output></span><input type="range" aria-label="Opacidad" min={5} max={100} value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
                        <label className={field}><span className="flex justify-between">Rotación<output>{rotation}°</output></span><input type="range" aria-label="Rotación" min={-45} max={45} value={rotation} onChange={event => setRotation(Number(event.target.value))} /></label>
                        <fieldset><legend className="mb-3 text-xs text-slate-300">Posición</legend><div className="grid grid-cols-3 gap-2">{POSITIONS.map(({ id, name, icon: Icon }) => <button type="button" key={id} onClick={() => setPosition(id)} aria-label={name} title={name} aria-pressed={position === id} className="studio-segment flex flex-col items-center justify-center gap-2 border border-white/5"><Icon size={19} aria-hidden="true" /><span className="text-[9px]">{name}</span></button>)}</div></fieldset>
                        {position === "tile" && <label className={field}><span className="flex justify-between">Espaciado<output>{spacing}px</output></span><input type="range" aria-label="Espaciado del mosaico" min={40} max={280} value={spacing} onChange={event => setSpacing(Number(event.target.value))} /></label>}
                    </aside>
                </div>
            </section>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-rose-300">{error}</p>}
        </main>
    </div>;
}
