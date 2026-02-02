"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { getQuotationForEditAction, updateQuotationAction } from "./actions";
import { toast } from "sonner";

interface EditQuotationModalProps {
    isOpen: boolean;
    quotationId: string;
    onClose: () => void;
}

export default function EditQuotationModal({ isOpen, quotationId, onClose }: EditQuotationModalProps) {
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        projectName: "",
        total: 0,
        notes: "",
        htmlContent: ""
    });
    const [folio, setFolio] = useState("");

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getQuotationForEditAction(quotationId).then((result) => {
                if (result.success && result.data) {
                    setFormData({
                        projectName: result.data.projectName || "",
                        total: result.data.total || 0,
                        notes: result.data.notes || "",
                        htmlContent: result.data.htmlContent || ""
                    });
                    setFolio(result.data.folio || "");
                } else {
                    toast.error(result.error || "Error al cargar cotización");
                    onClose();
                }
                setIsLoading(false);
            });
        }
    }, [isOpen, quotationId, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await updateQuotationAction(quotationId, {
                projectName: formData.projectName,
                total: formData.total,
                notes: formData.notes || undefined,
                htmlContent: formData.htmlContent || undefined
            });

            if (result.success) {
                toast.success("Cotización actualizada correctamente");
                onClose();
            } else {
                toast.error(result.error || "Error al actualizar cotización");
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">
                        Editar Cotización {folio && <span className="text-slate-400 font-mono text-base ml-2">#{folio}</span>}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {/* Project Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nombre del Proyecto
                            </label>
                            <input
                                type="text"
                                value={formData.projectName}
                                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                                maxLength={200}
                            />
                        </div>

                        {/* Total */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Total (CLP)
                            </label>
                            <input
                                type="number"
                                value={formData.total}
                                onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                min={0}
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Notas internas
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                maxLength={1000}
                                placeholder="Notas privadas (no visibles para el cliente)"
                            />
                        </div>

                        {/* HTML Content */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Contenido HTML
                            </label>
                            <textarea
                                value={formData.htmlContent}
                                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[200px] font-mono text-sm"
                                placeholder="<div>Contenido de la cotización...</div>"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                HTML de la cotización. Solo se permiten etiquetas seguras.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isPending}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Guardar cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
