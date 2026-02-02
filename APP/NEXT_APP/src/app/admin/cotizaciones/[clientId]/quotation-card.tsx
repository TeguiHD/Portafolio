"use client";

import { useState, useTransition } from "react";
import {
    Globe, Lock, Clock, Copy, Check, ExternalLink, Settings,
    Eye, EyeOff, Pencil, Trash2, DollarSign, ChevronDown
} from "lucide-react";
import AccessControlModal from "./access-control-modal";
import EditQuotationModal from "./edit-quotation-modal";
import PaymentModal from "./PaymentModal";
import QuotationStatusBadge, {
    getAvailableTransitions,
    STATUS_CONFIG,
    type QuotationStatus
} from "../components/QuotationStatusBadge";
import { toggleVisibilityAction, deleteQuotationAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface QuotationCardProps {
    quotation: {
        id: string;
        folio: string;
        slug: string | null;
        projectName: string;
        total: number;
        totalPaid?: number;
        status: string;
        accessMode: string;
        codeExpiresAt: Date | null;
        createdAt: Date;
        isVisible: boolean;
    };
    clientSlug: string;
    baseUrl: string;
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function QuotationCard({ quotation, clientSlug, baseUrl, canEdit = false, canDelete = false }: QuotationCardProps) {
    const [copied, setCopied] = useState(false);
    const [showAccessManager, setShowAccessManager] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [isVisible, setIsVisible] = useState(quotation.isVisible);
    const [currentStatus, setCurrentStatus] = useState(quotation.status as QuotationStatus);
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const router = useRouter();

    const link = `${baseUrl}/cotizacion/${clientSlug}/${quotation.slug || quotation.folio}`;
    const isPublic = quotation.accessMode === "public";
    const isExpired = quotation.codeExpiresAt && new Date() > new Date(quotation.codeExpiresAt);

    // Payment tracking
    const totalPaid = quotation.totalPaid || 0;
    const remaining = quotation.total - totalPaid;
    const percentagePaid = quotation.total > 0 ? Math.min(100, (totalPaid / quotation.total) * 100) : 0;
    const isApproved = currentStatus === "APPROVED";
    const canRegisterPayment = isApproved && remaining > 0;

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

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteQuotationAction(quotation.id);
            if (result.success) {
                toast.success("Cotización eliminada correctamente");
                setShowDeleteConfirm(false);
            } else {
                toast.error(result.error || "Error al eliminar cotización");
            }
        } catch {
            toast.error("Error al eliminar cotización");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusChange = async (newStatus: QuotationStatus) => {
        setShowStatusDropdown(false);
        setIsChangingStatus(true);

        try {
            const response = await fetch("/api/quotations/status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quotationId: quotation.id,
                    newStatus,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al cambiar estado");
            }

            setCurrentStatus(newStatus);
            toast.success(`Estado cambiado a ${STATUS_CONFIG[newStatus].label}`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al cambiar estado");
        } finally {
            setIsChangingStatus(false);
        }
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

    const availableTransitions = getAvailableTransitions(currentStatus);

    return (
        <>
            <div className={`bg-slate-900 border rounded-xl p-5 transition-colors ${isVisible
                ? "border-slate-800 hover:border-slate-700"
                : "border-red-500/30 bg-red-950/20"
                }`}>
                <div className="flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="bg-slate-800 text-slate-300 text-xs font-mono px-2 py-1 rounded">
                                    {quotation.folio}
                                </span>

                                {/* Status Badge with Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => canEdit && availableTransitions.length > 0 && setShowStatusDropdown(!showStatusDropdown)}
                                        disabled={isChangingStatus || availableTransitions.length === 0}
                                        className={`flex items-center gap-1 ${canEdit && availableTransitions.length > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                    >
                                        <QuotationStatusBadge status={currentStatus} />
                                        {canEdit && availableTransitions.length > 0 && (
                                            <ChevronDown size={12} className={`text-slate-400 transition-transform ${showStatusDropdown ? "rotate-180" : ""}`} />
                                        )}
                                    </button>

                                    {/* Status Dropdown */}
                                    {showStatusDropdown && (
                                        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 min-w-[160px]">
                                            <div className="p-1">
                                                {availableTransitions.map((status) => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleStatusChange(status)}
                                                        className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 transition-colors"
                                                    >
                                                        <QuotationStatusBadge status={status} size="sm" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

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

                            <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                <span>{formatDate(quotation.createdAt)}</span>
                                <span className="font-medium text-white">${quotation.total.toLocaleString("es-CL")}</span>
                                {getExpirationText() && (
                                    <span className={`flex items-center gap-1 ${isExpired ? "text-red-400" : ""}`}>
                                        <Clock size={12} />
                                        {getExpirationText()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Payment Button (only for APPROVED with remaining balance) */}
                            {canRegisterPayment && (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                                    title="Registrar pago"
                                >
                                    <DollarSign size={16} />
                                    <span className="hidden sm:inline">Pago</span>
                                </button>
                            )}

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

                            {/* Edit Button */}
                            {canEdit && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                                    title="Editar cotización"
                                >
                                    <Pencil size={16} />
                                    <span className="hidden sm:inline">Editar</span>
                                </button>
                            )}

                            {/* Delete Button */}
                            {canDelete && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                                    title="Eliminar cotización"
                                >
                                    <Trash2 size={16} />
                                    <span className="hidden sm:inline">Eliminar</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Payment Progress Bar (show for approved quotations with payments) */}
                    {(isApproved || currentStatus === "COMPLETED") && totalPaid > 0 && (
                        <div className="border-t border-slate-800 pt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-400">Progreso de pago</span>
                                <span className="text-white">
                                    <span className="text-emerald-400">${totalPaid.toLocaleString("es-CL")}</span>
                                    {" / "}
                                    ${quotation.total.toLocaleString("es-CL")}
                                </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                    style={{ width: `${percentagePaid}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-slate-500">{percentagePaid.toFixed(0)}% pagado</span>
                                {remaining > 0 && (
                                    <span className="text-xs text-amber-400">
                                        Pendiente: ${remaining.toLocaleString("es-CL")}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
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

            {/* Edit Modal */}
            {canEdit && (
                <EditQuotationModal
                    isOpen={showEditModal}
                    quotationId={quotation.id}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                quotationId={quotation.id}
                quotationFolio={quotation.folio}
                total={quotation.total}
                totalPaid={totalPaid}
                onPaymentRegistered={() => router.refresh()}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Eliminar Cotización</h3>
                        <p className="text-slate-400 mb-4">
                            ¿Estás seguro de que deseas eliminar la cotización <strong className="text-white">{quotation.folio}</strong>?
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Eliminar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
