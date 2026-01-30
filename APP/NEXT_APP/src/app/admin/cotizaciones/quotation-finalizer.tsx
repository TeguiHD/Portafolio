"use client";

import { useState, useTransition } from "react";
import { Lock, Globe, Loader2, Check, Copy, ExternalLink, Code } from "lucide-react";
import { toast } from "sonner";
import { createQuotationAction } from "./[clientId]/actions";
import { QuotationDraft } from "../../../modules/quotations/types";

interface Props {
    clientId: string;
    draft: QuotationDraft;
    onBack: () => void;
    onSuccess: () => void;
}

export default function QuotationFinalizer({ clientId, draft, onBack, onSuccess }: Props) {
    const [accessMode, setAccessMode] = useState<"public" | "code">("code");
    const [codeDuration, setCodeDuration] = useState("15d");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ link: string; code?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // If result exists, show success view
    if (result) {
        return (
            <div className="text-center py-10">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">¡Cotización Publicada!</h2>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    La cotización ha sido creada exitosamente. Comparte el enlace con tu cliente.
                </p>

                <div className="max-w-md mx-auto space-y-4">
                    {/* Link */}
                    <div className="bg-slate-800 rounded-xl p-4 text-left">
                        <p className="text-xs text-slate-500 mb-2">Enlace de acceso:</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-indigo-400 text-sm break-all font-mono bg-slate-900/50 p-2 rounded">{result.link}</code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(result.link);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                    toast.success("Enlace copiado");
                                }}
                                className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                            >
                                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                            <a
                                href={result.link}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
                            >
                                <ExternalLink size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Code */}
                    {result.code && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center">
                            <p className="text-xs text-orange-400 mb-2 font-semibold uppercase tracking-wider">Código de acceso</p>
                            <code className="text-3xl font-bold text-white font-mono tracking-widest">{result.code}</code>
                            <p className="text-xs text-orange-400/70 mt-2">Comparte este código con el cliente</p>
                        </div>
                    )}

                    <button
                        onClick={onSuccess}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors mt-4"
                    >
                        Volver a Cotizaciones
                    </button>
                </div>
            </div>
        );
    }

    const handlePublish = () => {
        const formData = new FormData();
        formData.set("clientId", clientId);
        formData.set("folio", draft.folio || `QT-${Date.now().toString().slice(-6)}`);
        formData.set("projectName", draft.projectName);
        formData.set("total", draft.total.toString());
        formData.set("accessMode", accessMode);
        formData.set("codeDuration", codeDuration);

        // Generate HTML Content from Draft if not present
        // In a real app, this would be a proper template render.
        // For now, simple fallback if AI didn't generate full HTML.
        const htmlContent = draft.htmlContent || generateSimpleHtml(draft);
        formData.set("htmlContent", htmlContent);

        startTransition(async () => {
            const res = await createQuotationAction(formData);
            if (res.success) {
                setResult({ link: res.link!, code: res.accessCode });
                toast.success("Cotización creada exitosamente");
            } else {
                toast.error(res.error || "Error al crear cotización");
            }
        });
    };

    return (
        <div className="h-full flex flex-col max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Code className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Finalizar y Publicar</h2>
                <p className="text-slate-400">Configura la seguridad antes de compartir</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-8 shadow-xl">
                {/* Review */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Resumen</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500">Proyecto</p>
                            <p className="font-medium text-white">{draft.projectName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="font-bold text-indigo-400 text-lg">${draft.total.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Seguridad</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setAccessMode("public")}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${accessMode === "public"
                                ? "border-green-500 bg-green-500/10"
                                : "border-slate-800 bg-slate-900 hover:border-slate-700"
                                }`}
                        >
                            <Globe className={`w-6 h-6 mb-3 ${accessMode === "public" ? "text-green-400" : "text-slate-500"}`} />
                            <p className="font-bold text-white mb-1">Público</p>
                            <p className="text-xs text-slate-400 leading-relaxed">Cualquiera con el enlace puede ver la cotización.</p>
                        </button>

                        <button
                            onClick={() => setAccessMode("code")}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${accessMode === "code"
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-slate-800 bg-slate-900 hover:border-slate-700"
                                }`}
                        >
                            <Lock className={`w-6 h-6 mb-3 ${accessMode === "code" ? "text-indigo-400" : "text-slate-500"}`} />
                            <p className="font-bold text-white mb-1">Privado</p>
                            <p className="text-xs text-slate-400 leading-relaxed">Requiere código de acceso único.</p>
                        </button>
                    </div>

                    {accessMode === "code" && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm text-slate-400 mb-2">Expiración del Código</label>
                            <select
                                value={codeDuration}
                                onChange={(e) => setCodeDuration(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="7d">1 Semana (7 días)</option>
                                <option value="15d">15 Días (Recomendado)</option>
                                <option value="30d">1 Mes (30 días)</option>
                                <option value="indefinite">Indefinido</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                    <button
                        onClick={onBack}
                        disabled={isPending}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        Volver
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isPending}
                        className="flex-[2] bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-3 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Publicando...
                            </>
                        ) : (
                            "Publicar Cotización"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Simple helper to generate HTML if none exists (Manual Mode)
function generateSimpleHtml(draft: QuotationDraft): string {
    const itemsRows = draft.items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity ?? 1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${(item.unitPrice ?? 0).toLocaleString()}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
        </tr>
    `).join("");

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; padding: 40px;">
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">Presupuesto: ${draft.projectName}</h1>
                <p style="color: #64748b;">${draft.clientName}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr style="background-color: #f1f5f9; text-align: left;">
                        <th style="padding: 12px; border-radius: 8px 0 0 8px;">Descripción</th>
                        <th style="padding: 12px; text-align: center;">Cant.</th>
                        <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                        <th style="padding: 12px; border-radius: 0 8px 8px 0; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 20px 12px; text-align: right; font-weight: bold; color: #64748b;">Total Estimado:</td>
                        <td style="padding: 20px 12px; text-align: right; font-size: 20px; font-weight: bold; color: #0f172a;">$${draft.total.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px;">
                <p>Este documento es una cotización preliminar sujeta a disponibilidad.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
