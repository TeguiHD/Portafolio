"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { MesaBoton, MesaRail } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoDescargar, IconoImagen, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { imageBitmapFromSource, canvasToBlob, drawImageToCanvas } from "@/lib/tools/image-processing";

const ACCENT = "#F59E0B";

// ICO sizes commonly needed
const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "generar", etiqueta: "Generar ICO", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

/**
 * Generates an ICO file from a canvas.
 * ICO format: Header + Directory Entries + Image Data (PNG embedded)
 * SECURITY: No external dependencies, pure binary construction.
 */
async function generateIco(img: ImageBitmap, sizes: number[]): Promise<Blob> {
    const pngBlobs: { size: number; data: ArrayBuffer }[] = [];

    for (const size of sizes) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        // Draw image scaled to the target size with high-quality interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        drawImageToCanvas(ctx, img, { width: size, height: size, fitMode: "contain" });

        const blob = await canvasToBlob(canvas, "image/png");
        const buffer = await blob.arrayBuffer();
        pngBlobs.push({ size, data: buffer });
    }

    // Build ICO file
    // Header: 6 bytes
    // Directory entries: 16 bytes each
    // Image data: PNG blobs
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * pngBlobs.length;
    let dataOffset = headerSize + dirSize;

    const totalSize = dataOffset + pngBlobs.reduce((acc, b) => acc + b.data.byteLength, 0);
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // ICONDIR header
    view.setUint16(0, 0, true);     // Reserved
    view.setUint16(2, 1, true);     // Type: 1 = ICO
    view.setUint16(4, pngBlobs.length, true); // Number of images

    // ICONDIRENTRY for each size
    for (let i = 0; i < pngBlobs.length; i++) {
        const entry = pngBlobs[i];
        const offset = headerSize + i * dirEntrySize;
        const w = entry.size >= 256 ? 0 : entry.size;
        const h = entry.size >= 256 ? 0 : entry.size;

        view.setUint8(offset + 0, w);          // Width
        view.setUint8(offset + 1, h);          // Height
        view.setUint8(offset + 2, 0);          // Color palette
        view.setUint8(offset + 3, 0);          // Reserved
        view.setUint16(offset + 4, 1, true);   // Color planes
        view.setUint16(offset + 6, 32, true);  // Bits per pixel
        view.setUint32(offset + 8, entry.data.byteLength, true);  // Image data size
        view.setUint32(offset + 12, dataOffset, true);             // Offset to image data

        dataOffset += entry.data.byteLength;
    }

    // Write image data
    let currentOffset = headerSize + dirSize;
    for (const entry of pngBlobs) {
        const src = new Uint8Array(entry.data);
        const dst = new Uint8Array(buffer, currentOffset, entry.data.byteLength);
        dst.set(src);
        currentOffset += entry.data.byteLength;
    }

    return new Blob([buffer], { type: "image/x-icon" });
}

export default function IcoConverterPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("convertir-ico");
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<number[]>([16, 32, 48]);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [urlDescargada, setUrlDescargada] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const resultUrlRef = useRef<string | null>(null);

    const handleImageLoad = useCallback((file: File, dataUrl: string) => {
        setSourceImage(dataUrl);
        setSourceFile(file);
        setResultUrl(null);
    }, []);

    const handleClear = useCallback(() => {
        setSourceImage(null);
        setSourceFile(null);
        setResultUrl(null);
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    }, []);

    const toggleSize = (size: number) => {
        setSelectedSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size].sort((a, b) => a - b)
        );
        setResultUrl(null);
    };

    useEffect(() => () => { if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current); }, []);
    useEffect(() => {
        setResultUrl(null);
        setError(null);
        if (!sourceImage || !selectedSizes.length) { setIsConverting(false); return; }
        let active = true;
        setIsConverting(true);
        const timer = setTimeout(async () => {
            let bitmap: ImageBitmap | null = null;
            try {
                bitmap = await imageBitmapFromSource(sourceFile, sourceImage);
                if (!active) return;
                const blob = await generateIco(bitmap, selectedSizes);
                if (!active) return;
                if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
                const url = URL.createObjectURL(blob);
                resultUrlRef.current = url;
                setResultUrl(url);
            } catch {
                if (active) setError("No se pudo generar el icono. Prueba con otra imagen.");
            } finally {
                bitmap?.close();
                if (active) setIsConverting(false);
            }
        }, 180);
        return () => { active = false; clearTimeout(timer); };
    }, [sourceImage, sourceFile, selectedSizes]);

    const handleDownload = useCallback(() => {
        if (!resultUrl || !sourceFile) return;
        const baseName = sourceFile.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
        const link = document.createElement("a");
        link.href = resultUrl;
        link.download = `${baseName}.ico`;
        link.click();
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
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Conversor a ICO"} />;
    }

    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : resultUrl ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : !selectedSizes.length ? ["listo", "pendiente", "pendiente"] : ["listo", "activo", "pendiente"];

    return <div className="tool-page"><main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <ToolPageHeader slug="convertir-ico" title="Convertir a ICO" description="Un icono, todos sus tamaños. Listo para descargar al subir tu imagen." />
        {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra tu logo o imagen" /> : <section aria-label="Editor de iconos ICO" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
            <MesaCabecera nombre={sourceFile?.name ?? "Imagen"}>
                <button type="button" className="studio-button studio-button-primary" onClick={handleDownload} disabled={!resultUrl || isConverting} aria-label="Descargar ICO"><IconoDescargar listo={!!resultUrl && urlDescargada === resultUrl} /><span><span className="hidden sm:inline">Descargar </span>ICO</span></button>
            </MesaCabecera>
            <div className="mesa-cuerpo mesa-cuerpo-panel">
                <div className="mesa-columna">
                    <MesaEscenario fondo="dark" pista={isConverting ? "Generando el icono" : resultUrl ? `${selectedSizes.length} ${selectedSizes.length === 1 ? "tamaño" : "tamaños"} · un archivo ICO` : selectedSizes.length ? undefined : "Elige al menos un tamaño"} className="p-5">
                        <div className="mb-5 flex min-h-[240px] items-center justify-center rounded-xl border border-white/5 bg-[#080e17]"><img src={sourceImage} alt="Vista previa del icono" className="h-40 w-40 object-contain" /></div>
                        <div className="flex min-h-20 flex-wrap items-end justify-center gap-4">{selectedSizes.map(size => <div key={size} className="flex flex-col items-center gap-2"><img src={sourceImage} alt="" width={Math.min(size, 64)} height={Math.min(size, 64)} className="rounded-sm object-contain" style={{ width: Math.min(size, 64), height: Math.min(size, 64) }} /><span className="text-[10px] text-slate-500">{size}px</span></div>)}</div>
                    </MesaEscenario>
                    <MesaPasos etiqueta="Progreso del icono" pasos={PASOS} estados={estadosPasos} />
                </div>
                <MesaRail etiqueta="Herramientas del icono">
                    <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                </MesaRail>
                <aside aria-label="Tamaños del icono" className="mesa-panel p-5">
                    <h2 className="mb-4 text-sm font-medium text-white">Tamaños incluidos</h2>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Elegir tamaños ICO">{ICO_SIZES.map(size => <button type="button" key={size} onClick={() => toggleSize(size)} aria-pressed={selectedSizes.includes(size)} className="studio-segment inline-flex items-center justify-center gap-2 border border-white/10">{selectedSizes.includes(size) && <Check size={14} aria-hidden="true" />}{size}×{size}</button>)}</div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">Tu imagen conserva su proporción y transparencia.</p>
                </aside>
            </div>
        </section>}
        {error && <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">{error}</p>}
    </main></div>;
}
