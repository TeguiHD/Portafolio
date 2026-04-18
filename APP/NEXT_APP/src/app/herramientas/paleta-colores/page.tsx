"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { StudioCard, StudioChip, StudioMetric, StudioStage } from "@/components/tools/ImageStudio";

const ACCENT = "#EC4899";

interface ColorInfo {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
    count: number;
    percentage: number;
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(value => value.toString(16).padStart(2, "0")).join("");
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
            colorMap.set(key, { r: qr, g: qg, b: qb, count: 1 });
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

    const totalCount = filtered.reduce((sum, color) => sum + color.count, 0);
    return filtered.map(color => ({
        hex: rgbToHex(color.r, color.g, color.b),
        rgb: { r: color.r, g: color.g, b: color.b },
        hsl: rgbToHsl(color.r, color.g, color.b),
        count: color.count,
        percentage: Math.round((color.count / totalCount) * 100),
    }));
}

export default function ColorPalettePage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("paleta-colores");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [palette, setPalette] = useState<ColorInfo[]>([]);
    const [numColors, setNumColors] = useState(6);
    const [selectedColorIndex, setSelectedColorIndex] = useState(0);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const extractFromImage = useCallback((imageUrl: string, colors: number) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(320 / img.naturalWidth, 320 / img.naturalHeight, 1);
            canvas.width = Math.round(img.naturalWidth * scale);
            canvas.height = Math.round(img.naturalHeight * scale);
            const context = canvas.getContext("2d");

            if (!context) return;

            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const nextPalette = extractPalette(imageData, colors);
            setPalette(nextPalette);
            setSelectedColorIndex(0);
        };
        img.src = imageUrl;
    }, []);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        void file;
        setSourceImage(dataUrl);
        setPalette([]);
        extractFromImage(dataUrl, numColors);
    }, [extractFromImage, numColors]);

    const handleClear = useCallback(() => {
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
        await navigator.clipboard.writeText(value);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 1600);
    }, []);

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

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#5a123a_0%,#0F1724_40%,#08111f_100%)]">
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
                <div className="mb-8 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-pink-300">Paleta</p>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl">Extraer paleta desde imagen</h1>
                    <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                        Obtén los colores dominantes de una imagen, revisa sus valores y copia variantes listas para diseño o interfaz.
                    </p>
                </div>

                <StudioCard
                    title="Imagen fuente"
                    description="La extracción se hace en local y prioriza los colores más representativos de la imagen."
                    eyebrow="Entrada"
                    accentColor={ACCENT}
                >
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <ImageDropzone
                            onImageLoad={handleImageLoad}
                            currentImage={sourceImage}
                            onClear={handleClear}
                            accentColor={ACCENT}
                            label="Arrastra una imagen para extraer su paleta"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <StudioMetric label="Colores" value={`${numColors} muestras`} accentColor={ACCENT} />
                            <StudioMetric label="Modo" value="Extracción local" accentColor={ACCENT} />
                            <StudioMetric label="Salida" value="HEX · RGB · HSL" accentColor={ACCENT} />
                            <StudioMetric label="Uso" value="Diseño y UI" accentColor={ACCENT} />
                        </div>
                    </div>
                </StudioCard>

                {sourceImage && palette.length > 0 && activeColor && (
                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <StudioCard
                            title="Análisis de color"
                            description="Haz clic en cualquier tarjeta para revisar tono, rol y armonías relacionadas."
                            eyebrow="Análisis"
                            accentColor={ACCENT}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <StudioStage title="Imagen" subtitle="Fuente" accentColor={ACCENT}>
                                    <img src={sourceImage} alt="Imagen analizada" className="max-h-[360px] w-full rounded-2xl object-contain" />
                                </StudioStage>
                                <StudioStage title="Color activo" subtitle={getToneName(activeColor.hsl)} accentColor={ACCENT} badge={getRole(selectedColorIndex)}>
                                    <div className="flex w-full flex-col items-center gap-4">
                                        <div className="h-44 w-full max-w-[320px] rounded-[28px] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.35)]" style={{ backgroundColor: activeColor.hex }} />
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <StudioChip accentColor={ACCENT} active>{activeColor.hex.toUpperCase()}</StudioChip>
                                            <StudioChip accentColor={ACCENT}>{activeColor.percentage}%</StudioChip>
                                            <StudioChip accentColor={ACCENT}>{`H${activeColor.hsl.h} S${activeColor.hsl.s} L${activeColor.hsl.l}`}</StudioChip>
                                        </div>
                                    </div>
                                </StudioStage>
                            </div>

                            <div className="mt-6 flex items-center justify-between gap-3">
                                <span className="text-sm text-neutral-400">Cantidad de colores</span>
                                <div className="flex flex-wrap gap-2">
                                    {[4, 6, 8, 10].map(count => (
                                        <button
                                            key={count}
                                            onClick={() => handleColorCount(count)}
                                            className="rounded-full px-3 py-2 text-xs font-semibold transition-all"
                                            style={numColors === count
                                                ? { backgroundColor: `${ACCENT}24`, color: "white", boxShadow: `0 0 0 1px ${ACCENT}` }
                                                : { backgroundColor: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 flex h-16 overflow-hidden rounded-2xl border border-white/10">
                                {palette.map((color, index) => (
                                    <button
                                        key={color.hex}
                                        onClick={() => setSelectedColorIndex(index)}
                                        className="relative transition-transform hover:scale-y-105"
                                        style={{ backgroundColor: color.hex, flex: color.percentage }}
                                        title={`${color.hex} · ${color.percentage}%`}
                                    >
                                        {selectedColorIndex === index && <span className="absolute inset-x-0 bottom-0 h-1 bg-white/80" />}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                                {palette.map((color, index) => (
                                    <button
                                        key={`${color.hex}-${index}`}
                                        onClick={() => setSelectedColorIndex(index)}
                                        className="min-w-[188px] rounded-[24px] border p-3 text-left transition-all"
                                        style={selectedColorIndex === index
                                            ? { borderColor: `${ACCENT}70`, backgroundColor: `${ACCENT}14` }
                                            : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                    >
                                        <div className="h-20 rounded-2xl" style={{ backgroundColor: color.hex }} />
                                        <div className="mt-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{getRole(index)}</p>
                                                <p className="mt-1 text-xs text-neutral-500">{getToneName(color.hsl)}</p>
                                            </div>
                                            <StudioChip accentColor={ACCENT} active={selectedColorIndex === index}>{color.percentage}%</StudioChip>
                                        </div>
                                        <p className="mt-3 font-mono text-sm text-white">{color.hex.toUpperCase()}</p>
                                    </button>
                                ))}
                            </div>
                        </StudioCard>

                        <div className="space-y-6">
                            <StudioCard
                                title="Detalle del color"
                                description="Copia valores listos para diseño o desarrollo."
                                eyebrow="Inspector"
                                accentColor={ACCENT}
                            >
                                <div className="space-y-3">
                                    {[
                                        { label: "HEX", value: activeColor.hex.toUpperCase(), token: "hex" },
                                        { label: "RGB", value: `rgb(${activeColor.rgb.r}, ${activeColor.rgb.g}, ${activeColor.rgb.b})`, token: "rgb" },
                                        { label: "HSL", value: `hsl(${activeColor.hsl.h}, ${activeColor.hsl.s}%, ${activeColor.hsl.l}%)`, token: "hsl" },
                                    ].map(item => (
                                        <button
                                            key={item.token}
                                            onClick={() => copyValue(item.value, item.token)}
                                            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-all hover:bg-black/30"
                                        >
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{item.label}</p>
                                                <p className="mt-1 font-mono text-sm text-white">{item.value}</p>
                                            </div>
                                            <span className="text-xs text-neutral-400">{copiedToken === item.token ? "copiado" : "copiar"}</span>
                                        </button>
                                    ))}
                                </div>
                            </StudioCard>

                            <StudioCard
                                title="Armonías"
                                description="Variaciones automáticas útiles para construir acentos, fondos o sistemas cromáticos."
                                eyebrow="Extensión"
                                accentColor={ACCENT}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    {harmony.map((item, index) => (
                                        <button
                                            key={`${item.label}-${index}`}
                                            onClick={() => copyValue(item.swatch, `harmony-${index}`)}
                                            className="rounded-[22px] border border-white/10 bg-black/20 p-3 text-left transition-all hover:bg-black/30"
                                        >
                                            <div className="h-16 rounded-2xl" style={{ backgroundColor: item.swatch }} />
                                            <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
                                            <p className="mt-1 font-mono text-xs text-neutral-400">{item.swatch}</p>
                                        </button>
                                    ))}
                                </div>
                            </StudioCard>

                            <StudioCard
                                title="Variables CSS"
                                description="Snippet directo para llevar la paleta a tu sistema de diseño."
                                eyebrow="Export"
                                accentColor={ACCENT}
                            >
                                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-neutral-300">
                                    {palette.map((color, index) => `--palette-${index + 1}: ${color.hex};`).join("\n")}
                                </pre>
                            </StudioCard>
                        </div>
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
