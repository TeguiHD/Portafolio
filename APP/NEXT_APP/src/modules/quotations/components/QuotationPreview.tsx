"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import type { QuotationData } from "../types";

interface QuotationPreviewProps {
    data: QuotationData;
    subtotal: number;
}

// Sanitize HTML content to prevent XSS attacks
function sanitizeHtml(html: string | undefined | null): string {
    if (!html) return "";
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'span'],
        ALLOWED_ATTR: ['class'],
    });
}

export function QuotationPreview({ data, subtotal }: QuotationPreviewProps) {
    const previewRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (typeof window === "undefined" || !previewRef.current) return;

        try {
            // Import jsPDF and html2canvas directly (no vulnerable html2pdf.js wrapper)
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import("jspdf"),
                import("html2canvas"),
            ]);

            // Capture the HTML element as a canvas
            const canvas = await html2canvas(previewRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            // Calculate dimensions for A4
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Create PDF
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            // Add image to PDF (handle multi-page if content is longer than A4)
            let heightLeft = imgHeight;
            let position = 0;
            const imgData = canvas.toDataURL("image/jpeg", 0.98);

            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save PDF
            const filename = `Cotizacion_${data.folio}_${data.clientName.replace(/\s+/g, "_")}.pdf`;
            pdf.save(filename);
        } catch (err) {
            console.error("Error generating PDF:", err);
            // Fallback to browser print
            window.print();
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("es-CL", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatCost = (min: number, max?: number): string => {
        const formatNum = (n: number) => `$${n.toLocaleString("es-CL")}`;
        if (max && max !== min) {
            return `~${formatNum(min)} - ${formatNum(max)}`;
        }
        return formatNum(min);
    };

    // Calculate totals
    const providerTotal = data.providerCosts?.reduce((sum, item) => {
        const avg = item.costMax ? (item.costMin + item.costMax) / 2 : item.costMin;
        return sum + avg;
    }, 0) || 0;
    const feesTotal = data.professionalFees?.reduce((sum, item) => sum + item.price, 0) || subtotal;

    // Use new structure or fallback to legacy
    const hasNewStructure = data.providerCosts?.length > 0 || data.professionalFees?.length > 0;

    return (
        <div className="space-y-4">
            {/* Actions */}
            <div className="flex justify-end gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownloadPdf}
                    className="px-6 py-2.5 rounded-xl bg-accent-1 text-black font-semibold flex items-center gap-2 shadow-[0_10px_30px_rgba(124,242,212,0.3)]"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar PDF
                </motion.button>
            </div>

            {/* Preview */}
            <div className="bg-[#525659] p-4 lg:p-10 rounded-2xl overflow-auto">
                <div
                    ref={previewRef}
                    className="bg-white mx-auto shadow-xl"
                    style={{
                        width: "210mm",
                        minHeight: "297mm",
                        padding: "15mm 20mm",
                        fontFamily: "'Inter', sans-serif",
                        color: "#111827",
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-200 pb-5 mb-8">
                        <div>
                            <div className="w-10 h-10 bg-gray-900 text-white rounded-md flex items-center justify-center font-bold text-xl mb-2">
                                NL
                            </div>
                            <h1 className="text-xl font-bold text-black">Nicoholas Lopetegui</h1>
                            <p className="text-sm text-gray-500">Consultor & Desarrollador Web</p>
                            <p className="text-sm text-blue-600">{process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@nicoholas.dev"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-extrabold text-gray-200 tracking-wider">COTIZACIÓN</p>
                            <p className="text-sm text-gray-500 mt-1"><strong>Folio:</strong> #{data.folio}</p>
                            <p className="text-sm text-gray-500"><strong>Fecha:</strong> {formatDate(data.date || new Date().toISOString())}</p>
                            <p className="text-sm text-gray-500"><strong>Validez:</strong> {data.validDays} días</p>
                        </div>
                    </div>

                    {/* Client Box */}
                    <div className="bg-gray-50 border-l-4 border-blue-800 p-4 rounded-r-lg mb-8 grid grid-cols-2 gap-5">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Cliente</p>
                            <p className="text-base font-semibold text-black">{data.clientName || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Proyecto</p>
                            <p className="text-base font-semibold text-black">{data.projectName || "—"}</p>
                        </div>
                    </div>

                    {/* Scope */}
                    {data.scope && (
                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                1. Alcance del Proyecto
                            </h2>
                            <div
                                className="text-sm text-gray-600 leading-relaxed text-justify prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.scope) }}
                            />
                        </div>
                    )}

                    {/* NEW: Provider Costs */}
                    {data.providerCosts && data.providerCosts.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                2. Detalle de Inversión
                            </h2>
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">a. Costos Directos (Pago a Proveedores)</p>
                            <table className="w-full text-sm mb-4">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left p-2 uppercase text-xs">Ítem</th>
                                        <th className="text-left p-2 uppercase text-xs">Detalle / Proveedor</th>
                                        <th className="text-right p-2 uppercase text-xs">Costo Aprox.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.providerCosts.map((item) => (
                                        <tr key={item.id} className={`border-b border-gray-100 ${item.isHighlighted ? "bg-yellow-50" : ""}`}>
                                            <td className="p-2 font-medium text-gray-800">{item.name}</td>
                                            <td className="p-2">
                                                <span className="text-blue-600">{item.provider}</span>
                                                {item.badge && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded">
                                                        {item.badge}
                                                    </span>
                                                )}
                                                {item.providerDetail && (
                                                    <span className="block text-xs text-gray-500">{item.providerDetail}</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-right font-medium whitespace-nowrap">
                                                {formatCost(item.costMin, item.costMax)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100">
                                        <td colSpan={2} className="p-2 text-right font-semibold text-xs uppercase text-gray-600">
                                            Total Aprox. Proveedores
                                        </td>
                                        <td className="p-2 text-right font-bold text-gray-800">
                                            ~${providerTotal.toLocaleString("es-CL")} CLP
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* NEW: Professional Fees */}
                    {data.professionalFees && data.professionalFees.length > 0 && (
                        <div className="mb-8">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">b. Honorarios Profesionales</p>
                            <table className="w-full text-sm border border-gray-200">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left p-3 uppercase text-xs">Servicio Profesional</th>
                                        <th className="text-right p-3 uppercase text-xs w-28">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.professionalFees.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-100">
                                            <td className="p-3">
                                                <p className="font-bold text-gray-800">{item.title}</p>
                                                <div
                                                    className="text-xs text-gray-600 mt-1 prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
                                                />
                                            </td>
                                            <td className="p-3 text-right font-semibold text-black align-top">
                                                ${item.price.toLocaleString("es-CL")}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-900 text-white">
                                        <td className="p-4 text-right font-bold">TOTAL HONORARIOS</td>
                                        <td className="p-4 text-right font-bold text-lg">${feesTotal.toLocaleString("es-CL")} CLP</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* LEGACY: Items (for backwards compatibility) */}
                    {!hasNewStructure && data.items && data.items.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">
                                Detalle de Inversión
                            </h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left p-3 uppercase text-xs">Servicio</th>
                                        <th className="text-right p-3 uppercase text-xs">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-100">
                                            <td className="p-3">
                                                <p className="font-bold text-gray-800">{item.title}</p>
                                                <p className="text-gray-600 text-xs mt-1">{item.description}</p>
                                                {(item.deliverables ?? []).length > 0 && (
                                                    <ul className="mt-2 space-y-1">
                                                        {(item.deliverables ?? []).map((del, i) => (
                                                            <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                                                                <span className="text-blue-800 font-bold">•</span> {del}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-semibold text-black whitespace-nowrap">
                                                ${(item.price ?? 0).toLocaleString("es-CL")}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-900 text-white">
                                        <td className="p-4 text-right font-bold">TOTAL</td>
                                        <td className="p-4 text-right font-bold text-lg">${subtotal.toLocaleString("es-CL")} CLP</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Conditions */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8 grid grid-cols-2 gap-5 text-sm">
                        <div>
                            <p className="font-bold text-black mb-2">Condiciones Comerciales:</p>
                            <ul className="space-y-1 text-gray-600">
                                <li>⏱ <strong>Plazo:</strong> {data.commercialConditions?.deadline || data.timeline}</li>
                                <li>💰 <strong>Pagos:</strong> {data.commercialConditions?.payments || data.paymentTerms}</li>
                                <li>🔄 <strong>Revisiones:</strong> {data.commercialConditions?.revisions || "2 rondas incluidas"}</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-black mb-2">Garantía y Entrega:</p>
                            <ul className="space-y-1 text-gray-600">
                                <li>🎓 <strong>Capacitación:</strong> {data.warrantyDelivery?.training || "Sesión online de uso"}</li>
                                <li>🛡 <strong>Garantía:</strong> {data.warrantyDelivery?.warranty || "30 días soporte post-entrega"}</li>
                                <li>📦 <strong>Contenidos:</strong> {data.warrantyDelivery?.content || "A cargo del cliente"}</li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer Note */}
                    {(data.footerNote || data.notes) && (
                        <div className="text-xs text-gray-500 italic mb-8">
                            * {data.footerNote || data.notes}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-dashed border-gray-300 pt-5 flex justify-between items-end mt-auto">
                        <div>
                            <p className="font-bold text-black">Nicoholas Lopetegui</p>
                            <p className="text-sm text-gray-500">Consultor Digital</p>
                        </div>
                        <p className="text-xs text-gray-400">Documento generado digitalmente</p>
                    </div>
                </div>
            </div>
        </div >
    );
}
