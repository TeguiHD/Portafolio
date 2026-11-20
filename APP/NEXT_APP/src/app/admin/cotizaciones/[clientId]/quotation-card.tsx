"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
    Globe, Lock, Clock, Copy, Check, ExternalLink, Settings,
    Eye, EyeOff, Pencil, Trash2, DollarSign, ChevronDown, PenLine, AlertTriangle
} from "lucide-react";
import AccessControlModal from "./access-control-modal";
import EditQuotationModal from "./edit-quotation-modal";
import PaymentModal from "./PaymentModal";
import QuotationStatusBadge, {
    getAvailableTransitions,
    STATUS_CONFIG,
    type QuotationStatus
} from "../components/QuotationStatusBadge";
import { toggleVisibilityAction, deleteQuotationAction, anularFirmaAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { copiarTexto } from "@/lib/tools/copiar";
import { BARRA, BOTON_PELIGRO, BOTON_SEC, CHIP, CHIP_NEUTRO, FOCO, SOBRE } from "@/modules/quotations/estilos";

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
        firma?: { nombre: string; fecha: string; documentoCambio: boolean } | null;
    };
    clientSlug: string;
    baseUrl: string;
    canEdit?: boolean;
    canDelete?: boolean;
    /** Puede registrar pagos (permiso de Pagos y propuesta propia): las mismas reglas que Pagos. */
    canCobrar?: boolean;
}

export default function QuotationCard({ quotation, clientSlug, baseUrl, canEdit = false, canDelete = false, canCobrar = false }: QuotationCardProps) {
    const [copied, setCopied] = useState(false);
    const [showAccessManager, setShowAccessManager] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [isVisible, setIsVisible] = useState(quotation.isVisible);
    const [currentStatus, setCurrentStatus] = useState(quotation.status as QuotationStatus);
    const [isPending, startTransition] = useTransition();
    const [anulando, startAnular] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const router = useRouter();
    const menuEstado = useRef<HTMLDivElement>(null);

    // Lo que llega del servidor manda: tras «Anular firma», un pago que la completa o la firma del cliente, la
    // tarjeta se actualiza sin recargar (antes el estado y la visibilidad quedaban como al abrir la página).
    const [previo, setPrevio] = useState({ status: quotation.status, isVisible: quotation.isVisible });
    if (previo.status !== quotation.status || previo.isVisible !== quotation.isVisible) {
        setPrevio({ status: quotation.status, isVisible: quotation.isVisible });
        setCurrentStatus(quotation.status as QuotationStatus);
        setIsVisible(quotation.isVisible);
    }

    // El menú de estado se cierra con Escape o al tocar fuera.
    useEffect(() => {
        if (!showStatusDropdown) return;
        const fuera = (e: PointerEvent) => {
            if (!menuEstado.current?.contains(e.target as Node)) setShowStatusDropdown(false);
        };
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setShowStatusDropdown(false); };
        document.addEventListener("pointerdown", fuera);
        document.addEventListener("keydown", tecla);
        return () => {
            document.removeEventListener("pointerdown", fuera);
            document.removeEventListener("keydown", tecla);
        };
    }, [showStatusDropdown]);

    const link = `${baseUrl}/cotizacion/${clientSlug}/${quotation.slug || quotation.folio}`;
    const isPublic = quotation.accessMode === "public";
    const isExpired = quotation.codeExpiresAt && new Date() > new Date(quotation.codeExpiresAt);

    // Payment tracking
    const totalPaid = quotation.totalPaid || 0;
    const remaining = quotation.total - totalPaid;
    const percentagePaid = quotation.total > 0 ? Math.min(100, (totalPaid / quotation.total) * 100) : 0;
    const isApproved = currentStatus === "APPROVED";
    const canRegisterPayment = canCobrar && isApproved && remaining > 0;
    const sinTotal = isApproved && quotation.total <= 0;

    const copyLink = async () => {
        if (!(await copiarTexto(link))) {
            toast.error("No se pudo copiar el enlace");
            return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleVisibility = () => {
        startTransition(async () => {
            const result = await toggleVisibilityAction(quotation.id, !isVisible);
            if (result.success) {
                setIsVisible(!isVisible);
                toast.success(isVisible ? "Propuesta oculta" : "Propuesta visible");
            } else {
                toast.error(result.error || "Error al cambiar visibilidad");
            }
        });
    };

    const handleDelete = async () => {
        if (!(await confirmar({
            titulo: `¿Eliminar la propuesta ${quotation.folio}?`,
            detalle: "No se puede deshacer.",
            accion: "Eliminar",
            peligro: true,
        }))) return;
        setIsDeleting(true);
        try {
            const result = await deleteQuotationAction(quotation.id);
            if (result.success) {
                toast.success("Propuesta eliminada");
                router.refresh();
            } else {
                toast.error(result.error || "No se pudo eliminar la propuesta");
            }
        } catch {
            toast.error("No se pudo eliminar la propuesta");
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
            // Si cambió por fuera (el cliente firmó, otro pago), la tarjeta se pone al día.
            router.refresh();
        } finally {
            setIsChangingStatus(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "America/Santiago",
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

    const puedeCambiarEstado = canEdit && availableTransitions.length > 0;
    const textoVence = getExpirationText();

    return (
        <li className={`border-b border-[var(--linea)] py-5 ${isVisible ? "" : "bg-red-500/5 px-3 -mx-3"}`}>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`${CHIP_NEUTRO} font-mono`}>{quotation.folio}</span>

                            <div className="relative" ref={menuEstado}>
                                {puedeCambiarEstado ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                        disabled={isChangingStatus}
                                        aria-expanded={showStatusDropdown}
                                        aria-label={`Estado: ${STATUS_CONFIG[currentStatus]?.label ?? currentStatus}. Cambiar estado`}
                                        className={`flex items-center gap-1 rounded-full transition-opacity duration-150 hover:opacity-80 disabled:opacity-50 ${FOCO}`}
                                    >
                                        <QuotationStatusBadge status={currentStatus} />
                                        <ChevronDown size={12} aria-hidden="true" className={`text-[var(--mut)] transition-transform duration-150 motion-reduce:transition-none ${showStatusDropdown ? "rotate-180" : ""}`} />
                                    </button>
                                ) : (
                                    <QuotationStatusBadge status={currentStatus} />
                                )}

                                {showStatusDropdown && (
                                    <ul
                                        aria-label="Pasar a"
                                        className="absolute left-0 top-full z-10 mt-1 min-w-[180px] rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] p-1 shadow-xl"
                                    >
                                        {availableTransitions.map((status) => (
                                            <li key={status}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(status)}
                                                    className={`flex min-h-10 w-full items-center rounded-md px-2 text-left transition-colors duration-150 ${SOBRE} ${FOCO}`}
                                                >
                                                    <QuotationStatusBadge status={status} size="sm" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {quotation.firma && (
                                <span
                                    className={`${CHIP} ${quotation.firma.documentoCambio
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "bg-emerald-500/10 text-emerald-400"}`}
                                    title={quotation.firma.documentoCambio
                                        ? "La propuesta se editó después de la firma: la firma corresponde a la versión anterior"
                                        : "Firma electrónica simple registrada desde el portal del cliente"}
                                >
                                    {quotation.firma.documentoCambio ? <AlertTriangle size={12} aria-hidden="true" /> : <PenLine size={12} aria-hidden="true" />}
                                    Firmada por {quotation.firma.nombre} el {new Date(quotation.firma.fecha).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}
                                    {quotation.firma.documentoCambio && ", luego editada"}
                                </span>
                            )}
                            {quotation.firma && canEdit && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!(await confirmar({
                                            titulo: `¿Anular la firma de ${quotation.firma?.nombre}?`,
                                            detalle: "La propuesta vuelve a Pendiente y el cliente podrá firmar de nuevo.",
                                            accion: "Anular firma",
                                            peligro: true,
                                        }))) return;
                                        startAnular(async () => {
                                            const r = await anularFirmaAction(quotation.id);
                                            if (r.success) {
                                                toast.success("Firma anulada");
                                                router.refresh();
                                            } else {
                                                toast.error(r.error || "No se pudo anular la firma");
                                            }
                                        });
                                    }}
                                    disabled={anulando}
                                    className={`min-h-11 rounded-sm px-1 text-xs text-[var(--mut)] underline underline-offset-2 transition-colors duration-150 hover:text-red-400 disabled:opacity-50 md:min-h-0 ${FOCO}`}
                                >
                                    {anulando ? "Anulando…" : "Anular firma"}
                                </button>
                            )}

                            {isPublic ? (
                                <span className={`${CHIP} bg-emerald-500/10 text-emerald-400`}>
                                    <Globe size={12} aria-hidden="true" />
                                    Pública
                                </span>
                            ) : (
                                <span className={`${CHIP} ${isExpired ? "bg-red-500/10 text-red-400" : "bg-[color-mix(in_srgb,var(--acento)_12%,transparent)] text-[var(--acento)]"}`}>
                                    <Lock size={12} aria-hidden="true" />
                                    Privada
                                </span>
                            )}
                            {!isVisible && (
                                <span className={`${CHIP} bg-red-500/10 text-red-400`}>
                                    <EyeOff size={12} aria-hidden="true" />
                                    Oculta
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg font-semibold text-[var(--txt)]">{quotation.projectName}</h3>

                        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--mut)]">
                            <span>{formatDate(quotation.createdAt)}</span>
                            <span className="font-semibold tabular-nums text-[var(--txt)]">${quotation.total.toLocaleString("es-CL")}</span>
                            {textoVence && (
                                <span className={`flex items-center gap-1 ${isExpired ? "text-red-400" : ""}`}>
                                    <Clock size={12} aria-hidden="true" />
                                    {textoVence}
                                </span>
                            )}
                        </p>
                        {sinTotal && canCobrar && (
                            <p className="mt-1 text-sm text-amber-400">
                                Sin total: {canEdit ? "edítala y escribe el total para poder registrar pagos." : "falta el total para poder registrar pagos."}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canRegisterPayment && (
                            <button type="button" onClick={() => setShowPaymentModal(true)} className={BOTON_SEC}>
                                <DollarSign size={16} aria-hidden="true" className="text-emerald-400" />
                                <span className="sr-only sm:not-sr-only">Registrar pago</span>
                            </button>
                        )}

                        {canEdit && (
                            <button
                                type="button"
                                onClick={handleToggleVisibility}
                                disabled={isPending}
                                className={isVisible ? BOTON_SEC : BOTON_PELIGRO}
                                title={isVisible ? "El cliente la ve en su portal" : "El cliente no la ve"}
                            >
                                {isVisible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
                                <span className="sr-only">{isVisible ? "Ocultar propuesta" : "Mostrar propuesta"}</span>
                            </button>
                        )}

                        <button type="button" onClick={copyLink} className={BOTON_SEC}>
                            {copied ? <Check size={16} aria-hidden="true" className="text-emerald-400" /> : <Copy size={16} aria-hidden="true" />}
                            <span className="sr-only sm:not-sr-only">{copied ? "Copiado" : "Copiar enlace"}</span>
                        </button>

                        <a href={link} target="_blank" rel="noreferrer" className={BOTON_SEC}>
                            <ExternalLink size={16} aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">Ver</span>
                            <span className="sr-only"> (se abre en otra pestaña)</span>
                        </a>

                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setShowAccessManager(true)}
                                aria-haspopup="dialog"
                                className={BOTON_SEC}
                            >
                                <Settings size={16} aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Acceso</span>
                            </button>
                        )}

                        {canEdit && (
                            <button type="button" onClick={() => setShowEditModal(true)} className={BOTON_SEC}>
                                <Pencil size={16} aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Editar</span>
                            </button>
                        )}

                        {canDelete && (
                            <button type="button" onClick={handleDelete} disabled={isDeleting} className={BOTON_PELIGRO}>
                                <Trash2 size={16} aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">{isDeleting ? "Eliminando…" : "Eliminar"}</span>
                            </button>
                        )}
                    </div>
                </div>

                {(isApproved || currentStatus === "COMPLETED") && totalPaid > 0 && (
                    <div className="max-w-xl">
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="text-[var(--mut)]" id={`pago-${quotation.id}`}>Pagado</span>
                            <span className="tabular-nums text-[var(--txt)]">
                                <span className="text-emerald-400">${totalPaid.toLocaleString("es-CL")}</span>
                                {" de "}
                                ${quotation.total.toLocaleString("es-CL")}
                            </span>
                        </div>
                        <div
                            className={BARRA}
                            role="progressbar"
                            aria-labelledby={`pago-${quotation.id}`}
                            aria-valuenow={Math.round(percentagePaid)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentagePaid}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-xs">
                            <span className="tabular-nums text-[var(--mut)]">{percentagePaid.toFixed(0)}% pagado</span>
                            {remaining > 0 && (
                                <span className="tabular-nums text-amber-400">
                                    Falta ${remaining.toLocaleString("es-CL")}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {canEdit && (
                <AccessControlModal
                    isOpen={showAccessManager}
                    quotationId={quotation.id}
                    currentMode={quotation.accessMode as "public" | "code"}
                    expiresAt={quotation.codeExpiresAt}
                    onClose={() => setShowAccessManager(false)}
                    onChanged={() => router.refresh()}
                />
            )}

            {canEdit && (
                <EditQuotationModal
                    isOpen={showEditModal}
                    quotationId={quotation.id}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => router.refresh()}
                />
            )}

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                quotationId={quotation.id}
                quotationFolio={quotation.folio}
                total={quotation.total}
                totalPaid={totalPaid}
                onPaymentRegistered={() => router.refresh()}
            />
        </li>
    );
}
