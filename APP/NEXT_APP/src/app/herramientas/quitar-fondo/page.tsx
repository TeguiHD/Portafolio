"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Check, ChevronDown, CircleHelp, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { BackgroundIllustration } from "@/components/tools/BackgroundIllustration";
import { BackgroundProcessor } from "@/components/tools/BackgroundProcessor";
import { composeSubject, createSubjectMask, MaskHistory, paintMaskStroke, readMaskAlpha, writeMaskAlpha, type MaskBackground, type MaskBrushMode, type MaskPoint } from "@/components/tools/MaskEngine";
import { MesaBoton, MesaGrupo, MesaMuestras, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCapas, IconoCopiar, IconoDescargar, IconoDeshacer, IconoGoma, IconoOjo, IconoPincel, IconoRehacer, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { canvasToBlob, canvasToObjectUrl, loadImageSource, sanitizeFileBaseName, triggerDownload } from "@/lib/tools/image-processing";
import styles from "@/components/tools/BackgroundStudio.module.css";

const ACCENT = "#5eead4";
const MAX_PIXELS = 16_000_000;
const FILLS = [
    { id: "transparent", etiqueta: "Transparente", css: "transparent" },
    { id: "white", etiqueta: "Blanco", css: "#ffffff" },
    { id: "cream", etiqueta: "Marfil", css: "#f5f1e8" },
    { id: "dark", etiqueta: "Oscuro", css: "#17212b" },
    { id: "gradient", etiqueta: "Degradado", css: "linear-gradient(135deg, #c4f1de, #ddd6fe)" },
] as const;
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "ia", etiqueta: "Recorte con IA", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoCapas /> },
];

type Status = "idle" | "processing" | "done" | "error";
interface Progress { key: string; label: string; current: number; total: number }
const INITIAL_PROGRESS: Progress = { key: "prepare", label: "Preparando tu imagen", current: 0, total: 0 };

function backgroundFill(id: string, custom: string): MaskBackground {
    if (id === "transparent") return null;
    if (id === "gradient") return { from: "#c4f1de", to: "#ddd6fe" };
    return { color: id === "custom" ? custom : FILLS.find(fill => fill.id === id)?.css ?? "#ffffff" };
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
    const [fill, setFill] = useState("transparent");
    const [custom, setCustom] = useState("#bbf7d0");
    const [brushMode, setBrushMode] = useState<MaskBrushMode>("erase");
    const [brushSize, setBrushSize] = useState(36);
    const [hardness, setHardness] = useState(70);
    const [cursor, setCursor] = useState<MaskPoint | null>(null);
    const [historyState, setHistoryState] = useState({ undo: false, redo: false, cambios: 0 });
    const [revision, setRevision] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [manual, setManual] = useState(false);
    const [comparando, setComparando] = useState(false);
    const [verMascara, setVerMascara] = useState(false);
    const [pulso, setPulso] = useState<MaskBrushMode | null>(null);
    const sourceRef = useRef<typeof source>(null);
    const originalRef = useRef<HTMLImageElement | null>(null);
    const maskRef = useRef<HTMLCanvasElement | null>(null);
    const initialRef = useRef<Uint8ClampedArray | null>(null);
    const historyRef = useRef<MaskHistory | null>(null);
    const processorRef = useRef<BackgroundProcessor | null>(null);
    const requestRef = useRef(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokeRef = useRef<{ point: MaskPoint; pointerId: number } | null>(null);
    const keyboardPointRef = useRef<MaskPoint | null>(null);
    const paintFrameRef = useRef(0);
    const pulsoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const copiaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const comparandoTecladoRef = useRef(false);
    const downloadUrlsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const downloadUrls = downloadUrlsRef.current;
        return () => {
            requestRef.current += 1;
            processorRef.current?.cancel();
            cancelAnimationFrame(paintFrameRef.current);
            if (pulsoTimer.current) clearTimeout(pulsoTimer.current);
            if (copiaTimer.current) clearTimeout(copiaTimer.current);
            for (const [url, timer] of downloadUrls) { clearTimeout(timer); URL.revokeObjectURL(url); }
            downloadUrls.clear();
        };
    }, []);

    useEffect(() => {
        if (status !== "processing") return;
        const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => clearInterval(interval);
    }, [startedAt, status]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        const original = originalRef.current;
        if (!canvas || !mask || !original) return;
        const scale = Math.min(1, 1400 / Math.max(mask.width, mask.height));
        const width = Math.max(1, Math.round(mask.width * scale));
        const height = Math.max(1, Math.round(mask.height * scale));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        if (comparando) {
            const context = canvas.getContext("2d");
            if (!context) return;
            context.globalCompositeOperation = "source-over";
            context.clearRect(0, 0, width, height);
            context.drawImage(original, 0, 0, width, height);
            return;
        }
        // El original al 22 % en modo restaurar enseña lo que se puede recuperar. Nunca entra en la exportación.
        composeSubject(canvas, original, mask, backgroundFill(fill, custom), verMascara, brushMode === "restore" && !verMascara);
    }, [fill, custom, comparando, verMascara, brushMode]);

    useEffect(() => { draw(); }, [draw, status, revision]);

    const updateHistory = useCallback(() => {
        const history = historyRef.current;
        setHistoryState({ undo: history?.canUndo ?? false, redo: history?.canRedo ?? false, cambios: history?.cambios ?? 0 });
        setRevision(value => value + 1);
        setDownloaded(false);
        setCopiado(false);
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
        setCopiado(false);
        setManual(false);
        setComparando(false);
        setVerMascara(false);
        setHistoryState({ undo: false, redo: false, cambios: 0 });
    }, []);

    const initializeMask = useCallback((canvas: HTMLCanvasElement, alpha: Uint8ClampedArray, isManual = false) => {
        maskRef.current = canvas;
        initialRef.current = alpha;
        historyRef.current = new MaskHistory(alpha);
        keyboardPointRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
        setDimensions({ width: canvas.width, height: canvas.height });
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
        setFill("transparent");
        setCursor(null);
        setDownloaded(false);
        setCopiado(false);
        setManual(false);
        setComparando(false);
        setVerMascara(false);
        maskRef.current = null;
        initialRef.current = null;
        historyRef.current = null;
        originalRef.current = null;
        strokeRef.current = null;
        setHistoryState({ undo: false, redo: false, cambios: 0 });
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

    const cambiarModo = (modo: MaskBrushMode) => {
        setBrushMode(modo);
        setPulso(modo);
        if (pulsoTimer.current) clearTimeout(pulsoTimer.current);
        pulsoTimer.current = setTimeout(() => setPulso(null), 260);
    };

    const pointerPoint = (event: PointerEvent<HTMLCanvasElement>): MaskPoint | null => {
        const mask = maskRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!mask || !rect.width || !rect.height) return null;
        return { x: (event.clientX - rect.left) / rect.width * mask.width, y: (event.clientY - rect.top) / rect.height * mask.height };
    };

    const puedePintar = status === "done" && !comparando && !exporting;

    const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!puedePintar) return;
        const point = pointerPoint(event);
        if (!point) return;
        setCursor(point);
        if (strokeRef.current?.pointerId !== event.pointerId) return;
        event.preventDefault();
        paint(strokeRef.current.point, point);
        strokeRef.current.point = point;
    };

    const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!puedePintar || event.button !== 0 || strokeRef.current) return;
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
        if (status !== "done" || exporting) return;
        const point = keyboardPointRef.current;
        const mask = maskRef.current;
        if (!point || !mask) return;
        const key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) && key === "z") {
            event.preventDefault();
            historyAction(event.shiftKey ? "redo" : "undo");
            return;
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            if (key === "e") { cambiarModo("erase"); return; }
            if (key === "r") { cambiarModo("restore"); return; }
            if (key === "m") { setVerMascara(value => !value); return; }
            if (key === "c") { if (!event.repeat) { comparandoTecladoRef.current = true; setComparando(true); } return; }
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
            if (event.repeat || comparando) return;
            paint(point, point);
            historyRef.current?.push(readMaskAlpha(mask));
            updateHistory();
        }
    };

    const editorKeyUp = (event: KeyboardEvent<HTMLCanvasElement>) => {
        if (event.key.toLowerCase() === "c") { comparandoTecladoRef.current = false; setComparando(false); }
    };

    const composeFull = () => {
        const original = originalRef.current;
        const mask = maskRef.current;
        if (!original || !mask) return null;
        const canvas = document.createElement("canvas");
        canvas.width = mask.width;
        canvas.height = mask.height;
        composeSubject(canvas, original, mask, backgroundFill(fill, custom));
        return canvas;
    };

    const download = async () => {
        const input = sourceRef.current;
        if (!input || exporting) return;
        finishStroke();
        const canvas = composeFull();
        if (!canvas) return;
        const request = requestRef.current;
        setExporting(true);
        setError(null);
        try {
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

    const copiar = async () => {
        if (exporting) return;
        finishStroke();
        const canvas = composeFull();
        if (!canvas) return;
        try {
            if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("sin portapapeles");
            const blob = await canvasToBlob(canvas, "image/png");
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setCopiado(true);
            if (copiaTimer.current) clearTimeout(copiaTimer.current);
            copiaTimer.current = setTimeout(() => setCopiado(false), 1600);
        } catch {
            setError("Tu navegador no permite copiar imágenes al portapapeles. Usa Descargar PNG.");
        }
    };

    const percent = progress.total > 0 ? Math.min(100, Math.round(progress.current / progress.total * 100)) : 0;
    const downloading = progress.key.startsWith("fetch:");
    const estadosPasos: EstadoPaso[] = status === "processing" ? ["listo", "activo", "pendiente"]
        : status === "error" ? ["listo", "error", "pendiente"]
        : status === "done" ? ["listo", manual ? "error" : "listo", "listo"]
        : ["pendiente", "pendiente", "pendiente"];
    const progresoModelo = status === "processing" && downloading && progress.total > 0 ? progress.current / progress.total : undefined;
    const pista = status === "processing"
        ? `${progress.label}${downloading && progress.total > 0 ? ` · ${percent} %` : ""} · ${elapsed}s`
        : status !== "done" ? undefined
        : comparando ? "Original"
        : verMascara ? "Máscara · pinta para editarla"
        : brushMode === "erase" ? "Pinta para borrar restos" : "Pinta para restaurar · el fantasma muestra lo borrado";
    // Alto máximo del lienzo: 560 px o la mitad de la ventana, para que el pie con el pincel siga a la vista.
    const anchoLienzo = `min(100%, calc(min(560px, 50vh) * ${(dimensions.width / dimensions.height).toFixed(4)}))`;

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
                    <section className="studio-panel mesa overflow-hidden" aria-label="Estudio de quitar fondo" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={source.file.name} detalle={`${dimensions.width > 1 ? `${dimensions.width} × ${dimensions.height} px · ` : ""}${(source.file.size / (1024 * 1024)).toFixed(1)} MB`}>
                            {status === "done" && <button type="button" className="studio-button studio-button-primary" onClick={() => { void download(); }} disabled={exporting}><IconoDescargar listo={downloaded} /><span><span className="hidden sm:inline">Descargar </span>PNG</span></button>}
                            <button type="button" className="studio-icon-button" onClick={reset} aria-label={status === "processing" ? "Cancelar procesamiento" : "Elegir otra imagen"} title={status === "processing" ? "Cancelar" : "Nueva imagen"}>{status === "processing" ? <X size={18} aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />}</button>
                        </MesaCabecera>

                        <div className="mesa-cuerpo">
                            <div className="mesa-columna">
                                <MesaEscenario fondo={fill} pista={pista} cambios={status === "done" ? historyState.cambios : 0} pulso={pulso} className="flex min-h-[260px] items-center justify-center p-4 sm:min-h-[360px]">
                                    {status === "done" ? (
                                        <div className="mesa-lienzo" style={{ width: anchoLienzo, aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
                                            <canvas ref={canvasRef} aria-label={verMascara ? "Máscara editable del recorte" : "Resultado editable"} aria-describedby="background-keyboard-help" tabIndex={0} onKeyDown={editorKeys} onKeyUp={editorKeyUp} onFocus={() => setCursor(keyboardPointRef.current)} onBlur={() => { finishStroke(); setCursor(null); if (comparandoTecladoRef.current) { comparandoTecladoRef.current = false; setComparando(false); } }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => { if (event.pointerId !== strokeRef.current?.pointerId) return; finishStroke(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke} onPointerLeave={() => { if (!strokeRef.current) setCursor(null); }} className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-300" style={{ touchAction: "none", cursor: comparando ? "default" : "none" }} />
                                            {cursor && !comparando && <div className="mesa-cursor" data-modo={brushMode} style={{ left: `${cursor.x / dimensions.width * 100}%`, top: `${cursor.y / dimensions.height * 100}%`, width: brushSize, height: brushSize }} />}
                                        </div>
                                    ) : (
                                        <>
                                            <img src={source.url} alt="Imagen que se está preparando" className="max-h-[440px] max-w-full rounded-lg object-contain" style={{ opacity: status === "error" ? 0.35 : 0.7 }} />
                                            {status === "processing" && (
                                                <div className="mesa-velo" aria-busy="true">
                                                    <div className="mesa-tarjeta text-center">
                                                        <LoaderCircle size={22} className="mx-auto mb-3 animate-spin text-teal-300 motion-reduce:animate-none" aria-hidden="true" />
                                                        <p className="text-sm font-semibold text-white" role="status" aria-live="polite">{progress.label}</p>
                                                        <p className="mt-1 text-[11px] text-slate-400">{downloading && progress.total > 0 ? `${(progress.current / 1048576).toFixed(1)} / ${(progress.total / 1048576).toFixed(1)} MB` : progress.key.startsWith("compute:") ? "Procesando en tu dispositivo" : "La primera imagen descarga el modelo"}</p>
                                                        <progress className={`${styles.progressTrack} mt-3`} max={progress.total || 1} value={progress.total > 0 ? progress.current : undefined} aria-label={progress.label} aria-valuetext={downloading ? `${percent}% de esta descarga` : progress.label} />
                                                        <button type="button" onClick={reset} className="studio-button mt-4 w-full justify-center">Cancelar</button>
                                                    </div>
                                                </div>
                                            )}
                                            {status === "error" && (
                                                <div className="mesa-velo">
                                                    <div className="mesa-tarjeta">
                                                        <p className="mb-2 text-sm font-semibold text-white">El recorte no se completó</p>
                                                        <p role="alert" className="text-xs leading-relaxed text-amber-200">{error}</p>
                                                        <div className="mt-4 flex flex-col gap-2">
                                                            <button type="button" className="studio-button studio-button-primary justify-center" onClick={() => { void processImage(source.file, source.url); }}><RotateCcw size={14} aria-hidden="true" />Volver a intentar</button>
                                                            {originalRef.current && <button type="button" className="studio-button justify-center" onClick={openManualEditor}><IconoPincel />Abrir editor manual</button>}
                                                            <button type="button" className="studio-button justify-center" onClick={reset}>Elegir otra imagen</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </MesaEscenario>

                                <MesaPasos etiqueta="Progreso del recorte" pasos={PASOS} estados={estadosPasos} progreso={progresoModelo} />

                                {status === "done" && (
                                    <div className="mesa-pie">
                                        <div className="mesa-rango"><label htmlFor="background-brush-size">Tamaño</label><input id="background-brush-size" type="range" min={4} max={140} value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} /><output htmlFor="background-brush-size">{brushSize} px</output></div>
                                        <div className="mesa-rango"><label htmlFor="background-brush-hardness">Dureza</label><input id="background-brush-hardness" type="range" min={0} max={100} value={hardness} onChange={event => setHardness(Number(event.target.value))} /><output htmlFor="background-brush-hardness">{hardness}%</output></div>
                                        <MesaMuestras etiqueta="Fondo de salida" opciones={[...FILLS]} valor={fill} onCambio={id => { setFill(id); setDownloaded(false); setCopiado(false); }}>
                                            <span className="mesa-muestra mesa-muestra-propio" title="Color personalizado" data-activo={fill === "custom" ? "true" : "false"}><input aria-label="Color de fondo personalizado" type="color" value={custom} onChange={event => { setCustom(event.target.value); setFill("custom"); setDownloaded(false); setCopiado(false); }} onClick={() => setFill("custom")} /></span>
                                        </MesaMuestras>
                                        <span className="mesa-pie-estado" role="status"><Check size={12} aria-hidden="true" />{copiado ? "Copiado al portapapeles" : downloaded ? "Descarga lista. Incluye tus retoques." : manual ? "Edición manual" : historyState.cambios ? "Recorte retocado" : "Recorte listo"}</span>
                                    </div>
                                )}
                            </div>

                            {status === "done" && (
                                <MesaRail etiqueta="Herramientas de retoque">
                                    <MesaGrupo etiqueta="Modo del pincel">
                                        <MesaBoton pista="Borrar" atajo="E" tono="borrar" pulsado={brushMode === "erase"} onClick={() => cambiarModo("erase")}><IconoGoma /></MesaBoton>
                                        <MesaBoton pista="Restaurar" atajo="R" tono="restaurar" pulsado={brushMode === "restore"} onClick={() => cambiarModo("restore")}><IconoPincel /></MesaBoton>
                                    </MesaGrupo>
                                    <MesaSeparador />
                                    <MesaBoton pista="Deshacer pincelada" atajo="Ctrl+Z" disabled={!historyState.undo || exporting} onClick={() => historyAction("undo")}><IconoDeshacer /></MesaBoton>
                                    <MesaBoton pista="Rehacer pincelada" atajo="Ctrl+Shift+Z" disabled={!historyState.redo || exporting} onClick={() => historyAction("redo")}><IconoRehacer /></MesaBoton>
                                    <MesaBoton pista="Volver al recorte inicial" disabled={!historyState.undo || exporting} onClick={() => historyAction("reset")}><RotateCcw size={18} aria-hidden="true" /></MesaBoton>
                                    <MesaSeparador />
                                    <MesaBoton pista="Comparar con el original" atajo="mantén C" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                                    <MesaBoton pista="Ver máscara" atajo="M" pulsado={verMascara} onClick={() => setVerMascara(value => !value)}><IconoCapas /></MesaBoton>
                                    <MesaSeparador />
                                    <MesaBoton pista="Copiar PNG" listo={copiado} disabled={exporting} onClick={() => { void copiar(); }}><IconoCopiar /></MesaBoton>
                                </MesaRail>
                            )}
                        </div>
                    </section>
                )}
                {status === "done" && error && <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">{error}</p>}
                <details className="group mt-5 rounded-xl border border-white/[0.07] bg-white/[0.015]">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><CircleHelp size={15} aria-hidden="true" />Unos detalles para que quede perfecto</span><ChevronDown size={14} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
                    <div className="grid gap-4 border-t border-white/5 p-4 text-xs leading-relaxed text-slate-400 sm:grid-cols-3"><p><strong className="font-medium text-slate-200">Una imagen nítida ayuda.</strong> Retratos y productos con buen contraste suelen dar el mejor resultado. Hasta 20 MB y 16 megapíxeles.</p><p><strong className="font-medium text-slate-200">Los detalles quedan en tus manos.</strong> Borra lo que sobra o restaura lo que falta. Baja la dureza para suavizar el borde.</p><p id="background-keyboard-help"><strong className="font-medium text-slate-200">También con teclado.</strong> Enfoca la imagen: flechas para mover el pincel, Espacio para pintar, Shift acelera. E borra, R restaura, [ y ] cambian el tamaño, C compara mientras se mantiene, M muestra la máscara. Ctrl / ⌘ Z deshace.</p></div>
                </details>
            </main>
        </div>
    );
}
