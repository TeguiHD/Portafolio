"use client";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useRef, useEffect } from "react";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";

// Character sets for ASCII art conversion
const ASCII_CHAR_SETS = {
    standard: " .:-=+*#%@",
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    blocks: " ░▒▓█",
    simple: " .oO@",
    binary: "01",
    custom: "",
};

type CharSetKey = keyof typeof ASCII_CHAR_SETS;
// «Compacto» salía igual que «Normal» (no hay nada más junto que un carácter por píxel): se quitó.
type SpaceDensity = "normal" | "sparse";

interface AsciiSettings {
    width: number;
    charSet: CharSetKey;
    customChars: string;
    inverted: boolean;
    colored: boolean;
    preserveAspect: boolean;
    // Enhanced settings
    brightness: number;      // -100 to 100
    contrast: number;        // -100 to 100
    saturation: number;      // -100 to 100
    hue: number;            // 0 to 360
    grayscale: boolean;
    sepia: boolean;
    spaceDensity: SpaceDensity;
    transparentFrame: boolean;
    qualityEnhancements: boolean;
}

const DEFAULT_SETTINGS: AsciiSettings = {
    width: 80,
    charSet: "standard",
    customChars: "",
    inverted: false,
    colored: false,
    preserveAspect: true,
    // Enhanced defaults
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    grayscale: false,
    sepia: false,
    spaceDensity: "normal",
    transparentFrame: false,
    qualityEnhancements: false,
};

// Preset configurations
const PRESETS = [
    { name: "Estándar", width: 80, charSet: "standard" as CharSetKey },
    { name: "HD", width: 120, charSet: "detailed" as CharSetKey },
    { name: "Retro", width: 60, charSet: "blocks" as CharSetKey },
    { name: "Minimal", width: 50, charSet: "simple" as CharSetKey },
];

// Icons
const CopyIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const ImageIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const TerminalIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ZoomInIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);

const ColorIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);

const InvertIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
);

import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarBlob, descargarTexto, nombreArchivo } from "@/lib/tools/descargar";
import { canvasToBlob } from "@/lib/tools/image-processing";
import { asciiAHtml, enfocar, escalaExportacion, medidasAscii, pintarAscii, pixelesAAscii, type ResultadoAscii } from "@/lib/tools/ascii";

// Límites para no agotar la memoria al decodificar.
const MAX_DIMENSION = 8000;
const MAX_TOTAL_PIXELS = 25_000_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Espera tras el último cambio de un control antes de recalcular: arrastrar un deslizador no convierte en cada paso.
const ESPERA_AJUSTES_MS = 120;
const FONDO = "#0F1724";
const COLOR_TEXTO = "#d4d4d4";
const TAM_FUENTE_PNG = 14;

const CHARSET_OPTIONS: { value: CharSetKey; label: string }[] = [
    { value: "standard", label: "Estándar ( .:-=+*#%@)" },
    { value: "detailed", label: "Detallado (70 caracteres)" },
    { value: "blocks", label: "Bloques (░▒▓█)" },
    { value: "simple", label: "Simple ( .oO@)" },
    { value: "binary", label: "Binario (01)" },
    { value: "custom", label: "Personalizado" },
];

/** Muestrea la imagen al tamaño de la grilla (con filtros y enfoque) y la pasa a caracteres. */
function convertir(canvas: HTMLCanvasElement, img: ImageBitmap, s: AsciiSettings): ResultadoAscii | null {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const width = s.width;
    const height = Math.max(1, s.preserveAspect ? Math.round(width * (img.height / img.width) * 0.5) : Math.round(width * 0.5));
    canvas.width = width;
    canvas.height = height;

    let filtro = `brightness(${(100 + s.brightness) / 100}) contrast(${(100 + s.contrast) / 100}) saturate(${(100 + s.saturation) / 100}) hue-rotate(${s.hue}deg)`;
    if (s.grayscale) filtro += " grayscale(100%)";
    if (s.sepia) filtro += " sepia(100%)";
    ctx.filter = filtro;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.filter = "none";

    let pixeles: Uint8ClampedArray = ctx.getImageData(0, 0, width, height).data;
    if (s.qualityEnhancements) pixeles = enfocar(pixeles, width, height);

    const base = s.charSet === "custom" && s.customChars.length > 0 ? s.customChars : ASCII_CHAR_SETS[s.charSet] || ASCII_CHAR_SETS.standard;
    // «Dirección del gradiente: claro → oscuro» hacía lo mismo que «Invertir» (y las dos juntas se anulaban): quedó solo Invertir.
    const rampa = Array.from(base);
    if (s.inverted) rampa.reverse();
    return pixelesAAscii(pixeles, width, height, rampa, s.spaceDensity === "sparse");
}

export default function AsciiArtPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("ascii");
    const { trackImmediate } = useToolTracking("ascii", { trackViewOnMount: true });

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    // Último resultado y los ajustes con que se hizo: si no coinciden con los actuales, hay una conversión pendiente.
    const [hecho, setHecho] = useState<{ resultado: ResultadoAscii; ajustes: AsciiSettings } | null>(null);
    const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
    const [fileName, setFileName] = useState<string>("");
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const [activeView, setActiveView] = useState<"original" | "ascii">("ascii");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [fontSize, setFontSize] = useState(6);
    const [error, setError] = useState<string | null>(null);
    const [errorExportar, setErrorExportar] = useState<string | null>(null);
    const [exportando, setExportando] = useState(false);
    const { copiado, fallo, copiar } = useCopiar();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const vistaColorRef = useRef<HTMLCanvasElement>(null);
    // Imagen decodificada UNA vez (createImageBitmap); cada cambio de ajuste la reutiliza.
    const bitmapRef = useRef<ImageBitmap | null>(null);

    const actualizando = !!imageUrl && hecho?.ajustes !== settings;
    const baseNombre = nombreArchivo(fileName, "imagen");

    useEffect(() => () => { bitmapRef.current?.close(); }, []);
    // Libera la URL de la vista previa al cambiar de imagen o salir.
    useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

    // (Re)genera el ASCII desde el bitmap ya decodificado, con una espera corta tras el último cambio.
    useEffect(() => {
        const bitmap = bitmapRef.current;
        const canvas = canvasRef.current;
        if (!imageUrl || !bitmap || !canvas) return;
        const id = window.setTimeout(() => {
            try {
                const resultado = convertir(canvas, bitmap, settings);
                if (resultado) { setHecho({ resultado, ajustes: settings }); setError(null); }
            } catch {
                setError("No se pudo convertir la imagen.");
            }
        }, ESPERA_AJUSTES_MS);
        return () => window.clearTimeout(id);
    }, [settings, imageUrl]);

    // Vista en color: se pinta en un canvas (un <span> por carácter eran hasta ~27 000 nodos).
    useEffect(() => {
        const canvas = vistaColorRef.current;
        if (!canvas || !hecho?.ajustes.colored) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const { ancho, alto } = medidasAscii(ctx, hecho.resultado, fontSize);
        const escala = escalaExportacion(ancho, alto, Math.min(window.devicePixelRatio || 1, 2));
        pintarAscii(canvas, hecho.resultado, { tamFuente: fontSize, conColor: true, colorTexto: COLOR_TEXTO, fondo: null, escala });
        canvas.style.width = `${ancho}px`;
        canvas.style.height = `${alto}px`;
    }, [hecho, fontSize]);

    const abrirImagen = async (file: File) => {
        setError(null);
        let bitmap: ImageBitmap;
        try {
            bitmap = await createImageBitmap(file);
        } catch {
            setError("No se pudo abrir la imagen. El archivo puede estar dañado.");
            return;
        }
        if (bitmap.width > MAX_DIMENSION || bitmap.height > MAX_DIMENSION) {
            bitmap.close();
            setError(`La imagen es demasiado grande: máximo ${MAX_DIMENSION} × ${MAX_DIMENSION} px.`);
            return;
        }
        if (bitmap.width * bitmap.height > MAX_TOTAL_PIXELS) {
            bitmap.close();
            setError(`La imagen tiene demasiados píxeles: máximo ${MAX_TOTAL_PIXELS / 1_000_000} MP.`);
            return;
        }
        bitmapRef.current?.close();
        bitmapRef.current = bitmap;
        setHecho(null);
        setFileName(file.name);
        setImageSize({ width: bitmap.width, height: bitmap.height });
        // Vista previa propia desde el File: no depende de la URL que entregue la zona de carga.
        setImageUrl(URL.createObjectURL(file));
    };

    const handleCopy = async () => {
        if (!hecho) return;
        if (await copiar(hecho.resultado.texto, "ascii")) trackImmediate("copy_ascii");
    };

    const handleDownloadTxt = () => {
        if (!hecho) return;
        descargarTexto(hecho.resultado.texto, `${baseNombre}-ascii.txt`);
        trackImmediate("download_txt");
    };

    // HTML siempre en color (el texto plano ya está en TXT).
    const handleDownloadHtml = () => {
        if (!hecho) return;
        const html = asciiAHtml(hecho.resultado, fileName || "imagen", settings.transparentFrame ? null : FONDO, true, COLOR_TEXTO);
        descargarTexto(html, `${baseNombre}-ascii.html`, "text/html");
        trackImmediate("download_html");
    };

    // PNG tal como se ve (con o sin color), a 14 px por fila y escala 2× salvo que la imagen salga demasiado grande.
    const handleDownloadPng = async () => {
        if (!hecho || exportando) return;
        setErrorExportar(null);
        setExportando(true);
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Sin contexto 2D");
            const { ancho, alto } = medidasAscii(ctx, hecho.resultado, TAM_FUENTE_PNG);
            pintarAscii(canvas, hecho.resultado, {
                tamFuente: TAM_FUENTE_PNG,
                conColor: hecho.ajustes.colored,
                colorTexto: COLOR_TEXTO,
                fondo: settings.transparentFrame ? null : FONDO,
                escala: escalaExportacion(ancho, alto),
            });
            descargarBlob(await canvasToBlob(canvas, "image/png"), `${baseNombre}-ascii.png`);
            trackImmediate("download_png");
        } catch {
            setErrorExportar("No se pudo crear el PNG. Prueba con un ancho menor.");
        } finally {
            setExportando(false);
        }
    };

    const handleReset = () => {
        bitmapRef.current?.close();
        bitmapRef.current = null;
        setImageUrl(null);
        setHecho(null);
        setFileName("");
        setImageSize(null);
        setSettings(DEFAULT_SETTINGS);
        setActiveView("ascii");
        setShowAdvanced(false);
        setError(null);
        setErrorExportar(null);
    };

    // Apply preset
    const applyPreset = (preset: typeof PRESETS[0]) => {
        setSettings(prev => ({
            ...prev,
            width: preset.width,
            charSet: preset.charSet,
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full motion-safe:animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de arte ASCII"} />;
    }

    return (
        <div className="tool-page">
            <canvas ref={canvasRef} className="hidden" />

            <main className="tool-main pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                {/* La cabecera va sola y centrada (como en las 29); «Nueva imagen» queda en su propia fila. */}
                <div className="mb-4 sm:mb-6">
                    <ToolPageHeader slug="ascii" />
                    {imageUrl && <div className="flex justify-end">
                        {(
                            <button
                                type="button"
                                onClick={handleReset}
                                aria-label="Nueva imagen"
                                className="flex-shrink-0 flex min-h-11 items-center gap-1.5 px-3 py-2 bg-white/10 text-neutral-300 rounded-lg hover:bg-white/20 transition-colors text-sm"
                            >
                                <RefreshIcon />
                                <span className="hidden sm:inline">Nueva imagen</span>
                            </button>
                        )}
                    </div>}
                </div>

                {/* Upload Area */}
                {!imageUrl && (
                    <div className="space-y-6">
                        <ImageDropzone
                            onImageLoad={(file) => { void abrirImagen(file); }}
                            maxSize={MAX_FILE_SIZE}
                            label="Arrastra una imagen"
                            sublabel="JPG, PNG, GIF, WebP o BMP · todo se procesa en tu navegador"
                        />

                        {error && (
                            <p role="alert" className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                                {error}
                            </p>
                        )}

                        {/* How it works */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            {[
                                { num: "1", icon: "📤", title: "Sube", desc: "Tu imagen" },
                                { num: "2", icon: "⚙️", title: "Ajusta", desc: "El estilo" },
                                { num: "3", icon: "📥", title: "Descarga", desc: "Tu arte" },
                            ].map((step) => (
                                <div key={step.num} className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                                    <span className="text-2xl sm:text-3xl">{step.icon}</span>
                                    <p className="font-medium text-white text-sm sm:text-base mt-2">{step.title}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Editor */}
                {imageUrl && (
                    <div className="space-y-4">
                        {/* Settings Bar */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3">
                            {/* Presets Row */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <span className="text-xs text-neutral-500 flex-shrink-0 hidden sm:block">Ajustes rápidos:</span>
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        aria-pressed={settings.width === preset.width && settings.charSet === preset.charSet}
                                        onClick={() => applyPreset(preset)}
                                        className={`flex-shrink-0 min-h-11 sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.width === preset.width && settings.charSet === preset.charSet
                                            ? "bg-accent-1 text-white"
                                            : "bg-white/10 text-neutral-300 hover:bg-white/20"
                                            }`}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>

                            {/* Controls Row */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {/* Width Control */}
                                <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                                    <label htmlFor="ascii-ancho" className="text-xs text-neutral-500 shrink-0">Ancho</label>
                                    <input
                                        id="ascii-ancho"
                                        type="range"
                                        min="30"
                                        max="200"
                                        value={settings.width}
                                        onChange={(e) => setSettings({ ...settings, width: parseInt(e.target.value) })}
                                        className="w-24 sm:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                    />
                                    <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.width}</span>
                                </div>

                                {/* Toggle Buttons */}
                                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                    <button
                                        type="button"
                                        aria-pressed={settings.colored}
                                        aria-label="Modo color"
                                        onClick={() => setSettings({ ...settings, colored: !settings.colored })}
                                        className={`flex h-11 w-11 items-center justify-center rounded-md transition-all sm:h-9 sm:w-9 ${settings.colored
                                            ? "bg-accent-1 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                        title="Modo color"
                                    >
                                        <ColorIcon filled={settings.colored} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={settings.inverted}
                                        aria-label="Invertir"
                                        onClick={() => setSettings({ ...settings, inverted: !settings.inverted })}
                                        className={`flex h-11 w-11 items-center justify-center rounded-md transition-all sm:h-9 sm:w-9 ${settings.inverted
                                            ? "bg-accent-1 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                        title="Invertir"
                                    >
                                        <InvertIcon />
                                    </button>
                                </div>

                                {/* Advanced Toggle */}
                                <button
                                    type="button"
                                    aria-expanded={showAdvanced}
                                    aria-controls="ascii-mas-opciones"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className={`flex min-h-11 sm:min-h-0 items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${showAdvanced
                                        ? "bg-white/20 text-white"
                                        : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                                        }`}
                                >
                                    <span>Más opciones</span>
                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                                </button>
                            </div>

                            {/* Advanced Options */}
                            {showAdvanced && (
                                <div id="ascii-mas-opciones" className="pt-3 border-t border-white/10 space-y-4 animate-slideDown">
                                    {/* Character Set Section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="ascii-caracteres" className="block text-xs text-neutral-500 mb-1.5">Juego de caracteres</label>
                                            <select
                                                id="ascii-caracteres"
                                                value={settings.charSet}
                                                onChange={(e) => setSettings({ ...settings, charSet: e.target.value as CharSetKey })}
                                                className="w-full min-h-11 px-3 py-2 bg-[#1a2332] border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1 transition-colors"
                                            >
                                                {CHARSET_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Custom Characters Input */}
                                        {settings.charSet === "custom" && (
                                            <div>
                                                <label htmlFor="ascii-propios" className="block text-xs text-neutral-500 mb-1.5">Caracteres (oscuro → claro)</label>
                                                <input
                                                    id="ascii-propios"
                                                    type="text"
                                                    value={settings.customChars}
                                                    onChange={(e) => setSettings({ ...settings, customChars: e.target.value })}
                                                    placeholder=" .:-=+*#%@"
                                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-accent-1 font-mono"
                                                />
                                            </div>
                                        )}

                                        {/* Space Density */}
                                        <div>
                                            <p id="ascii-espaciado" className="block text-xs text-neutral-500 mb-1.5">Densidad de espaciado</p>
                                            <div className="flex gap-1 bg-white/5 p-1 rounded-lg" role="group" aria-labelledby="ascii-espaciado">
                                                {[
                                                    { value: "normal", label: "Normal" },
                                                    { value: "sparse", label: "Espaciado" },
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        aria-pressed={settings.spaceDensity === option.value}
                                                        onClick={() => setSettings({ ...settings, spaceDensity: option.value as SpaceDensity })}
                                                        className={`flex-1 min-h-11 sm:min-h-0 py-1.5 px-2 rounded text-xs font-medium transition-colors ${settings.spaceDensity === option.value
                                                            ? "bg-accent-1 text-white"
                                                            : "text-neutral-400 hover:text-white"
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Adjustments Section */}
                                    <div className="pt-3 border-t border-white/10">
                                        <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            Ajustes de imagen
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Brightness */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <label htmlFor="ascii-brightness" className="text-xs text-neutral-500 w-16">Brillo</label>
                                                <input
                                                    id="ascii-brightness"
                                                    type="range"
                                                    min="-100"
                                                    max="100"
                                                    value={settings.brightness}
                                                    onChange={(e) => setSettings({ ...settings, brightness: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.brightness}</span>
                                            </div>

                                            {/* Contrast */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <label htmlFor="ascii-contrast" className="text-xs text-neutral-500 w-16">Contraste</label>
                                                <input
                                                    id="ascii-contrast"
                                                    type="range"
                                                    min="-100"
                                                    max="100"
                                                    value={settings.contrast}
                                                    onChange={(e) => setSettings({ ...settings, contrast: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.contrast}</span>
                                            </div>

                                            {/* Saturation */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <label htmlFor="ascii-saturation" className="text-xs text-neutral-500 w-16">Saturación</label>
                                                <input
                                                    id="ascii-saturation"
                                                    type="range"
                                                    min="-100"
                                                    max="100"
                                                    value={settings.saturation}
                                                    onChange={(e) => setSettings({ ...settings, saturation: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.saturation}</span>
                                            </div>

                                            {/* Hue */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <label htmlFor="ascii-hue" className="text-xs text-neutral-500 w-16">Tono</label>
                                                <input
                                                    id="ascii-hue"
                                                    type="range"
                                                    min="0"
                                                    max="360"
                                                    value={settings.hue}
                                                    onChange={(e) => setSettings({ ...settings, hue: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-lg appearance-none cursor-pointer"
                                                    style={{
                                                        background: 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))'
                                                    }}
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.hue}°</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters & Enhancements Section */}
                                    <div className="pt-3 border-t border-white/10">
                                        <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                            Filtros y mejoras
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {/* Grayscale */}
                                            <button
                                                type="button"
                                                aria-pressed={settings.grayscale}
                                                onClick={() => setSettings({ ...settings, grayscale: !settings.grayscale })}
                                                className={`flex min-h-11 sm:min-h-0 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.grayscale
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                                </svg>
                                                Escala grises
                                            </button>

                                            {/* Sepia */}
                                            <button
                                                type="button"
                                                aria-pressed={settings.sepia}
                                                onClick={() => setSettings({ ...settings, sepia: !settings.sepia })}
                                                className={`flex min-h-11 sm:min-h-0 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.sepia
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                </svg>
                                                Sepia
                                            </button>

                                            {/* Quality Enhancements */}
                                            <button
                                                type="button"
                                                aria-pressed={settings.qualityEnhancements}
                                                onClick={() => setSettings({ ...settings, qualityEnhancements: !settings.qualityEnhancements })}
                                                className={`flex min-h-11 sm:min-h-0 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.qualityEnhancements
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Nitidez
                                            </button>

                                            {/* Transparent Frame */}
                                            <button
                                                type="button"
                                                aria-pressed={settings.transparentFrame}
                                                onClick={() => setSettings({ ...settings, transparentFrame: !settings.transparentFrame })}
                                                className={`flex min-h-11 sm:min-h-0 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.transparentFrame
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                                </svg>
                                                Transparente
                                            </button>
                                        </div>
                                    </div>

                                    {/* Options Row */}
                                    <div className="pt-3 border-t border-white/10 flex flex-wrap gap-3">
                                        <label className="flex min-h-11 sm:min-h-0 items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={settings.preserveAspect}
                                                onChange={(e) => setSettings({ ...settings, preserveAspect: e.target.checked })}
                                                className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-accent-1 checked:border-accent-1 focus:ring-accent-1/50 transition-colors"
                                            />
                                            <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">Preservar proporción</span>
                                        </label>

                                        {/* Reset Button */}
                                        <button
                                            type="button"
                                            onClick={() => setSettings({
                                                ...settings,
                                                brightness: 0,
                                                contrast: 0,
                                                saturation: 0,
                                                hue: 0,
                                                grayscale: false,
                                                sepia: false,
                                                qualityEnhancements: false,
                                            })}
                                            className="ml-auto flex min-h-11 sm:min-h-0 items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <RefreshIcon />
                                            Restablecer ajustes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile View Toggle */}
                        <div className="sm:hidden flex bg-white/5 border border-white/10 rounded-xl p-1" role="group" aria-label="Vista">
                            <button
                                type="button"
                                aria-pressed={activeView === "original"}
                                onClick={() => setActiveView("original")}
                                className={`flex-1 flex min-h-11 items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "original"
                                    ? "bg-white/10 text-white"
                                    : "text-neutral-400"
                                    }`}
                            >
                                <ImageIcon />
                                Original
                            </button>
                            <button
                                type="button"
                                aria-pressed={activeView === "ascii"}
                                onClick={() => setActiveView("ascii")}
                                className={`flex-1 flex min-h-11 items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "ascii"
                                    ? "bg-white/10 text-white"
                                    : "text-neutral-400"
                                    }`}
                            >
                                <TerminalIcon />
                                ASCII Art
                            </button>
                        </div>

                        {/* Preview Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Original Image */}
                            <div className={`${activeView === "ascii" ? "hidden sm:block" : ""}`}>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                                        <ImageIcon />
                                        Imagen original
                                    </span>
                                    {imageSize && (
                                        <span className="text-[10px] text-neutral-600 font-mono">
                                            {imageSize.width}×{imageSize.height}px
                                        </span>
                                    )}
                                </div>
                                <div className="relative bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                                    <div className="aspect-[4/3] sm:h-[350px] lg:h-[400px] flex items-center justify-center">
                                        <img
                                            src={imageUrl}
                                            alt="Imagen original"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ASCII Output */}
                            <div className={`${activeView === "original" ? "hidden sm:block" : ""}`}>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                                        <TerminalIcon />
                                        ASCII Art
                                        {hecho && (
                                            <span className="font-mono text-[10px] text-neutral-600">
                                                {hecho.resultado.columnas}×{hecho.resultado.filas}
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5" role="group" aria-label="Tamaño de la vista previa">
                                        <button
                                            type="button"
                                            onClick={() => setFontSize(prev => Math.max(3, prev - 1))}
                                            disabled={fontSize <= 3}
                                            aria-label="Reducir tamaño"
                                            className="flex h-11 w-11 items-center justify-center rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors disabled:opacity-40 sm:h-7 sm:w-7"
                                        >
                                            <ZoomOutIcon />
                                        </button>
                                        <span className="text-[10px] text-neutral-500 font-mono w-4 text-center" aria-hidden="true">{fontSize}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFontSize(prev => Math.min(12, prev + 1))}
                                            disabled={fontSize >= 12}
                                            aria-label="Aumentar tamaño"
                                            className="flex h-11 w-11 items-center justify-center rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors disabled:opacity-40 sm:h-7 sm:w-7"
                                        >
                                            <ZoomInIcon />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative bg-[#080b10] border border-white/10 rounded-xl overflow-hidden" aria-busy={actualizando}>
                                    {/* Contenedor con desplazamiento: enfocable para recorrerlo con el teclado. */}
                                    <div className="aspect-[4/3] sm:h-[350px] lg:h-[400px] overflow-auto focus-visible:outline-2 focus-visible:outline-accent-1" tabIndex={0} role="region" aria-label="Resultado en ASCII">
                                        {!hecho ? (error ? null :
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                <div className="flex flex-col items-center gap-2" role="status">
                                                    <div className="w-6 h-6 border-2 border-accent-1 border-t-transparent rounded-full motion-safe:animate-spin" aria-hidden="true" />
                                                    <span className="text-xs text-neutral-400">Generando…</span>
                                                </div>
                                            </div>
                                        ) : hecho.ajustes.colored ? (
                                            <div className="p-2 sm:p-3 w-max">
                                                <canvas
                                                    ref={vistaColorRef}
                                                    role="img"
                                                    aria-label={`Arte ASCII en color de ${hecho.resultado.columnas} columnas por ${hecho.resultado.filas} filas. Usa Copiar o TXT para obtener el texto.`}
                                                    className="block"
                                                />
                                            </div>
                                        ) : (
                                            <pre
                                                className="p-2 sm:p-3 font-mono whitespace-pre select-all leading-none min-h-full text-neutral-300"
                                                style={{ fontSize: `${fontSize}px`, letterSpacing: "0px" }}
                                            >
                                                {hecho.resultado.texto}
                                            </pre>
                                        )}
                                    </div>
                                    {actualizando && hecho && (
                                        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] text-neutral-300">
                                            Actualizando…
                                        </span>
                                    )}
                                </div>
                                {error && (
                                    <p role="alert" className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => { void handleCopy(); }}
                                    disabled={!hecho}
                                    aria-label="Copiar el arte ASCII como texto"
                                    className={`flex min-h-11 items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${copiado === "ascii"
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                        }`}
                                >
                                    {copiado === "ascii" ? <CheckIcon /> : <CopyIcon />}
                                    <span>{copiado === "ascii" ? "Copiado" : fallo === "ascii" ? "No se pudo copiar" : "Copiar"}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadTxt}
                                    disabled={!hecho}
                                    aria-label="Descargar TXT"
                                    className="flex min-h-11 items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-accent-1 to-accent-2 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent-1/20"
                                >
                                    <DownloadIcon />
                                    <span>TXT</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { void handleDownloadPng(); }}
                                    disabled={!hecho || exportando}
                                    aria-label="Descargar PNG"
                                    className="flex min-h-11 items-center gap-1.5 px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                                >
                                    <DownloadIcon />
                                    <span>{exportando ? "Creando…" : "PNG"}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadHtml}
                                    disabled={!hecho}
                                    aria-label="Descargar HTML en color"
                                    className="flex min-h-11 items-center gap-1.5 px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                                >
                                    <DownloadIcon />
                                    <span>HTML</span>
                                    <span className="hidden xs:inline text-neutral-400">+ Color</span>
                                </button>
                            </div>
                            <p role="status" className="mt-2 text-center text-xs text-neutral-500">
                                {copiado === "ascii" ? "Texto copiado." : fallo === "ascii" ? "No se pudo copiar. Usa TXT para descargarlo." : ""}
                            </p>
                            {errorExportar && <p role="alert" className="mt-2 text-center text-xs text-red-300">{errorExportar}</p>}
                        </div>
                    </div>
                )}

                {/* Tip */}
                {imageUrl && hecho && (
                    <div className="mt-4 sm:mt-6 p-3 bg-accent-1/5 border border-accent-1/10 rounded-xl">
                        <p className="text-xs text-neutral-400 text-center sm:text-left">
                            <span className="text-accent-1 font-medium">💡 Tip:</span>{" "}
                            Usa el modo &quot;Bloques&quot; para logos e iconos, y &quot;Detallado&quot; para fotos con más definición.
                            El PNG sale tal como se ve: en color si el modo color está activo y con fondo transparente si eliges «Transparente».
                        </p>
                    </div>
                )}

            </main>

            <style jsx>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-reduced-motion: no-preference) {
                    .animate-slideDown {
                        animation: slideDown 0.2s ease-out;
                    }
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
