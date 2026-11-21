"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Type, Image as ImageIcon, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, Move, Grid2X2, LoaderCircle } from "lucide-react";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoDescargar, IconoImagen, IconoOjo, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { ImageDropzone, useSinAbrirArchivoSoltado } from "@/components/tools/ImageDropzone";
import { canvasToBlob, loadImageSource } from "@/lib/tools/image-processing";
import { avisoFormato, formatoSalida } from "@/lib/tools/formato-salida";
import { descargarBlob, nombreArchivo } from "@/lib/tools/descargar";

const ACCENT = "#F97316";
/** Lado mayor de la vista previa: basta para la pantalla, también en alta densidad, sin pintar la foto completa. */
const LADO_VISTA = 1600;
/** Espera tras el último cambio antes de redibujar: escribir o mover un control no repinta en cada tecla. */
const ESPERA_MS = 150;

type WatermarkPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tile";
type WatermarkMode = "text" | "logo";
const PASOS = [
    { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
    { id: "marcar", etiqueta: "Marcar", icono: <IconoVarita /> },
    { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];

const POSITIONS: { id: WatermarkPosition; name: string; icon: typeof Move }[] = [
    { id: "center", name: "Centro", icon: Move },
    { id: "top-left", name: "Arriba izquierda", icon: ArrowUpLeft },
    { id: "top-right", name: "Arriba derecha", icon: ArrowUpRight },
    { id: "bottom-left", name: "Abajo izquierda", icon: ArrowDownLeft },
    { id: "bottom-right", name: "Abajo derecha", icon: ArrowDownRight },
    { id: "tile", name: "Mosaico", icon: Grid2X2 },
];

/** Tamaños en % del ancho de la imagen: la marca se ve igual en una foto de 800 px que en una de 6000 px. */
interface AjustesMarca {
    mode: WatermarkMode;
    text: string;
    fontSize: number;
    opacity: number;
    color: string;
    position: WatermarkPosition;
    rotation: number;
    spacing: number;
    logoScale: number;
}

function getPlacement(
    canvasWidth: number,
    canvasHeight: number,
    elementWidth: number,
    elementHeight: number,
    position: Exclude<WatermarkPosition, "tile">
) {
    const padding = Math.min(canvasWidth, canvasHeight) * 0.035;

    switch (position) {
        case "top-left":
            return { x: padding, y: padding };
        case "top-right":
            return { x: canvasWidth - padding - elementWidth, y: padding };
        case "bottom-left":
            return { x: padding, y: canvasHeight - padding - elementHeight };
        case "bottom-right":
            return { x: canvasWidth - padding - elementWidth, y: canvasHeight - padding - elementHeight };
        default:
            return { x: (canvasWidth - elementWidth) / 2, y: (canvasHeight - elementHeight) / 2 };
    }
}

/**
 * Dibuja la imagen y la marca en coordenadas de la imagen original (width × height). La vista previa escala el
 * contexto antes de llamar: lo que se ve y lo que se descarga son la misma composición.
 */
function dibujarMarca(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number, ajustes: AjustesMarca, logo: HTMLImageElement | null) {
    context.drawImage(image, 0, 0, width, height);
    context.globalAlpha = ajustes.opacity / 100;
    const radians = (ajustes.rotation * Math.PI) / 180;
    const unit = width / 100;
    const spacing = ajustes.spacing * unit;

    // Mosaico: rejilla centrada que cubre el lienzo girado; se salta las celdas que caen fuera de la imagen.
    const tile = (stepX: number, stepY: number, draw: (x: number, y: number) => void) => {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const coverX = (width * Math.abs(cos) + height * Math.abs(sin)) / 2;
        const coverY = (width * Math.abs(sin) + height * Math.abs(cos)) / 2;
        const columns = Math.ceil(coverX / stepX) + 1;
        const rows = Math.ceil(coverY / stepY) + 1;
        const reach = Math.hypot(stepX, stepY);
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(radians);
        for (let row = -rows; row <= rows; row++) {
            for (let column = -columns; column <= columns; column++) {
                const x = column * stepX;
                const y = row * stepY;
                const canvasX = width / 2 + x * cos - y * sin;
                const canvasY = height / 2 + x * sin + y * cos;
                if (canvasX < -reach || canvasX > width + reach || canvasY < -reach || canvasY > height + reach) continue;
                draw(x, y);
            }
        }
        context.restore();
    };

    if (ajustes.mode === "text") {
        const text = ajustes.text.slice(0, 200);
        const fontSize = ajustes.fontSize * unit;
        context.fillStyle = ajustes.color;
        context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        context.textBaseline = "middle";
        context.textAlign = "center";
        const textWidth = context.measureText(text).width;

        if (ajustes.position === "tile") {
            tile(textWidth + spacing, fontSize + spacing * 0.5, (x, y) => context.fillText(text, x, y));
        } else {
            const placement = getPlacement(width, height, textWidth, fontSize, ajustes.position);
            context.save();
            context.translate(placement.x + textWidth / 2, placement.y + fontSize / 2);
            context.rotate(radians);
            context.fillText(text, 0, 0);
            context.restore();
        }
    } else if (logo) {
        const logoWidth = Math.max(1, ajustes.logoScale * unit);
        // Un SVG sin medidas propias puede llegar con naturalWidth 0: se dibuja cuadrado en vez de fallar.
        const logoHeight = logo.naturalWidth > 0 && logo.naturalHeight > 0 ? (logoWidth / logo.naturalWidth) * logo.naturalHeight : logoWidth;

        if (ajustes.position === "tile") {
            tile(logoWidth + spacing, logoHeight + spacing, (x, y) => context.drawImage(logo, x - logoWidth / 2, y - logoHeight / 2, logoWidth, logoHeight));
        } else {
            const placement = getPlacement(width, height, logoWidth, logoHeight, ajustes.position);
            context.save();
            context.translate(placement.x + logoWidth / 2, placement.y + logoHeight / 2);
            context.rotate(radians);
            context.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
            context.restore();
        }
    }

    context.globalAlpha = 1;
}

export default function WatermarkPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("marca-agua");
    useSinAbrirArchivoSoltado();
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [fuente, setFuente] = useState<{ version: number; image: HTMLImageElement } | null>(null);
    const [mode, setMode] = useState<WatermarkMode>("text");
    const [text, setText] = useState("© Tu Marca");
    const [fontSize, setFontSize] = useState(5);
    const [opacity, setOpacity] = useState(40);
    const [color, setColor] = useState("#ffffff");
    const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
    const [rotation, setRotation] = useState(-12);
    const [spacing, setSpacing] = useState(15);
    const [logoImage, setLogoImage] = useState<string | null>(null);
    const [logo, setLogo] = useState<{ version: number; image: HTMLImageElement } | null>(null);
    const [logoScale, setLogoScale] = useState(22);
    const [calidad, setCalidad] = useState(0.92);
    const [vistaLista, setVistaLista] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [claveDescargada, setClaveDescargada] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [comparando, setComparando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const vistaRef = useRef<HTMLCanvasElement>(null);
    const sourceVersion = useRef(0);
    const logoVersion = useRef(0);
    // Las URL blob: de la foto y del logo son de esta página (los recuadros se desmontan): se liberan al cambiarlas o al salir.
    const urlsRef = useRef<{ foto: string | null; logo: string | null }>({ foto: null, logo: null });
    const cambiarUrl = useCallback((cual: "foto" | "logo", siguiente: string | null) => {
        const actual = urlsRef.current[cual];
        if (actual && actual !== siguiente) URL.revokeObjectURL(actual);
        urlsRef.current[cual] = siguiente;
    }, []);
    useEffect(() => () => { cambiarUrl("foto", null); cambiarUrl("logo", null); }, [cambiarUrl]);

    const ajustes = useMemo<AjustesMarca>(
        () => ({ mode, text, fontSize, opacity, color, position, rotation, spacing, logoScale }),
        [mode, text, fontSize, opacity, color, position, rotation, spacing, logoScale]
    );
    const logoActivo = mode === "logo" ? logo?.image ?? null : null;
    const marcaValida = mode === "text" ? text.trim().length > 0 : logoActivo !== null;
    const formato = formatoSalida(sourceFile?.type);
    const clave = JSON.stringify([fuente?.version, logo?.version, ajustes, calidad]);

    const handleImageLoad = useCallback((file: File, url: string) => {
        const version = ++sourceVersion.current;
        cambiarUrl("foto", url);
        setSourceImage(url);
        setSourceFile(file);
        setFuente(null);
        setVistaLista(false);
        setExportando(false);
        setAviso(null);
        setError(null);
        void loadImageSource(url).then((image) => {
            if (version === sourceVersion.current) setFuente({ version, image });
        }).catch(() => {
            if (version === sourceVersion.current) setError("No se pudo leer la imagen. Prueba con otro archivo.");
        });
    }, [cambiarUrl]);

    const handleLogoLoad = useCallback((_file: File, url: string) => {
        const version = ++logoVersion.current;
        cambiarUrl("logo", url);
        setLogoImage(url);
        setLogo(null);
        setError(null);
        void loadImageSource(url).then((image) => {
            if (version === logoVersion.current) setLogo({ version, image });
        }).catch(() => {
            if (version === logoVersion.current) setError("No se pudo leer el logo. Prueba con otro archivo.");
        });
    }, [cambiarUrl]);

    const quitarLogo = useCallback(() => {
        logoVersion.current += 1;
        cambiarUrl("logo", null);
        setLogoImage(null);
        setLogo(null);
    }, [cambiarUrl]);

    const handleClear = useCallback(() => {
        sourceVersion.current += 1;
        logoVersion.current += 1;
        cambiarUrl("foto", null);
        cambiarUrl("logo", null);
        setSourceImage(null);
        setSourceFile(null);
        setFuente(null);
        setLogoImage(null);
        setLogo(null);
        setVistaLista(false);
        setExportando(false);
        setAviso(null);
        setError(null);
    }, [cambiarUrl]);

    // Vista previa reducida, ESPERA_MS después del último cambio. La imagen y el logo ya están decodificados.
    useEffect(() => {
        if (!fuente || !marcaValida) return;
        const timer = window.setTimeout(() => {
            const canvas = vistaRef.current;
            if (!canvas) return;
            const { image } = fuente;
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            const scale = Math.min(1, LADO_VISTA / Math.max(width, height));
            // Asignar el tamaño también limpia el lienzo y su transformación.
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const context = canvas.getContext("2d");
            if (!context) {
                setError("No se pudo preparar la vista previa.");
                return;
            }
            context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            dibujarMarca(context, image, width, height, ajustes, logoActivo);
            setVistaLista(true);
        }, ESPERA_MS);
        return () => window.clearTimeout(timer);
    }, [fuente, marcaValida, ajustes, logoActivo]);

    const handleDownload = useCallback(async () => {
        if (!fuente || !sourceFile || !marcaValida || exportando) return;
        const version = sourceVersion.current;
        const pedido = formatoSalida(sourceFile.type);
        const { image } = fuente;
        const canvas = document.createElement("canvas");
        setExportando(true);
        setError(null);
        try {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Canvas no disponible");
            dibujarMarca(context, image, canvas.width, canvas.height, ajustes, logoActivo);
            const blob = await canvasToBlob(canvas, pedido.tipo, calidad);
            if (version !== sourceVersion.current) return;
            const recibido = formatoSalida(blob.type);
            descargarBlob(blob, `${nombreArchivo(sourceFile.name, "imagen")}_marca.${recibido.extension}`);
            setAviso(avisoFormato(pedido, recibido));
            setClaveDescargada(clave);
        } catch {
            if (version === sourceVersion.current) setError("No se pudo exportar la imagen. Si es muy grande, redúcela e inténtalo de nuevo.");
        } finally {
            canvas.width = canvas.height = 0;
            if (version === sourceVersion.current) setExportando(false);
        }
    }, [fuente, sourceFile, marcaValida, exportando, ajustes, logoActivo, calidad, clave]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Marca de Agua"} />;
    }

    const field = "studio-field";
    const estadosPasos: EstadoPaso[] = !sourceImage ? ["activo", "pendiente", "pendiente"] : error ? ["listo", "error", "pendiente"] : fuente && marcaValida ? ["listo", "listo", "listo"] : ["listo", "activo", "pendiente"];
    const mostrarVista = vistaLista && marcaValida && !comparando;
    const mismoFormato = formatoSalida(sourceFile?.type).tipo === sourceFile?.type;
    const pista = comparando ? "Original" : !fuente ? "Abriendo imagen" : !marcaValida ? "Escribe tu marca o añade un logo" : `Se descarga a tamaño completo · ${formato.nombre}`;
    return <div className="tool-page">
        <main className="tool-main mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <ToolPageHeader slug="marca-agua" />
            {!sourceImage ? <ImageDropzone onImageLoad={handleImageLoad} accentColor={ACCENT} label="Arrastra la imagen a proteger" /> : <section aria-label="Editor de marca de agua" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": ACCENT } as CSSProperties}>
                <MesaCabecera nombre={sourceFile?.name ?? "Imagen"} detalle={fuente ? `${fuente.image.naturalWidth} × ${fuente.image.naturalHeight} px` : undefined}>
                    <button type="button" className="studio-button studio-button-primary" aria-label={`Descargar ${formato.nombre} con marca de agua`} disabled={!fuente || !marcaValida || exportando} onClick={() => { void handleDownload(); }}>{exportando ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={claveDescargada === clave} />}<span><span className="hidden sm:inline">Descargar </span>{formato.nombre}</span></button>
                </MesaCabecera>
                <div className="mesa-cuerpo mesa-cuerpo-panel">
                    <div className="mesa-columna">
                        <MesaEscenario fondo="dark" pista={pista} className="flex min-h-[260px] items-center justify-center p-3 sm:min-h-[380px]">
                            <canvas ref={vistaRef} role="img" aria-label="Imagen con marca de agua" className={mostrarVista ? "max-h-[480px] w-full object-contain" : "hidden"} />
                            {!mostrarVista && <img src={sourceImage} alt="Imagen original" className="max-h-[480px] w-full object-contain" />}
                        </MesaEscenario>
                        <MesaPasos etiqueta="Progreso de la marca" pasos={PASOS} estados={estadosPasos} />
                    </div>
                    <MesaRail etiqueta="Herramientas de la marca">
                        <MesaBoton pista="Comparar con el original" pulsado={comparando} onMantener={setComparando}><IconoOjo /></MesaBoton>
                        <MesaSeparador />
                        <MesaBoton pista="Cambiar imagen" onClick={handleClear}><IconoImagen /></MesaBoton>
                    </MesaRail>
                    <aside aria-label="Ajustes de marca de agua" className="mesa-panel space-y-5 p-4">
                        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de marca">
                            {(["text", "logo"] as const).map(item => <button type="button" key={item} className="studio-segment inline-flex items-center justify-center gap-2" aria-pressed={mode === item} onClick={() => setMode(item)}>{item === "text" ? <Type size={16} aria-hidden="true" /> : <ImageIcon size={16} aria-hidden="true" />}{item === "text" ? "Texto" : "Logo"}</button>)}
                        </div>
                        {mode === "text" ? <>
                            <label className={field}>Texto de la marca<input type="text" value={text} maxLength={200} onChange={event => setText(event.target.value)} placeholder="Tu marca" /></label>
                            <label className={field}><span className="flex justify-between">Tamaño del texto<output>{fontSize}% del ancho</output></span><input type="range" aria-label="Tamaño del texto" min={2} max={20} step={0.5} value={fontSize} onChange={event => setFontSize(Number(event.target.value))} /></label>
                            <label className="flex items-center justify-between text-xs text-slate-300">Color del texto<input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-11 w-12 cursor-pointer rounded-lg bg-transparent" /></label>
                        </> : <>
                            <ImageDropzone onImageLoad={handleLogoLoad} enPagina={false} currentImage={logoImage} onClear={quitarLogo} accentColor={ACCENT} label="Añade tu logo" sublabel="PNG con transparencia" maxSize={10 * 1024 * 1024} />
                            <label className={field}><span className="flex justify-between">Escala del logo<output>{logoScale}% del ancho</output></span><input type="range" aria-label="Escala del logo" min={8} max={45} value={logoScale} onChange={event => setLogoScale(Number(event.target.value))} /></label>
                        </>}
                        <label className={field}><span className="flex justify-between">Opacidad<output>{opacity}%</output></span><input type="range" aria-label="Opacidad" min={5} max={100} value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
                        <label className={field}><span className="flex justify-between">Rotación<output>{rotation}°</output></span><input type="range" aria-label="Rotación" min={-45} max={45} value={rotation} onChange={event => setRotation(Number(event.target.value))} /></label>
                        <fieldset><legend className="mb-3 text-xs text-slate-300">Posición</legend><div className="grid grid-cols-3 gap-2">{POSITIONS.map(({ id, name, icon: Icon }) => <button type="button" key={id} onClick={() => setPosition(id)} aria-label={name} title={name} aria-pressed={position === id} className="studio-segment flex flex-col items-center justify-center gap-2 border border-white/5"><Icon size={19} aria-hidden="true" /><span className="text-[9px]">{name}</span></button>)}</div></fieldset>
                        {position === "tile" && <label className={field}><span className="flex justify-between">Espaciado<output>{spacing}% del ancho</output></span><input type="range" aria-label="Espaciado del mosaico" min={5} max={50} value={spacing} onChange={event => setSpacing(Number(event.target.value))} /></label>}
                        <div className="space-y-3 border-t border-white/10 pt-4">
                            <p className="text-xs leading-5 text-slate-400">{mismoFormato ? `Se descarga en ${formato.nombre}, igual que el original.` : `Se descarga en ${formato.nombre}.`}</p>
                            {formato.conPerdida && <label className={field}><span className="flex justify-between">Calidad<output>{Math.round(calidad * 100)}%</output></span><input type="range" aria-label="Calidad" min={50} max={100} value={Math.round(calidad * 100)} onChange={event => setCalidad(Number(event.target.value) / 100)} /></label>}
                        </div>
                    </aside>
                </div>
            </section>}
            <p role="status" className="mt-3 text-xs text-slate-400 empty:hidden">{aviso}</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-rose-300">{error}</p>}
        </main>
    </div>;
}
