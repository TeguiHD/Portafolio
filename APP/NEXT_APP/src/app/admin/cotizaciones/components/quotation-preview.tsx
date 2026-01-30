import { QuotationData } from "../../../../modules/quotations/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
    data: QuotationData;
}

export default function QuotationPreview({ data }: Props) {
    const totalProviderCosts = data.providerCosts.reduce((sum, item) => sum + item.costMin, 0);
    const totalProfessionalFees = data.professionalFees.reduce((sum, item) => sum + item.price, 0);
    // Legacy items support if present
    const totalLegacyItems = (data.items || []).reduce((sum, item) => sum + (item.price || (item.unitPrice ?? 0) * (item.quantity ?? 0) || 0), 0);

    const grandTotal = totalProviderCosts + totalProfessionalFees + totalLegacyItems;

    return (
        <div id="quotation-preview" className="bg-white text-slate-800 p-8 md:p-12 shadow-2xl rounded-xl max-w-4xl mx-auto min-h-[1000px] relative overflow-hidden font-sans">
            {/* Decoración */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 z-0"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xl">
                            NL
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Nicoholas Lopetegui</h1>
                            <p className="text-indigo-600 font-semibold text-sm tracking-wide">Consultoría e Ingeniería Web</p>
                            <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                                <p>nikoholas.lopetegui@gmail.com</p>
                                <p>+56 9 5896 2507</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cotización N°</p>
                        <p className="text-lg font-bold text-slate-900">{data.folio || "BORRADOR"}</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Fecha: {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                </div>

                {/* Cliente y Proyecto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="p-6 bg-slate-50 rounded-2xl border-l-4 border-slate-200">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Para:</h3>
                        <p className="font-bold text-slate-800">{data.clientName || "Nombre del Cliente"}</p>
                        <p className="text-sm text-slate-600 font-medium">{data.clientEmail}</p>
                    </div>
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border-l-4 border-indigo-400">
                        <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Proyecto:</h3>
                        <p className="font-bold text-slate-800">{data.projectName || "Nuevo Proyecto"}</p>
                        <p className="text-sm text-indigo-600 font-medium italic">"{data.projectDescription || "Descripción corta"}"</p>
                    </div>
                </div>

                {/* Scope / Propuesta */}
                {data.scope && (
                    <div className="mb-12">
                        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <span className="text-indigo-500">★</span> ¿Qué incluye?
                        </h2>
                        <div className="prose prose-sm prose-slate max-w-none text-slate-600 whitespace-pre-wrap">
                            {data.scope}
                        </div>
                    </div>
                )}

                {/* Inversión */}
                <div className="mb-12">
                    <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <span className="text-indigo-500">❖</span> Desglose de Inversión
                    </h2>

                    <div className="space-y-6">
                        {/* Provider Costs */}
                        {data.providerCosts.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">A. Servicios Externos</h3>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500">
                                            <tr>
                                                <th className="px-6 py-3 text-left">Concepto</th>
                                                <th className="px-6 py-3 text-left">Proveedor</th>
                                                <th className="px-6 py-3 text-right">Costo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.providerCosts.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-4 font-semibold">{item.name}</td>
                                                    <td className="px-6 py-4 text-slate-500">{item.provider}</td>
                                                    <td className="px-6 py-4 text-right font-bold">${item.costMin.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-indigo-50/30">
                                                <td colSpan={2} className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px]">Subtotal</td>
                                                <td className="px-6 py-4 text-right font-bold text-indigo-600">${totalProviderCosts.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Professional Fees */}
                        {(data.professionalFees.length > 0 || totalLegacyItems > 0) && (
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">B. Servicios Profesionales</h3>
                                <div className="space-y-3">
                                    {data.professionalFees.map((item) => (
                                        <div key={item.id} className="p-6 bg-slate-50 rounded-2xl flex flex-col md:flex-row justify-between items-center border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800">{item.title}</p>
                                                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                                            </div>
                                            <div className="mt-4 md:mt-0 text-right">
                                                <p className="text-xl font-bold text-slate-900">${item.price.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Legacy Items Fallback */}
                                    {data.items?.map((item) => (
                                        <div key={item.id} className="p-6 bg-slate-50 rounded-2xl flex flex-col md:flex-row justify-between items-center border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800">{item.description}</p>
                                                <p className="text-xs text-slate-500 mt-1">{item.quantity ?? 1} x ${(item.unitPrice ?? 0).toLocaleString()}</p>
                                            </div>
                                            <div className="mt-4 md:mt-0 text-right">
                                                <p className="text-xl font-bold text-slate-900">${((item.unitPrice ?? 0) * (item.quantity ?? 1)).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div className="mt-10 p-8 bg-indigo-600 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center shadow-2xl shadow-indigo-200">
                        <div>
                            <h2 className="text-xl font-bold">TOTAL INVERSIÓN</h2>
                            <p className="text-indigo-100 text-xs mt-1">Servicios Profesionales + Infraestructura</p>
                        </div>
                        <div className="text-right mt-4 md:mt-0">
                            <p className="text-4xl font-bold">${grandTotal.toLocaleString()}</p>
                            <p className="text-[10px] uppercase tracking-widest opacity-70">Pesos Chilenos (CLP)</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest gap-4 border-t border-slate-50 pt-8">
                    <p>Nicoholas Lopetegui — Soluciones Digitales {new Date().getFullYear()}</p>
                    <p>{data.footerNote}</p>
                </div>
            </div>
        </div>
    );
}
