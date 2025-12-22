"use client";

import { useState, useRef, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";

interface OCRData {
    amount: { value: number; confidence: number };
    date: { value: string; confidence: number };
    merchant: { value: string; confidence: number };
    rut: { value: string | null; confidence: number };
    suggestedCategory: {
        value: string;
        confidence: number;
        categoryId?: string;
        categoryName?: string;
    };
    defaultAccountId?: string;
    defaultAccountName?: string;
}

interface ReceiptScannerProps {
    onScanComplete: (data: OCRData) => void;
    onCancel: () => void;
}

type ScanState = "idle" | "capturing" | "processing" | "preview" | "result";

const CONFIDENCE_COLORS = {
    high: { bg: "bg-green-500/20", border: "border-green-500/30", text: "text-green-400" },
    medium: { bg: "bg-yellow-500/20", border: "border-yellow-500/30", text: "text-yellow-400" },
    low: { bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400" },
};

function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
    if (confidence >= 0.8) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
}

export function ReceiptScanner({ onScanComplete, onCancel }: ReceiptScannerProps) {
    const [state, setState] = useState<ScanState>("idle");
    const [imageData, setImageData] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<OCRData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processingTime, setProcessingTime] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Start camera capture
    const startCamera = useCallback(async () => {
        try {
            setState("capturing");
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment", // Prefer back camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError("No se pudo acceder a la cámara. Intenta subir una imagen.");
            setState("idle");
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Capture photo from camera
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
        setImageData(dataUrl);
        stopCamera();
        setState("preview");
    }, [stopCamera]);

    // Handle file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Por favor selecciona una imagen");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("La imagen es muy grande (máximo 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setImageData(event.target?.result as string);
            setState("preview");
        };
        reader.readAsDataURL(file);
    }, []);

    // Process image with OCR
    const processImage = useCallback(async () => {
        if (!imageData) return;

        setState("processing");
        setError(null);

        try {
            const res = await fetch("/api/finance/ocr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imageData }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al procesar imagen");
            }

            setOcrResult(data.data);
            setProcessingTime(data.processingTime);
            setState("result");
        } catch (err) {
            setError((err as Error).message);
            setState("preview");
        }
    }, [imageData]);

    // Confirm and use OCR result
    const confirmResult = useCallback(() => {
        if (ocrResult) {
            onScanComplete(ocrResult);
        }
    }, [ocrResult, onScanComplete]);

    // Reset scanner
    const reset = useCallback(() => {
        stopCamera();
        setImageData(null);
        setOcrResult(null);
        setError(null);
        setState("idle");
    }, [stopCamera]);

    // Cleanup on unmount
    const handleCancel = useCallback(() => {
        stopCamera();
        onCancel();
    }, [stopCamera, onCancel]);

    return (
        <div className="min-h-[80vh] max-h-[90vh] bg-black/90 rounded-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900/80 rounded-t-2xl">
                <button
                    onClick={handleCancel}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-lg font-semibold text-white">Escanear Boleta</h2>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto min-h-0">
                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 max-w-md text-center">
                        {error}
                    </div>
                )}

                {/* Idle State - Choose input method */}
                {state === "idle" && (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Escanea tu boleta</h3>
                            <p className="text-gray-400 max-w-sm mx-auto">
                                Toma una foto o sube una imagen y extraeremos los datos automáticamente
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                            <button
                                onClick={startCamera}
                                className="flex items-center justify-center gap-3 py-4 px-6 bg-blue-600 text-white
                                         rounded-xl hover:bg-blue-500 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Usar Cámara
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-3 py-4 px-6 bg-gray-800 text-white
                                         rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Subir Imagen
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                )}

                {/* Camera View */}
                {state === "capturing" && (
                    <div className="relative w-full max-w-lg">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full rounded-2xl"
                        />
                        {/* Capture guide overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-4 border-2 border-white/50 rounded-xl" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70 text-sm">
                                Centra la boleta en el recuadro
                            </div>
                        </div>

                        <button
                            onClick={capturePhoto}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full
                                     flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            <div className="w-14 h-14 bg-white rounded-full border-4 border-gray-300" />
                        </button>
                    </div>
                )}

                {/* Preview State */}
                {state === "preview" && imageData && (
                    <div className="w-full max-w-lg space-y-4">
                        <img
                            src={imageData}
                            alt="Preview"
                            className="w-full rounded-2xl max-h-[60vh] object-contain"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={reset}
                                className="flex-1 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                Volver a tomar
                            </button>
                            <button
                                onClick={processImage}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors"
                            >
                                Analizar
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing State */}
                {state === "processing" && (
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto relative">
                            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Analizando boleta...</h3>
                            <p className="text-gray-400 mt-1">Esto tomará unos segundos</p>
                        </div>
                    </div>
                )}

                {/* Result State */}
                {state === "result" && ocrResult && (
                    <div className="w-full max-w-lg space-y-4">
                        <div className="bg-gray-900/80 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Datos Extraídos</h3>
                                <span className="text-xs text-gray-500">{processingTime}ms</span>
                            </div>

                            {/* Amount */}
                            <ResultField
                                label="Monto"
                                value={formatCurrency(ocrResult.amount.value)}
                                confidence={ocrResult.amount.confidence}
                            />

                            {/* Date */}
                            <ResultField
                                label="Fecha"
                                value={new Date(ocrResult.date.value).toLocaleDateString("es-CL")}
                                confidence={ocrResult.date.confidence}
                            />

                            {/* Merchant */}
                            <ResultField
                                label="Comercio"
                                value={ocrResult.merchant.value}
                                confidence={ocrResult.merchant.confidence}
                            />

                            {/* Category */}
                            <ResultField
                                label="Categoría sugerida"
                                value={ocrResult.suggestedCategory.categoryName || ocrResult.suggestedCategory.value}
                                confidence={ocrResult.suggestedCategory.confidence}
                            />

                            {/* RUT */}
                            {ocrResult.rut.value && (
                                <ResultField
                                    label="RUT"
                                    value={ocrResult.rut.value}
                                    confidence={ocrResult.rut.confidence}
                                />
                            )}
                        </div>

                        <p className="text-center text-sm text-gray-400">
                            Podrás editar los datos antes de guardar
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={reset}
                                className="flex-1 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                Escanear otra
                            </button>
                            <button
                                onClick={confirmResult}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-colors"
                            >
                                Usar estos datos
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}

function ResultField({
    label,
    value,
    confidence,
}: {
    label: string;
    value: string;
    confidence: number;
}) {
    const level = getConfidenceLevel(confidence);
    const colors = CONFIDENCE_COLORS[level];

    return (
        <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{label}</span>
                <span className={`text-xs ${colors.text}`}>
                    {Math.round(confidence * 100)}%
                </span>
            </div>
            <p className="text-white font-medium mt-1">{value}</p>
        </div>
    );
}
