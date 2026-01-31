"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinance } from "../context/FinanceContext";
import type { TransactionType, AccountType } from "../types";
import { OCRResultDisplay, type OCRData } from "./OCRResultDisplay";

interface Account {
    id: string;
    name: string;
    type: AccountType;
    currency: { code: string; symbol: string };
}

interface Category {
    id: string;
    name: string;
    icon: string | null;
    type: "INCOME" | "EXPENSE";
}

interface TransactionItem {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface TransactionFormData {
    type: Exclude<TransactionType, "TRANSFER">;
    amount: string;
    displayAmount: string; // For formatted display with thousand separators
    description: string;
    merchant: string;
    notes: string;
    categoryId: string;
    accountId: string;
    currencyId: string;
    transactionDate: string;
    // Receipt scanner fields (for EXPENSE)
    documentType?: "boleta" | "factura" | "ticket" | "unknown";
    documentNumber?: string; // Folio
    barcodeData?: string;
    rut?: string;
    // Financial details from receipt
    subtotal?: number;
    tax?: number; // IVA
    discount?: number;
    // Line items from receipt
    items?: TransactionItem[];
    // Income specific fields
    incomeSource?: string; // Source of income (client, employer, etc.)
}

interface TransactionFormProps {
    initialData?: Partial<TransactionFormData> & { id?: string };
    onSuccess?: () => void;
    onCancel?: () => void;
}

// Helper function to format number with thousand separators
function formatWithThousandSeparator(value: string): string {
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');

    // Split integer and decimal parts
    const parts = cleanValue.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts[1];

    // Add thousand separators to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Combine with decimal part if exists
    if (decimalPart !== undefined) {
        return `${formattedInteger},${decimalPart.slice(0, 2)}`;
    }

    return formattedInteger;
}

// Helper to parse formatted value back to number
function parseFormattedValue(value: string): string {
    // Replace thousand separators (.) and decimal comma (,) for correct parsing
    return value.replace(/\./g, '').replace(',', '.');
}

export function TransactionForm({ initialData, onSuccess, onCancel }: TransactionFormProps) {
    const { baseCurrency, triggerRefresh } = useFinance();
    const isEditing = !!initialData?.id;

    // Determine initial type - if it's undefined, default to EXPENSE
    const initialType = initialData?.type || "EXPENSE";

    const [formData, setFormData] = useState<TransactionFormData>({
        type: initialType,
        amount: initialData?.amount || "",
        displayAmount: initialData?.amount ? formatWithThousandSeparator(initialData.amount) : "",
        description: initialData?.description || "",
        merchant: initialData?.merchant || "",
        notes: initialData?.notes || "",
        categoryId: initialData?.categoryId || "",
        accountId: initialData?.accountId || "",
        currencyId: initialData?.currencyId || "",
        transactionDate: initialData?.transactionDate || new Date().toISOString().split("T")[0],
    });

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [currencies, setCurrencies] = useState<{ id: string; code: string; symbol: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    // Receipt scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scannerState, setScannerState] = useState<"idle" | "capturing" | "processing" | "preview" | "result">("idle");
    const [imageData, setImageData] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<OCRData | null>(null);
    const [processingTime, setProcessingTime] = useState<number | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Fetch accounts, categories, and currencies
    useEffect(() => {
        async function fetchFormData() {
            try {
                const [accountsRes, categoriesRes, currenciesRes] = await Promise.all([
                    fetch("/api/finance/accounts"),
                    fetch("/api/finance/categories"),
                    fetch("/api/finance/currencies"),
                ]);

                if (accountsRes.ok) {
                    const { data } = await accountsRes.json();
                    setAccounts(data || []);
                    // Set default account if not provided
                    if (!formData.accountId && data?.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            accountId: data[0].id,
                            currencyId: data[0].currency?.id || prev.currencyId,
                        }));
                    }
                }

                if (categoriesRes.ok) {
                    const { data } = await categoriesRes.json();
                    setCategories(data || []);
                }

                if (currenciesRes.ok) {
                    const { data } = await currenciesRes.json();
                    setCurrencies(data || []);
                    // Set default currency
                    if (!formData.currencyId && data?.length > 0) {
                        const defaultCurrency = data.find((c: { code: string; id: string }) => c.code === baseCurrency) || data[0];
                        setFormData(prev => ({ ...prev, currencyId: defaultCurrency.id }));
                    }
                }
            } catch (err) {
                console.error("Error fetching form data:", err);
            } finally {
                setLoadingData(false);
            }
        }

        fetchFormData();
        // formData.accountId and formData.currencyId intentionally excluded to prevent infinite re-render when setting defaults
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseCurrency]);

    // Filter categories by type and remove duplicates
    const filteredCategories = categories
        .filter(c => c.type === (formData.type === "INCOME" ? "INCOME" : "EXPENSE"))
        .filter((category, index, self) =>
            index === self.findIndex(c => c.id === category.id)
        );

    // Receipt Scanner Functions
    const startCamera = useCallback(async () => {
        try {
            setScannerState("capturing");
            setScanError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
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
            setScanError("No se pudo acceder a la cámara. Intenta subir una imagen.");
            setScannerState("idle");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
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
        setImageData(dataUrl);
        stopCamera();
        setScannerState("preview");
    }, [stopCamera]);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setScanError("Por favor selecciona una imagen");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setScanError("La imagen es muy grande (máximo 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setImageData(event.target?.result as string);
            setScannerState("preview");
        };
        reader.readAsDataURL(file);
    }, []);

    const processImage = useCallback(async () => {
        if (!imageData) return;

        setScannerState("processing");
        setScanError(null);
        setScanResult(null);

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

            const ocrData = data.data as OCRData;
            setProcessingTime(data.processingTime);

            // Store full OCR result for display
            setScanResult(ocrData);
            setScannerState("result");
        } catch (err) {
            setScanError((err as Error).message);
            setScannerState("preview");
        }
    }, [imageData]);

    const resetScanner = useCallback(() => {
        stopCamera();
        setImageData(null);
        setScanError(null);
        setScanResult(null);
        setProcessingTime(undefined);
        setScannerState("idle");
    }, [stopCamera]);

    const closeScanner = useCallback(() => {
        stopCamera();
        setShowScanner(false);
        setScannerState("idle");
        setImageData(null);
        setScanError(null);
        setScanResult(null);
        setProcessingTime(undefined);
    }, [stopCamera]);

    // Apply OCR data to form
    const applyOCRData = useCallback(() => {
        if (!scanResult || !scanResult.isValidDocument) return;

        const ocrData = scanResult;
        const merchantName = ocrData.merchant?.value?.name || "";
        const totalAmount = ocrData.financials?.total || ocrData.amount?.value || 0;
        const dateValue = ocrData.emissionDate?.value || ocrData.date?.value || new Date().toISOString().split("T")[0];

        // Map OCR items to form items
        const formItems = ocrData.items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.total,
        })) || undefined;

        // Auto-fill form with validated OCR data
        setFormData(prev => ({
            ...prev,
            type: "EXPENSE", // OCR is always expense
            amount: totalAmount.toString(),
            displayAmount: formatWithThousandSeparator(totalAmount.toString()),
            description: merchantName || prev.description,
            merchant: merchantName || prev.merchant,
            transactionDate: dateValue,
            categoryId: ocrData.suggestedCategory?.categoryId || prev.categoryId,
            // Store additional receipt data
            documentType: ocrData.documentType,
            documentNumber: ocrData.documentNumber?.value || undefined,
            barcodeData: ocrData.barcodeData?.value || undefined,
            rut: ocrData.merchant?.value?.rut || ocrData.rut?.value || undefined,
            // Financial details
            subtotal: ocrData.financials?.subtotal || undefined,
            tax: ocrData.financials?.tax || undefined,
            discount: ocrData.financials?.discount || undefined,
            // Store items from receipt
            items: formItems,
        }));

        // Build simplified notes (most data now shown in dedicated fields)
        const notesParts: string[] = [];
        const merchant = ocrData.merchant?.value;

        // Location info
        if (merchant?.location) {
            const loc = merchant.location;
            const locationParts = [loc.city, loc.commune].filter(Boolean);
            if (locationParts.length > 0) {
                notesParts.push(`📍 ${locationParts.join(", ")}`);
            }
        }

        // Payment method
        if (ocrData.paymentMethod) {
            notesParts.push(`💳 ${ocrData.paymentMethod}`);
        }

        if (notesParts.length > 0) {
            setFormData(prev => ({
                ...prev,
                notes: notesParts.join(" | ") + (prev.notes ? `\n${prev.notes}` : ""),
            }));
        }

        // Close scanner after applying
        closeScanner();
    }, [scanResult, closeScanner]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                amount: parseFloat(parseFormattedValue(formData.displayAmount)),
                categoryId: formData.categoryId || undefined,
            };

            const url = isEditing
                ? `/api/finance/transactions/${initialData.id}`
                : "/api/finance/transactions";

            const response = await fetch(url, {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al guardar");
            }

            triggerRefresh();
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        // Special handling for amount field with thousand separators
        if (name === "amount") {
            const rawValue = value.replace(/[^\d,]/g, '');
            const formattedValue = formatWithThousandSeparator(rawValue.replace(',', '.'));
            setFormData(prev => ({
                ...prev,
                amount: parseFormattedValue(formattedValue),
                displayAmount: formattedValue
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset category when type changes
        if (name === "type") {
            setFormData(prev => ({ ...prev, categoryId: "" }));
        }

        // Update currency when account changes
        if (name === "accountId") {
            const selectedAccount = accounts.find(a => a.id === value);
            if (selectedAccount?.currency) {
                const currency = currencies.find(c => c.code === selectedAccount.currency.code);
                if (currency) {
                    setFormData(prev => ({ ...prev, currencyId: currency.id }));
                }
            }
        }
    };

    const typeColors = {
        EXPENSE: "bg-red-500/20 border-red-500/50 text-red-400",
        INCOME: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
    };

    if (loadingData) {
        return (
            <div className="animate-pulse space-y-4 p-6">
                <div className="h-10 bg-neutral-800 rounded-lg" />
                <div className="h-10 bg-neutral-800 rounded-lg" />
                <div className="h-10 bg-neutral-800 rounded-lg" />
            </div>
        );
    }

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Transaction Type Toggle - Solo Gasto/Ingreso */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-800/50 rounded-xl">
                {(["EXPENSE", "INCOME"] as const).map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type, categoryId: "" }))}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${formData.type === type
                            ? typeColors[type]
                            : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
                            }`}
                    >
                        {type === "EXPENSE" ? "💸 Gasto" : "💰 Ingreso"}
                    </button>
                ))}
            </div>

            {/* Quick Actions - AI Scan Button */}
            <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-purple-300 hover:text-purple-200 transition-all group"
            >
                <div className="w-8 h-8 rounded-full bg-purple-500/20 group-hover:bg-purple-500/30 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div className="text-left">
                    <span className="block text-sm font-medium">Completar con IA</span>
                    <span className="block text-xs text-purple-400/70">Escanear boleta para autocompletar</span>
                </div>
                <svg className="w-5 h-5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Monto *
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                        {currencies.find(c => c.id === formData.currencyId)?.symbol || "$"}
                    </span>
                    <input
                        type="text"
                        name="amount"
                        value={formData.displayAmount}
                        onChange={handleChange}
                        required
                        placeholder="0"
                        inputMode="decimal"
                        className="w-full pl-10 pr-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white text-xl placeholder-neutral-500 focus:outline-none focus:border-accent-1 transition-colors"
                    />
                </div>
            </div>

            {/* Account & Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Cuenta *
                    </label>
                    <select
                        name="accountId"
                        value={formData.accountId}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 pr-10 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-accent-1 focus:ring-2 focus:ring-accent-1/20 transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                    >
                        <option value="">Seleccionar cuenta</option>
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} ({account.currency.code})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Categoría
                    </label>
                    <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 pr-10 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-accent-1 focus:ring-2 focus:ring-accent-1/20 transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                    >
                        <option value="">Sin categoría</option>
                        {filteredCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.icon} {category.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Description & Merchant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Descripción
                    </label>
                    <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Ej: Almuerzo"
                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        {formData.type === "EXPENSE" ? "Comercio" : "Fuente"}
                    </label>
                    <input
                        type="text"
                        name="merchant"
                        value={formData.merchant}
                        onChange={handleChange}
                        placeholder={formData.type === "EXPENSE" ? "Ej: Supermercado Lider" : "Ej: Cliente, Empleador"}
                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1 transition-colors"
                    />
                </div>
            </div>

            {/* Date */}
            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Fecha *
                </label>
                <input
                    type="date"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleChange}
                    required
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-accent-1 transition-colors"
                />
            </div>

            {/* Expense-specific fields - Receipt details */}
            {formData.type === "EXPENSE" && (formData.documentType || formData.documentNumber || formData.rut) && (
                <div className="bg-neutral-800/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Datos del Documento
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {formData.documentType && (
                            <div>
                                <span className="text-neutral-500">Tipo:</span>
                                <span className="ml-2 text-white capitalize">{formData.documentType}</span>
                            </div>
                        )}
                        {formData.documentNumber && (
                            <div>
                                <span className="text-neutral-500">Folio:</span>
                                <span className="ml-2 text-white">{formData.documentNumber}</span>
                            </div>
                        )}
                        {formData.rut && (
                            <div>
                                <span className="text-neutral-500">RUT:</span>
                                <span className="ml-2 text-white">{formData.rut}</span>
                            </div>
                        )}
                        {formData.subtotal && formData.subtotal > 0 && (
                            <div>
                                <span className="text-neutral-500">Neto:</span>
                                <span className="ml-2 text-white">${formData.subtotal.toLocaleString("es-CL")}</span>
                            </div>
                        )}
                        {formData.tax && formData.tax > 0 && (
                            <div>
                                <span className="text-neutral-500">IVA:</span>
                                <span className="ml-2 text-white">${formData.tax.toLocaleString("es-CL")}</span>
                            </div>
                        )}
                        {formData.discount && formData.discount > 0 && (
                            <div>
                                <span className="text-neutral-500">Descuento:</span>
                                <span className="ml-2 text-green-400">-${formData.discount.toLocaleString("es-CL")}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Notas
                </label>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Notas adicionales..."
                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1 transition-colors resize-none"
                />
            </div>

            {/* Items from Receipt */}
            {formData.items && formData.items.length > 0 && (
                <div className="border border-neutral-700 rounded-xl overflow-hidden">
                    <div className="bg-neutral-800/50 px-4 py-3 flex items-center justify-between">
                        <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Productos ({formData.items.length})
                        </h4>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, items: undefined }))}
                            className="text-neutral-500 hover:text-red-400 text-xs transition-colors"
                        >
                            Quitar todos
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-800/30 sticky top-0">
                                <tr className="text-neutral-400 text-xs">
                                    <th className="text-left px-4 py-2">Producto</th>
                                    <th className="text-center px-2 py-2 w-16">Cant.</th>
                                    <th className="text-right px-2 py-2 w-24">Precio</th>
                                    <th className="text-right px-4 py-2 w-24">Total</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {formData.items.map((item, idx) => (
                                    <tr key={idx} className="text-neutral-300 hover:bg-neutral-800/30">
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items!];
                                                    newItems[idx] = { ...newItems[idx], description: e.target.value };
                                                    setFormData(prev => ({ ...prev, items: newItems }));
                                                }}
                                                className="w-full bg-transparent border-none focus:outline-none focus:bg-neutral-700/50 rounded px-1 -ml-1"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...formData.items!];
                                                    const qty = parseFloat(e.target.value) || 1;
                                                    newItems[idx] = {
                                                        ...newItems[idx],
                                                        quantity: qty,
                                                        totalPrice: qty * newItems[idx].unitPrice
                                                    };
                                                    setFormData(prev => ({ ...prev, items: newItems }));
                                                }}
                                                className="w-12 bg-transparent border-none text-center focus:outline-none focus:bg-neutral-700/50 rounded"
                                                min="1"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-right text-neutral-400">
                                            ${item.unitPrice.toLocaleString("es-CL")}
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium text-white">
                                            ${item.totalPrice.toLocaleString("es-CL")}
                                        </td>
                                        <td className="pr-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newItems = formData.items!.filter((_, i) => i !== idx);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        items: newItems.length > 0 ? newItems : undefined
                                                    }));
                                                }}
                                                className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-neutral-800/50">
                                <tr className="text-white font-medium">
                                    <td colSpan={3} className="px-4 py-2 text-right">Total:</td>
                                    <td className="px-4 py-2 text-right">
                                        ${formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString("es-CL")}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading || !formData.displayAmount || !formData.accountId}
                    className="flex-1 py-3 px-4 bg-accent-1 hover:bg-accent-1/90 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Guardando...
                        </>
                    ) : (
                        <>
                            {isEditing ? "Actualizar" : "Registrar"} transacción
                        </>
                    )}
                </button>
            </div>

            {/* Receipt Scanner Modal */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg bg-neutral-900 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                                <h3 className="text-lg font-semibold text-white">Escanear Boleta</h3>
                                <button
                                    onClick={closeScanner}
                                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto flex-1 min-h-0">
                                {scanError && (
                                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                        {scanError}
                                    </div>
                                )}

                                {/* Idle State */}
                                {scannerState === "idle" && (
                                    <div className="text-center space-y-4 py-6">
                                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                                            <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-neutral-400">
                                            Toma una foto o sube una imagen de tu boleta
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={startCamera}
                                                className="flex items-center justify-center gap-2 py-3 px-6 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Usar Cámara
                                            </button>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center justify-center gap-2 py-3 px-6 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                {scannerState === "capturing" && (
                                    <div className="relative">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full rounded-xl"
                                        />
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute inset-4 border-2 border-white/50 rounded-xl" />
                                        </div>
                                        <button
                                            onClick={capturePhoto}
                                            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center"
                                        >
                                            <div className="w-12 h-12 bg-white rounded-full border-4 border-neutral-300" />
                                        </button>
                                    </div>
                                )}

                                {/* Preview */}
                                {scannerState === "preview" && imageData && (
                                    <div className="space-y-4">
                                        <img
                                            src={imageData}
                                            alt="Preview"
                                            className="w-full rounded-xl max-h-64 object-contain bg-neutral-800"
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={resetScanner}
                                                className="flex-1 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors"
                                            >
                                                Reintentar
                                            </button>
                                            <button
                                                onClick={processImage}
                                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors"
                                            >
                                                Analizar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Processing */}
                                {scannerState === "processing" && (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 mx-auto relative">
                                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">Analizando documento...</p>
                                            <p className="text-neutral-400 text-sm">Validando y extrayendo información</p>
                                        </div>
                                    </div>
                                )}

                                {/* Result State */}
                                {scannerState === "result" && scanResult && (
                                    <div className="space-y-4">
                                        {/* Invalid Document */}
                                        {!scanResult.isValidDocument ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-xl">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-amber-500/20 rounded-lg">
                                                            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-amber-400 font-medium">Documento no válido</p>
                                                            <p className="text-amber-300/70 text-sm mt-1">
                                                                {scanResult.validationMessage || "La imagen no parece ser una boleta o factura"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={resetScanner}
                                                    className="w-full py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors"
                                                >
                                                    Reintentar
                                                </button>
                                            </div>
                                        ) : (
                                            /* Valid Document - Use OCRResultDisplay component */
                                            <OCRResultDisplay
                                                data={scanResult}
                                                imageData={imageData}
                                                processingTime={processingTime}
                                                onConfirm={applyOCRData}
                                                onRetry={resetScanner}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden canvas for camera capture */}
            <canvas ref={canvasRef} className="hidden" />
        </motion.form>
    );
}
