"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { AlertCircle, Check, Link2, LoaderCircle, Maximize2, SlidersHorizontal, Unlink2 } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone, useSinAbrirArchivoSoltado } from "@/components/tools/ImageDropzone";
import { LoteImagenes } from "@/components/tools/LoteImagenes";
import { useToolAccess } from "@/hooks/useToolAccess";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoAjustes, IconoDescargar, IconoImagen, IconoOjo, IconoSubir } from "@/components/tools/mesa/MesaIcons";
import { loadImageSource, revokeObjectUrl, type DrawFitMode, type ExportMimeType } from "@/lib/tools/image-processing";
import { exportarImagen, extensionDe, formatearPeso, usaPesoObjetivo, type AjustesImagen, type ImagenExportada, type ModoEstudio } from "@/lib/tools/exportar-imagen";
import { etiquetaFormato, listaFormatos } from "@/lib/tools/firmas-imagen";
import { descargarBlob, nombreArchivo } from "@/lib/tools/descargar";
import { numeroCL } from "@/lib/tools/numeros";

const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "procesar", etiqueta: "Procesar", icono: <IconoAjustes /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

const CONFIG = {
    "convertir-imagen": { title: "Convertir imagen", description: "PNG, WebP o JPEG. Elige el formato y tu archivo estará listo.", accent: "#FBBF24", suffix: "convertida" },
    "comprimir-imagen": { title: "Comprimir imagen", description: "Menos peso. La misma imagen. Ajusta la calidad y compara.", accent: "#60A5FA", suffix: "comprimida" },
    redimensionar: { title: "Redimensionar imagen", description: "El tamaño exacto, con una vista previa que responde a tus ajustes.", accent: "#C4B5FD", suffix: "redimensionada" },
};
const FORMATOS_ENTRADA = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif", "image/bmp"];
const FORMATS: { value: ExportMimeType; label: string }[] = [
    { value: "image/webp", label: "WebP" },
    { value: "image/png", label: "PNG" },
    { value: "image/jpeg", label: "JPEG" },
];
const PRESETS = [
    { label: "Instagram · publicación", width: 1080, height: 1080 },
    { label: "Instagram · historia", width: 1080, height: 1920 },
    { label: "YouTube · miniatura", width: 1280, height: 720 },
    { label: "YouTube · banner", width: 2560, height: 1440 },
    { label: "Facebook · portada", width: 820, height: 312 },
    { label: "LinkedIn · banner", width: 1584, height: 396 },
    { label: "Full HD", width: 1920, height: 1080 },
    { label: "4K", width: 3840, height: 2160 },
];
/** 50 MB: más que el máximo de entrada, así que nunca limita de verdad. */
const OBJETIVO_MAXIMO_KB = 50 * 1024;
const fieldClass = "min-h-11 w-full rounded-lg border border-white/10 bg-[#0a111b] px-3 text-sm text-slate-200 outline-none transition-colors focus:border-white/40 focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40";
const actionClass = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Formato de partida al abrir una imagen. Comprimir y redimensionar conservan el de la foto (un JPEG sigue siendo JPEG:
 * antes salía en WebP o en PNG, que además pesa más); un PNG se comprime en WebP porque PNG no tiene calidad.
 * Convertir no cambia lo elegido.
 */
function formatoInicial(mode: ModoEstudio, tipo: string): ExportMimeType | null {
    if (mode === "convertir-imagen") return null;
    if (tipo === "image/jpeg") return "image/jpeg";
    if (tipo === "image/webp") return "image/webp";
    return mode === "comprimir-imagen" ? "image/webp" : "image/png";
}

/** Entero de un campo numérico leído a la chilena: «1.080» son mil ochenta, no 1,08 (que redondeado daba 1 px). */
function enteroDeCampo(valor: string): number {
    return Math.max(0, Math.round(numeroCL(valor) ?? 0));
}

type Resultado = { key: string; url: string; blob: Blob; width: number; height: number; mime: string; calidad: number | null; objetivo: ImagenExportada["objetivo"] };

export function ImageTransformStudio({ mode }: { mode: ModoEstudio }) {
    const config = CONFIG[mode];
    const idAyudaObjetivo = useId();
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess(mode);
    useSinAbrirArchivoSoltado();
    const [source, setSource] = useState<{ id: number; file: File; url: string; image: HTMLImageElement } | null>(null);
    const [lote, setLote] = useState<{ id: number; archivos: File[] } | null>(null);
    const [decoding, setDecoding] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [format, setFormat] = useState<ExportMimeType>(mode === "redimensionar" ? "image/png" : "image/webp");
    const [quality, setQuality] = useState(mode === "comprimir-imagen" ? 75 : 90);
    const [maxEdge, setMaxEdge] = useState(0);
    const [objetivoKb, setObjetivoKb] = useState(0);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [locked, setLocked] = useState(true);
    const [fit, setFit] = useState<DrawFitMode>("contain");
    const [fill, setFill] = useState(false);
    const [background, setBackground] = useState("#ffffff");
    const [comparando, setComparando] = useState(false);
    const [descargado, setDescargado] = useState(false);
    const [result, setResult] = useState<Resultado | null>(null);
    const [exportError, setExportError] = useState<{ key: string; message: string } | null>(null);
    const sourceVersion = useRef(0);
    const resultUrl = useRef<string | null>(null);
    const sourceUrl = useRef<string | null>(null);
    const ajustes = useMemo<AjustesImagen>(() => ({
        modo: mode,
        formato: format,
        calidad: quality,
        ladoMaximo: mode === "comprimir-imagen" ? maxEdge : 0,
        ancho: width,
        alto: height,
        proporcionFija: locked,
        encaje: fit,
        rellenar: mode === "redimensionar" && fill,
        fondo: background,
        objetivoKb: mode === "comprimir-imagen" ? objetivoKb : 0,
    }), [mode, format, quality, maxEdge, width, height, locked, fit, fill, background, objetivoKb]);
    const objetivoActivo = usaPesoObjetivo(ajustes);
    const key = useMemo(() => JSON.stringify([source?.id, ajustes]), [source?.id, ajustes]);
    const currentResult = result?.key === key ? result : null;
    const error = exportError?.key === key ? exportError.message : loadError;
    const processing = !!source && !currentResult && !error;

    // La URL de la imagen original es de este estudio (el recuadro de carga se desmonta): la libera al cambiarla.
    const soltarOriginal = useCallback(() => {
        revokeObjectUrl(sourceUrl.current);
        sourceUrl.current = null;
        revokeObjectUrl(resultUrl.current);
        resultUrl.current = null;
    }, []);

    const handleLoad = useCallback((file: File, url: string) => {
        const version = ++sourceVersion.current;
        setDecoding(true);
        setLoadError(null);
        setSource(null);
        setLote(null);
        setResult(null);
        setExportError(null);
        setComparando(false);
        setDescargado(false);
        revokeObjectUrl(sourceUrl.current);
        sourceUrl.current = url;
        revokeObjectUrl(resultUrl.current);
        resultUrl.current = null;
        const inicial = formatoInicial(mode, file.type);
        if (inicial) setFormat(inicial);
        void loadImageSource(url).then((image) => {
            if (version !== sourceVersion.current) return;
            setSource({ id: version, file, url, image });
            setWidth(image.naturalWidth);
            setHeight(image.naturalHeight);
        }).catch(() => {
            if (version === sourceVersion.current) setLoadError("No se pudo abrir esta imagen. Prueba con PNG, JPEG o WebP.");
        }).finally(() => { if (version === sourceVersion.current) setDecoding(false); });
    }, [mode]);

    const handleLote = useCallback((archivos: File[]) => {
        const version = ++sourceVersion.current;
        setSource(null);
        setResult(null);
        setDecoding(false);
        setLoadError(null);
        setExportError(null);
        setComparando(false);
        setDescargado(false);
        soltarOriginal();
        // Con tipos mezclados se deja el formato elegido.
        const inicial = new Set(archivos.map((archivo) => archivo.type)).size === 1 ? formatoInicial(mode, archivos[0].type) : null;
        if (inicial) setFormat(inicial);
        setLote({ id: version, archivos });
        // Medidas de partida: las de la primera imagen.
        if (mode === "redimensionar") {
            void createImageBitmap(archivos[0]).then((bitmap) => {
                if (version === sourceVersion.current) {
                    setWidth(bitmap.width);
                    setHeight(bitmap.height);
                }
                bitmap.close();
            }).catch(() => undefined);
        }
    }, [mode, soltarOriginal]);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        setSource(null);
        setLote(null);
        setResult(null);
        setDecoding(false);
        setLoadError(null);
        setExportError(null);
        soltarOriginal();
    }, [soltarOriginal]);

    useEffect(() => () => {
        sourceVersion.current += 1;
        revokeObjectUrl(resultUrl.current);
        revokeObjectUrl(sourceUrl.current);
    }, []);

    useEffect(() => {
        if (!source) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const exportada = await exportarImagen(source.image, ajustes, { signal: controller.signal });
                if (controller.signal.aborted) return;
                const url = URL.createObjectURL(exportada.blob);
                revokeObjectUrl(resultUrl.current);
                resultUrl.current = url;
                setResult({ key, url, blob: exportada.blob, width: exportada.ancho, height: exportada.alto, mime: exportada.blob.type, calidad: exportada.calidad, objetivo: exportada.objetivo });
                setDescargado(false);
                setExportError(null);
            } catch (cause) {
                if (!controller.signal.aborted) setExportError({ key, message: cause instanceof Error ? cause.message : "No se pudo exportar la imagen." });
            }
        }, objetivoActivo ? 500 : 220);
        return () => { controller.abort(); window.clearTimeout(timer); };
    }, [source, ajustes, key, objetivoActivo]);

    const updateDimension = (dimension: "width" | "height", value: number, enLote: boolean) => {
        const next = Math.max(0, Math.round(value));
        // Con el campo vacío (0) no se toca el otro: así no salta a 1 mientras se escribe.
        const proporcional = locked && !!source && !enLote && next > 0;
        if (dimension === "width") {
            setWidth(next);
            if (proporcional && source) setHeight(Math.max(1, Math.round(next * source.image.naturalHeight / source.image.naturalWidth)));
        } else {
            setHeight(next);
            if (proporcional && source) setWidth(Math.max(1, Math.round(next * source.image.naturalWidth / source.image.naturalHeight)));
        }
    };
    const download = () => {
        if (!currentResult || !source) return;
        descargarBlob(currentResult.blob, `${nombreArchivo(source.file.name, "imagen")}_${config.suffix}.${extensionDe(currentResult.mime)}`);
        setDescargado(true);
    };
    const savings = source && currentResult ? Math.round((1 - currentResult.blob.size / source.file.size) * 100) : null;

    if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Cargando herramienta"><LoaderCircle className="h-6 w-6 text-slate-400 motion-safe:animate-spin" /></div>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || config.title} />;

    const estadosPasos: EstadoPaso[] = !source ? ["activo", "pendiente", "pendiente"] : currentResult ? ["listo", "listo", "listo"] : error ? ["listo", "error", "pendiente"] : ["listo", "activo", "pendiente"];
    const pista = !source ? undefined : comparando ? "Original" : processing ? (objetivoActivo ? "Buscando el peso objetivo" : "Procesando en tu dispositivo") : currentResult ? `${currentResult.width} × ${currentResult.height} · ${formatearPeso(currentResult.blob.size)}` : undefined;
    const objetivoTexto = !objetivoActivo || !source || error
        ? null
        : !currentResult?.objetivo
            ? `Buscando la mejor calidad para ${objetivoKb} KB…`
            : currentResult.objetivo.logrado
                ? `Pesa ${formatearPeso(currentResult.blob.size)}; el objetivo era ${objetivoKb} KB. Calidad ${currentResult.calidad}%${currentResult.objetivo.reducida ? `, reducida a ${currentResult.width} × ${currentResult.height} px` : ""}.`
                : `No se pudo llegar a ${objetivoKb} KB: lo más liviano fue ${formatearPeso(currentResult.blob.size)}, con calidad ${currentResult.calidad}% y ${currentResult.width} × ${currentResult.height} px.`;

    const panel = (enLote: boolean) => <aside aria-label={enLote ? "Ajustes del lote" : "Ajustes de imagen"} className="mesa-panel space-y-5 p-5">
        {mode === "redimensionar" && <>
            <label className="block text-xs text-slate-300"><span className="mb-2 block">Tamaños rápidos</span><select className={fieldClass} value="" onChange={(event) => { const preset = PRESETS[Number(event.target.value)]; setWidth(preset.width); setHeight(preset.height); setLocked(false); }}><option value="" disabled>Elegir un formato</option>{PRESETS.map((preset, index) => <option key={preset.label} value={index}>{preset.label} · {preset.width} × {preset.height}</option>)}</select></label>
            <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-xs text-slate-400"><span className="mb-2 block">Ancho (px)</span><input className={fieldClass} type="number" min={1} max={16000} value={width || ""} onChange={(event) => updateDimension("width", enteroDeCampo(event.target.value), enLote)} /></label><button type="button" title="Mantener proporción" aria-label="Mantener proporción" aria-pressed={locked} onClick={() => { const next = !locked; setLocked(next); if (next && source && !enLote && width > 0) setHeight(Math.max(1, Math.round(width * source.image.naturalHeight / source.image.naturalWidth))); }} className={actionClass} style={locked ? { color: config.accent } : undefined}>{locked ? <Link2 className="h-4 w-4" /> : <Unlink2 className="h-4 w-4" />}</button><label className="min-w-0 flex-1 text-xs text-slate-400"><span className="mb-2 block">Alto (px)</span><input className={fieldClass} type="number" min={1} max={16000} value={height || ""} onChange={(event) => updateDimension("height", enteroDeCampo(event.target.value), enLote)} /></label></div>
            {enLote && <p className="text-[11px] leading-5 text-slate-500">{locked ? `Cada imagen cabe en ${width} × ${height} px sin deformarse.` : `Todas salen de ${width} × ${height} px.`}</p>}
            {!(enLote && locked) && <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Ajuste de imagen">{([['contain', 'Ajustar'], ['cover', 'Cubrir'], ['stretch', 'Estirar']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={fit === value} onClick={() => setFit(value)} className={actionClass} style={fit === value ? { color: config.accent, borderColor: `${config.accent}60`, background: `${config.accent}10` } : undefined}>{label}</button>)}</div>}
        </>}
        <fieldset><legend className="mb-3 text-xs font-medium text-slate-300">Formato de salida</legend><div className="grid grid-cols-3 gap-1.5">{FORMATS.map((item) => <button key={item.value} type="button" aria-pressed={format === item.value} onClick={() => setFormat(item.value)} className={actionClass} style={format === item.value ? { color: config.accent, borderColor: `${config.accent}60`, background: `${config.accent}10` } : undefined}>{item.label}</button>)}</div></fieldset>
        {format === "image/png"
            ? mode === "comprimir-imagen"
                ? <div className="space-y-3"><p className="text-xs leading-5 text-slate-400">PNG no tiene calidad que ajustar: se guarda sin pérdida y solo baja de peso si reduces sus medidas. Para comprimir o apuntar a un peso, pasa a WebP; también conserva la transparencia.</p><button type="button" onClick={() => setFormat("image/webp")} className={`${actionClass} w-full`}>Pasar a WebP</button></div>
                : <p className="text-xs leading-5 text-slate-400">PNG conserva la transparencia y el detalle. Puede generar un archivo más grande.</p>
            : objetivoActivo
                ? <p className="flex justify-between text-xs text-slate-300"><span>Calidad</span><output className="font-mono" style={{ color: config.accent }}>{!enLote && currentResult?.calidad != null ? `${currentResult.calidad}%` : "Automática"}</output></p>
                : <label className="block text-xs text-slate-300"><span className="mb-3 flex justify-between"><span>Calidad</span><output className="font-mono" style={{ color: config.accent }}>{quality}%</output></span><input type="range" min={10} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="h-5 w-full cursor-pointer" style={{ accentColor: config.accent }} /><span className="mt-1 flex justify-between text-[11px] text-slate-500"><span>Menor peso</span><span>Más detalle</span></span></label>}
        {mode === "comprimir-imagen" && <div>
            <label className="block text-xs text-slate-300"><span className="mb-2 block">Peso objetivo (KB)</span><input className={fieldClass} type="number" inputMode="numeric" min={1} max={OBJETIVO_MAXIMO_KB} placeholder="Sin objetivo" value={objetivoKb || ""} disabled={format === "image/png"} aria-describedby={idAyudaObjetivo} onChange={(event) => setObjetivoKb(Math.min(OBJETIVO_MAXIMO_KB, enteroDeCampo(event.target.value)))} /></label>
            <span id={idAyudaObjetivo} className="mt-2 block text-[11px] leading-4 text-slate-500">{format === "image/png" ? "Solo con WebP o JPEG." : enLote ? "Para cada imagen: la mayor calidad que quepa; si ni con 40% alcanza, se achica." : "Busca la mayor calidad que quepa. Si ni con 40% alcanza, achica la imagen."}</span>
            {!enLote && <p aria-live="polite" className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-300">{objetivoTexto && currentResult?.objetivo && !currentResult.objetivo.logrado && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />}{objetivoTexto}</p>}
        </div>}
        {mode === "comprimir-imagen" && <label className="block text-xs text-slate-300"><span className="mb-2 flex items-center gap-2"><Maximize2 className="h-4 w-4 text-slate-500" />Lado máximo (px)</span><input className={fieldClass} type="number" min={0} max={16000} placeholder="Tamaño original" value={maxEdge || ""} onChange={(event) => setMaxEdge(enteroDeCampo(event.target.value))} /><span className="mt-2 block text-[11px] text-slate-500">Conserva la proporción. No amplía imágenes.</span></label>}
        {(mode === "redimensionar" || format === "image/jpeg") && <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">{format !== "image/jpeg" && <input type="checkbox" checked={fill} onChange={(event) => setFill(event.target.checked)} className="h-4 w-4" style={{ accentColor: config.accent }} />}{format === "image/jpeg" ? "Fondo JPEG" : "Rellenar fondo"}</label><input type="color" value={background} aria-label="Color de fondo" disabled={format !== "image/jpeg" && !fill} onChange={(event) => setBackground(event.target.value)} className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent disabled:opacity-40" /></div>}
        {!enLote && currentResult && currentResult.mime !== format && <p className="text-xs leading-5 text-slate-400">Tu navegador no sabe crear {etiquetaFormato(format)}: el archivo salió en {etiquetaFormato(currentResult.mime)}.</p>}
        {(enLote ? lote?.archivos.some((archivo) => archivo.type === "image/gif") : source?.file.type === "image/gif") && <p className="text-xs leading-5 text-slate-400">Si el GIF es animado, solo se usa el primer cuadro: la animación no se conserva.</p>}
    </aside>;

    return <div className="tool-page">
        <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
            <ToolPageHeader slug={mode} title={config.title} description={config.description} />
            {lote ? <LoteImagenes key={lote.id} archivos={lote.archivos} ajustes={ajustes} acento={config.accent} sufijo={config.suffix} pasos={PASOS} onCambiar={handleClear}>{panel(true)}</LoteImagenes>
            : !source ? <>
                <ImageDropzone onImageLoad={handleLoad} multiple onMultipleLoad={handleLote} accept={FORMATOS_ENTRADA} accentColor={config.accent} label="Arrastra una o varias imágenes" sublabel={`${listaFormatos(FORMATOS_ENTRADA)} · tus archivos permanecen en tu dispositivo`} />
                {decoding && <p role="status" className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />Abriendo imagen…</p>}
            </> : <section aria-label="Editor de imagen" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": config.accent } as CSSProperties}>
                <MesaCabecera nombre={source.file.name} detalle={`${source.image.naturalWidth} × ${source.image.naturalHeight} · ${formatearPeso(source.file.size)}`}>
                    <button type="button" onClick={download} disabled={!currentResult} className="studio-button studio-button-primary"><IconoDescargar listo={descargado} /><span>Descargar</span></button>
                </MesaCabecera>
                <div className="mesa-cuerpo mesa-cuerpo-panel">
                    <div className="mesa-columna">
                        <MesaEscenario fondo="transparent" pista={pista} className="flex h-[min(50vh,480px)] min-h-[270px] items-center justify-center p-6">
                            <div className="mesa-lienzo flex max-h-full max-w-full items-center justify-center">
                                <img src={comparando || !currentResult ? source.url : currentResult.url} alt={comparando ? "Imagen original" : "Vista previa del resultado"} className="max-h-[calc(min(50vh,480px)-48px)] max-w-full object-contain" />
                            </div>
                        </MesaEscenario>
                        <MesaPasos etiqueta="Progreso de la imagen" pasos={PASOS} estados={estadosPasos} />
                        <div className="mesa-pie" aria-live="polite">
                            <span className="inline-flex items-center gap-2">{currentResult ? <Check className="h-4 w-4" style={{ color: config.accent }} /> : <SlidersHorizontal className="h-4 w-4" />}{currentResult ? `${currentResult.width} × ${currentResult.height} · ${formatearPeso(currentResult.blob.size)}` : processing ? "Procesando…" : "Ajusta los parámetros"}</span>
                            {savings !== null && <span className="mesa-pie-estado" style={{ color: savings > 0 ? config.accent : "#94a3b8" }}>{savings > 0 ? `${savings}% menos peso` : savings === 0 ? "Mismo peso" : `${Math.abs(savings)}% más peso${mode === "comprimir-imagen" ? " · conviene el original" : ""}`}</span>}
                        </div>
                    </div>
                    <MesaRail etiqueta="Herramientas de imagen">
                        <MesaBoton pista="Comparar con el original" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                        <MesaSeparador />
                        <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                    </MesaRail>
                    {panel(false)}
                </div>
            </section>}
            {!lote && error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
        </main>
    </div>;
}
