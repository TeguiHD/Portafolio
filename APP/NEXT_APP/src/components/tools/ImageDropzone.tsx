"use client";

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type CSSProperties } from "react";
import { ImagePlus, Upload, X, RefreshCw, LoaderCircle, AlertCircle } from "lucide-react";
import { BYTES_CABECERA, etiquetaFormato, extensionesAceptadas, formatoPorBytes, listaFormatos, pareceSvg } from "@/lib/tools/firmas-imagen";

// SECURITY(NIST): Size limits to prevent DoS
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max
/** Máximo de imágenes por lote. */
export const MAX_LOTE = 20;

type Validacion = { ok: true; archivo: File } | { ok: false; motivo: string };

// SECURITY(OWASP): el tipo se decide por los bytes (firma), no por la extensión ni por file.type.
async function validarArchivo(file: File, accept: readonly string[], maxSize: number): Promise<Validacion> {
    if (file.size > maxSize) return { ok: false, motivo: `El archivo es muy grande. Máximo: ${Math.round(maxSize / 1024 / 1024)} MB.` };
    if (file.size === 0) return { ok: false, motivo: "El archivo está vacío." };
    const cabecera = new Uint8Array(await file.slice(0, BYTES_CABECERA).arrayBuffer());
    let tipo = formatoPorBytes(cabecera);
    if (!tipo && accept.includes("image/svg+xml") && (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) && pareceSvg(await file.slice(0, 4096).text())) {
        tipo = "image/svg+xml";
    }
    if (!tipo) {
        return { ok: false, motivo: !file.type || accept.includes(file.type) ? "No pudimos reconocer esta imagen. Prueba con otro archivo o vuelve a exportarlo." : `Formato no soportado: ${etiquetaFormato(file.type)}. Usa ${listaFormatos(accept)}.` };
    }
    if (!accept.includes(tipo)) return { ok: false, motivo: `Formato no soportado: ${etiquetaFormato(tipo)}. Usa ${listaFormatos(accept)}.` };
    // Con el tipo real (file.type puede venir vacío o mal puesto); new File no copia los bytes.
    return { ok: true, archivo: tipo === file.type ? file : new File([file], file.name, { type: tipo, lastModified: file.lastModified }) };
}

function leerComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No pudimos leer el archivo.")));
        reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
        reader.onabort = () => reject(new Error("Lectura cancelada."));
        reader.readAsDataURL(file);
    });
}

/* ---- Pegar y soltar en toda la página ----
   Una sola escucha en window para todos los recuadros montados: cada evento lo recibe uno solo
   (el que contiene el objetivo o, si no, el primero visible), así no se duplican las cargas. */

interface Receptor {
    raiz: { readonly current: HTMLElement | null };
    enPagina: () => boolean;
    recibir: (archivos: File[]) => void;
    resaltar: (activo: boolean) => void;
}

const receptores: Receptor[] = [];
let resaltado: Receptor | null = null;
let profundidadArrastre = 0;
/** Páginas que, sin recuadro a la vista (ya en el editor), igual deben impedir que el navegador abra el archivo soltado. */
let guardias = 0;

function esVisible(elemento: HTMLElement): boolean {
    if (!elemento.isConnected) return false;
    return typeof elemento.checkVisibility === "function" ? elemento.checkVisibility() : elemento.getClientRects().length > 0;
}

function elegirReceptor(objetivo: EventTarget | null): Receptor | null {
    const visibles = receptores.filter((receptor) => receptor.raiz.current && esVisible(receptor.raiz.current));
    if (objetivo instanceof Node) {
        const propio = visibles.find((receptor) => receptor.raiz.current?.contains(objetivo));
        if (propio) return propio;
    }
    return visibles.find((receptor) => receptor.enPagina()) ?? null;
}

function marcar(receptor: Receptor | null) {
    if (resaltado === receptor) return;
    resaltado?.resaltar(false);
    resaltado = receptor;
    receptor?.resaltar(true);
}

function llevaArchivos(evento: DragEvent): boolean {
    return Array.from(evento.dataTransfer?.types ?? []).includes("Files");
}

function esCampoDeTexto(elemento: Element | null): boolean {
    if (elemento instanceof HTMLTextAreaElement) return true;
    if (elemento instanceof HTMLInputElement) return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(elemento.type);
    return elemento instanceof HTMLElement && elemento.isContentEditable;
}

function archivosDelPortapapeles(datos: DataTransfer): File[] {
    const archivos = Array.from(datos.files);
    if (archivos.length) return archivos;
    for (const item of Array.from(datos.items)) {
        const archivo = item.kind === "file" ? item.getAsFile() : null;
        if (archivo) archivos.push(archivo);
    }
    return archivos;
}

function alEntrarArrastre(evento: DragEvent) {
    if (llevaArchivos(evento)) profundidadArrastre += 1;
}

function alSalirArrastre(evento: DragEvent) {
    if (!llevaArchivos(evento)) return;
    profundidadArrastre = Math.max(0, profundidadArrastre - 1);
    if (profundidadArrastre === 0) marcar(null);
}

function alArrastrarEncima(evento: DragEvent) {
    if (!llevaArchivos(evento)) return;
    const receptor = elegirReceptor(evento.target);
    marcar(receptor);
    if (!evento.dataTransfer) return;
    if (receptor) {
        evento.preventDefault();
        evento.dataTransfer.dropEffect = "copy";
    } else if (guardias > 0 && !evento.defaultPrevented) {
        // Sin esto, soltar una imagen sobre el editor hace que el navegador la abra y se pierde el trabajo.
        evento.preventDefault();
        evento.dataTransfer.dropEffect = "none";
    }
}

function alSoltar(evento: DragEvent) {
    profundidadArrastre = 0;
    marcar(null);
    if (evento.defaultPrevented || !evento.dataTransfer || !llevaArchivos(evento)) return;
    const receptor = elegirReceptor(evento.target);
    if (!receptor) {
        if (guardias > 0) evento.preventDefault();
        return;
    }
    evento.preventDefault();
    receptor.recibir(Array.from(evento.dataTransfer.files));
}

function alPegar(evento: ClipboardEvent) {
    if (evento.defaultPrevented || !evento.clipboardData) return;
    // En un campo de texto manda el pegado normal, salvo que el portapapeles traiga solo una imagen (no hay texto que pegar).
    if (esCampoDeTexto(document.activeElement) && evento.clipboardData.types.includes("text/plain")) return;
    const archivos = archivosDelPortapapeles(evento.clipboardData);
    if (!archivos.length) return;
    const receptor = elegirReceptor(evento.target);
    if (!receptor) return;
    evento.preventDefault();
    receptor.recibir(archivos);
}

let escuchando = false;

/** Pone o quita las escuchas de window según haya recuadros o páginas que las necesiten. */
function sincronizarEscuchas() {
    const hacenFalta = receptores.length > 0 || guardias > 0;
    if (hacenFalta === escuchando) return;
    escuchando = hacenFalta;
    if (hacenFalta) {
        window.addEventListener("dragenter", alEntrarArrastre);
        window.addEventListener("dragleave", alSalirArrastre);
        window.addEventListener("dragover", alArrastrarEncima);
        window.addEventListener("drop", alSoltar);
        window.addEventListener("paste", alPegar);
        return;
    }
    profundidadArrastre = 0;
    window.removeEventListener("dragenter", alEntrarArrastre);
    window.removeEventListener("dragleave", alSalirArrastre);
    window.removeEventListener("dragover", alArrastrarEncima);
    window.removeEventListener("drop", alSoltar);
    window.removeEventListener("paste", alPegar);
}

function registrarReceptor(receptor: Receptor): () => void {
    receptores.push(receptor);
    sincronizarEscuchas();
    return () => {
        const indice = receptores.indexOf(receptor);
        if (indice >= 0) receptores.splice(indice, 1);
        if (resaltado === receptor) resaltado = null;
        sincronizarEscuchas();
    };
}

/**
 * Para las páginas que esconden el recuadro al abrir el editor: mientras estén montadas, soltar un archivo fuera de un
 * recuadro no hace nada, en vez de que el navegador abra la imagen y se pierda lo hecho.
 */
export function useSinAbrirArchivoSoltado() {
    useEffect(() => {
        guardias += 1;
        sincronizarEscuchas();
        return () => {
            guardias -= 1;
            sincronizarEscuchas();
        };
    }, []);
}

interface ImageDropzoneProps {
    /**
     * Recibe el archivo ya validado (con el tipo real en `file.type`) y una URL para mostrarlo.
     * Por defecto es una URL `blob:`. Este recuadro la libera cuando entrega otra o al pulsar «Quitar imagen»;
     * si se desmonta, la URL sigue viva y conviene que la libere quien la recibió (URL.revokeObjectURL).
     */
    onImageLoad: (file: File, url: string) => void;
    accept?: string[];
    maxSize?: number;
    label?: string;
    sublabel?: string;
    accentColor?: string;
    currentImage?: string | null;
    onClear?: () => void;
    /** Permite elegir o soltar varias imágenes (hasta 20). */
    multiple?: boolean;
    /** Con `multiple`: recibe los archivos válidos cuando son dos o más. Con uno solo se llama a `onImageLoad`. */
    onMultipleLoad?: (files: File[]) => void;
    /** "dataUrl" entrega el archivo entero en base64: úsalo solo si la herramienta necesita ese texto. */
    entrega?: "blob" | "dataUrl";
    /** Escucha pegar (Ctrl/⌘ V) y soltar en toda la página mientras el recuadro esté visible. */
    enPagina?: boolean;
}

export function ImageDropzone({
    onImageLoad,
    accept = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"],
    maxSize = MAX_FILE_SIZE,
    label = "Arrastra una imagen aquí",
    sublabel,
    accentColor = "#FF8A00",
    currentImage,
    onClear,
    multiple = false,
    onMultipleLoad,
    entrega = "blob",
    enPagina = true,
}: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [selectedName, setSelectedName] = useState("");
    const [selectedBytes, setSelectedBytes] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const raiz = useRef<HTMLDivElement>(null);
    const leyendo = useRef(false);
    const ultimaUrl = useRef<string | null>(null);
    const maxMb = Math.round(maxSize / 1024 / 1024);

    const handleFiles = useCallback(async (entrada: FileList | File[] | null) => {
        if (!entrada || entrada.length === 0 || leyendo.current) return;
        leyendo.current = true;
        // Instantánea: el FileList del input es "vivo" y el onChange limpia
        // input.value justo después de llamar aquí, así que tras el primer
        // await files[0] sería undefined y los consumidores recibirían un File nulo.
        const archivos = Array.from(entrada);
        const enLote = multiple && !!onMultipleLoad;
        const candidatos = archivos.slice(0, enLote ? MAX_LOTE : 1);
        setError(null);
        setAviso(null);
        setIsValidating(true);
        try {
            const validos: File[] = [];
            const rechazos: string[] = [];
            for (const archivo of candidatos) {
                const validacion = await validarArchivo(archivo, accept, maxSize);
                if (validacion.ok) validos.push(validacion.archivo);
                else rechazos.push(candidatos.length > 1 ? `${archivo.name}: ${validacion.motivo}` : validacion.motivo);
            }
            if (rechazos.length) setError(rechazos.length > 3 ? `${rechazos.slice(0, 3).join(" · ")} · y ${rechazos.length - 3} más.` : rechazos.join(" · "));
            const fuera = archivos.length - candidatos.length;
            if (fuera > 0) setAviso(enLote ? `Se cargan hasta ${MAX_LOTE} imágenes a la vez: quedaron fuera ${fuera}.` : "Se usó solo la primera imagen.");
            if (enLote && validos.length > 1) {
                onMultipleLoad?.(validos);
                return;
            }
            const archivo = validos[0];
            if (!archivo) return;
            const url = entrega === "dataUrl" ? await leerComoDataUrl(archivo) : URL.createObjectURL(archivo);
            if (entrega === "blob") {
                if (ultimaUrl.current) URL.revokeObjectURL(ultimaUrl.current);
                ultimaUrl.current = url;
            }
            setSelectedName(archivo.name);
            setSelectedBytes(archivo.size);
            onImageLoad(archivo, url);
        } catch {
            setError("No pudimos leer la imagen. Inténtalo con otro archivo.");
        } finally {
            leyendo.current = false;
            setIsValidating(false);
        }
    }, [accept, maxSize, multiple, onMultipleLoad, onImageLoad, entrega]);

    // Las escuchas de window viven mientras el recuadro esté montado; leen siempre la versión más reciente.
    const recibir = useRef(handleFiles);
    const enPaginaRef = useRef(enPagina);
    useEffect(() => {
        recibir.current = handleFiles;
        enPaginaRef.current = enPagina;
    }, [handleFiles, enPagina]);
    useEffect(() => registrarReceptor({
        raiz,
        enPagina: () => enPaginaRef.current,
        recibir: (archivos) => { void recibir.current(archivos); },
        resaltar: setIsDragging,
    }), []);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        void handleFiles(e.target.files);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
    }, [handleFiles]);

    const quitar = () => {
        onClear?.();
        if (ultimaUrl.current) URL.revokeObjectURL(ultimaUrl.current);
        ultimaUrl.current = null;
        setError(null);
        setAviso(null);
        setSelectedName("");
        setSelectedBytes(0);
    };

    const pistaPegar = enPagina ? "Suelta o pega (Ctrl / ⌘ V) en cualquier parte de la página" : "O pega con Ctrl / ⌘ V";

    return (
        <div ref={raiz} className="image-dropzone min-w-0 rounded-2xl" style={{ "--drop-accent": accentColor, outline: isDragging && currentImage ? `2px dashed ${accentColor}` : undefined, outlineOffset: 4 } as CSSProperties}>
            <input ref={inputRef} type="file" accept={extensionesAceptadas(accept)} onChange={handleChange} aria-label="Seleccionar imagen" className="sr-only" tabIndex={-1} multiple={multiple} />
            {currentImage ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111923]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{selectedName || "Imagen de entrada"}</p>{selectedBytes > 0 && <p className="mt-0.5 text-[10px] text-slate-500">{(selectedBytes / 1024).toFixed(1)} KB · Original</p>}</div>
                        <button type="button" onClick={() => inputRef.current?.click()} disabled={isValidating} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"><RefreshCw size={14} aria-hidden="true" />Cambiar</button>
                        {onClear && <button type="button" onClick={quitar} disabled={isValidating} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Quitar imagen"><X size={17} aria-hidden="true" /></button>}
                    </div>
                    <div className="bg-[#080e17] p-4"><img src={currentImage} alt="Imagen seleccionada" className="mx-auto max-h-[340px] w-full object-contain" /></div>
                </div>
            ) : (
                <div tabIndex={0} role="group" aria-label="Área para soltar o pegar una imagen" onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); inputRef.current?.click(); } }} className={`image-dropzone-empty group relative flex min-h-[280px] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors duration-200 sm:p-8 ${isDragging ? "is-dragging" : ""}`} style={{ borderColor: isDragging ? accentColor : "#ffffff25", backgroundColor: isDragging ? `${accentColor}10` : "#101822" }}>
                    <span className="dropzone-glyph relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 shadow-lg" style={{ background: `${accentColor}10`, color: accentColor }}>{isValidating ? <LoaderCircle size={28} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />}</span>
                    <div><p className="text-sm font-medium text-white">{isDragging ? (multiple ? "Suelta las imágenes para empezar" : "Suelta la imagen para empezar") : label}</p><p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">{sublabel || listaFormatos(accept)}</p></div>
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={isValidating} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-5 text-xs font-semibold text-slate-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-teal-300"><Upload size={15} aria-hidden="true" />{isValidating ? "Preparando imagen…" : multiple ? "Seleccionar imágenes" : "Seleccionar imagen"}</button>
                    <p className="text-[11px] text-slate-400">{pistaPegar} · hasta {maxMb} MB{multiple ? ` · ${MAX_LOTE} imágenes a la vez` : ""}</p>
                </div>
            )}
            {isValidating && <p role="status" className="mt-2 text-xs text-slate-400">Leyendo y comprobando la imagen…</p>}
            {aviso && <p role="status" className="mt-2 text-xs text-slate-400">{aviso}</p>}
            {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-200"><AlertCircle size={15} className="shrink-0" aria-hidden="true" />{error}</p>}
        </div>
    );
}
