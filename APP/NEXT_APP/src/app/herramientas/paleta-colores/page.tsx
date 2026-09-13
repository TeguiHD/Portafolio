"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCopiar, IconoDescargar, IconoGota, IconoImagen, IconoSubir } from "@/components/tools/mesa/MesaIcons";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { sanitizeFileBaseName, triggerDownload } from "@/lib/tools/image-processing";

const ACCENT = "#EC4899";
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "extraer", etiqueta: "Extraer", icono: <IconoGota /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

interface ColorInfo {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
    count: number;
    percentage: number;
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    let s = 0;

    if (max !== min) {
        const delta = max - min;
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / delta + 2) / 6;
        else h = ((r - g) / delta + 4) / 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToCss(h: number, s: number, l: number) {
    return `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}%)`;
}

function getToneName({ h, s, l }: ColorInfo["hsl"]) {
    if (l < 14) return "Negro";
    if (s < 8) return l > 70 ? "Gris claro" : "Gris";
    if (h < 15) return "Rojo";
    if (h < 45) return "Naranja";
    if (h < 70) return "Amarillo";
    if (h < 110) return "Lima";
    if (h < 160) return "Verde";
    if (h < 200) return "Turquesa";
    if (h < 240) return "Azul";
    if (h < 285) return "Índigo";
    if (h < 330) return "Magenta";
    return "Rosa";
}

function getRole(index: number) {
    if (index === 0) return "Dominante";
    if (index === 1) return "Apoyo";
    if (index === 2) return "Acento";
    return "Secundario";
}

function buildHarmony(color: ColorInfo) {
    const { h, s, l } = color.hsl;

    return [
        { label: "Complementario", swatch: hslToCss(h + 180, s, l) },
        { label: "Análogo +", swatch: hslToCss(h + 24, Math.max(s - 6, 10), l) },
        { label: "Análogo -", swatch: hslToCss(h - 24, Math.max(s - 6, 10), l) },
        { label: "Acento fuerte", swatch: hslToCss(h + 150, Math.min(s + 8, 100), Math.max(l - 6, 10)) },
    ];
}

function extractPalette(imageData: ImageData, numColors = 6): ColorInfo[] {
    const pixels: [number, number, number][] = [];
    const data = imageData.data;
    const pixelStep = Math.max(1, Math.floor(data.length / 4 / 50000));

    for (let index = 0; index < data.length; index += pixelStep * 4) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        if (a < 128) continue;
        pixels.push([r, g, b]);
    }

    if (pixels.length === 0) return [];

    const binSize = 16;
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

    for (const [r, g, b] of pixels) {
        const qr = Math.round(r / binSize) * binSize;
        const qg = Math.round(g / binSize) * binSize;
        const qb = Math.round(b / binSize) * binSize;
        const key = `${qr},${qg},${qb}`;
        const existing = colorMap.get(key);
        if (existing) {
            existing.r = Math.round((existing.r * existing.count + r) / (existing.count + 1));
            existing.g = Math.round((existing.g * existing.count + g) / (existing.count + 1));
            existing.b = Math.round((existing.b * existing.count + b) / (existing.count + 1));
            existing.count += 1;
        } else {
            colorMap.set(key, { r, g, b, count: 1 });
        }
    }

    const sorted = [...colorMap.values()].sort((left, right) => right.count - left.count);
    const filtered: (typeof sorted)[0][] = [];

    for (const color of sorted) {
        if (filtered.length >= numColors) break;
        const tooSimilar = filtered.some(existing => {
            const dr = Math.abs(existing.r - color.r);
            const dg = Math.abs(existing.g - color.g);
            const db = Math.abs(existing.b - color.b);
            return dr + dg + db < 60;
        });
        if (!tooSimilar) filtered.push(color);
    }

    // Count every sampled pixel against its nearest swatch, not just the winning bins.
    const counts = filtered.map(() => 0);
    for (const sample of sorted) {
        let nearest = 0;
        let distance = Infinity;
        filtered.forEach((color, index) => {
            const delta = (sample.r - color.r) ** 2 + (sample.g - color.g) ** 2 + (sample.b - color.b) ** 2;
            if (delta < distance) { nearest = index; distance = delta; }
        });
        counts[nearest] += sample.count;
    }
    return filtered.map((color, index) => ({
        hex: rgbToHex(color.r, color.g, color.b),
        rgb: { r: color.r, g: color.g, b: color.b },
        hsl: rgbToHsl(color.r, color.g, color.b),
        count: counts[index],
        percentage: Math.round((counts[index] / pixels.length) * 100),
    }));
}

export default function ColorPalettePage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("paleta-colores");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [palette, setPalette] = useState<ColorInfo[]>([]);
    const [numColors, setNumColors] = useState(6);
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [fileName, setFileName] = useState("paleta");
    const [cssDescargado, setCssDescargado] = useState<string | null>(null);
    const extractionVersion = useRef(0);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        extractionVersion.current += 1;
        if (copyTimer.current) clearTimeout(copyTimer.current);
    }, []);

    const extractFromImage = useCallback((imageUrl: string, colors: number) => {
        const version = ++extractionVersion.current;
        setExtracting(true);
        setError(null);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            if (version !== extractionVersion.current) return;
            const canvas = document.createElement("canvas");
            const scale = Math.min(320 / img.naturalWidth, 320 / img.naturalHeight, 1);
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const context = canvas.getContext("2d");

            if (!context) { setError("No se pudo analizar la imagen."); setExtracting(false); return; }

            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const nextPalette = extractPalette(imageData, colors);
            setPalette(nextPalette);
            setSelectedColorIndex(0);
            setExtracting(false);
            if (!nextPalette.length) setError("La imagen no contiene píxeles visibles para extraer una paleta.");
        };
        img.onerror = () => { if (version === extractionVersion.current) { setError("No se pudo leer esta imagen."); setExtracting(false); } };
        img.src = imageUrl;
    }, []);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setFileName(sanitizeFileBaseName(file.name));
        setSourceImage(dataUrl);
        setPalette([]);
        extractFromImage(dataUrl, numColors);
    }, [extractFromImage, numColors]);

    const handleClear = useCallback(() => {
        extractionVersion.current += 1;
        setExtracting(false);
        setError(null);
        setSourceImage(null);
        setPalette([]);
        setSelectedColorIndex(0);
    }, []);

    const handleColorCount = useCallback((count: number) => {
        setNumColors(count);
        if (sourceImage) {
            extractFromImage(sourceImage, count);
        }
    }, [extractFromImage, sourceImage]);

    const copyValue = useCallback(async (value: string, token: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedToken(token);
            if (copyTimer.current) clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopiedToken(null), 1600);
        } catch { setError("No se pudo copiar. Puedes seleccionar y copiar los valores manualmente."); }
    }, []);

    const css = `:root {\n${palette.map((color, index) => `  --palette-${index + 1}: ${color.hex};`).join("\n")}\n}`;
    const downloadPalette = () => {
        const url = URL.createObjectURL(new Blob([css], { type: "text/css" }));
        triggerDownload(url, `${fileName}_paleta.css`);
        setCssDescargado(css);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Extractor de Paleta"} />;
    }

    const activeColor = palette[selectedColorIndex] || null;
    const harmony = activeColor ? buildHarmony(activeColor) : [];

    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : palette.length ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
                <ToolPageHeader slug="paleta-colores" title="Los colores de tu imagen" description="Extrae una paleta y llévala a tu diseño en HEX, RGB, HSL o CSS." />
                {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra una imagen para extraer su paleta" /> : (
                    <section aria-label="Estudio de color" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={fileName} detalle={palette.length ? `${palette.length} colores` : undefined}>
                            <div className="mesa-chips" role="group" aria-label="Cantidad de colores">{[4, 6, 8, 10].map((count) => <button key={count} type="button" className="mesa-chip" aria-label={`${count} colores`} aria-pressed={numColors === count} onClick={() => handleColorCount(count)}>{count}</button>)}</div>
                            <button type="button" onClick={downloadPalette} disabled={!palette.length || extracting} className="studio-button studio-button-primary"><IconoDescargar listo={palette.length > 0 && cssDescargado === css} />CSS</button>
                        </MesaCabecera>
                        <div className="mesa-cuerpo mesa-cuerpo-panel">
                            <div className="mesa-columna">
                                <MesaEscenario fondo="dark" pista={extracting ? "Extrayendo colores" : palette.length ? "Pulsa un color para ver sus valores" : undefined} className="min-w-0"><div className="relative flex h-[min(48vh,440px)] min-h-[260px] items-center justify-center bg-[#070b11] p-6"><img src={sourceImage} alt="Imagen analizada" className="max-h-full max-w-full object-contain" />{extracting && <span role="status" className="absolute bottom-4 flex items-center gap-2 rounded-full bg-[#0a111b]/90 px-3 py-2 text-xs text-slate-300"><LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />Extrayendo colores…</span>}</div>
                                {palette.length > 0 && <div className="grid" style={{ gridTemplateColumns: `repeat(${palette.length}, minmax(0, 1fr))` }}>{palette.map((color, index) => <button key={color.hex} type="button" onClick={() => setSelectedColorIndex(index)} aria-label={`Seleccionar ${color.hex}, ${color.percentage}%`} aria-pressed={selectedColorIndex === index} title={`${color.hex.toUpperCase()} · ${color.percentage}%`} className="group relative flex h-20 min-w-0 cursor-pointer items-end justify-center p-2 outline-none transition-all hover:brightness-110 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:h-28" style={{ backgroundColor: color.hex }}><span className="rounded bg-black/65 px-1.5 py-1 font-mono text-[9px] text-white sm:text-[10px]">{palette.length <= 6 ? color.hex.toUpperCase() : `${color.percentage}%`}</span>{selectedColorIndex === index && <Check className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full bg-black/65 p-0.5 text-white" />}</button>)}</div>}
                            </MesaEscenario>
                                <MesaPasos etiqueta="Progreso de la paleta" pasos={PASOS} estados={estadosPasos} />
                            </div>
                            <MesaRail etiqueta="Herramientas de la paleta">
                                <MesaBoton pista={copiedToken === "css" ? "CSS copiado" : "Copiar paleta CSS"} listo={copiedToken === "css"} disabled={!palette.length} onClick={() => { void copyValue(css, "css"); }}><IconoCopiar /></MesaBoton>
                                <MesaSeparador />
                                <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                            </MesaRail>
                            <aside aria-label="Detalle del color" className="mesa-panel space-y-4 p-5">
                                {activeColor && <><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-xl border border-white/10" style={{ backgroundColor: activeColor.hex }} /><div><p className="text-sm font-medium text-white">{getToneName(activeColor.hsl)}</p><p className="mt-1 text-xs text-slate-400">{getRole(selectedColorIndex)} · {activeColor.percentage}%</p></div></div>
                                    <div className="space-y-2">{[{ label: "HEX", value: activeColor.hex.toUpperCase(), token: "hex" }, { label: "RGB", value: `rgb(${activeColor.rgb.r}, ${activeColor.rgb.g}, ${activeColor.rgb.b})`, token: "rgb" }, { label: "HSL", value: `hsl(${activeColor.hsl.h}, ${activeColor.hsl.s}%, ${activeColor.hsl.l}%)`, token: "hsl" }].map((item) => <button key={item.token} type="button" onClick={() => copyValue(item.value, item.token)} aria-label={`Copiar ${item.label}: ${item.value}`} className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-left transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-pink-300"><span className="min-w-0"><span className="block text-[10px] text-slate-500">{item.label}</span><span className="mt-1 block break-all font-mono text-xs text-slate-200">{item.value}</span></span>{copiedToken === item.token ? <Check className="h-4 w-4 shrink-0 text-pink-200" /> : <Copy className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-200" />}</button>)}</div>
                                    <div className="border-t border-white/10 pt-4"><p className="mb-3 text-xs text-slate-400">Armonías · pulsa para copiar</p><div className="grid grid-cols-4 gap-2">{harmony.map((item, index) => <button key={item.label} type="button" title={item.label} aria-label={`Copiar ${item.label}: ${item.swatch}`} onClick={() => copyValue(item.swatch, `harmony-${index}`)} className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 focus-visible:ring-2 focus-visible:ring-white" style={{ backgroundColor: item.swatch }}>{copiedToken === `harmony-${index}` && <Check className="h-4 w-4 rounded bg-black/60 text-white" />}</button>)}</div></div>
                                </>}
                            </aside>
                        </div>
                    </section>
                )}
                {copiedToken && <p role="status" className="sr-only">Color copiado</p>}
                {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
            </main>
        </div>
    );
}
