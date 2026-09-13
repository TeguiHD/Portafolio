"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, Code2, ImagePlus, LoaderCircle, Package, Smartphone } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { canvasToBlob, drawImageToCanvas, loadImageSource, revokeObjectUrl, triggerDownload } from "@/lib/tools/image-processing";

const ACCENT = "#67E8F9";
const FAVICON_SIZES = [
    { size: 16, name: "favicon-16x16.png", desc: "Navegador" },
    { size: 32, name: "favicon-32x32.png", desc: "Retina" },
    { size: 48, name: "favicon-48x48.png", desc: "Windows" },
    { size: 64, name: "favicon-64x64.png", desc: "Safari" },
    { size: 128, name: "icon-128x128.png", desc: "Chrome" },
    { size: 180, name: "apple-touch-icon.png", desc: "Apple" },
    { size: 192, name: "android-chrome-192x192.png", desc: "Android" },
    { size: 512, name: "android-chrome-512x512.png", desc: "PWA" },
];
const HTML_SNIPPET = `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;
type FaviconPreview = { size: number; url: string; blob: Blob };

export default function FaviconGeneratorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("favicon");
    const [source, setSource] = useState<{ id: number; file: File; url: string; image: HTMLImageElement } | null>(null);
    const [padding, setPadding] = useState(8);
    const [background, setBackground] = useState("#ffffff");
    const [transparent, setTransparent] = useState(true);
    const [generated, setGenerated] = useState<{ key: string; items: FaviconPreview[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [decoding, setDecoding] = useState(false);
    const [packing, setPacking] = useState(false);
    const [copied, setCopied] = useState(false);
    const sourceVersion = useRef(0);
    const previewsRef = useRef<FaviconPreview[]>([]);
    const zipUrlRef = useRef<string | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const key = JSON.stringify([source?.id, padding, background, transparent]);
    const previews = generated?.key === key ? generated.items : [];

    const clearUrls = useCallback(() => {
        previewsRef.current.forEach((item) => revokeObjectUrl(item.url));
        previewsRef.current = [];
        revokeObjectUrl(zipUrlRef.current);
        zipUrlRef.current = null;
    }, []);

    const handleImageLoad = useCallback((file: File, url: string) => {
        const version = ++sourceVersion.current;
        clearUrls();
        setSource(null);
        setGenerated(null);
        setError(null);
        setDecoding(true);
        setPacking(false);
        void loadImageSource(url).then((image) => {
            if (version === sourceVersion.current) setSource({ id: version, file, url, image });
        }).catch(() => {
            if (version === sourceVersion.current) setError("No se pudo leer la imagen. Prueba con otro archivo.");
        }).finally(() => { if (version === sourceVersion.current) setDecoding(false); });
    }, [clearUrls]);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        clearUrls();
        setSource(null);
        setGenerated(null);
        setError(null);
        setPacking(false);
    }, [clearUrls]);

    useEffect(() => () => {
        sourceVersion.current += 1;
        clearUrls();
        if (copyTimer.current) clearTimeout(copyTimer.current);
    }, [clearUrls]);

    useEffect(() => {
        if (!source) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            const next: FaviconPreview[] = [];
            try {
                for (const { size } of FAVICON_SIZES) {
                    const canvas = document.createElement("canvas");
                    canvas.width = canvas.height = size;
                    const context = canvas.getContext("2d");
                    if (!context) throw new Error("No se pudo generar el icono.");
                    if (!transparent) { context.fillStyle = background; context.fillRect(0, 0, size, size); }
                    const inset = size * padding / 100;
                    context.translate(inset, inset);
                    context.imageSmoothingEnabled = true;
                    context.imageSmoothingQuality = "high";
                    drawImageToCanvas(context, source.image, { width: size - inset * 2, height: size - inset * 2, fitMode: "contain" });
                    const blob = await canvasToBlob(canvas, "image/png");
                    if (cancelled) return;
                    next.push({ size, blob, url: URL.createObjectURL(blob) });
                }
                previewsRef.current.forEach((item) => revokeObjectUrl(item.url));
                previewsRef.current = next;
                setGenerated({ key, items: next });
                setError(null);
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudieron generar los favicons.");
            } finally {
                if (cancelled || next.length !== FAVICON_SIZES.length) next.forEach((item) => revokeObjectUrl(item.url));
            }
        }, 180);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [source, padding, background, transparent, key]);

    const handleDownloadZip = async () => {
        if (!previews.length || packing) return;
        const version = sourceVersion.current;
        setPacking(true);
        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            for (const item of previews) zip.file(FAVICON_SIZES.find((entry) => entry.size === item.size)!.name, item.blob);
            zip.file("site.webmanifest", JSON.stringify({ name: "App", icons: FAVICON_SIZES.filter((entry) => [192, 512].includes(entry.size)).map((entry) => ({ src: `/${entry.name}`, sizes: `${entry.size}x${entry.size}`, type: "image/png" })) }, null, 2));
            zip.file("INSTRUCCIONES.html", HTML_SNIPPET);
            const blob = await zip.generateAsync({ type: "blob" });
            if (version !== sourceVersion.current) return;
            revokeObjectUrl(zipUrlRef.current);
            const url = URL.createObjectURL(blob);
            zipUrlRef.current = url;
            triggerDownload(url, "favicons.zip");
        } catch {
            if (version === sourceVersion.current) setError("No se pudo crear el ZIP. Puedes descargar cada tamaño por separado.");
        } finally { if (version === sourceVersion.current) setPacking(false); }
    };

    const copySnippet = async () => {
        try {
            await navigator.clipboard.writeText(HTML_SNIPPET);
            setCopied(true);
            if (copyTimer.current) clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopied(false), 1800);
        } catch { setError("No se pudo copiar. Selecciona el código para copiarlo manualmente."); }
    };

    if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Cargando herramienta"><LoaderCircle className="h-6 w-6 text-slate-400 motion-safe:animate-spin" /></div>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de Favicons"} />;

    return <div className="tool-page"><main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
        <ToolPageHeader slug="favicon" title="Favicons, listos para tu web" description="Sube tu logo. Ocho tamaños, un manifest y todo en un ZIP." />
        {!source ? <><ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra tu logo o icono" sublabel="PNG, JPG o WebP · conserva la proporción original" />{decoding && <p role="status" className="mt-4 text-center text-sm text-slate-400">Abriendo imagen…</p>}</> : <section aria-label="Estudio de favicons" className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c131d]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3 sm:px-5"><div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Cambiar imagen" title="Cambiar imagen" onClick={handleClear} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-300"><ImagePlus className="h-4 w-4" /></button><span className="truncate text-sm text-slate-300">{source.file.name}</span></div><button type="button" disabled={!previews.length || packing} onClick={handleDownloadZip} className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-cyan-200 px-4 text-sm font-semibold text-cyan-950 hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40">{packing ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : <Package className="h-4 w-4" />}Descargar ZIP</button></div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6 p-5 sm:p-8">
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080e17]"><div className="flex h-12 items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4"><div className="flex gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /></div><div className="flex h-9 items-center gap-2 rounded-t-lg bg-white/5 px-4 text-xs text-slate-300"><img src={previews.find((item) => item.size === 32)?.url ?? source.url} width={16} height={16} alt="Favicon en una pestaña" className="object-contain" />Tu página</div></div><div className="flex min-h-44 items-center justify-center gap-7"><div className="flex h-24 w-24 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 shadow-xl"><img src={previews.find((item) => item.size === 180)?.url ?? source.url} alt="Icono en pantalla de inicio" className="h-20 w-20 object-contain" /></div><div className="space-y-2 text-xs text-slate-400"><Smartphone className="h-5 w-5 text-cyan-200" /><p>Tu marca, en cada pantalla.</p></div></div></div>
                    <div className="grid grid-cols-4 gap-2" aria-label="Descargar tamaños individuales">{FAVICON_SIZES.map((item) => { const preview = previews.find((entry) => entry.size === item.size); return <button key={item.size} type="button" disabled={!preview} title={`Descargar ${item.name}`} aria-label={`Descargar ${item.size} × ${item.size}`} onClick={() => preview && triggerDownload(preview.url, item.name)} className="group flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-1 py-4 transition-colors hover:border-cyan-200/40 hover:bg-cyan-200/5 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40">{preview ? <img src={preview.url} alt="" className="h-8 w-8 object-contain" /> : <LoaderCircle className="h-8 w-8 text-slate-500 motion-safe:animate-spin" />}<span className="font-mono text-xs text-slate-200">{item.size}px</span><span className="flex items-center gap-1 text-[10px] text-slate-500"><ArrowDownToLine className="h-3 w-3 transition-colors group-hover:text-cyan-200" />{item.desc}</span></button>; })}</div>
                    <p role="status" className="flex items-center gap-2 text-xs text-slate-400">{previews.length ? <Check className="h-4 w-4 text-cyan-200" /> : <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />}{previews.length ? "8 PNG + manifest + código HTML" : "Generando tamaños…"}</p>
                </div>
                <aside aria-label="Ajustes de favicon" className="space-y-5 border-t border-white/10 bg-white/[0.02] p-5 lg:border-l lg:border-t-0"><label className="block text-xs text-slate-300"><span className="mb-3 flex justify-between"><span>Margen interior</span><output className="font-mono text-cyan-200">{padding}%</output></span><input type="range" min={0} max={30} value={padding} onChange={(event) => setPadding(Number(event.target.value))} className="h-5 w-full cursor-pointer accent-cyan-200" /></label><label className="flex cursor-pointer items-center gap-3 text-xs text-slate-300"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} className="h-4 w-4 accent-cyan-200" />Fondo transparente</label>{!transparent && <label className="flex items-center justify-between text-xs text-slate-300">Color de fondo<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-10 w-12 cursor-pointer rounded bg-transparent" /></label>}<div className="border-t border-white/10 pt-5"><Code2 className="mb-3 h-5 w-5 text-slate-500" /><p className="text-xs leading-5 text-slate-400">Copia los archivos a la raíz de tu web y añade las etiquetas HTML al encabezado.</p><button type="button" onClick={copySnippet} className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 text-xs text-slate-200 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-300">{copied ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}{copied ? "Copiado" : "Copiar etiquetas HTML"}</button></div></aside>
            </div>
        </section>}
        {source && <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-xs text-slate-400">Ver etiquetas HTML</summary><pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-300">{HTML_SNIPPET}</pre></details>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    </main></div>;
}
