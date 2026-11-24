"use client";

import { useState, useRef, useCallback, useEffect, useId } from "react";
import { Camera, Check, ChevronLeft, CircleAlert, ImagePlus, LoaderCircle, RotateCcw, ScanLine, TriangleAlert, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { OCRResultDisplay, type OCRData } from "./OCRResultDisplay";
import { CabeceraFinanzas, CargandoFinanzas } from "./Piezas";
import { AYUDA, BOTON, BOTON_SEC, CIFRA, ERROR, FOCO, ICONO_PELIGRO, MARCA, MARCA_NEUTRA, RIEL, SECCION, SUAVE, VACIO } from "./estilos";

interface BatchItem {
    id: string;
    imageData: string;
    status: "pending" | "processing" | "completed" | "error";
    result?: OCRData;
    error?: string;
    processingTime?: number;
}

interface BatchReceiptScannerProps {
    onComplete: (results: { data: OCRData; imageData: string }[]) => void;
    onCancel: () => void;
}

/** Estado de una boleta en la grilla: siempre con palabra, no solo color. */
function EstadoBoleta({ item }: { item: BatchItem }) {
    if (item.status === "processing") {
        return (
            <span className={MARCA_NEUTRA}>
                <LoaderCircle aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />
                Procesando
            </span>
        );
    }
    if (item.status === "completed" && item.result && !item.result.isValidDocument) {
        return (
            <span className={`${MARCA} bg-amber-500/10 text-amber-400`}>
                <TriangleAlert aria-hidden="true" className="size-3" />
                No válida
            </span>
        );
    }
    if (item.status === "completed") {
        return (
            <span className={`${MARCA} bg-emerald-500/10 text-emerald-400`}>
                <Check aria-hidden="true" className="size-3" />
                Listo
            </span>
        );
    }
    if (item.status === "error") {
        return (
            <span className={`${MARCA} bg-red-500/10 text-red-400`}>
                <CircleAlert aria-hidden="true" className="size-3" />
                Error
            </span>
        );
    }
    return <span className={MARCA_NEUTRA}>Pendiente</span>;
}

export function BatchReceiptScanner({ onComplete, onCancel }: BatchReceiptScannerProps) {
    const [items, setItems] = useState<BatchItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const base = useId();

    // Al salir de la vista (Usar, Volver) la cámara se apaga aunque siga abierta
    useEffect(() => {
        const stream = streamRef;
        return () => {
            stream.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Generate unique ID
    const generateId = () => `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add images from file input
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        let omitidos = 0;

        files.forEach(file => {
            if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { // Max 5MB
                omitidos++;
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const newItem: BatchItem = {
                    id: generateId(),
                    imageData: event.target?.result as string,
                    status: "pending",
                };
                setItems(prev => [...prev, newItem]);
            };
            reader.readAsDataURL(file);
        });

        setAviso(omitidos === 0
            ? null
            : `${omitidos === 1 ? "Se omitió 1 archivo" : `Se omitieron ${omitidos} archivos`}: solo se aceptan imágenes de hasta 5 MB.`);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    // Camera functions
    const startCamera = useCallback(async () => {
        try {
            setAviso(null);
            setShowCamera(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error("Camera error:", err);
            setShowCamera(false);
            setAviso("No se pudo abrir la cámara. Revisa el permiso del navegador o sube imágenes desde la galería.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const newItem: BatchItem = {
            id: generateId(),
            imageData: dataUrl,
            status: "pending",
        };
        setItems(prev => [...prev, newItem]);

        // Don't stop camera - allow multiple captures
    }, []);

    // Remove an item
    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selectedItem === id) setSelectedItem(null);
    }, [selectedItem]);

    // Process a single item
    const processItem = useCallback(async (item: BatchItem): Promise<BatchItem> => {
        try {
            const startTime = Date.now();
            const res = await fetch("/api/finance/ocr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: item.imageData }),
            });

            const data = await res.json();
            const processingTime = Date.now() - startTime;

            if (!res.ok) {
                return { ...item, status: "error", error: data.error || "Error al procesar" };
            }

            return {
                ...item,
                status: "completed",
                result: data.data as OCRData,
                processingTime,
            };
        } catch (err) {
            return { ...item, status: "error", error: (err as Error).message };
        }
    }, []);

    // Process all pending items
    const processAll = useCallback(async () => {
        setIsProcessing(true);
        stopCamera();

        const pendingItems = items.filter(item => item.status === "pending");

        for (const item of pendingItems) {
            // Update status to processing
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, status: "processing" as const } : i
            ));

            // Process item
            const result = await processItem(item);

            // Update with result
            setItems(prev => prev.map(i =>
                i.id === item.id ? result : i
            ));
        }

        setIsProcessing(false);
    }, [items, processItem, stopCamera]);

    // Finish and return results
    const handleFinish = useCallback(() => {
        const successfulResults = items
            .filter(item => item.status === "completed" && item.result?.isValidDocument)
            .map(item => ({
                data: item.result!,
                imageData: item.imageData,
            }));

        onComplete(successfulResults);
    }, [items, onComplete]);

    // Vuelve a dejar una boleta como pendiente para leerla otra vez
    const volverAPendiente = (itemId: string) => {
        setItems(prev => prev.map(i =>
            i.id === itemId
                ? { ...i, status: "pending" as const, result: undefined, error: undefined }
                : i
        ));
    };

    // Get the selected item data
    const selectedItemData = items.find(item => item.id === selectedItem);

    // Count stats
    const stats = {
        total: items.length,
        pending: items.filter(i => i.status === "pending").length,
        processing: items.filter(i => i.status === "processing").length,
        completed: items.filter(i => i.status === "completed").length,
        errors: items.filter(i => i.status === "error").length,
    };
    // Solo las que son boleta o factura llegan a «Usar» (handleFinish descarta el resto)
    const validas = items.filter(i => i.status === "completed" && i.result?.isValidDocument).length;
    const hechas = stats.completed + stats.errors;
    const avance = stats.total > 0 ? (hechas / stats.total) * 100 : 0;

    return (
        <div className="max-w-[1180px] pb-8">
            <div className="mb-4">
                <button
                    type="button"
                    onClick={() => {
                        stopCamera();
                        onCancel();
                    }}
                    className={`-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] sm:min-h-10 ${FOCO}`}
                >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                    Volver al resumen
                </button>
            </div>

            <CabeceraFinanzas
                titulo="Escanear boletas"
                bajada={
                    <span aria-live="polite">
                        {stats.total} boleta{stats.total !== 1 ? "s" : ""}, {stats.completed} procesada{stats.completed !== 1 ? "s" : ""}
                    </span>
                }
            >
                {stats.pending > 0 && !isProcessing && (
                    <button type="button" onClick={() => void processAll()} className={BOTON}>
                        <ScanLine aria-hidden="true" className="size-4" />
                        Procesar ({stats.pending})
                    </button>
                )}
                {validas > 0 && !isProcessing && (
                    <button type="button" onClick={handleFinish} className={stats.pending > 0 ? BOTON_SEC : BOTON}>
                        <Check aria-hidden="true" className="size-4" />
                        Usar ({validas})
                    </button>
                )}
            </CabeceraFinanzas>

            {/* Avance de la lectura */}
            {isProcessing && (
                <div className="mt-6">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-[var(--txt)]">Leyendo boletas…</span>
                        <span className={`${CIFRA} text-[var(--mut)]`}>{hechas} de {stats.total}</span>
                    </div>
                    <div
                        className={`${RIEL} mt-2`}
                        role="progressbar"
                        aria-label="Boletas leídas"
                        aria-valuemin={0}
                        aria-valuemax={stats.total}
                        aria-valuenow={hechas}
                    >
                        <div className="h-full rounded-full bg-[var(--acento)]" style={{ width: `${avance}%` }} />
                    </div>
                </div>
            )}

            {aviso && (
                <p role="alert" className={`${ERROR} mt-6`}>{aviso}</p>
            )}

            <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
                {/* Boletas: cámara o grilla */}
                <section aria-labelledby={`${base}-boletas`} className="min-w-0">
                    <h2 id={`${base}-boletas`} className={`${SECCION} mb-3`}>Boletas</h2>

                    {showCamera ? (
                        <div>
                            {/* Visor de la cámara: fondo negro propio, como una foto */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                aria-label="Vista de la cámara"
                                className="aspect-[3/4] max-h-[65dvh] w-full rounded-xl bg-black object-contain sm:aspect-[4/3]"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button type="button" onClick={capturePhoto} className={`${BOTON} sm:flex-1`}>
                                    <Camera aria-hidden="true" className="size-4" />
                                    Tomar foto
                                </button>
                                <button type="button" onClick={stopCamera} className={`${BOTON_SEC} sm:flex-1`}>
                                    <X aria-hidden="true" className="size-4" />
                                    Cerrar cámara
                                </button>
                            </div>
                            <p className={AYUDA}>Puedes tomar varias fotos seguidas.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => void startCamera()} className={`${BOTON_SEC} flex-1`}>
                                    <Camera aria-hidden="true" className="size-4" />
                                    Cámara
                                </button>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className={`${BOTON_SEC} flex-1`}>
                                    <ImagePlus aria-hidden="true" className="size-4" />
                                    Galería
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                            <p className={AYUDA}>Imágenes de hasta 5 MB.</p>

                            {items.length === 0 ? (
                                <div className={`${VACIO} mt-4`}>
                                    <p className="font-medium text-[var(--txt)]">Sin boletas</p>
                                    <p className="mt-1 text-sm">Usa la cámara o sube imágenes.</p>
                                </div>
                            ) : (
                                <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                                    {items.map((item, index) => {
                                        const elegida = selectedItem === item.id;
                                        const numero = index + 1;
                                        return (
                                            <li key={item.id} className="min-w-0">
                                                <button
                                                    type="button"
                                                    aria-pressed={elegida}
                                                    onClick={() => setSelectedItem(item.id)}
                                                    className={`block w-full overflow-hidden rounded-xl border-2 bg-[var(--fondo-2)] transition-colors duration-150 motion-reduce:transition-none ${elegida ? "border-[var(--acento)]" : "border-transparent hover:border-[var(--linea-2)]"} ${FOCO}`}
                                                >
                                                    <img
                                                        src={item.imageData}
                                                        alt={`Boleta ${numero}`}
                                                        className="aspect-[3/4] w-full object-cover"
                                                    />
                                                </button>

                                                <div className="mt-2 flex items-start gap-1">
                                                    <div className="min-w-0 flex-1">
                                                        <EstadoBoleta item={item} />
                                                        {item.status === "completed" && item.result?.financials?.total ? (
                                                            <p className={`mt-1 truncate font-semibold text-[var(--txt)] ${CIFRA}`}>
                                                                {formatCurrency(item.result.financials.total)}
                                                            </p>
                                                        ) : null}
                                                        {item.status === "completed" && item.result?.merchant?.value?.name ? (
                                                            <p className="truncate text-xs text-[var(--mut)]">
                                                                {item.result.merchant.value.name}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        aria-label={`Quitar boleta ${numero}`}
                                                        className={`${ICONO_PELIGRO} -mt-2 -mr-2`}
                                                    >
                                                        <X aria-hidden="true" className="size-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    )}
                </section>

                {/* Detalle de la boleta elegida */}
                <section aria-labelledby={`${base}-detalle`} className="min-w-0">
                    <h2 id={`${base}-detalle`} className={`${SECCION} mb-3`}>Detalle</h2>

                    {selectedItemData ? (
                        selectedItemData.status === "completed" && selectedItemData.result ? (
                            selectedItemData.result.isValidDocument ? (
                                <OCRResultDisplay
                                    data={selectedItemData.result}
                                    imageData={selectedItemData.imageData}
                                    processingTime={selectedItemData.processingTime}
                                    onConfirm={() => {
                                        // Use only this single item's result
                                        if (selectedItemData.result?.isValidDocument) {
                                            onComplete([{
                                                data: selectedItemData.result,
                                                imageData: selectedItemData.imageData,
                                            }]);
                                        }
                                    }}
                                    onRetry={() => volverAPendiente(selectedItemData.id)}
                                />
                            ) : (
                                <div>
                                    <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                                        <p className="font-medium">Documento no válido</p>
                                        <p className="mt-1">
                                            {selectedItemData.result.validationMessage || "La imagen no parece ser una boleta o factura."}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => volverAPendiente(selectedItemData.id)} className={`${BOTON_SEC} mt-4`}>
                                        <RotateCcw aria-hidden="true" className="size-4" />
                                        Reintentar
                                    </button>
                                </div>
                            )
                        ) : selectedItemData.status === "error" ? (
                            <div>
                                <div role="alert" className={ERROR}>
                                    <p className="font-medium">No se pudo procesar la boleta</p>
                                    {selectedItemData.error ? <p className="mt-1">{selectedItemData.error}</p> : null}
                                </div>
                                <button type="button" onClick={() => volverAPendiente(selectedItemData.id)} className={`${BOTON_SEC} mt-4`}>
                                    <RotateCcw aria-hidden="true" className="size-4" />
                                    Reintentar
                                </button>
                            </div>
                        ) : selectedItemData.status === "processing" ? (
                            <CargandoFinanzas texto="Leyendo los datos de la boleta…" />
                        ) : (
                            <div>
                                <img
                                    src={selectedItemData.imageData}
                                    alt="Vista previa de la boleta"
                                    className="max-h-[60dvh] w-full rounded-xl bg-[var(--fondo-2)] object-contain"
                                />
                                <p className={`${SUAVE} mt-3 text-center`}>
                                    Presiona «Procesar» para leer los datos.
                                </p>
                            </div>
                        )
                    ) : (
                        <p className={VACIO}>Selecciona una boleta para ver los detalles.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
