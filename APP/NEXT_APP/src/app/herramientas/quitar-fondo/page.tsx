"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowDownToLine, ArrowLeftRight, Check, ChevronDown, CircleHelp, Eraser, ImagePlus, Layers2, LoaderCircle, Paintbrush, Redo2, RotateCcw, ShieldCheck, Sparkles, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BackgroundIllustration } from "@/components/tools/BackgroundIllustration";
import { BackgroundProcessor } from "@/components/tools/BackgroundProcessor";
import { composeSubject, createSubjectMask, MaskHistory, paintMaskStroke, readMaskAlpha, writeMaskAlpha, type MaskBackground, type MaskBrushMode, type MaskPoint } from "@/components/tools/MaskEngine";
import { canvasToObjectUrl, loadImageSource, sanitizeFileBaseName, triggerDownload } from "@/lib/tools/image-processing";
import styles from "@/components/tools/BackgroundStudio.module.css";

const ACCENT = "#5eead4";
const MAX_PIXELS = 16_000_000;
const FILLS = [
    { id: "transparent", label: "Transparente", color: "transparent" },
    { id: "white", label: "Blanco", color: "#ffffff" },
    { id: "cream", label: "Marfil", color: "#f5f1e8" },
    { id: "dark", label: "Oscuro", color: "#17212b" },
    { id: "gradient", label: "Degradado", color: "linear-gradient(135deg, #c4f1de, #ddd6fe)" },
] as const;

type Status = "idle" | "processing" | "done" | "error";
type View = "compare" | "edit" | "mask";
interface Progress { key: string; label: string; current: number; total: number }
const INITIAL_PROGRESS: Progress = { key: "prepare", label: "Preparando tu imagen", current: 0, total: 0 };

function backgroundFill(id: string, custom: string): MaskBackground {
    if (id === "transparent") return null;
    if (id === "gradient") return { from: "#c4f1de", to: "#ddd6fe" };
    return { color: id === "custom" ? custom : FILLS.find(fill => fill.id === id)?.color ?? "#ffffff" };
}

export default function BackgroundRemoverPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("quitar-fondo");
    const [source, setSource] = useState<{ file: File; url: string } | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS);
    const [startedAt, setStartedAt] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
    const [view, setView] = useState<View>("compare");
    const [comparison, setComparison] = useState(50);
    const [fill, setFill] = useState("transparent");
    const [custom, setCustom] = useState("#bbf7d0");
    const [brushMode, setBrushMode] = useState<MaskBrushMode>("erase");
    const [brushSize, setBrushSize] = useState(36);
    const [hardness, setHardness] = useState(70);
    const [zoom, setZoom] = useState(1);
    const [viewportWidth, setViewportWidth] = useState(640);
    const [cursor, setCursor] = useState<MaskPoint | null>(null);
    const [historyState, setHistoryState] = useState({ undo: false, redo: false });
    const [revision, setRevision] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [manual, setManual] = useState(false);
    const sourceRef = useRef<typeof source>(null);
    const originalRef = useRef<HTMLImageElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const initialRef = useRef<Uint8ClampedArray | null>(null);
    const historyRef = useRef<MaskHistory | null>(null);
    const processorRef = useRef<BackgroundProcessor | null>(null);
    const requestRef = useRef(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const strokeRef = useRef<{ point: MaskPoint; pointerId: number } | null>(null);
    const keyboardPointRef = useRef<MaskPoint | null>(null);
    const paintFrameRef = useRef(0);
    const downloadUrlsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const downloadUrls = downloadUrlsRef.current;
        return () => {
            requestRef.current += 1;
            processorRef.current?.cancel();
            cancelAnimationFrame(paintFrameRef.current);
            for (const [url, timer] of downloadUrls) { clearTimeout(timer); URL.revokeObjectURL(url); }
            downloadUrls.clear();
        };
    }, []);

    useEffect(() => {
        if (status !== "processing") return;
        const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => clearInterval(interval);
    }, [startedAt, status]);

    useEffect(() => {
        if (!stageRef.current) return;
        const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
        observer.observe(stageRef.current);
        return () => observer.disconnect();
    }, [status]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        const original = originalRef.current;
        if (!canvas || !mask || !original) return;
        const scale = Math.min(1, 1400 / Math.max(mask.width, mask.height));
        const width = Math.max(1, Math.round(mask.width * scale));
        const height = Math.max(1, Math.round(mask.height * scale));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        // A faint original reveals what can be restored. It never enters the export.
        composeSubject(canvas, original, mask, backgroundFill(fill, custom), view === "mask", view === "edit" && brushMode === "restore");
    }, [fill, custom, view, brushMode]);

    useEffect(() => { draw(); }, [draw, status, revision]);

    const updateHistory = useCallback(() => {
        const history = historyRef.current;
        setHistoryState({ undo: history?.canUndo ?? false, redo: history?.canRedo ?? false });
        setRevision(value => value + 1);
        setDownloaded(false);
    }, []);

    const reset = useCallback(() => {
        requestRef.current += 1;
        processorRef.current?.cancel();
        sourceRef.current = null;
        originalRef.current = null;
        maskRef.current = null;
        initialRef.current = null;
        historyRef.current = null;
        strokeRef.current = null;
        keyboardPointRef.current = null;
        setSource(null);
        setStatus("idle");
        setError(null);
        setCursor(null);
        setExporting(false);
        setDownloaded(false);
        setManual(false);
        setHistoryState({ undo: false, redo: false });
    }, []);

    const initializeMask = useCallback((canvas: HTMLCanvasElement, alpha: Uint8ClampedArray, isManual = false) => {
        maskRef.current = canvas;
        initialRef.current = alpha;
        historyRef.current = new MaskHistory(alpha);
        keyboardPointRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
        setDimensions({ width: canvas.width, height: canvas.height });
        setView(isManual ? "edit" : "compare");
        setStatus("done");
        setManual(isManual);
        setError(null);
        updateHistory();
    }, [updateHistory]);

    const processImage = useCallback(async (file: File, url: string) => {
        const request = ++requestRef.current;
        // Reuse a successfully initialized worker; replace a running job when the file changes.
        sourceRef.current = { file, url };
        setSource({ file, url });
        setStatus("processing");
        setProgress(INITIAL_PROGRESS);
        setStartedAt(Date.now());
        setElapsed(0);
        setError(null);
        setView("compare");
        setFill("transparent");
        setComparison(50);
        setZoom(1);
        setCursor(null);
        setDownloaded(false);
        setManual(false);
        maskRef.current = null;
        initialRef.current = null;
        historyRef.current = null;
        originalRef.current = null;
        strokeRef.current = null;
        setHistoryState({ undo: false, redo: false });
        try {
            const original = await loadImageSource(url);
            if (request !== requestRef.current) return;
            if (original.naturalWidth * original.naturalHeight > MAX_PIXELS) {
                throw new Error("Esta imagen supera los 16 megapíxeles. Redimensiónala antes de quitar el fondo.");
            }
            originalRef.current = original;
            setDimensions({ width: original.naturalWidth, height: original.naturalHeight });
            if (!processorRef.current) processorRef.current = new BackgroundProcessor();
            setProgress({ key: "model", label: "Iniciando el motor de recorte", current: 0, total: 0 });
            const blob = await processorRef.current.process(file, (key, current, total) => {
                if (request !== requestRef.current) return;
                const labels: Record<string, string> = {
                    "compute:decode": "Leyendo la imagen",
                    "compute:inference": "Detectando el sujeto",
                    "compute:mask": "Separando el fondo",
                    "compute:encode": "Preparando el resultado",
                    compatible: "Preparando el modo compatible",
                };
                const label = key.startsWith("fetch:")
                    ? key.includes("/models/") ? "Descargando el modelo de recorte" : "Descargando el motor de imagen"
                    : labels[key] ?? "Preparando el recorte";
                setProgress({ key, label, current, total });
            });
            if (request !== requestRef.current) return;
            const resultUrl = URL.createObjectURL(blob);
            try {
                const resultImage = await loadImageSource(resultUrl);
                if (request !== requestRef.current) return;
                const { canvas, alpha } = createSubjectMask(resultImage);
                initializeMask(canvas, alpha);
            } finally { URL.revokeObjectURL(resultUrl); }
        } catch (failure) {
            if (request !== requestRef.current) return;
            setStatus("error");
            const message = failure instanceof Error ? failure.message : "No se pudo procesar esta imagen.";
            setError(/fetch|network|session|metadata|resource/i.test(message)
                ? "No se pudo descargar o iniciar el modelo. Revisa tu conexión y vuelve a intentarlo. También puedes editar la imagen manualmente."
                : message);
        }
    }, [initializeMask]);

    const openManualEditor = () => {
        const original = originalRef.current;
        if (!original) return;
        const canvas = document.createElement("canvas");
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        const alpha = new Uint8ClampedArray(canvas.width * canvas.height).fill(255);
        writeMaskAlpha(canvas, alpha);
        initializeMask(canvas, alpha, true);
    };

    const historyAction = useCallback((action: "undo" | "redo" | "reset") => {
        const history = historyRef.current;
        const mask = maskRef.current;
        if (!history || !mask || strokeRef.current) return;
        if (action === "reset" && initialRef.current) history.push(initialRef.current);
        const alpha = action === "undo" ? history.undo() : action === "redo" ? history.redo() : history.current;
        writeMaskAlpha(mask, alpha);
        updateHistory();
        draw();
    }, [draw, updateHistory]);

    const finishStroke = useCallback(() => {
        if (!strokeRef.current) return;
        strokeRef.current = null;
        if (maskRef.current && historyRef.current) historyRef.current.push(readMaskAlpha(maskRef.current));
        updateHistory();
    }, [updateHistory]);

    const paint = useCallback((from: MaskPoint, to: MaskPoint) => {
        const mask = maskRef.current;
        const canvas = canvasRef.current;
        if (!mask || !canvas) return;
        const scale = mask.width / canvas.getBoundingClientRect().width;
        paintMaskStroke(mask, from, to, brushSize * scale, hardness, brushMode);
        cancelAnimationFrame(paintFrameRef.current);
        paintFrameRef.current = requestAnimationFrame(draw);
    }, [brushSize, hardness, brushMode, draw]);

    const pointerPoint = (event: PointerEvent<HTMLCanvasElement>): MaskPoint | null => {
        const mask = maskRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!mask || !rect.width || !rect.height) return null;
        return { x: (event.clientX - rect.left) / rect.width * mask.width, y: (event.clientY - rect.top) / rect.height * mask.height };
    };

    const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
        if (view === "compare") return;
        const point = pointerPoint(event);
        if (!point) return;
        setCursor(point);
        if (strokeRef.current?.pointerId !== event.pointerId) return;
        event.preventDefault();
        paint(strokeRef.current.point, point);
        strokeRef.current.point = point;
    };

    const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
        if (view === "compare" || event.button !== 0 || strokeRef.current || exporting) return;
        const point = pointerPoint(event);
        if (!point) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        strokeRef.current = { point, pointerId: event.pointerId };
        keyboardPointRef.current = point;
        setCursor(point);
        paint(point, point);
        setDownloaded(false);
    };

    const editorKeys = (event: KeyboardEvent<HTMLCanvasElement>) => {
        if (view === "compare" || exporting) return;
        const point = keyboardPointRef.current;
        const mask = maskRef.current;
        if (!point || !mask) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
            event.preventDefault();
            historyAction(event.shiftKey ? "redo" : "undo");
            return;
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            if (event.key.toLowerCase() === "e") { setBrushMode("erase"); return; }
            if (event.key.toLowerCase() === "r") { setBrushMode("restore"); return; }
            if (event.key === "[") { setBrushSize(size => Math.max(4, size - 4)); return; }
            if (event.key === "]") { setBrushSize(size => Math.min(140, size + 4)); return; }
        }
        const step = Math.max(1, Math.round(mask.width / 100)) * (event.shiftKey ? 5 : 1);
        const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (delta[event.key]) {
            event.preventDefault();
            const [x, y] = delta[event.key];
            const next = { x: Math.max(0, Math.min(mask.width, point.x + x)), y: Math.max(0, Math.min(mask.height, point.y + y)) };
            keyboardPointRef.current = next;
            setCursor(next);
        } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            if (event.repeat) return;
            paint(point, point);
            historyRef.current?.push(readMaskAlpha(mask));
            updateHistory();
        }
    };

    const download = async () => {
        const original = originalRef.current;
        const mask = maskRef.current;
        const input = sourceRef.current;
        if (!original || !mask || !input || exporting) return;
        finishStroke();
        const request = requestRef.current;
        setExporting(true);
        setError(null);
        try {
            const canvas = document.createElement("canvas");
            canvas.width = mask.width;
            canvas.height = mask.height;
            composeSubject(canvas, original, mask, backgroundFill(fill, custom));
            const url = await canvasToObjectUrl(canvas, "image/png", 1);
            if (request !== requestRef.current) { URL.revokeObjectURL(url); return; }
            triggerDownload(url, `${sanitizeFileBaseName(input.file.name)}_${fill === "transparent" ? "sin_fondo" : "editada"}.png`);
            const timer = setTimeout(() => { URL.revokeObjectURL(url); downloadUrlsRef.current.delete(url); }, 60_000);
            downloadUrlsRef.current.set(url, timer);
            setDownloaded(true);
        } catch {
            if (request === requestRef.current) setError("No se pudo descargar la imagen. Inténtalo de nuevo.");
        } finally { if (request === requestRef.current) setExporting(false); }
    };

    const changeView = (next: View) => { finishStroke(); setView(next); setCursor(null); setZoom(1); };
    const fittedWidth = Math.max(1, Math.min(viewportWidth - 32, 460 * dimensions.width / dimensions.height));
    const downloading = progress.key.startsWith("fetch:");
    const percent = progress.total > 0 ? Math.min(100, Math.round(progress.current / progress.total * 100)) : 0;

    if (isLoading) return <main className="tool-main flex min-h-[50vh] items-center justify-center" aria-label="Cargando herramienta"><LoaderCircle className="h-7 w-7 animate-spin text-teal-300 motion-reduce:animate-none" role="status" /></main>;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Quitar fondo"} />;

    return (
        <div className="tool-page min-h-screen">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
                <ToolPageHeader slug="quitar-fondo" title="Quitar fondo" description="Sube una imagen. El fondo desaparece y tú afinas los detalles." />

                {!source ? (
                    <section className="studio-panel overflow-hidden" aria-label="Subir imagen para quitar el fondo">
                        <div className="grid md:grid-cols-[1.05fr_1fr]">
                            <div className={`${styles.stage} relative flex flex-col items-center justify-center px-6 py-5 sm:px-10 sm:py-8`}>
                                <div className="mb-1 flex items-center gap-2 self-start text-[11px] font-medium tracking-wide text-teal-200"><Sparkles size={14} aria-hidden="true" />Un buen recorte cambia todo.</div>
                                <BackgroundIllustration />
                                <p className="text-center text-xs text-slate-400">Del original a un PNG transparente.</p>
                            </div>
                            <div className="flex flex-col justify-center gap-5 p-5 sm:p-8">
                                <ImageDropzone onImageLoad={(file, url) => { void processImage(file, url); }} accept={["image/png", "image/jpeg", "image/webp"]} maxSize={20 * 1024 * 1024} accentColor={ACCENT} label="Suelta tu imagen aquí" sublabel="JPG, PNG o WebP · Empezamos al subirla" />
                                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-teal-300" aria-hidden="true" />Tu imagen se queda contigo</span><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-teal-300" aria-hidden="true" />Sin marca de agua</span></div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="studio-panel overflow-hidden" aria-label="Estudio de quitar fondo">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                            <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{source.file.name}</p><p className="mt-1 text-[11px] text-slate-500">{dimensions.width > 1 ? `${dimensions.width} × ${dimensions.height} px · ` : ""}{(source.file.size / (1024 * 1024)).toFixed(1)} MB</p></div>
                            {status === "done" && <button className="studio-button studio-button-primary" onClick={() => { void download(); }} disabled={exporting}>{exporting ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowDownToLine size={16} aria-hidden="true" />}{exporting ? "Preparando…" : "Descargar PNG"}</button>}
                            <button className="studio-icon-button" onClick={reset} aria-label={status === "processing" ? "Cancelar procesamiento" : "Elegir otra imagen"} title={status === "processing" ? "Cancelar" : "Nueva imagen"}>{status === "processing" ? <X size={18} aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />}</button>
                        </div>

                        {status === "done" ? (
                            <div className="grid lg:grid-cols-[minmax(0,1fr)_264px]">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
                                        <div className="flex gap-1" role="group" aria-label="Vista de la imagen">
                                            {([{ id: "compare", label: "Antes / después", icon: ArrowLeftRight }, { id: "edit", label: "Retocar", icon: Paintbrush }, { id: "mask", label: "Máscara", icon: Layers2 }] as const).map(({ id, label, icon: Icon }) => <button key={id} className="studio-segment inline-flex items-center gap-1.5 px-2.5" aria-pressed={view === id} onClick={() => changeView(id)}><Icon size={14} aria-hidden="true" /><span>{label}</span></button>)}
                                        </div>
                                        {view !== "compare" && <div className="flex items-center" role="group" aria-label="Ampliar la vista"><button className="studio-icon-button" disabled={zoom <= 1} aria-label="Alejar" onClick={() => { setZoom(value => Math.max(1, value - 0.5)); setCursor(null); }}><ZoomOut size={15} aria-hidden="true" /></button><span className="w-10 text-center font-mono text-[10px] text-slate-400">{zoom * 100}%</span><button className="studio-icon-button" disabled={zoom >= 3} aria-label="Acercar" onClick={() => { setZoom(value => Math.min(3, value + 0.5)); setCursor(null); }}><ZoomIn size={15} aria-hidden="true" /></button></div>}
                                    </div>
                                    <div ref={stageRef} className={`${styles.stage} max-h-[560px] min-h-[260px] overflow-auto p-4 sm:min-h-[360px]`}>
                                        <div className={`relative mx-auto overflow-hidden rounded-lg ${styles.checker}`} style={{ width: fittedWidth * zoom, aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
                                            <canvas ref={canvasRef} aria-label={view === "mask" ? "Máscara editable del recorte" : "Resultado editable"} aria-describedby={view !== "compare" ? "background-keyboard-help" : undefined} tabIndex={view === "compare" ? -1 : 0} onKeyDown={editorKeys} onFocus={() => { if (view !== "compare") setCursor(keyboardPointRef.current); }} onBlur={() => { finishStroke(); setCursor(null); }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => { if (event.pointerId !== strokeRef.current?.pointerId) return; finishStroke(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke} onPointerLeave={() => { if (!strokeRef.current) setCursor(null); }} className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-300" style={{ touchAction: view === "compare" ? "auto" : "none", cursor: view === "compare" ? "default" : "none" }} />
                                            {view === "compare" && <>
                                                <img src={source.url} alt="Imagen original antes de quitar el fondo" className="pointer-events-none absolute inset-0 h-full w-full" style={{ clipPath: `inset(0 ${100 - comparison}% 0 0)` }} />
                                                <div className="pointer-events-none absolute inset-x-3 top-3 z-[7] flex justify-between gap-2 text-[10px] font-medium text-white"><span className="rounded-md bg-slate-950/70 px-2 py-1">Original</span><span className="rounded-md bg-slate-950/70 px-2 py-1">Sin fondo</span></div>
                                                <input className={styles.compareInput} type="range" min={0} max={100} value={comparison} onChange={event => setComparison(Number(event.target.value))} aria-label="Comparar antes y después" aria-valuetext={`${comparison}% original, ${100 - comparison}% resultado`} />
                                                <div className={styles.divider} style={{ left: `${comparison}%` }}><span className="absolute left-1/2 top-1/2 flex h-11 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-900 shadow-lg"><ArrowLeftRight size={17} aria-hidden="true" /></span></div>
                                            </>}
                                            {cursor && view !== "compare" && <div className={styles.cursor} style={{ left: `${cursor.x / dimensions.width * 100}%`, top: `${cursor.y / dimensions.height * 100}%`, width: brushSize, height: brushSize, borderColor: brushMode === "restore" ? "#5eead4" : "white" }} />}
                                        </div>
                                    </div>
                                    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3 text-[11px] text-slate-400"><span>{view === "compare" ? "Arrastra la línea para comparar." : "Pinta sobre la imagen para afinar el recorte."}</span><span className="inline-flex items-center gap-1.5 text-teal-300"><Check size={12} aria-hidden="true" />{manual ? "Edición manual" : historyState.undo ? "Recorte retocado" : "Recorte listo"}</span></div>
                                </div>

                                <aside className="border-t border-white/10 bg-[#111923] p-4 lg:border-l lg:border-t-0" aria-label="Ajustes del recorte">
                                    <div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-semibold text-white">Afina el recorte</h2><div className="flex gap-1"><button className="studio-icon-button" title="Deshacer (Ctrl / ⌘ Z)" aria-label="Deshacer pincelada" disabled={!historyState.undo || exporting} onClick={() => historyAction("undo")}><Undo2 size={16} aria-hidden="true" /></button><button className="studio-icon-button" title="Rehacer (Ctrl / ⌘ Shift Z)" aria-label="Rehacer pincelada" disabled={!historyState.redo || exporting} onClick={() => historyAction("redo")}><Redo2 size={16} aria-hidden="true" /></button></div></div>
                                    <div className="mb-5 grid grid-cols-2 gap-2" role="group" aria-label="Modo del pincel"><button className="studio-button justify-center" aria-pressed={brushMode === "erase" && view !== "compare"} onClick={() => { setBrushMode("erase"); if (view === "compare") changeView("edit"); }} style={brushMode === "erase" && view !== "compare" ? { borderColor: "#5eead455", color: ACCENT, background: "#5eead40a" } : undefined}><Eraser size={15} aria-hidden="true" />Borrar</button><button className="studio-button justify-center" aria-pressed={brushMode === "restore" && view !== "compare"} onClick={() => { setBrushMode("restore"); if (view === "compare") changeView("edit"); }} style={brushMode === "restore" && view !== "compare" ? { borderColor: "#5eead455", color: ACCENT, background: "#5eead40a" } : undefined}><Paintbrush size={15} aria-hidden="true" />Restaurar</button></div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                        <div><div className="mb-2 flex justify-between text-[11px]"><label htmlFor="background-brush-size" className="text-slate-300">Tamaño</label><output className="font-mono text-slate-400">{brushSize} px</output></div><input id="background-brush-size" type="range" min={4} max={140} value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} className="w-full" /></div>
                                        <div><div className="mb-2 flex justify-between text-[11px]"><label htmlFor="background-brush-hardness" className="text-slate-300">Dureza</label><output className="font-mono text-slate-400">{hardness}%</output></div><input id="background-brush-hardness" type="range" min={0} max={100} value={hardness} onChange={event => setHardness(Number(event.target.value))} className="w-full" /></div>
                                    </div>
                                    <div className="my-5 border-t border-white/10" />
                                    <h2 className="mb-3 text-xs font-semibold text-white">Fondo de salida</h2>
                                    <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir fondo de salida">
                                        {FILLS.map(option => <button key={option.id} aria-label={option.label} title={option.label} aria-pressed={fill === option.id} onClick={() => { setFill(option.id); setDownloaded(false); }} className={`relative flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors ${option.id === "transparent" ? styles.checker : ""}`} style={{ borderColor: fill === option.id ? ACCENT : "#ffffff1a", ...(option.id !== "transparent" ? { background: option.color } : {}) }}>{fill === option.id && <Check size={16} className={option.id === "transparent" || option.id === "dark" ? "text-teal-200" : "text-slate-900"} aria-hidden="true" />}</button>)}
                                        <label className="relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2" style={{ borderColor: fill === "custom" ? ACCENT : "#ffffff1a", background: "conic-gradient(#fb7185, #fbbf24, #86efac, #67e8f9, #a78bfa, #fb7185)" }} title="Color personalizado"><input aria-label="Color de fondo personalizado" type="color" value={custom} onChange={event => { setCustom(event.target.value); setFill("custom"); setDownloaded(false); }} onClick={() => setFill("custom")} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /><span className="pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white">{fill === "custom" ? <Check size={14} aria-hidden="true" /> : "+"}</span></label>
                                    </div>
                                    <p className="mt-2 text-[10px] text-slate-500">{fill === "custom" ? custom.toUpperCase() : FILLS.find(option => option.id === fill)?.label} · PNG a resolución original</p>
                                    <button className="studio-button mt-5 w-full justify-center" disabled={!historyState.undo || exporting} onClick={() => historyAction("reset")}><RotateCcw size={14} aria-hidden="true" />{manual ? "Restaurar imagen" : "Volver al recorte inicial"}</button>
                                    <p className="mt-3 min-h-4 text-center text-[11px] text-teal-300" role="status">{downloaded ? "Descarga lista. Incluye tus retoques." : ""}</p>
                                </aside>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                                <div className={`${styles.stage} relative flex min-h-[240px] items-center justify-center overflow-hidden p-5 sm:min-h-[380px]`}><img src={source.url} alt="Imagen que se está preparando" className="max-h-[420px] max-w-full rounded-lg object-contain" />{status === "processing" && <div className="pointer-events-none absolute inset-0 bg-slate-950/20" />}</div>
                                <div className="flex flex-col justify-center border-t border-white/10 p-6 lg:border-l lg:border-t-0">
                                    {status === "processing" ? <div aria-busy="true">
                                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/5 text-teal-300"><LoaderCircle size={22} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /></div>
                                        <p className="mb-2 text-sm font-semibold text-white" role="status" aria-live="polite">{progress.label}</p>
                                        <div className="mb-4 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>{downloading && progress.total > 0 ? `${(progress.current / 1048576).toFixed(1)} / ${(progress.total / 1048576).toFixed(1)} MB` : progress.key.startsWith("compute:") ? "Procesando en tu dispositivo" : "El proceso empieza automáticamente"}</span><span className="shrink-0 font-mono">{elapsed}s</span></div>
                                        <progress className={styles.progressTrack} max={progress.total || 1} value={progress.total > 0 ? progress.current : undefined} aria-label={progress.label} aria-valuetext={downloading ? `${percent}% de esta descarga` : progress.label} />
                                        <p className="mt-4 text-xs leading-relaxed text-slate-400">{downloading || !progress.key.startsWith("compute:") ? "La primera imagen necesita descargar el modelo. Tu archivo se procesa en este dispositivo." : "Estamos separando el sujeto del fondo. Puedes cancelar en cualquier momento."}</p>
                                        <button onClick={reset} className="studio-button mt-5 justify-center">Cancelar</button>
                                    </div> : <div><p className="mb-2 text-sm font-semibold text-white">El recorte no se completó</p><p role="alert" className="text-xs leading-relaxed text-amber-200">{error}</p><div className="mt-5 flex flex-col gap-2"><button className="studio-button studio-button-primary justify-center" onClick={() => { void processImage(source.file, source.url); }}><RotateCcw size={14} aria-hidden="true" />Volver a intentar</button>{originalRef.current && <button className="studio-button justify-center" onClick={openManualEditor}><Paintbrush size={14} aria-hidden="true" />Abrir editor manual</button>}<button className="studio-button justify-center" onClick={reset}>Elegir otra imagen</button></div></div>}
                                </div>
                            </div>
                        )}
                    </section>
                )}
                {status === "done" && error && <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">{error}</p>}
                <details className="group mt-5 rounded-xl border border-white/[0.07] bg-white/[0.015]">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><CircleHelp size={15} aria-hidden="true" />Unos detalles para que quede perfecto</span><ChevronDown size={14} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
                    <div className="grid gap-4 border-t border-white/5 p-4 text-xs leading-relaxed text-slate-400 sm:grid-cols-3"><p><strong className="font-medium text-slate-200">Una imagen nítida ayuda.</strong> Retratos y productos con buen contraste suelen dar el mejor resultado. Hasta 20 MB y 16 megapíxeles.</p><p><strong className="font-medium text-slate-200">Los detalles quedan en tus manos.</strong> Borra lo que sobra o restaura lo que falta. Baja la dureza para suavizar el borde y amplía para trabajar de cerca.</p><p id="background-keyboard-help"><strong className="font-medium text-slate-200">También con teclado.</strong> En Retocar, enfoca la imagen: flechas para mover el pincel, Espacio para pintar. Shift acelera el movimiento. E borra, R restaura, [ y ] cambian el tamaño. Ctrl / ⌘ Z deshace.</p></div>
                </details>
            </main>
        </div>
    );
}
