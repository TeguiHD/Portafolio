"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent, type ClipboardEvent, type CSSProperties } from "react";
import { ImagePlus, Upload, X, RefreshCw, LoaderCircle, AlertCircle } from "lucide-react";

// SECURITY(OWASP): Validate file type by magic bytes, not just extension
const MAGIC_BYTES: Record<string, number[][]> = {
    "image/png": [[0x89, 0x50, 0x4E, 0x47]],
    "image/jpeg": [[0xFF, 0xD8, 0xFF]],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
    "image/gif": [[0x47, 0x49, 0x46, 0x38]],
    "image/bmp": [[0x42, 0x4D]],
    "image/svg+xml": [], // SVG is text-based, validated differently
    "image/x-icon": [[0x00, 0x00, 0x01, 0x00], [0x00, 0x00, 0x02, 0x00]],
};

async function validateMagicBytes(file: File, acceptedTypes: string[]): Promise<boolean> {
    // Skip magic byte validation for text-based formats
    if (acceptedTypes.includes("image/svg+xml") && file.type === "image/svg+xml") {
        return true;
    }

    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const type of acceptedTypes) {
        const signatures = MAGIC_BYTES[type];
        if (!signatures || signatures.length === 0) continue;

        for (const sig of signatures) {
            if (sig.every((byte, i) => bytes[i] === byte)) {
                // RIFF is also used by WAV and AVI; WebP has a second signature.
                if (type === "image/webp" && ![0x57, 0x45, 0x42, 0x50].every((byte, i) => bytes[i + 8] === byte)) continue;
                return true;
            }
        }
    }

    return false;
}

// SECURITY(NIST): Size limits to prevent DoS
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

interface ImageDropzoneProps {
    onImageLoad: (file: File, dataUrl: string) => void;
    accept?: string[];
    maxSize?: number;
    label?: string;
    sublabel?: string;
    accentColor?: string;
    currentImage?: string | null;
    onClear?: () => void;
    multiple?: boolean;
    onMultipleLoad?: (files: { file: File; dataUrl: string }[]) => void;
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
}: ImageDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [selectedName, setSelectedName] = useState("");
    const [selectedBytes, setSelectedBytes] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const reading = useRef(false);

    const acceptString = accept.map(t => {
        // Map MIME types to extensions for input accept attribute
        const map: Record<string, string> = {
            "image/png": ".png",
            "image/jpeg": ".jpg,.jpeg",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "image/bmp": ".bmp",
            "image/svg+xml": ".svg",
            "image/x-icon": ".ico",
        };
        return map[t] || t;
    }).join(",");

    const processFile = useCallback(async (file: File) => {
        setError(null);

        // SECURITY: Validate file size
        if (file.size > maxSize) {
            setError(`El archivo es muy grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`);
            return null;
        }

        // SECURITY: Validate MIME type
        if (!accept.includes(file.type)) {
            setError(`Formato no soportado: ${file.type || "desconocido"}`);
            return null;
        }

        // SECURITY(OWASP): Validate magic bytes
        setIsValidating(true);
        const isValid = await validateMagicBytes(file, accept);

        if (!isValid) {
            setError("No pudimos reconocer esta imagen. Prueba con otro archivo o vuelve a exportarlo.");
            return null;
        }

        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
            reader.onabort = () => reject(new Error("Lectura cancelada."));
            reader.readAsDataURL(file);
        });
    }, [accept, maxSize]);

    const handleFiles = useCallback(async (fileList: FileList | File[] | null) => {
        if (!fileList || fileList.length === 0 || reading.current) return;
        reading.current = true;
        // Instantánea: el FileList del input es "vivo" y el onChange limpia
        // input.value justo después de llamar aquí, así que tras el primer
        // await files[0] sería undefined y los consumidores recibirían un File nulo.
        const files = Array.from(fileList);

        setIsValidating(true);
        try {
        if (multiple && onMultipleLoad) {
            const results: { file: File; dataUrl: string }[] = [];
            for (let i = 0; i < Math.min(files.length, 20); i++) {
                const dataUrl = await processFile(files[i]);
                if (dataUrl) results.push({ file: files[i], dataUrl });
            }
            if (results.length > 0) onMultipleLoad(results);
        } else {
            const dataUrl = await processFile(files[0]);
            if (dataUrl) {
                setSelectedName(files[0].name);
                setSelectedBytes(files[0].size);
                onImageLoad(files[0], dataUrl);
            }
        }
        } catch { setError("No pudimos leer la imagen. Inténtalo con otro archivo."); }
        finally { reading.current = false; setIsValidating(false); }
    }, [multiple, onMultipleLoad, onImageLoad, processFile]);

    const handleDrop = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsDragging(false);
    }, []);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
    }, [handleFiles]);

    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
        const images = Array.from(event.clipboardData.files).filter(file => file.type.startsWith("image/"));
        if (!images.length) return;
        event.preventDefault();
        void handleFiles(images);
    };

    return (
        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onPaste={handlePaste} className="image-dropzone min-w-0" style={{ "--drop-accent": accentColor } as CSSProperties}>
            <input ref={inputRef} type="file" accept={acceptString} onChange={handleChange} aria-label="Seleccionar imagen" className="sr-only" tabIndex={-1} multiple={multiple} />
            {currentImage ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111923]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{selectedName || "Imagen de entrada"}</p>{selectedBytes > 0 && <p className="mt-0.5 text-[10px] text-slate-500">{(selectedBytes / 1024).toFixed(1)} KB · Original</p>}</div>
                        <button type="button" onClick={() => inputRef.current?.click()} disabled={isValidating} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"><RefreshCw size={14} aria-hidden="true" />Cambiar</button>
                        {onClear && <button type="button" onClick={() => { onClear(); setError(null); setSelectedName(""); setSelectedBytes(0); }} disabled={isValidating} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Quitar imagen"><X size={17} aria-hidden="true" /></button>}
                    </div>
                    <div className="bg-[#080e17] p-4"><img src={currentImage} alt="Imagen seleccionada" className="mx-auto max-h-[340px] w-full object-contain" /></div>
                </div>
            ) : (
                <div tabIndex={0} role="group" aria-label="Área para soltar o pegar una imagen" onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); inputRef.current?.click(); } }} className={`image-dropzone-empty group relative flex min-h-[280px] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed p-6 text-center transition-colors duration-200 sm:p-8 ${isDragging ? "is-dragging" : ""}`} style={{ borderColor: isDragging ? accentColor : "#ffffff25", backgroundColor: isDragging ? `${accentColor}10` : "#101822" }}>
                    <span className="dropzone-glyph relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 shadow-lg" style={{ background: `${accentColor}10`, color: accentColor }}>{isValidating ? <LoaderCircle size={28} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />}</span>
                    <div><p className="text-sm font-medium text-white">{isDragging ? "Suelta la imagen para empezar" : label}</p><p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">{sublabel || accept.map((type) => type.split("/")[1].toUpperCase()).join(" · ")}</p></div>
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={isValidating} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-5 text-xs font-semibold text-slate-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-teal-300"><Upload size={15} aria-hidden="true" />{isValidating ? "Preparando imagen…" : multiple ? "Seleccionar imágenes" : "Seleccionar imagen"}</button>
                    <p className="text-[11px] text-slate-400">O pega con Ctrl / ⌘ V · hasta {Math.round(maxSize / 1024 / 1024)} MB{multiple ? " · 20 imágenes" : ""}</p>
                </div>
            )}
            {isValidating && <p role="status" className="mt-2 text-xs text-slate-400">Leyendo y comprobando la imagen…</p>}
            {error && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-200"><AlertCircle size={15} className="shrink-0" aria-hidden="true" />{error}</p>}
        </div>
    );
}
