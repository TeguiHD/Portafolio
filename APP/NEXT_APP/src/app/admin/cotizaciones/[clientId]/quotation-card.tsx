"use client";

import { useState, useTransition } from "react";
import { Globe, Lock, Clock, Copy, Check, ExternalLink, Settings, Eye, EyeOff } from "lucide-react";
import AccessControlModal from "./access-control-modal";
import { toggleVisibilityAction } from "./actions";
import { toast } from "sonner";

interface QuotationCardProps {
    quotation: {
        id: string;
        folio: string;
        slug: string | null;
        projectName: string;
        total: number;
        accessMode: string;
        codeExpiresAt: Date | null;
        createdAt: Date;
        isVisible: boolean;
    };
    clientSlug: string;
    baseUrl: string;
}

export default function QuotationCard({ quotation, clientSlug, baseUrl }: QuotationCardProps) {
    const [copied, setCopied] = useState(false);
    const [showAccessManager, setShowAccessManager] = useState(false);
    const [isVisible, setIsVisible] = useState(quotation.isVisible);
    const [isPending, startTransition] = useTransition();

    const link = `${baseUrl}/cotizacion/${clientSlug}/${quotation.slug || quotation.folio}`;
    const isPublic = quotation.accessMode === "public";
    const isExpired = quotation.codeExpiresAt && new Date() > new Date(quotation.codeExpiresAt);

    const copyLink = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleVisibility = () => {
        startTransition(async () => {
            const result = await toggleVisibilityAction(quotation.id, !isVisible);
            if (result.success) {
                setIsVisible(!isVisible);
                toast.success(isVisible ? "Cotización ocultada" : "Cotización visible");
            } else {
                toast.error(result.error || "Error al cambiar visibilidad");
            }
        });
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const getExpirationText = () => {
        if (isPublic) return null;
        if (!quotation.codeExpiresAt) return "Código indefinido";
        if (isExpired) return "Código expirado";

        const days = Math.ceil((new Date(quotation.codeExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return `Expira en ${days} día${days !== 1 ? "s" : ""}`;
    };

    return (
        <div className={`bg-slate-900 border rounded-xl p-5 transition-colors ${isVisible
            ? "border-slate-800 hover:border-slate-700"
            : "border-red-500/30 bg-red-950/20"
            }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-slate-800 text-slate-300 text-xs font-mono px-2 py-1 rounded">
                            {quotation.folio}
                        </span>
                        {isPublic ? (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                                <Globe size={12} />
                                Público
                            </span>
                        ) : (
                            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isExpired
                                ? "text-red-400 bg-red-500/10"
                                : "text-indigo-400 bg-indigo-500/10"
                                }`}>
                                <Lock size={12} />
                                Privado
                            </span>
                        )}
                        {!isVisible && (
                            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                                <EyeOff size={12} />
                                Oculta
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{quotation.projectName}</h3>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{formatDate(quotation.createdAt)}</span>
                        <span>${quotation.total.toLocaleString("es-CL")}</span>
                        {getExpirationText() && (
                            <span className={`flex items-center gap-1 ${isExpired ? "text-red-400" : ""}`}>
                                <Clock size={12} />
                                {getExpirationText()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Visibility Toggle */}
                    <button
                        onClick={handleToggleVisibility}
                        disabled={isPending}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isVisible
                            ? "bg-slate-800 hover:bg-slate-700 text-white"
                            : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            } disabled:opacity-50`}
                        title={isVisible ? "Ocultar cotización" : "Mostrar cotización"}
                    >
                        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        title="Copiar enlace"
                    >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        <span className="hidden sm:inline">Copiar</span>
                    </button>

                    <a
                        href={link}
                        target="_blank"
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        title="Ver cotización"
                    >
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">Ver</span>
                    </a>

                    <button
                        onClick={() => setShowAccessManager(!showAccessManager)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${showAccessManager
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 hover:bg-slate-700 text-white"
                            }`}
                        title="Gestionar acceso"
                    >
                        <Settings size={16} />
                        <span className="hidden sm:inline">Acceso</span>
                    </button>
                </div>
            </div>

            {/* Access Manager Modal */}
            <AccessControlModal
                isOpen={showAccessManager}
                quotationId={quotation.id}
                currentMode={quotation.accessMode as "public" | "code"}
                expiresAt={quotation.codeExpiresAt}
                onClose={() => setShowAccessManager(false)}
            />
        </div>
    );
}
