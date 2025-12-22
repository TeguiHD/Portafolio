"use client";

import { motion } from "framer-motion";
import { useState } from "react";

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

// Confidence badge
const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
    const percentage = Math.round(confidence * 100);
    const color = percentage >= 90 ? "emerald" : percentage >= 70 ? "amber" : "red";
    
    return (
        <span className={`text-xs px-1.5 py-0.5 rounded bg-${color}-500/20 text-${color}-400`}>
            {percentage}%
        </span>
    );
};

// Section component
const Section = ({ title, icon, children, defaultOpen = true }: { 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="border border-neutral-700/50 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                    {icon}
                    {title}
                </div>
                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </button>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0 }}
                className="overflow-hidden"
            >
                <div className="p-3 space-y-2">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

// Info row component
const InfoRow = ({ label, value, confidence, mono = false }: { 
    label: string; 
    value: string | number | null | undefined;
    confidence?: number;
    mono?: boolean;
}) => {
    if (!value) return null;
    
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-neutral-700/30 last:border-0">
            <span className="text-sm text-neutral-400">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-sm text-neutral-200 ${mono ? "font-mono" : ""}`}>{value}</span>
                {confidence !== undefined && confidence > 0 && <ConfidenceBadge confidence={confidence} />}
            </div>
        </div>
    );
};

export function OCRResultDisplay({ data, imageData, processingTime, onConfirm, onRetry }: OCRResultDisplayProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "details" | "items">("summary");
    
    const documentTypeLabels: Record<string, string> = {
        boleta: "📄 Boleta Electrónica",
        factura: "📋 Factura Electrónica",
        ticket: "🎫 Ticket",
        unknown: "📝 Documento",
    };
    
    const merchant = data.merchant?.value;
    const financials = data.financials;
    const items = data.items || [];
    
    return (
        <div className="space-y-4">
            {/* Document Header */}
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-white">
                                {documentTypeLabels[data.documentType] || documentTypeLabels.unknown}
                            </span>
                            {data.documentNumber?.value && (
                                <span className="text-sm bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                                    N° {data.documentNumber.value}
                                </span>
                            )}
                        </div>
                        {merchant?.name && (
                            <p className="text-neutral-300 mt-1">{merchant.name}</p>
                        )}
                        {merchant?.rut && (
                            <p className="text-sm text-neutral-400 font-mono">{merchant.rut}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-white">
                            {formatCurrency(financials?.total || data.amount?.value || 0)}
                        </p>
                        {data.emissionDate?.value && (
                            <p className="text-sm text-neutral-400">
                                {formatDate(data.emissionDate.value)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-700/50 pb-2">
                {["summary", "details", "items"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as typeof activeTab)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            activeTab === tab
                                ? "bg-purple-500/20 text-purple-400"
                                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                        }`}
                    >
                        {tab === "summary" && "Resumen"}
                        {tab === "details" && "Detalles"}
                        {tab === "items" && `Items (${items.length})`}
                    </button>
                ))}
            </div>
            
            {/* Tab Content */}
            <div className="space-y-3">
                {activeTab === "summary" && (
                    <>
                        {/* Financial Summary */}
                        <Section
                            title="Totales"
                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        >
                            {financials ? (
                                <>
                                    <InfoRow label="Monto Neto" value={formatCurrency(financials.subtotal)} />
                                    <InfoRow label="IVA (19%)" value={formatCurrency(financials.tax)} />
                                    {financials.additionalTaxes?.map((tax, i) => (
                                        <InfoRow key={i} label={tax.name} value={formatCurrency(tax.amount)} />
                                    ))}
                                    {financials.discount && financials.discount > 0 && (
                                        <InfoRow label="Descuento" value={`-${formatCurrency(financials.discount)}`} />
                                    )}
                                    {financials.tip && financials.tip > 0 && (
                                        <InfoRow label="Propina" value={formatCurrency(financials.tip)} />
                                    )}
                                    <div className="pt-2 mt-2 border-t border-neutral-600">
                                        <InfoRow label="TOTAL" value={formatCurrency(financials.total)} />
                                    </div>
                                </>
                            ) : (
                                <InfoRow label="Total" value={formatCurrency(data.amount?.value || 0)} confidence={data.amount?.confidence} />
                            )}
                        </Section>
                        
                        {/* Category Suggestion */}
                        {data.suggestedCategory && (
                            <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-neutral-400">Categoría sugerida</p>
                                    <p className="text-sm text-white">{data.suggestedCategory.categoryName || data.suggestedCategory.value}</p>
                                </div>
                                <ConfidenceBadge confidence={data.suggestedCategory.confidence} />
                            </div>
                        )}
                    </>
                )}
                
                {activeTab === "details" && (
                    <>
                        {/* Merchant Info */}
                        {merchant && (
                            <Section
                                title="Emisor"
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                            >
                                <InfoRow label="Nombre" value={merchant.name} confidence={data.merchant?.confidence} />
                                {merchant.businessName && merchant.businessName !== merchant.name && (
                                    <InfoRow label="Razón Social" value={merchant.businessName} />
                                )}
                                <InfoRow label="RUT" value={merchant.rut} mono />
                                <InfoRow label="Giro" value={merchant.businessType} />
                                <InfoRow label="Email" value={merchant.email} />
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
                        
                        {/* Customer Info (for facturas) */}
                        {data.customer && (
                            <Section
                                title="Cliente"
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                defaultOpen={false}
                            >
                                <InfoRow label="Nombre" value={data.customer.name} />
                                <InfoRow label="RUT" value={data.customer.rut} mono />
                                <InfoRow label="Dirección" value={data.customer.address} />
                                <InfoRow label="Giro" value={data.customer.businessType} />
                            </Section>
                        )}
                        
                        {/* Transaction Details */}
                        <Section
                            title="Documento"
                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        >
                            <InfoRow label="Tipo" value={documentTypeLabels[data.documentType]} />
                            <InfoRow label="Folio" value={data.documentNumber?.value} confidence={data.documentNumber?.confidence} mono />
                            <InfoRow label="Fecha Emisión" value={data.emissionDate?.value ? formatDate(data.emissionDate.value) : undefined} confidence={data.emissionDate?.confidence} />
                            <InfoRow label="Fecha Pago" value={data.paymentDate ? formatDate(data.paymentDate) : undefined} />
                            <InfoRow label="Tipo de Venta" value={data.purchaseType} />
                            <InfoRow label="Forma de Pago" value={data.paymentMethod} />
                            <InfoRow label="Timbre SII" value={data.siiCode?.value} />
                            <InfoRow label="Código Barras" value={data.barcodeData?.value} mono />
                        </Section>
                    </>
                )}
                
                {activeTab === "items" && (
                    <div className="space-y-2">
                        {items.length === 0 ? (
                            <div className="text-center py-8 text-neutral-400">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p>No se detectaron productos/servicios</p>
                            </div>
                        ) : (
                            <>
                                {/* Items Table Header */}
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-neutral-800/50 rounded-lg text-xs font-medium text-neutral-400">
                                    <div className="col-span-1">Cód</div>
                                    <div className="col-span-4">Descripción</div>
                                    <div className="col-span-2 text-center">Cant.</div>
                                    <div className="col-span-2 text-right">P.Unit</div>
                                    <div className="col-span-3 text-right">Total</div>
                                </div>
                                
                                {/* Items List */}
                                {items.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="grid grid-cols-12 gap-2 px-3 py-2 bg-neutral-800/30 rounded-lg text-sm hover:bg-neutral-800/50 transition-colors"
                                    >
                                        <div className="col-span-1 text-neutral-500 font-mono text-xs truncate">
                                            {item.code || "-"}
                                        </div>
                                        <div className="col-span-4 text-neutral-200 truncate" title={item.description}>
                                            {item.description}
                                        </div>
                                        <div className="col-span-2 text-center text-neutral-300">
                                            {item.quantity}
                                        </div>
                                        <div className="col-span-2 text-right text-neutral-400 font-mono">
                                            {formatCurrency(item.unitPrice)}
                                        </div>
                                        <div className="col-span-3 text-right text-white font-mono">
                                            {formatCurrency(item.total)}
                                            {item.discount && item.discount > 0 && (
                                                <span className="text-xs text-red-400 ml-1">
                                                    (-{formatCurrency(item.discount)})
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                
                                {/* Items Summary */}
                                <div className="pt-3 mt-3 border-t border-neutral-700/50 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-400">Total Items</span>
                                        <span className="text-white font-mono">
                                            {formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-500">Cantidad total de productos</span>
                                        <span className="text-neutral-400">
                                            {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {/* Processing Time */}
            {processingTime && (
                <div className="text-xs text-neutral-500 text-center">
                    Procesado en {(processingTime / 1000).toFixed(2)}s
                </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onRetry}
                    className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Escanear otra
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Usar datos
                </button>
            </div>
        </div>
    );
}
