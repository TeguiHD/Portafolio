"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { OCRResultDisplay, type OCRData } from "./OCRResultDisplay";

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

export function BatchReceiptScanner({ onComplete, onCancel }: BatchReceiptScannerProps) {
    const [items, setItems] = useState<BatchItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Generate unique ID
    const generateId = () => `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add images from file input
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        files.forEach(file => {
            if (!file.type.startsWith("image/")) return;
            if (file.size > 5 * 1024 * 1024) return; // Max 5MB

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

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    // Camera functions
    const startCamera = useCallback(async () => {
        try {
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

    return (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            stopCamera();
                            onCancel();
                        }}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Escanear Boletas</h2>
                        <p className="text-xs text-neutral-400">
                            {stats.total} boleta{stats.total !== 1 ? "s" : ""} • {stats.completed} procesada{stats.completed !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    {stats.pending > 0 && !isProcessing && (
                        <button
                            onClick={processAll}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Procesar ({stats.pending})
                        </button>
                    )}
                    {stats.completed > 0 && !isProcessing && (
                        <button
                            onClick={handleFinish}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Usar ({stats.completed})
                        </button>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left panel - Image grid / Camera */}
                <div className="w-1/2 border-r border-neutral-800 flex flex-col min-h-0">
                    {showCamera ? (
                        <div className="flex-1 relative bg-black">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-contain"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Camera controls */}
                            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                                <button
                                    onClick={stopCamera}
                                    className="p-3 rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full bg-white border-4 border-neutral-400 hover:border-purple-400 transition-colors"
                                />
                                <div className="w-12" /> {/* Spacer for balance */}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Add buttons */}
                            <div className="p-4 border-b border-neutral-800 flex gap-2">
                                <button
                                    onClick={startCamera}
                                    className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Cámara
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
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

                            {/* Image grid */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500">
                                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-lg font-medium mb-1">Sin boletas</p>
                                        <p className="text-sm">Usa la cámara o sube imágenes</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedItem(item.id)}
                                                className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedItem === item.id
                                                        ? "border-purple-500 ring-2 ring-purple-500/30"
                                                        : "border-transparent hover:border-neutral-600"
                                                    }`}
                                            >
                                                <img
                                                    src={item.imageData}
                                                    alt="Receipt"
                                                    className="w-full h-full object-cover"
                                                />

                                                {/* Status overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                                {/* Status badge */}
                                                <div className="absolute top-2 right-2">
                                                    {item.status === "pending" && (
                                                        <span className="px-2 py-1 bg-neutral-600 text-white text-xs rounded-full">
                                                            Pendiente
                                                        </span>
                                                    )}
                                                    {item.status === "processing" && (
                                                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full flex items-center gap-1">
                                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            Procesando
                                                        </span>
                                                    )}
                                                    {item.status === "completed" && (
                                                        <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                                                            ✓ Listo
                                                        </span>
                                                    )}
                                                    {item.status === "error" && (
                                                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                                                            Error
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Remove button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeItem(item.id);
                                                    }}
                                                    className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                                {/* Amount preview if completed */}
                                                {item.status === "completed" && item.result?.financials?.total && (
                                                    <div className="absolute bottom-2 left-2 right-2">
                                                        <p className="text-white font-bold text-lg">
                                                            ${item.result.financials.total.toLocaleString("es-CL")}
                                                        </p>
                                                        {item.result.merchant?.value?.name && (
                                                            <p className="text-white/70 text-xs truncate">
                                                                {item.result.merchant.value.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right panel - Preview / Details */}
                <div className="w-1/2 flex flex-col bg-neutral-900/50 min-h-0">
                    {selectedItemData ? (
                        <div className="flex-1 overflow-y-auto p-4 min-h-0">
                            {selectedItemData.status === "completed" && selectedItemData.result ? (
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
                                    onRetry={() => {
                                        setItems(prev => prev.map(i =>
                                            i.id === selectedItemData.id
                                                ? { ...i, status: "pending" as const, result: undefined, error: undefined }
                                                : i
                                        ));
                                    }}
                                />
                            ) : selectedItemData.status === "error" ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <p className="text-lg font-medium text-white mb-2">Error al procesar</p>
                                    <p className="text-sm text-neutral-400 mb-4">{selectedItemData.error}</p>
                                    <button
                                        onClick={() => {
                                            setItems(prev => prev.map(i =>
                                                i.id === selectedItemData.id
                                                    ? { ...i, status: "pending" as const, error: undefined }
                                                    : i
                                            ));
                                        }}
                                        className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            ) : selectedItemData.status === "processing" ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <svg className="w-16 h-16 text-purple-400 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <p className="text-lg font-medium text-white">Procesando con IA...</p>
                                    <p className="text-sm text-neutral-400">Extrayendo datos de la boleta</p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col">
                                    <img
                                        src={selectedItemData.imageData}
                                        alt="Receipt preview"
                                        className="flex-1 object-contain rounded-xl"
                                    />
                                    <p className="text-center text-neutral-400 mt-4 text-sm">
                                        Presiona "Procesar" para extraer los datos
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 p-8">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <p className="text-lg font-medium mb-1">Vista previa</p>
                            <p className="text-sm">Selecciona una boleta para ver los detalles</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Processing progress bar */}
            {isProcessing && (
                <div className="flex-shrink-0 px-4 py-3 border-t border-neutral-800 bg-neutral-900">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((stats.completed + stats.errors) / stats.total) * 100}%` }}
                                    className="h-full bg-purple-500 rounded-full"
                                />
                            </div>
                        </div>
                        <span className="text-sm text-neutral-400">
                            {stats.completed + stats.errors} / {stats.total}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
