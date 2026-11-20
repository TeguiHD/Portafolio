"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown, FileText, RotateCcw, Tag } from "lucide-react";
import { BOTON, BOTON_SEC, FICHA, FOCO, LISTA, MARCA, MARCA_NEUTRA, SOBRE, VACIO } from "./estilos";

// Types matching OCR service response
interface OCRLocation {
    city?: string;
    commune?: string;
    address?: string;
    region?: string;
}

interface OCRMerchant {
    name: string;
    businessName?: string;
    rut: string | null;
    businessType?: string;
    phone?: string;
    email?: string;
    location?: OCRLocation;
}

interface OCRCustomer {
    name?: string;
    rut?: string;
    address?: string;
    businessType?: string;
}

interface OCRItem {
    code?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    additionalTax?: number;
    total: number;
}

interface OCRFinancials {
    subtotal: number;
    tax: number;
    additionalTaxes?: Array<{ name: string; rate?: number; amount: number }>;
    discount?: number;
    tip?: number;
    total: number;
}

export interface OCRData {
    isValidDocument: boolean;
    documentType: "boleta" | "factura" | "ticket" | "unknown";
    validationMessage?: string;

    documentNumber?: { value: string | null; confidence: number };
    emissionDate?: { value: string; confidence: number };
    paymentDate?: string;

    merchant?: { value: OCRMerchant; confidence: number };
    customer?: OCRCustomer;

    purchaseType?: string;
    paymentMethod?: string;

    items?: OCRItem[];
    financials?: OCRFinancials;

    // Legacy fields
    amount?: { value: number; confidence: number };
    date?: { value: string; confidence: number };
    rut?: { value: string | null; confidence: number };
    suggestedCategory?: { value: string; confidence: number; categoryId?: string; categoryName?: string };

    barcodeData?: { value: string | null; confidence: number };
    siiCode?: { value: string | null; confidence: number };

    defaultAccountId?: string;
    defaultAccountName?: string;
}

interface OCRResultDisplayProps {
    data: OCRData;
    imageData?: string | null;
    processingTime?: number;
    onConfirm: () => void;
    onRetry: () => void;
}

// Format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
    }).format(value);
};

// Format date
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("es-CL", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

/** Qué tan segura es la lectura de un dato: con palabra además del color. */
const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
    const percentage = Math.round(confidence * 100);
    const nivel = percentage >= 90
        ? { texto: "alta", clase: "bg-emerald-500/10 text-emerald-400" }
        : percentage >= 70
            ? { texto: "media", clase: "bg-amber-500/10 text-amber-400" }
            : { texto: "baja", clase: "bg-red-500/10 text-red-400" };

    return (
        <span className={`${MARCA} shrink-0 whitespace-nowrap ${nivel.clase}`}>
            Confianza {nivel.texto} · <span className="tabular-nums">{percentage} %</span>
        </span>
    );
};

/** Bloque plegable con <details>: el teclado y el lector de pantalla lo entienden sin código extra. */
const Section = ({ title, children, defaultOpen = true }: {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}) => (
    <details open={defaultOpen} className="group/seccion border-b border-[var(--linea)]">
        <summary
            className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 text-sm font-medium text-[var(--txt)] transition-colors duration-150 motion-reduce:transition-none sm:min-h-10 [&::-webkit-details-marker]:hidden ${SOBRE} ${FOCO}`}
        >
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 -rotate-90 text-[var(--mut)] group-open/seccion:rotate-0" />
            {title}
        </summary>
        <dl className="m-0 px-1 pb-3">{children}</dl>
    </details>
);

// Fila «dato: valor» dentro de una sección (va dentro de un <dl>)
const InfoRow = ({ label, value, confidence, mono = false, fuerte = false }: {
    label: string;
    value: string | number | null | undefined;
    confidence?: number;
    mono?: boolean;
    /** Fila de total: con línea arriba y en negrita. */
    fuerte?: boolean;
}) => {
    if (!value) return null;

    return (
        <div className={`flex items-baseline justify-between gap-4 py-1.5 ${fuerte ? "mt-1.5 border-t border-[var(--linea-2)] pt-3" : ""}`}>
            <dt className={`shrink-0 text-sm ${fuerte ? "font-semibold text-[var(--txt)]" : "text-[var(--mut)]"}`}>{label}</dt>
            <dd className="m-0 flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right">
                <span className={`min-w-0 text-sm text-[var(--txt)] tabular-nums [overflow-wrap:anywhere] ${mono ? "font-mono" : ""} ${fuerte ? "font-semibold" : ""}`}>
                    {value}
                </span>
                {confidence !== undefined && confidence > 0 && <ConfidenceBadge confidence={confidence} />}
            </dd>
        </div>
    );
};

const PESTANAS = [
    { id: "summary", nombre: "Resumen" },
    { id: "details", nombre: "Detalles" },
    { id: "items", nombre: "Ítems" },
] as const;

const documentTypeLabels: Record<string, string> = {
    boleta: "Boleta electrónica",
    factura: "Factura electrónica",
    ticket: "Ticket",
    unknown: "Documento",
};

const TH = "py-2 text-sm font-medium text-[var(--mut)]";

export function OCRResultDisplay({ data, imageData: _imageData, processingTime, onConfirm, onRetry }: OCRResultDisplayProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "details" | "items">("summary");
    const id = useId();
    const pestanasRef = useRef<(HTMLButtonElement | null)[]>([]);

    const merchant = data.merchant?.value;
    const financials = data.financials;
    const items = data.items || [];

    // Pestañas con flechas, Inicio y Fin: la selección sigue al foco
    const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
        const actual = PESTANAS.findIndex((p) => p.id === activeTab);
        let siguiente = -1;
        if (e.key === "ArrowRight") siguiente = (actual + 1) % PESTANAS.length;
        else if (e.key === "ArrowLeft") siguiente = (actual - 1 + PESTANAS.length) % PESTANAS.length;
        else if (e.key === "Home") siguiente = 0;
        else if (e.key === "End") siguiente = PESTANAS.length - 1;
        if (siguiente < 0) return;
        e.preventDefault();
        setActiveTab(PESTANAS[siguiente].id);
        pestanasRef.current[siguiente]?.focus();
    };

    return (
        <div className="space-y-5">
            {/* Documento: tipo, emisor y total */}
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-[var(--linea)] pb-4">
                <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--mut)]">
                        <FileText aria-hidden="true" className="size-4 shrink-0" />
                        {documentTypeLabels[data.documentType] || documentTypeLabels.unknown}
                        {data.documentNumber?.value && (
                            <span className={`${MARCA_NEUTRA} tabular-nums`}>N° {data.documentNumber.value}</span>
                        )}
                    </p>
                    {merchant?.name && (
                        <p className="mt-1.5 text-lg font-semibold text-[var(--txt)] [overflow-wrap:anywhere]">{merchant.name}</p>
                    )}
                    {merchant?.rut && (
                        <p className="font-mono text-sm text-[var(--mut)]">{merchant.rut}</p>
                    )}
                </div>
                <div className="sm:text-right">
                    <p className="text-2xl font-bold tracking-[-0.03em] text-[var(--txt)] tabular-nums">
                        {formatCurrency(financials?.total || data.amount?.value || 0)}
                    </p>
                    {data.emissionDate?.value && (
                        <p className="text-sm text-[var(--mut)]">
                            {formatDate(data.emissionDate.value)}
                        </p>
                    )}
                </div>
            </div>

            <div>
                {/* Pestañas */}
                <div
                    role="tablist"
                    aria-label="Datos leídos"
                    onKeyDown={alTeclear}
                    className="flex overflow-x-auto border-b border-[var(--linea)]"
                >
                    {PESTANAS.map((p, i) => {
                        const activa = activeTab === p.id;
                        return (
                            <button
                                key={p.id}
                                ref={(el) => { pestanasRef.current[i] = el; }}
                                type="button"
                                role="tab"
                                id={`${id}-${p.id}`}
                                aria-selected={activa}
                                tabIndex={activa ? 0 : -1}
                                onClick={() => setActiveTab(p.id)}
                                className="relative inline-flex min-h-11 shrink-0 items-center px-3 text-sm whitespace-nowrap text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] sm:min-h-10 aria-selected:text-[var(--txt)] aria-selected:after:absolute aria-selected:after:inset-x-3 aria-selected:after:bottom-0 aria-selected:after:border-b-2 aria-selected:after:border-[var(--acento)]"
                            >
                                {p.id === "items" ? `${p.nombre} (${items.length})` : p.nombre}
                            </button>
                        );
                    })}
                </div>

                {/* Contenido de la pestaña */}
                <div
                    role="tabpanel"
                    aria-labelledby={`${id}-${activeTab}`}
                    tabIndex={activeTab === "items" ? 0 : undefined}
                    className={`rounded-sm pt-3 ${FOCO}`}
                >
                    {activeTab === "summary" && (
                        <div className={LISTA}>
                            <Section title="Totales">
                                {financials ? (
                                    <>
                                        <InfoRow label="Monto neto" value={formatCurrency(financials.subtotal)} />
                                        <InfoRow label="IVA (19 %)" value={formatCurrency(financials.tax)} />
                                        {financials.additionalTaxes?.map((tax, i) => (
                                            <InfoRow key={i} label={tax.name} value={formatCurrency(tax.amount)} />
                                        ))}
                                        {financials.discount && financials.discount > 0 ? (
                                            <InfoRow label="Descuento" value={`−${formatCurrency(financials.discount)}`} />
                                        ) : null}
                                        {financials.tip && financials.tip > 0 ? (
                                            <InfoRow label="Propina" value={formatCurrency(financials.tip)} />
                                        ) : null}
                                        <InfoRow label="Total" value={formatCurrency(financials.total)} fuerte />
                                    </>
                                ) : (
                                    <InfoRow label="Total" value={formatCurrency(data.amount?.value || 0)} confidence={data.amount?.confidence} />
                                )}
                            </Section>

                            {/* Categoría sugerida */}
                            {data.suggestedCategory && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--linea)] px-1 py-3">
                                    <span aria-hidden="true" className={FICHA}>
                                        <Tag className="size-[18px]" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-[var(--mut)]">Categoría sugerida</p>
                                        <p className="truncate text-sm font-medium text-[var(--txt)]">
                                            {data.suggestedCategory.categoryName || data.suggestedCategory.value}
                                        </p>
                                    </div>
                                    <ConfidenceBadge confidence={data.suggestedCategory.confidence} />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "details" && (
                        <div className={LISTA}>
                            {/* Emisor */}
                            {merchant && (
                                <Section title="Emisor">
                                    <InfoRow label="Nombre" value={merchant.name} confidence={data.merchant?.confidence} />
                                    {merchant.businessName && merchant.businessName !== merchant.name && (
                                        <InfoRow label="Razón social" value={merchant.businessName} />
                                    )}
                                    <InfoRow label="RUT" value={merchant.rut} mono />
                                    <InfoRow label="Giro" value={merchant.businessType} />
                                    <InfoRow label="Correo" value={merchant.email} />
                                    <InfoRow label="Teléfono" value={merchant.phone} />
                                    {merchant.location && (
                                        <>
                                            <InfoRow label="Dirección" value={merchant.location.address} />
                                            <InfoRow label="Ciudad" value={merchant.location.city} />
                                            <InfoRow label="Comuna" value={merchant.location.commune} />
                                            <InfoRow label="Región" value={merchant.location.region} />
                                        </>
                                    )}
                                </Section>
                            )}

                            {/* Cliente (en facturas) */}
                            {data.customer && (
                                <Section title="Cliente" defaultOpen={false}>
                                    <InfoRow label="Nombre" value={data.customer.name} />
                                    <InfoRow label="RUT" value={data.customer.rut} mono />
                                    <InfoRow label="Dirección" value={data.customer.address} />
                                    <InfoRow label="Giro" value={data.customer.businessType} />
                                </Section>
                            )}

                            {/* Documento */}
                            <Section title="Documento">
                                <InfoRow label="Tipo" value={documentTypeLabels[data.documentType]} />
                                <InfoRow label="Folio" value={data.documentNumber?.value} confidence={data.documentNumber?.confidence} mono />
                                <InfoRow label="Fecha de emisión" value={data.emissionDate?.value ? formatDate(data.emissionDate.value) : undefined} confidence={data.emissionDate?.confidence} />
                                <InfoRow label="Fecha de pago" value={data.paymentDate ? formatDate(data.paymentDate) : undefined} />
                                <InfoRow label="Tipo de venta" value={data.purchaseType} />
                                <InfoRow label="Forma de pago" value={data.paymentMethod} />
                                <InfoRow label="Timbre SII" value={data.siiCode?.value} />
                                <InfoRow label="Código de barras" value={data.barcodeData?.value} mono />
                            </Section>
                        </div>
                    )}

                    {activeTab === "items" && (
                        items.length === 0 ? (
                            <p className={VACIO}>No se detectaron productos ni servicios.</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[300px] border-collapse text-sm">
                                        <caption className="sr-only">Productos y servicios de la boleta</caption>
                                        <thead>
                                            <tr className="border-b border-[var(--linea)]">
                                                <th scope="col" className={`${TH} pr-3 text-left`}>Producto</th>
                                                <th scope="col" className={`${TH} px-3 text-right`}>Cantidad</th>
                                                <th scope="col" className={`${TH} pl-3 text-right`}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={index} className="border-b border-[var(--linea)] align-top">
                                                    <td className="py-2.5 pr-3 text-[var(--txt)]">
                                                        <span className="[overflow-wrap:anywhere]">{item.description}</span>
                                                        {item.code ? (
                                                            <span className="block font-mono text-xs text-[var(--mut)]">Cód. {item.code}</span>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right whitespace-nowrap text-[var(--mut)] tabular-nums">
                                                        {item.quantity} × {formatCurrency(item.unitPrice)}
                                                    </td>
                                                    <td className="py-2.5 pl-3 text-right whitespace-nowrap font-medium text-[var(--txt)] tabular-nums">
                                                        {formatCurrency(item.total)}
                                                        {item.discount && item.discount > 0 ? (
                                                            <span className="block text-xs font-normal text-red-400">
                                                                Descuento −{formatCurrency(item.discount)}
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <dl className="m-0 mt-3 grid gap-1">
                                    <div className="flex justify-between gap-4 text-sm">
                                        <dt className="text-[var(--mut)]">Total de los ítems</dt>
                                        <dd className="m-0 font-semibold text-[var(--txt)] tabular-nums">
                                            {formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4 text-xs text-[var(--mut)]">
                                        <dt>Cantidad total de productos</dt>
                                        <dd className="m-0 tabular-nums">
                                            {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                                        </dd>
                                    </div>
                                </dl>
                            </>
                        )
                    )}
                </div>
            </div>

            {/* Tiempo de lectura */}
            {processingTime ? (
                <p className="text-center text-xs text-[var(--mut)]">
                    Procesado en {(processingTime / 1000).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s
                </p>
            ) : null}

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={onRetry} className={`${BOTON_SEC} sm:flex-1`}>
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Escanear otra
                </button>
                <button type="button" onClick={onConfirm} className={`${BOTON} sm:flex-1`}>
                    <Check aria-hidden="true" className="size-4" />
                    Usar datos
                </button>
            </div>
        </div>
    );
}
