"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import Link from "next/link";
import { Camera, ChevronRight, FileText, ImageUp, ReceiptText, ScanLine, TriangleAlert, X } from "lucide-react";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { useFinance } from "../context/FinanceContext";
import type { TransactionType, AccountType } from "../types";
import { OCRResultDisplay, type OCRData } from "./OCRResultDisplay";
import { CargandoFinanzas } from "./Piezas";
import {
    BOTON,
    BOTON_SEC,
    CAMPO,
    CIFRA,
    ENLACE,
    ERROR,
    ETIQUETA,
    FOCO,
    GIRA,
    ICONO,
    ICONO_PELIGRO,
    OPCION,
    OPCION_NO,
    OPCION_SI,
    SECCION,
    SOBRE,
    SUAVE,
    SUBE,
} from "./estilos";
import { hoyChile } from "../fechas";

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

/** Campo del monto: como CAMPO, pero más grande y con espacio a la izquierda para el símbolo de la moneda. */
const CAMPO_MONTO = `block min-h-12 w-full rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-2 pr-3 pl-10 text-xl font-semibold text-[var(--txt)] tabular-nums placeholder:text-[var(--mut)] ${FOCO}`;

const TIPO_DOCUMENTO: Record<NonNullable<TransactionFormData["documentType"]>, string> = {
    boleta: "Boleta",
    factura: "Factura",
    ticket: "Ticket",
    unknown: "Documento",
};

export function TransactionForm({ initialData, onSuccess, onCancel }: TransactionFormProps) {
    const { baseCurrency, triggerRefresh } = useFinance();
    const isEditing = !!initialData?.id;
    const idSinCuentas = useId();
    const idCuenta = useId();
    const idBase = useId();

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
        transactionDate: initialData?.transactionDate || hoyChile(),
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
        const dateValue = ocrData.emissionDate?.value || ocrData.date?.value || hoyChile();

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
                // Al editar, «sin categoría» se manda como null para que se guarde; al crear, la API la sugiere.
                categoryId: formData.categoryId || (isEditing ? null : undefined),
                currencyId: formData.currencyId || undefined,
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

    const simbolo = currencies.find(c => c.id === formData.currencyId)?.symbol || "$";

    if (loadingData) {
        return <CargandoFinanzas texto="Cargando formulario…" />;
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <p role="alert" className={ERROR}>
                        {error}
                    </p>
                )}

                {/* Tipo: solo gasto o ingreso */}
                <fieldset>
                    <legend className="sr-only">Tipo de transacción</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {(["EXPENSE", "INCOME"] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                aria-pressed={formData.type === type}
                                onClick={() => setFormData(prev => ({ ...prev, type, categoryId: "" }))}
                                className={`${OPCION} ${formData.type === type ? OPCION_SI : OPCION_NO}`}
                            >
                                {type === "EXPENSE" ? "Gasto" : "Ingreso"}
                            </button>
                        ))}
                    </div>
                </fieldset>

                {/* Escanear boleta para autocompletar */}
                <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg border border-[var(--linea-2)] px-3 py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none ${SOBRE} ${FOCO}`}
                >
                    <ScanLine aria-hidden="true" className="size-[18px] shrink-0 text-[var(--acento)]" />
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--txt)]">Completar con IA</span>
                        <span className="block text-xs text-[var(--mut)]">Escanear boleta para autocompletar</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[var(--mut)]" />
                </button>

                {/* Monto */}
                <div>
                    <label htmlFor={`${idBase}-monto`} className={ETIQUETA}>
                        Monto *
                    </label>
                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--mut)]">
                            {simbolo}
                        </span>
                        <input
                            id={`${idBase}-monto`}
                            type="text"
                            name="amount"
                            value={formData.displayAmount}
                            onChange={handleChange}
                            required
                            placeholder="0"
                            inputMode="decimal"
                            className={CAMPO_MONTO}
                        />
                    </div>
                </div>

                {/* Cuenta y categoría */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                        <label htmlFor={idCuenta} className={ETIQUETA}>
                            Cuenta *
                        </label>
                        <select
                            id={idCuenta}
                            name="accountId"
                            value={formData.accountId}
                            onChange={handleChange}
                            required
                            className={CAMPO}
                        >
                            <option value="">Seleccionar cuenta</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.currency.code})
                                </option>
                            ))}
                        </select>
                        {/* Sin cuentas el botón de registrar queda deshabilitado: aquí se explica por qué y cómo salir de ahí. */}
                        {!loadingData && accounts.length === 0 && (
                            <p id={idSinCuentas} className="mt-2 text-sm text-[var(--mut)]">
                                Aún no tienes cuentas, y cada transacción se registra en una.{" "}
                                <Link href="/admin/finance/accounts?nueva=1" className={`${ENLACE} underline`}>
                                    Crea tu primera cuenta
                                </Link>{" "}
                                y vuelve aquí.
                            </p>
                        )}
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-categoria`} className={ETIQUETA}>
                            Categoría
                        </label>
                        <select
                            id={`${idBase}-categoria`}
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            className={CAMPO}
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

                {/* Descripción y comercio */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-descripcion`} className={ETIQUETA}>
                            Descripción
                        </label>
                        <input
                            id={`${idBase}-descripcion`}
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Ej: Almuerzo"
                            className={CAMPO}
                        />
                    </div>

                    <div className="min-w-0">
                        <label htmlFor={`${idBase}-comercio`} className={ETIQUETA}>
                            {formData.type === "EXPENSE" ? "Comercio" : "Fuente"}
                        </label>
                        <input
                            id={`${idBase}-comercio`}
                            type="text"
                            name="merchant"
                            value={formData.merchant}
                            onChange={handleChange}
                            placeholder={formData.type === "EXPENSE" ? "Ej: Supermercado Lider" : "Ej: Cliente, Empleador"}
                            className={CAMPO}
                        />
                    </div>
                </div>

                {/* Fecha */}
                <div>
                    <label htmlFor={`${idBase}-fecha`} className={ETIQUETA}>
                        Fecha *
                    </label>
                    <input
                        id={`${idBase}-fecha`}
                        type="date"
                        name="transactionDate"
                        value={formData.transactionDate}
                        onChange={handleChange}
                        required
                        max={hoyChile()}
                        className={CAMPO}
                    />
                </div>

                {/* Datos del documento escaneado (solo gastos) */}
                {formData.type === "EXPENSE" && (formData.documentType || formData.documentNumber || formData.rut) && (
                    <section aria-labelledby={`${idBase}-documento`} className="border-y border-[var(--linea)] py-4">
                        <h2 id={`${idBase}-documento`} className={`${SECCION} mb-3 flex items-center gap-2`}>
                            <FileText aria-hidden="true" className="size-4" />
                            Datos del documento
                        </h2>
                        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                            {formData.documentType && (
                                <div className="min-w-0">
                                    <dt className="text-[var(--mut)]">Tipo</dt>
                                    <dd className="m-0 text-[var(--txt)]">{TIPO_DOCUMENTO[formData.documentType] ?? formData.documentType}</dd>
                                </div>
                            )}
                            {formData.documentNumber && (
                                <div className="min-w-0">
                                    <dt className="text-[var(--mut)]">Folio</dt>
                                    <dd className="m-0 truncate text-[var(--txt)]">{formData.documentNumber}</dd>
                                </div>
                            )}
                            {formData.rut && (
                                <div className="min-w-0">
                                    <dt className="text-[var(--mut)]">RUT</dt>
                                    <dd className="m-0 truncate text-[var(--txt)]">{formData.rut}</dd>
                                </div>
                            )}
                            {(formData.subtotal ?? 0) > 0 && (
                                <div className="min-w-0">
                                    <dt className="text-[var(--mut)]">Neto</dt>
                                    <dd className={`m-0 text-[var(--txt)] ${CIFRA}`}>${formData.subtotal?.toLocaleString("es-CL")}</dd>
                                </div>
                            )}
                            {(formData.tax ?? 0) > 0 && (
                                <div className="min-w-0">
                                    <dt className="text-[var(--mut)]">IVA</dt>
                                    <dd className={`m-0 text-[var(--txt)] ${CIFRA}`}>${formData.tax?.toLocaleString("es-CL")}</dd>
                                </div>
                            )}
                            {(formData.discount ?? 0) > 0 && (
                                <div className="min-w-0">
                                    <dt className="text-[var(--mut)]">Descuento</dt>
                                    <dd className={`m-0 ${SUBE} ${CIFRA}`}>−${formData.discount?.toLocaleString("es-CL")}</dd>
                                </div>
                            )}
                        </dl>
                    </section>
                )}

                {/* Notas */}
                <div>
                    <label htmlFor={`${idBase}-notas`} className={ETIQUETA}>
                        Notas
                    </label>
                    <textarea
                        id={`${idBase}-notas`}
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Notas adicionales..."
                        className={`${CAMPO} resize-none`}
                    />
                </div>

                {/* Productos de la boleta */}
                {formData.items && formData.items.length > 0 && (
                    <section aria-labelledby={`${idBase}-productos`}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <h2 id={`${idBase}-productos`} className={`${SECCION} flex items-center gap-2`}>
                                <ReceiptText aria-hidden="true" className="size-4" />
                                Productos ({formData.items.length})
                            </h2>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, items: undefined }))}
                                className={`inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-[var(--mut)] transition-colors duration-150 hover:text-red-400 motion-reduce:transition-none sm:min-h-10 ${FOCO}`}
                            >
                                Quitar todos
                            </button>
                        </div>
                        <div className="max-h-60 overflow-auto rounded-lg border border-[var(--linea)]">
                            <table className="w-full min-w-[420px] text-sm">
                                <thead className="sticky top-0 bg-[var(--sup)]">
                                    <tr className="border-b border-[var(--linea)]">
                                        <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-[var(--mut)]">Producto</th>
                                        <th scope="col" className="w-16 px-2 py-2 text-center text-sm font-medium text-[var(--mut)]">Cant.</th>
                                        <th scope="col" className="w-24 px-2 py-2 text-right text-sm font-medium text-[var(--mut)]">Precio</th>
                                        <th scope="col" className="w-24 px-3 py-2 text-right text-sm font-medium text-[var(--mut)]">Total</th>
                                        <th scope="col" className="w-12">
                                            <span className="sr-only">Quitar</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-[var(--linea)] text-[var(--txt)]">
                                            <td className="px-3 py-1">
                                                <input
                                                    type="text"
                                                    aria-label={`Descripción del producto ${idx + 1}`}
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const newItems = [...formData.items!];
                                                        newItems[idx] = { ...newItems[idx], description: e.target.value };
                                                        setFormData(prev => ({ ...prev, items: newItems }));
                                                    }}
                                                    className={`-ml-1 w-full min-w-0 rounded bg-transparent px-1 py-1.5 text-[var(--txt)] focus-visible:bg-[var(--fondo-2)] ${FOCO}`}
                                                />
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                <input
                                                    type="number"
                                                    aria-label={`Cantidad del producto ${idx + 1}`}
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
                                                    className={`w-14 rounded bg-transparent py-1.5 text-center text-[var(--txt)] tabular-nums focus-visible:bg-[var(--fondo-2)] ${FOCO}`}
                                                    min="1"
                                                />
                                            </td>
                                            <td className={`px-2 py-1 text-right text-[var(--mut)] ${CIFRA}`}>
                                                ${item.unitPrice.toLocaleString("es-CL")}
                                            </td>
                                            <td className={`px-3 py-1 text-right font-medium ${CIFRA}`}>
                                                ${item.totalPrice.toLocaleString("es-CL")}
                                            </td>
                                            <td className="pr-1 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newItems = formData.items!.filter((_, i) => i !== idx);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            items: newItems.length > 0 ? newItems : undefined
                                                        }));
                                                    }}
                                                    aria-label={`Quitar ${item.description || `producto ${idx + 1}`}`}
                                                    className={ICONO_PELIGRO}
                                                >
                                                    <X aria-hidden="true" className="size-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-medium text-[var(--txt)]">
                                        <th scope="row" colSpan={3} className="px-3 py-2 text-right font-medium">Total</th>
                                        <td className={`px-3 py-2 text-right ${CIFRA}`}>
                                            ${formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString("es-CL")}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                )}

                {/* Acciones */}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    {onCancel && (
                        <button type="button" onClick={onCancel} className={BOTON_SEC}>
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !formData.displayAmount || !formData.accountId}
                        aria-describedby={!loadingData && accounts.length === 0 ? idSinCuentas : undefined}
                        className={BOTON}
                    >
                        {loading ? (
                            <>
                                <span aria-hidden="true" className={GIRA} />
                                Guardando...
                            </>
                        ) : (
                            <>
                                {isEditing ? "Actualizar" : "Registrar"} transacción
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Escáner de boletas: va fuera del <form> para que ningún botón suyo lo envíe */}
            {showScanner && (
                <DialogoFormulario titulo="Escanear boleta" alCerrar={closeScanner}>
                    {(cerrar) => (
                        <>
                            <button type="button" onClick={cerrar} aria-label="Cerrar" className={`${ICONO} absolute top-2 right-2`}>
                                <X aria-hidden="true" className="size-[18px]" />
                            </button>

                            {scanError && (
                                <p role="alert" className={`${ERROR} mb-4`}>
                                    {scanError}
                                </p>
                            )}

                            {/* Sin imagen */}
                            {scannerState === "idle" && (
                                <div className="space-y-4">
                                    <p className={SUAVE}>
                                        Toma una foto o sube una imagen de tu boleta
                                    </p>
                                    <div className="grid gap-3">
                                        <button type="button" onClick={startCamera} className={BOTON}>
                                            <Camera aria-hidden="true" className="size-4" />
                                            Usar cámara
                                        </button>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className={BOTON_SEC}>
                                            <ImageUp aria-hidden="true" className="size-4" />
                                            Subir imagen
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

                            {/* Cámara */}
                            {scannerState === "capturing" && (
                                <div className="relative">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full rounded-lg bg-[var(--fondo-2)]"
                                    />
                                    <div aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-lg border-2 border-[var(--acento)]" />
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        aria-label="Tomar foto"
                                        className={`absolute bottom-4 left-1/2 grid size-14 -translate-x-1/2 place-items-center rounded-full border-4 border-[var(--sup)] bg-[var(--acento)] text-[var(--acento-tinta)] ${FOCO}`}
                                    >
                                        <Camera aria-hidden="true" className="size-5" />
                                    </button>
                                </div>
                            )}

                            {/* Vista previa */}
                            {scannerState === "preview" && imageData && (
                                <div className="space-y-4">
                                    <img
                                        src={imageData}
                                        alt="Vista previa de la boleta"
                                        className="max-h-64 w-full rounded-lg bg-[var(--fondo-2)] object-contain"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={resetScanner} className={BOTON_SEC}>
                                            Reintentar
                                        </button>
                                        <button type="button" onClick={processImage} className={BOTON}>
                                            Analizar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Analizando */}
                            {scannerState === "processing" && (
                                <div role="status" className="space-y-3 py-8 text-center">
                                    <span aria-hidden="true" className="mx-auto block size-8 animate-spin rounded-full border-[3px] border-[var(--acento)] border-t-transparent motion-reduce:animate-none" />
                                    <p className="font-medium text-[var(--txt)]">Analizando documento...</p>
                                    <p className={SUAVE}>Validando y extrayendo información</p>
                                </div>
                            )}

                            {/* Resultado */}
                            {scannerState === "result" && scanResult && (
                                <div className="space-y-4">
                                    {!scanResult.isValidDocument ? (
                                        <div className="space-y-4">
                                            <div role="alert" className="flex items-start gap-3 rounded-lg bg-amber-500/10 px-4 py-3">
                                                <TriangleAlert aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-amber-400" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-amber-400">Documento no válido</p>
                                                    <p className="mt-1 text-sm text-[var(--mut)]">
                                                        {scanResult.validationMessage || "La imagen no parece ser una boleta o factura"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={resetScanner} className={`${BOTON_SEC} w-full`}>
                                                Reintentar
                                            </button>
                                        </div>
                                    ) : (
                                        <OCRResultDisplay
                                            data={scanResult}
                                            imageData={imageData}
                                            processingTime={processingTime}
                                            onConfirm={() => {
                                                applyOCRData();
                                                // Cierra el <dialog> nativo para que el foco vuelva al botón que lo abrió.
                                                cerrar();
                                            }}
                                            onRetry={resetScanner}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </DialogoFormulario>
            )}

            {/* Lienzo oculto para la foto de la cámara */}
            <canvas ref={canvasRef} className="hidden" />
        </>
    );
}
