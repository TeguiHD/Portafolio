"use client";

import { useState, useTransition } from "react";
import { X, Globe, Lock, Loader2, Check, Copy, AlertTriangle } from "lucide-react";
import { updateQuotationAccessAction } from "./actions";
import { toast } from "sonner";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    quotationId: string;
    currentMode: "public" | "code";
    expiresAt: Date | null;
}

export default function AccessControlModal({ isOpen, onClose, quotationId, currentMode, expiresAt: _expiresAt }: Props) {
    const [mode, setMode] = useState<"public" | "code">(currentMode);
    const [duration, setDuration] = useState<string>("15d");
    const [isPending, startTransition] = useTransition();
    const [newCode, setNewCode] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleSave = () => {
        // If switching to private or refreshing code, show confirmation first
        if (mode === "code" && !showConfirmation && !newCode) {
            setShowConfirmation(true);
            return;
        }

        // If switching to public, direct save
        if (mode === "public") {
            performUpdate();
            return;
        }

        // If confirmed private update
        if (showConfirmation) {
            performUpdate();
        }
    };

    const performUpdate = () => {
        startTransition(async () => {
            const res = await updateQuotationAccessAction(quotationId, mode, mode === "code" ? duration : undefined);
            if (res.success) {
                if (mode === "public") {
                    toast.success("Cotización ahora es pública");
                    onClose();
                } else {
                    toast.success("Código de acceso generado");
                    if (res.code) {
                        setNewCode(res.code);
                        setShowConfirmation(false);
                    }
                }
            } else {
                toast.error(res.error || "Error al actualizar acceso");
            }
        });
    };

    const copyCode = async () => {
        if (newCode) {
            await navigator.clipboard.writeText(newCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Código copiado al portapapeles");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        {newCode ? (
                            <>
                                <Check className="text-green-400" size={20} />
                                Acceso Actualizado
                            </>
                        ) : (
                            <>
                                <Lock className="text-indigo-400" size={20} />
                                Gestionar Acceso
                            </>
                        )}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {newCode ? (
                        // SUCCESS VIEW WITH CODE
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                                <p className="text-sm text-green-400 mb-2 font-medium">¡Nuevo código generado!</p>
                                <div className="flex items-center justify-center gap-3 my-4">
                                    <code className="text-3xl font-mono font-bold text-white tracking-wider">{newCode}</code>
                                    <button
                                        onClick={copyCode}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                                        title="Copiar"
                                    >
                                        {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                    </button>
                                </div>
                                <div className="flex items-start gap-2 text-left text-xs text-slate-400 bg-slate-950/50 p-3 rounded-lg">
                                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                                    <p>
                                        <strong>IMPORTANTE:</strong> Este código se muestra una sola vez.
                                        Cópialo y compártelo ahora. Por seguridad, solo almacenamos una versión cifrada.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-colors"
                            >
                                Entendido, cerrar
                            </button>
                        </div>
                    ) : showConfirmation ? (
                        // CONFIRMATION VIEW
                        <div className="space-y-4">
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="text-orange-400 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-orange-400 font-bold text-sm mb-1">¿Generar nuevo código?</h4>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Al generar un nuevo código, <strong>el código anterior dejará de funcionar inmediatamente</strong>.
                                        Los usuarios que intenten acceder con el código antiguo perderán acceso.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={performUpdate}
                                    disabled={isPending}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {isPending ? <Loader2 className="animate-spin" size={18} /> : "Sí, generar"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        // EDIT FORM VIEW
                        <div className="space-y-6">
                            {/* Mode Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMode("public")}
                                    className={`p-4 rounded-xl border-2 transition-all text-left relative ${mode === "public"
                                        ? "border-green-500 bg-green-500/10"
                                        : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
                                        }`}
                                >
                                    <Globe className={`w-5 h-5 mb-2 ${mode === "public" ? "text-green-400" : "text-slate-400"}`} />
                                    <p className="font-bold text-white text-sm">Público</p>
                                    <p className="text-xs text-slate-400 mt-1">Sin restricciones</p>
                                    {mode === "public" && <Check className="absolute top-3 right-3 text-green-400" size={16} />}
                                </button>

                                <button
                                    onClick={() => setMode("code")}
                                    className={`p-4 rounded-xl border-2 transition-all text-left relative ${mode === "code"
                                        ? "border-indigo-500 bg-indigo-500/10"
                                        : "border-slate-800 bg-slate-800/50 hover:border-slate-700"
                                        }`}
                                >
                                    <Lock className={`w-5 h-5 mb-2 ${mode === "code" ? "text-indigo-400" : "text-slate-400"}`} />
                                    <p className="font-bold text-white text-sm">Privado</p>
                                    <p className="text-xs text-slate-400 mt-1">Requiere código</p>
                                    {mode === "code" && <Check className="absolute top-3 right-3 text-indigo-400" size={16} />}
                                </button>
                            </div>

                            {/* Options for Private Mode */}
                            {mode === "code" && (
                                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 space-y-3">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Validez del Código
                                    </label>
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                                    >
                                        <option value="7d">1 Semana (7 días)</option>
                                        <option value="15d">15 Días</option>
                                        <option value="30d">1 Mes (30 días)</option>
                                        <option value="indefinite">Indefinido</option>
                                    </select>
                                    <p className="text-xs text-slate-500">
                                        Después de este tiempo, deberás generar un nuevo código.
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isPending || (mode === currentMode && mode === "public")}
                                    className="w-full bg-white hover:bg-slate-200 text-slate-900 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        mode === "code" ? (currentMode === "code" ? "Generar Nuevo Código" : "Proteger con Código") : "Hacer Público"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
