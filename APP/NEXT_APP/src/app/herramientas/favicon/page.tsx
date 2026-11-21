"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDownToLine, Code2, LoaderCircle, Smartphone } from "lucide-react";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCodigo, IconoDescargar, IconoImagen, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone, useSinAbrirArchivoSoltado } from "@/components/tools/ImageDropzone";
import { canvasToBlob, drawImageToCanvas, loadImageSource, revokeObjectUrl } from "@/lib/tools/image-processing";
import { descargarBlob } from "@/lib/tools/descargar";
import { useCopiar } from "@/lib/tools/copiar";
import { empaquetarIco } from "@/lib/tools/ico";

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
const ICO_SIZES = [16, 32, 48];
const APPLE_SIZE = 180;
const NOMBRE_POR_DEFECTO = "Mi sitio";

function etiquetasHtml(colorTema: string) {
    return `<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${colorTema}">`;
}

/** Va como texto: un .html con solo etiquetas <link> se abre en blanco en el navegador. */
function instrucciones(colorTema: string) {
    return `Cómo instalar estos favicons

1. Copia todos los archivos de este ZIP a la raíz de tu sitio (la carpeta donde está tu index.html).
2. Pega estas etiquetas dentro de <head> en tus páginas:

${etiquetasHtml(colorTema)}
`;
}

function crearManifest(nombre: string, nombreCorto: string, colorTema: string, colorFondo: string) {
    const nombreFinal = nombre.trim() || NOMBRE_POR_DEFECTO;
    return JSON.stringify({
        name: nombreFinal,
        short_name: nombreCorto.trim() || nombreFinal,
        icons: FAVICON_SIZES.filter((entry) => [192, 512].includes(entry.size)).map((entry) => ({ src: `/${entry.name}`, sizes: `${entry.size}x${entry.size}`, type: "image/png" })),
        theme_color: colorTema,
        background_color: colorFondo,
        display: "standalone",
    }, null, 2);
}

type FaviconPreview = { size: number; url: string; blob: Blob };
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "generar", etiqueta: "Ocho tamaños", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

export default function FaviconGeneratorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("favicon");
    useSinAbrirArchivoSoltado();
    const [source, setSource] = useState<{ id: number; file: File; url: string; image: HTMLImageElement } | null>(null);
    const [padding, setPadding] = useState(8);
    const [background, setBackground] = useState("#ffffff");
    const [transparent, setTransparent] = useState(true);
    // iOS no respeta la transparencia del apple-touch-icon: la pinta de negro. Ese icono siempre sale opaco.
    const [fondoApple, setFondoApple] = useState("#ffffff");
    const [nombreApp, setNombreApp] = useState("");
    const [nombreCorto, setNombreCorto] = useState("");
    const [colorTema, setColorTema] = useState("#ffffff");
    const [generated, setGenerated] = useState<{ key: string; items: FaviconPreview[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [decoding, setDecoding] = useState(false);
    const [packing, setPacking] = useState(false);
    const [zipDescargado, setZipDescargado] = useState<string | null>(null);
    const { copiado, fallo, copiar } = useCopiar(2000);
    const sourceVersion = useRef(0);
    const previewsRef = useRef<FaviconPreview[]>([]);
    // La URL blob: del logo es de esta página (el recuadro de carga se desmonta): se libera al cambiarlo o al salir.
    const urlFuenteRef = useRef<string | null>(null);
    const fondoIconoApple = transparent ? fondoApple : background;
    const key = JSON.stringify([source?.id, padding, background, transparent, fondoIconoApple]);
    const zipKey = JSON.stringify([key, nombreApp, nombreCorto, colorTema]);
    const previews = generated?.key === key ? generated.items : [];
    const snippet = etiquetasHtml(colorTema);

    const clearUrls = useCallback(() => {
        previewsRef.current.forEach((item) => revokeObjectUrl(item.url));
        previewsRef.current = [];
    }, []);

    const cambiarUrlFuente = useCallback((siguiente: string | null) => {
        if (urlFuenteRef.current !== siguiente) revokeObjectUrl(urlFuenteRef.current);
        urlFuenteRef.current = siguiente;
    }, []);

    const handleImageLoad = useCallback((file: File, url: string) => {
        const version = ++sourceVersion.current;
        clearUrls();
        cambiarUrlFuente(url);
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
    }, [clearUrls, cambiarUrlFuente]);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        clearUrls();
        cambiarUrlFuente(null);
        setSource(null);
        setGenerated(null);
        setError(null);
        setPacking(false);
    }, [clearUrls, cambiarUrlFuente]);

    useEffect(() => () => {
        sourceVersion.current += 1;
        clearUrls();
        cambiarUrlFuente(null);
    }, [clearUrls, cambiarUrlFuente]);

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
                    const relleno = size === APPLE_SIZE ? fondoIconoApple : transparent ? null : background;
                    if (relleno) { context.fillStyle = relleno; context.fillRect(0, 0, size, size); }
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
    }, [source, padding, background, transparent, fondoIconoApple, key]);

    const handleDownloadZip = async () => {
        if (!previews.length || packing) return;
        const version = sourceVersion.current;
        setPacking(true);
        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            for (const item of previews) zip.file(FAVICON_SIZES.find((entry) => entry.size === item.size)!.name, item.blob);
            const icoPngs = await Promise.all(ICO_SIZES.map(async (lado) => {
                const preview = previews.find((item) => item.size === lado);
                if (!preview) throw new Error(`Falta el tamaño ${lado}`);
                return { lado, png: await preview.blob.arrayBuffer() };
            }));
            zip.file("favicon.ico", empaquetarIco(icoPngs));
            zip.file("site.webmanifest", crearManifest(nombreApp, nombreCorto, colorTema, fondoIconoApple));
            zip.file("INSTRUCCIONES.txt", instrucciones(colorTema));
            const blob = await zip.generateAsync({ type: "blob" });
            if (version !== sourceVersion.current) return;
            descargarBlob(blob, "favicons.zip");
            setZipDescargado(zipKey);
        } catch {
            if (version === sourceVersion.current) setError("No se pudo crear el ZIP. Puedes descargar cada tamaño por separado.");
        } finally { if (version === sourceVersion.current) setPacking(false); }
    };

    if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Cargando herramienta"><LoaderCircle className="h-6 w-6 text-slate-400 motion-safe:animate-spin" /></div>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de favicons"} />;

    const estadosPasos: EstadoPaso[] = !source ? ["activo", "pendiente", "pendiente"] : previews.length ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];
    const pista = copiado === "html" ? "Etiquetas copiadas"
        : fallo === "html" ? "No se pudo copiar · cópialas desde «Ver etiquetas HTML»"
        : previews.length ? "8 PNG, favicon.ico, manifest y etiquetas HTML" : error ? undefined : "Generando tamaños";

    return <div className="tool-page"><main className="tool-main pb-12 pt-20 sm:pt-24">
        <ToolPageHeader slug="favicon" />
        {!source ? <><ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra tu logo o icono" sublabel="PNG, JPG o WebP · conserva la proporción original" />{decoding && <p role="status" className="mt-4 text-center text-sm text-slate-400">Abriendo imagen…</p>}</> : <section aria-label="Estudio de favicons" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
            <MesaCabecera nombre={source.file.name} detalle={`${source.image.naturalWidth} × ${source.image.naturalHeight} px`}>
                <button type="button" onClick={() => { void handleDownloadZip(); }} disabled={!previews.length || packing} className="studio-button studio-button-primary">{packing ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={zipDescargado === zipKey && previews.length > 0} />}<span><span className="hidden sm:inline">Descargar </span>ZIP</span></button>
            </MesaCabecera>
            <div className="mesa-cuerpo mesa-cuerpo-panel">
                <div className="mesa-columna">
                    <MesaEscenario fondo="dark" pista={pista} className="space-y-5 p-5 sm:p-6">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080e17]"><div className="flex h-12 items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4"><div className="flex gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /></div><div className="flex h-9 items-center gap-2 rounded-t-lg bg-white/5 px-4 text-xs text-slate-300"><img src={previews.find((item) => item.size === 32)?.url ?? source.url} width={16} height={16} alt="Favicon en una pestaña" className="object-contain" />{nombreApp.trim() || "Tu página"}</div></div><div className="flex min-h-44 items-center justify-center gap-7"><div className="flex h-24 w-24 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 shadow-xl"><img src={previews.find((item) => item.size === APPLE_SIZE)?.url ?? source.url} alt="Icono en pantalla de inicio" className="h-20 w-20 rounded-[18px] object-contain" /></div><div className="space-y-2 text-xs text-slate-400"><Smartphone className="h-5 w-5 text-cyan-200" /><p>{nombreCorto.trim() || nombreApp.trim() || "Tu marca, en cada pantalla."}</p></div></div></div>
                        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Descargar tamaños individuales">{FAVICON_SIZES.map((item) => { const preview = previews.find((entry) => entry.size === item.size); return <button key={item.size} type="button" disabled={!preview} title={`Descargar ${item.name}`} aria-label={`Descargar ${item.size} × ${item.size}`} onClick={() => preview && descargarBlob(preview.blob, item.name)} className="group flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-1 py-4 transition-colors hover:border-cyan-200/40 hover:bg-cyan-200/5 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40">{preview ? <img src={preview.url} alt="" className="h-8 w-8 object-contain" /> : <LoaderCircle className="h-8 w-8 text-slate-500 motion-safe:animate-spin" />}<span className="font-mono text-xs text-slate-200">{item.size}px</span><span className="flex items-center gap-1 text-[10px] text-slate-500"><ArrowDownToLine className="h-3 w-3 transition-colors group-hover:text-cyan-200" />{item.desc}</span></button>; })}</div>
                    </MesaEscenario>
                    <MesaPasos etiqueta="Progreso del favicon" pasos={PASOS} estados={estadosPasos} />
                </div>
                <MesaRail etiqueta="Herramientas del favicon">
                    <MesaBoton pista="Copiar etiquetas HTML" listo={copiado === "html"} onClick={() => { void copiar(snippet, "html"); }}><IconoCodigo /></MesaBoton>
                    <MesaSeparador />
                    <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                </MesaRail>
                <aside aria-label="Ajustes de favicon" className="mesa-panel space-y-5 p-5">
                    <label className="block text-xs text-slate-300"><span className="mb-3 flex justify-between"><span>Margen interior</span><output className="font-mono text-cyan-200">{padding}%</output></span><input type="range" min={0} max={30} value={padding} onChange={(event) => setPadding(Number(event.target.value))} className="h-5 w-full cursor-pointer accent-cyan-200" /></label>
                    <label className="flex cursor-pointer items-center gap-3 text-xs text-slate-300"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} className="h-4 w-4 accent-cyan-200" />Fondo transparente</label>
                    {!transparent && <label className="flex items-center justify-between text-xs text-slate-300">Color de fondo<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-10 w-12 cursor-pointer rounded bg-transparent" /></label>}
                    {transparent && <div><label className="flex items-center justify-between text-xs text-slate-300">Fondo del icono de Apple<input type="color" value={fondoApple} aria-describedby="favicon-apple-nota" onChange={(event) => setFondoApple(event.target.value)} className="h-10 w-12 cursor-pointer rounded bg-transparent" /></label><p id="favicon-apple-nota" className="mt-1 text-[11px] leading-5 text-slate-500">iPhone y iPad pintan de negro lo transparente, por eso ese icono va con fondo.</p></div>}
                    <div role="group" aria-labelledby="favicon-manifest" className="space-y-4 border-t border-white/10 pt-5">
                        <p id="favicon-manifest" className="text-xs font-medium text-slate-200">Manifest</p>
                        <label className="studio-field">Nombre de la app<input type="text" value={nombreApp} maxLength={60} autoComplete="off" placeholder={NOMBRE_POR_DEFECTO} onChange={(event) => setNombreApp(event.target.value)} /></label>
                        <div className="studio-field"><label htmlFor="favicon-corto">Nombre corto</label><input id="favicon-corto" type="text" value={nombreCorto} maxLength={30} autoComplete="off" aria-describedby="favicon-corto-nota" placeholder={nombreApp.trim() || NOMBRE_POR_DEFECTO} onChange={(event) => setNombreCorto(event.target.value)} /><small id="favicon-corto-nota">Va bajo el icono en el celular. Si lo dejas vacío, se usa el nombre.</small></div>
                        <label className="flex items-center justify-between text-xs text-slate-300">Color del tema<input type="color" value={colorTema} onChange={(event) => setColorTema(event.target.value)} className="h-10 w-12 cursor-pointer rounded bg-transparent" /></label>
                    </div>
                    <div className="border-t border-white/10 pt-5"><Code2 className="mb-3 h-5 w-5 text-slate-500" aria-hidden="true" /><p className="text-xs leading-5 text-slate-400">Copia los archivos a la raíz de tu web y añade las etiquetas HTML al encabezado.</p></div>
                </aside>
            </div>
        </section>}
        {source && <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-xs text-slate-400">Ver etiquetas HTML</summary><pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-300"><code>{snippet}</code></pre></details>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    </main></div>;
}
