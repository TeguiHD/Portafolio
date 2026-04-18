"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";

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
            if (sig.every((byte, i) => bytes[i] === byte)) return true;
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
    const inputRef = useRef<HTMLInputElement>(null);

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
        setIsValidating(false);

        if (!isValid) {
            setError("El archivo no parece ser una imagen válida (verificación de bytes mágicos fallida)");
            return null;
        }

        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
        });
    }, [accept, maxSize]);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        if (multiple && onMultipleLoad) {
            const results: { file: File; dataUrl: string }[] = [];
            for (let i = 0; i < Math.min(files.length, 20); i++) {
                const dataUrl = await processFile(files[i]);
                if (dataUrl) results.push({ file: files[i], dataUrl });
            }
            if (results.length > 0) onMultipleLoad(results);
        } else {
            const dataUrl = await processFile(files[0]);
            if (dataUrl) onImageLoad(files[0], dataUrl);
        }
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
        setIsDragging(false);
    }, []);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
    }, [handleFiles]);

    if (currentImage) {
        return (
            <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: `${accentColor}30` }}>
                <img
                    src={currentImage}
                    alt="Imagen seleccionada"
                    className="w-full max-h-[400px] object-contain bg-[#0A0A0F]"
                />
                {onClear && (
                    <button
                        onClick={onClear}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors"
                        title="Quitar imagen"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div>
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 ${isDragging ? "scale-[1.01]" : "hover:scale-[1.005]"
                    }`}
                style={{
                    borderColor: isDragging ? accentColor : `${accentColor}40`,
                    background: isDragging ? `${accentColor}10` : `${accentColor}05`,
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={acceptString}
                    onChange={handleChange}
                    className="hidden"
                    multiple={multiple}
                />

                {isValidating ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: "transparent" }} />
                        <p className="text-sm text-neutral-400">Validando imagen...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: accentColor }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-medium">{label}</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                {sublabel || `o haz clic para seleccionar${multiple ? " (múltiples)" : ""}`}
                            </p>
                        </div>
                        <p className="text-xs text-neutral-600">
                            Máx. {Math.round(maxSize / 1024 / 1024)}MB
                        </p>
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}
