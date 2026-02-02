"use client";

import { useState } from "react";
import { Share2, Copy, Check, X, Clock, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface ShareClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName: string;
}

type PermissionLevel = "VIEW" | "EDIT" | "FULL";

const PERMISSION_OPTIONS: { value: PermissionLevel; label: string; description: string }[] = [
    { value: "VIEW", label: "Solo ver", description: "Puede ver el cliente y sus cotizaciones" },
    { value: "EDIT", label: "Editar", description: "Puede modificar cotizaciones y registrar pagos" },
    { value: "FULL", label: "Acceso completo", description: "Control total incluyendo eliminar" },
];

const EXPIRATION_OPTIONS = [
    { value: 1, label: "1 hora" },
    { value: 24, label: "24 horas" },
    { value: 168, label: "7 días" },
    { value: 720, label: "30 días" },
    { value: 0, label: "Indefinido" },
];

export default function ShareClientModal({ isOpen, onClose, clientId, clientName }: ShareClientModalProps) {
    const [permission, setPermission] = useState<PermissionLevel>("VIEW");
    const [expiresInHours, setExpiresInHours] = useState(24);
    const [maxUses, setMaxUses] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch("/api/clients/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    permission,
                    expiresInHours,
                    maxUses,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al generar código");
            }

            setGeneratedCode(data.code);
            setExpiresAt(new Date(data.expiresAt));
            toast.success("Código generado exitosamente");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al generar código");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (generatedCode) {
            await navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Código copiado al portapapeles");
        }
    };

    const handleClose = () => {
        setGeneratedCode(null);
        setExpiresAt(null);
        setPermission("VIEW");
        setExpiresInHours(24);
        setMaxUses(1);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Share2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Compartir Cliente</h2>
                            <p className="text-sm text-slate-400">{clientName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {!generatedCode ? (
                        /* Configuration Form */
                        <div className="space-y-6">
                            {/* Permission Level */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                    <Shield className="w-4 h-4 text-indigo-400" />
                                    Nivel de Permiso
                                </label>
                                <div className="space-y-2">
                                    {PERMISSION_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setPermission(option.value)}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors ${permission === option.value
                                                    ? "border-indigo-500 bg-indigo-500/10"
                                                    : "border-slate-700 hover:border-slate-600"
                                                }`}
                                        >
                                            <div className="font-medium text-white">{option.label}</div>
                                            <div className="text-sm text-slate-400">{option.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Expiration */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                    Tiempo de Expiración
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {EXPIRATION_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setExpiresInHours(option.value)}
                                            className={`p-2 rounded-lg border text-sm transition-colors ${expiresInHours === option.value
                                                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                                    : "border-slate-700 text-slate-300 hover:border-slate-600"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Max Uses */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                    <Users className="w-4 h-4 text-emerald-400" />
                                    Máximo de Usos
                                </label>
                                <div className="flex gap-2">
                                    {[1, 3, 5, 10].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setMaxUses(n)}
                                            className={`flex-1 p-2 rounded-lg border text-sm transition-colors ${maxUses === n
                                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                    : "border-slate-700 text-slate-300 hover:border-slate-600"
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        Generar Código
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Generated Code Display */
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                                    <Check className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">¡Código Generado!</h3>
                                <p className="text-sm text-slate-400">
                                    Comparte este código con el usuario que deseas agregar
                                </p>
                            </div>

                            {/* Code Display */}
                            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                                <div className="font-mono text-lg text-center text-white tracking-wider mb-3">
                                    {generatedCode}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            ¡Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copiar Código
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Info */}
                            <div className="space-y-2 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-indigo-400" />
                                    <span>Permiso: <span className="text-white">{PERMISSION_OPTIONS.find(p => p.value === permission)?.label}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                    <span>Expira: <span className="text-white">{expiresAt?.toLocaleString("es-CL")}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-400" />
                                    <span>Usos máximos: <span className="text-white">{maxUses}</span></span>
                                </div>
                            </div>

                            {/* New Code Button */}
                            <button
                                onClick={() => setGeneratedCode(null)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Generar Otro Código
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
