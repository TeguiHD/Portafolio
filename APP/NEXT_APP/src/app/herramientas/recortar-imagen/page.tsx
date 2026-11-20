"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { LoaderCircle } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone, useSinAbrirArchivoSoltado } from "@/components/tools/ImageDropzone";

import { SubjectBrush, type SubjectBrushHandle } from "@/components/tools/SubjectBrush";
import { BackgroundProcessor } from "@/components/tools/BackgroundProcessor";
import { calcularMascaraSujeto, esCancelacion, mensajeErrorDetector, type MascaraSujeto } from "@/lib/tools/mascara-sujeto";
import { bboxFromAlpha, bboxFromMask, fitCropToSubject, scaleRect, type Rect } from "@/lib/crop-geometry";
import { MesaBoton, MesaGrupo, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoCuadricula, IconoDescargar, IconoEncuadre, IconoGirar, IconoGoma, IconoImagen, IconoPincel, IconoRestablecer, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { canvasToBlob, loadImageSource, type ExportMimeType } from "@/lib/tools/image-processing";
import { FORMATOS_SALIDA, avisoFormato, formatoSalida } from "@/lib/tools/formato-salida";
import { descargarBlob, nombreArchivo } from "@/lib/tools/descargar";

const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "encuadrar", etiqueta: "Encuadrar", icono: <IconoEncuadre /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

const ACCENT = "#EC4899";

const PRESETS: { name: string; aspect: number; label: string }[] = [
    { name: "Original", aspect: 0, label: "Proporción original" },
    { name: "1:1", aspect: 1, label: "Cuadrado" },
    { name: "16:9", aspect: 16 / 9, label: "YouTube" },
    { name: "9:16", aspect: 9 / 16, label: "Stories" },
    { name: "4:3", aspect: 4 / 3, label: "Foto" },
    { name: "3:2", aspect: 3 / 2, label: "Paisaje" },
    { name: "4:5", aspect: 4 / 5, label: "Instagram" },
];

function getRadianAngle(rotation: number) {
    return (rotation * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
    const radians = getRadianAngle(rotation);

    return {
        width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
        height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
    };
}

/**
 * Genera el archivo del recorte (solo al descargar). `pixelCrop` viene de react-easy-crop y está en la caja de la
 * imagen ya rotada; se dibuja directo en un lienzo del tamaño del recorte, sin el lienzo rotado completo intermedio.
 */
async function exportarRecorte(image: HTMLImageElement, pixelCrop: Area, rotation: number, tipo: ExportMimeType, calidad: number) {
    const safeWidth = Math.max(1, Math.round(pixelCrop.width));
    const safeHeight = Math.max(1, Math.round(pixelCrop.height));
    const rotatedBounds = rotateSize(image.naturalWidth, image.naturalHeight, rotation);
    const outputCanvas = document.createElement("canvas");
    const outputContext = outputCanvas.getContext("2d");

    if (!outputContext) {
        throw new Error("No se pudo exportar el recorte");
    }

    outputCanvas.width = safeWidth;
    outputCanvas.height = safeHeight;
    // JPEG no guarda transparencia: las esquinas que deja una rotación saldrían negras.
    if (tipo === "image/jpeg") {
        outputContext.fillStyle = "#ffffff";
        outputContext.fillRect(0, 0, safeWidth, safeHeight);
    }
    outputContext.translate(-pixelCrop.x, -pixelCrop.y);
    outputContext.translate(rotatedBounds.width / 2, rotatedBounds.height / 2);
    outputContext.rotate(getRadianAngle(rotation));
    outputContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
    outputContext.drawImage(image, 0, 0);

    try {
        return await canvasToBlob(outputCanvas, tipo, calidad);
    } finally {
        outputCanvas.width = outputCanvas.height = 0;
    }
}

export default function ImageCropperPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("recortar-imagen");
    useSinAbrirArchivoSoltado();
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [formato, setFormato] = useState<ExportMimeType>("image/png");
    const [calidad, setCalidad] = useState(0.9);
    const [exportando, setExportando] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const imagenRef = useRef<HTMLImageElement | null>(null);
    const sourceVersion = useRef(0);
    const [showGrid, setShowGrid] = useState(true);
    const [descargado, setDescargado] = useState(false);

    // «Encajar al sujeto»: la máscara sale del worker de quitar-fondo y se guarda por imagen,
    // así cambiar margen, proporción o pincel no vuelve a correr el modelo.
    const [mode, setMode] = useState<"crop" | "subject">("crop");
    const [brushSize, setBrushSize] = useState(0.06);
    const [paddingRatio, setPaddingRatio] = useState(0.08);
    const [subjectBusy, setSubjectBusy] = useState(false);
    const [subjectLabel, setSubjectLabel] = useState<string | null>(null);
    const [progresoSujeto, setProgresoSujeto] = useState<number | null>(null);
    const [cajaSujeto, setCajaSujeto] = useState<Rect | null>(null);
    const [snapKey, setSnapKey] = useState(0);
    const [initialArea, setInitialArea] = useState<Area | null>(null);
    const brushRef = useRef<SubjectBrushHandle | null>(null);
    const procesadorRef = useRef<BackgroundProcessor | null>(null);
    const mascaraRef = useRef<{ version: number; mascara: MascaraSujeto } | null>(null);
    const ocupadoRef = useRef<number | null>(null);
    // La URL blob: de la imagen es de esta página (el recuadro de carga se desmonta): se libera al cambiarla o al salir.
    const urlFuenteRef = useRef<string | null>(null);
    const soltarUrlFuente = useCallback((siguiente: string | null) => {
        if (urlFuenteRef.current && urlFuenteRef.current !== siguiente) URL.revokeObjectURL(urlFuenteRef.current);
        urlFuenteRef.current = siguiente;
    }, []);

    const aspectoDe = (indice: number) => PRESETS[indice].aspect || (imageDimensions ? imageDimensions.width / imageDimensions.height : 4 / 3);
    const aspect = aspectoDe(selectedPreset);
    const formatoActual = formatoSalida(formato);

    useEffect(() => {
        return () => {
            sourceVersion.current += 1;
            procesadorRef.current?.cancel();
            soltarUrlFuente(null);
        };
    }, [soltarUrlFuente]);

    /** Corta la detección en curso (termina el worker); si no hay ninguna, deja el modelo cargado. */
    const cancelarDeteccion = useCallback(() => {
        if (ocupadoRef.current !== null) procesadorRef.current?.cancel();
        ocupadoRef.current = null;
    }, []);

    const handleImageLoad = useCallback((file: File, url: string) => {
        const version = ++sourceVersion.current;
        cancelarDeteccion();
        soltarUrlFuente(url);
        imagenRef.current = null;
        mascaraRef.current = null;
        setImageDimensions(null);
        setSubjectBusy(false);
        setProgresoSujeto(null);
        setSourceImage(url);
        setSourceFile(file);
        setFormato(formatoSalida(file.type).tipo);
        setExportando(false);
        setAviso(null);
        setCroppedAreaPixels(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setError(null);
        setMode("crop");
        setInitialArea(null);
        setCajaSujeto(null);
        setSubjectLabel(null);
        setDescargado(false);

        void loadImageSource(url).then((image) => {
            if (version !== sourceVersion.current) return;
            imagenRef.current = image;
            setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
        }).catch(() => { if (version === sourceVersion.current) setError("No se pudo leer la imagen"); });
    }, [cancelarDeteccion, soltarUrlFuente]);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        cancelarDeteccion();
        soltarUrlFuente(null);
        imagenRef.current = null;
        mascaraRef.current = null;
        setSubjectBusy(false);
        setProgresoSujeto(null);
        setSourceImage(null);
        setSourceFile(null);
        setCroppedAreaPixels(null);
        setImageDimensions(null);
        setExportando(false);
        setAviso(null);
        setCajaSujeto(null);
        setSubjectLabel(null);
        setError(null);
    }, [cancelarDeteccion, soltarUrlFuente]);

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
        setDescargado(false);
    }, []);

    const handleDownload = useCallback(async () => {
        const imagen = imagenRef.current;
        if (!imagen || !croppedAreaPixels || !sourceFile || exportando) return;
        const version = sourceVersion.current;
        const pedido = formatoSalida(formato);
        setExportando(true);
        setError(null);
        try {
            const blob = await exportarRecorte(imagen, croppedAreaPixels, rotation, pedido.tipo, calidad);
            if (version !== sourceVersion.current) return;
            const recibido = formatoSalida(blob.type);
            descargarBlob(blob, `${nombreArchivo(sourceFile.name, "imagen")}_recorte.${recibido.extension}`);
            setAviso(avisoFormato(pedido, recibido));
            setDescargado(true);
        } catch {
            if (version === sourceVersion.current) setError("No se pudo generar el archivo. Si la imagen es muy grande, prueba con un recorte más pequeño.");
        } finally {
            if (version === sourceVersion.current) setExportando(false);
        }
    }, [croppedAreaPixels, sourceFile, exportando, formato, rotation, calidad]);

    const handleResetCrop = useCallback(() => {
        setInitialArea(null);
        setCajaSujeto(null);
        setSubjectLabel(null);
        setDescargado(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setSelectedPreset(0);
        setError(null);
    }, []);

    /** Encuadra la caja del sujeto (px de la imagen) con margen y proporción; remonta el cropper para aplicarlo. */
    const aplicarEncaje = useCallback((caja: Rect, aspecto: number, margen: number) => {
        if (!imageDimensions) return;
        setInitialArea(fitCropToSubject(caja, imageDimensions, { aspect: aspecto, paddingRatio: margen }));
        setSnapKey((k) => k + 1);
        setRotation(0);
        setMode("crop");
        setDescargado(false);
    }, [imageDimensions]);

    const elegirProporcion = (indice: number) => {
        setSelectedPreset(indice);
        if (cajaSujeto && mode === "crop") aplicarEncaje(cajaSujeto, aspectoDe(indice), paddingRatio);
    };

    const cambiarMargen = (margen: number) => {
        setPaddingRatio(margen);
        if (cajaSujeto && mode === "crop") aplicarEncaje(cajaSujeto, aspect, margen);
    };

    const cambiarRotacion = (grados: number) => {
        setRotation(grados);
        // La caja del sujeto está en la imagen sin rotar: deja de valer para reencuadrar.
        setCajaSujeto(null);
    };

    const handleSnapToSubject = useCallback(async () => {
        const imagen = imagenRef.current;
        if (!imagen || !imageDimensions) return;
        const version = sourceVersion.current;
        const brush = mode === "subject" ? brushRef.current : null;
        const conTrazos = brush?.hasStrokes() ?? false;
        setSubjectBusy(true);
        setError(null);
        setSubjectLabel("Iniciando el detector");
        setProgresoSujeto(null);
        const guardada = mascaraRef.current;
        let mascara = guardada && guardada.version === version ? guardada.mascara : null;
        let fallo: unknown = null;

        try {
            if (!mascara) {
                ocupadoRef.current = version;
                try {
                    const procesador = procesadorRef.current ?? new BackgroundProcessor();
                    procesadorRef.current = procesador;
                    mascara = await calcularMascaraSujeto(imagen, procesador, (etiqueta, fraccion) => {
                        if (version !== sourceVersion.current) return;
                        setSubjectLabel(etiqueta);
                        setProgresoSujeto(fraccion);
                    });
                    if (version !== sourceVersion.current) return;
                    mascaraRef.current = { version, mascara };
                } catch (causa) {
                    if (version !== sourceVersion.current || esCancelacion(causa)) return;
                    console.warn("Detector de sujetos no disponible", causa);
                    fallo = causa;
                } finally {
                    if (ocupadoRef.current === version) ocupadoRef.current = null;
                }
            }

            let caja: Rect | null = null;
            if (mascara) {
                // Pincel ∩ segmentación; si la segmentación no ve nada dentro del trazo, vale la pincelada sola.
                const trazo = brush && conTrazos ? brush.getMask(mascara.ancho, mascara.alto) : null;
                const encontrada =
                    bboxFromAlpha(mascara.alfa, mascara.ancho, mascara.alto, 64, trazo) ??
                    (trazo ? bboxFromMask(trazo, mascara.ancho, mascara.alto) : null);
                if (encontrada) caja = scaleRect(encontrada, 1 / mascara.escala);
            } else if (brush && conTrazos) {
                const gw = Math.min(512, imageDimensions.width);
                const gh = Math.max(1, Math.round((gw * imageDimensions.height) / imageDimensions.width));
                const trazo = brush.getMask(gw, gh);
                const encontrada = trazo ? bboxFromMask(trazo, gw, gh) : null;
                if (encontrada) caja = scaleRect(encontrada, imageDimensions.width / gw);
            }

            if (!caja) {
                setSubjectLabel(null);
                setError(fallo ? mensajeErrorDetector(fallo) : "No se detectó ningún sujeto. Usa «Marcar sujeto», pinta encima de lo que quieres conservar e inténtalo de nuevo.");
                return;
            }

            setCajaSujeto(caja);
            aplicarEncaje(caja, PRESETS[selectedPreset].aspect || imageDimensions.width / imageDimensions.height, paddingRatio);
            setSubjectLabel(mascara ? "Recorte ajustado al sujeto" : "Encaje por pincelada: el detector no respondió");
        } finally {
            if (version === sourceVersion.current) {
                setSubjectBusy(false);
                setProgresoSujeto(null);
            }
        }
    }, [imageDimensions, mode, selectedPreset, paddingRatio, aplicarEncaje]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Recortador de Imágenes"} />;
    }

    const estadosPasos: EstadoPaso[] = !imageDimensions ? ["activo", "pendiente", "pendiente"]
        : croppedAreaPixels && mode === "crop" ? ["listo", "listo", "listo"]
        : ["listo", "activo", "pendiente"];
    const pista = mode === "subject" ? "Pinta sobre lo que quieres conservar" : (!subjectBusy && subjectLabel) || "Arrastra para encuadrar · flechas para ajustar";
    const rotacionVisible = rotation > 180 ? rotation - 360 : rotation;
    const controlMargen = <div className="mesa-rango"><label htmlFor="subject-padding">Margen</label><input id="subject-padding" type="range" min={0} max={0.3} step={0.01} value={paddingRatio} onChange={(event) => cambiarMargen(Number(event.target.value))} /><output htmlFor="subject-padding">{Math.round(paddingRatio * 100)}%</output></div>;

    return (
        <div className="tool-page">
            <main className="tool-main mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
                <ToolPageHeader slug="recortar-imagen" title="Recortar imagen" description="Encuadra, gira o encaja al sujeto, y descarga en PNG, JPEG o WebP." />
                {!sourceImage ? (
                    <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a recortar" sublabel="PNG, JPG o WebP · procesamiento local" />
                ) : (
                    <section aria-label="Editor de recorte" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                        <MesaCabecera nombre={sourceFile?.name ?? "Imagen"} detalle={croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)} × ${Math.round(croppedAreaPixels.height)} px` : imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px` : undefined}>
                            <button type="button" aria-label={`Descargar recorte ${formatoActual.nombre}`} onClick={() => { void handleDownload(); }} disabled={!croppedAreaPixels || !imageDimensions || exportando || mode !== "crop"} className="studio-button studio-button-primary">
                                {exportando ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={descargado} />}<span><span className="hidden sm:inline">Descargar </span>{formatoActual.nombre}</span>
                            </button>
                        </MesaCabecera>
                        <div className="mesa-cuerpo">
                            <div className="mesa-columna">
                                <MesaEscenario fondo="dark" pista={pista} className="h-[min(50vh,520px)] min-h-[280px] sm:min-h-[360px]">
                                    {mode === "subject" ? (
                                        <SubjectBrush ref={brushRef} imageSrc={sourceImage} brushSize={brushSize} accentColor={ACCENT} />
                                    ) : imageDimensions ? (
                                        <Cropper key={snapKey} image={sourceImage} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} initialCroppedAreaPixels={initialArea ?? undefined} maxZoom={5} showGrid={showGrid}
                                            onCropChange={setCrop}
                                            onZoomChange={setZoom}
                                            onRotationChange={cambiarRotacion}
                                            onCropComplete={onCropComplete} />
                                    ) : <div className="flex h-full items-center justify-center"><LoaderCircle className="h-6 w-6 text-pink-300 motion-safe:animate-spin" /></div>}
                                </MesaEscenario>
                                <MesaPasos etiqueta="Progreso del recorte" pasos={PASOS} estados={estadosPasos} />
                                <div className="mesa-pie">
                                    <div className="mesa-chips" role="group" aria-label="Proporción">
                                        {PRESETS.map((preset, index) => <button key={preset.name} type="button" className="mesa-chip" title={preset.label} aria-label={`${preset.name}: ${preset.label}`} aria-pressed={selectedPreset === index} onClick={() => elegirProporcion(index)}>{preset.name}</button>)}
                                    </div>
                                    {mode === "crop" ? <>
                                        <div className="mesa-rango"><label htmlFor="crop-zoom">Zoom</label><input id="crop-zoom" type="range" min={1} max={5} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><output htmlFor="crop-zoom">{zoom.toFixed(1)}×</output></div>
                                        <div className="mesa-rango"><label htmlFor="crop-rotation">Rotación</label><input id="crop-rotation" type="range" min={-180} max={180} step={1} value={rotacionVisible} onChange={(event) => cambiarRotacion((Number(event.target.value) + 360) % 360)} /><output htmlFor="crop-rotation">{rotacionVisible}°</output></div>
                                        {cajaSujeto && controlMargen}
                                        <div className="mesa-chips" role="group" aria-label="Formato de descarga">
                                            {FORMATOS_SALIDA.map((item) => <button key={item.tipo} type="button" className="mesa-chip" aria-pressed={formato === item.tipo} onClick={() => { setFormato(item.tipo); setAviso(null); setDescargado(false); }}>{item.nombre}</button>)}
                                        </div>
                                        {formatoActual.conPerdida && <div className="mesa-rango"><label htmlFor="crop-quality">Calidad</label><input id="crop-quality" type="range" min={0.5} max={1} step={0.01} value={calidad} onChange={(event) => { setCalidad(Number(event.target.value)); setDescargado(false); }} /><output htmlFor="crop-quality">{Math.round(calidad * 100)}%</output></div>}
                                    </> : <>
                                        <div className="mesa-rango"><label htmlFor="subject-brush">Tamaño del pincel</label><input id="subject-brush" type="range" min={0.02} max={0.15} step={0.01} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /><output htmlFor="subject-brush">{Math.round(brushSize * 100)}</output></div>
                                        {controlMargen}
                                    </>}
                                    <span className="mesa-pie-estado" role="status">
                                        {subjectBusy ? <><LoaderCircle className="h-3 w-3 motion-safe:animate-spin" aria-hidden="true" />{subjectLabel}{progresoSujeto !== null && <span aria-hidden="true">· {Math.round(progresoSujeto * 100)}%</span>}</>
                                            : exportando ? "Generando el archivo…" : aviso ?? ""}
                                    </span>
                                </div>
                            </div>
                            <MesaRail etiqueta="Herramientas de recorte">
                                <MesaGrupo etiqueta="Modo de edición">
                                    <MesaBoton pista="Recortar" pulsado={mode === "crop"} onClick={() => setMode("crop")}><IconoEncuadre /></MesaBoton>
                                    <MesaBoton pista="Marcar sujeto" pulsado={mode === "subject"} onClick={() => setMode("subject")}><IconoPincel /></MesaBoton>
                                </MesaGrupo>
                                <MesaSeparador />
                                <MesaBoton pista="Encajar al sujeto" disabled={subjectBusy || !imageDimensions} onClick={() => { void handleSnapToSubject(); }}><IconoVarita /></MesaBoton>
                                {mode === "crop" ? <>
                                    <MesaBoton pista="Mostrar cuadrícula" pulsado={showGrid} onClick={() => setShowGrid(!showGrid)}><IconoCuadricula /></MesaBoton>
                                    <MesaBoton pista="Girar 90°" onClick={() => cambiarRotacion((rotation + 90) % 360)}><IconoGirar /></MesaBoton>
                                    <MesaBoton pista="Restablecer encuadre" onClick={handleResetCrop}><IconoRestablecer /></MesaBoton>
                                </> : <>
                                    <MesaBoton pista="Limpiar trazos" disabled={subjectBusy} onClick={() => brushRef.current?.clear()}><IconoGoma /></MesaBoton>
                                </>}
                                <MesaSeparador />
                                <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                            </MesaRail>
                        </div>
                    </section>
                )}
                {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            </main>
        </div>
    );
}
