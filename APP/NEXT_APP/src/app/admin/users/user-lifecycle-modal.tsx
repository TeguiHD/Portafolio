"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
    AlertTriangle,
    Trash2,
    RotateCcw,
    Download,
    UserX,
    Clock,
    ShieldOff,
    Loader2,
    CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialogo, cls } from "./dialogo";

interface UserLifecycleModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        isActive: boolean;
        deletionStatus?: string;
        deletionScheduledAt?: string | null;
    } | null;
    onUserUpdated: () => void;
}

interface UserDataSummary {
    userId: string;
    email: string;
    name: string | null;
    createdAt: string;
    stats: {
        quotations: number;
        clients: number;
        transactions: number;
        cvVersions: number;
        financeAccounts: number;
        receipts: number;
    };
}

type ActionType = "suspend" | "reactivate" | "request_deletion" | "cancel_deletion" | "anonymize" | "permanent_delete" | "export_data";

const actionLabels: Record<ActionType, string> = {
    suspend: "Suspender cuenta",
    reactivate: "Reactivar cuenta",
    request_deletion: "Programar eliminación",
    cancel_deletion: "Cancelar eliminación",
    anonymize: "Anonimizar datos",
    permanent_delete: "Eliminar para siempre",
    export_data: "Exportar datos",
};

const actionDescriptions: Record<ActionType, string> = {
    suspend: "No podrá entrar al sistema, pero sus datos quedan intactos. Se puede reactivar cuando quieras.",
    reactivate: "Le devuelve el acceso completo al sistema.",
    request_deletion: "Empieza la eliminación con 30 días de gracia. En ese plazo se puede cancelar.",
    cancel_deletion: "Cancela la eliminación programada y restaura la cuenta.",
    anonymize: "Reemplaza toda su información personal por datos anónimos; las cifras se conservan. No se puede deshacer.",
    permanent_delete: "Borra al usuario y todos sus datos; solo queda el registro de auditoría. No se puede deshacer.",
    export_data: "Genera un archivo JSON con todos sus datos (derecho a la portabilidad).",
};

/** Tono de cada acción: color del ícono, siempre junto al texto. */
const actionTone: Record<ActionType, string> = {
    suspend: "text-amber-400",
    reactivate: "text-emerald-400",
    request_deletion: "text-rose-400",
    cancel_deletion: "text-sky-400",
    anonymize: "text-violet-400",
    permanent_delete: "text-red-400",
    export_data: "text-[var(--acento)]",
};

/** Lo que se escribe para confirmar lo irreversible (la API sigue recibiendo su propio código). */
const FRASE: Partial<Record<ActionType, string>> = {
    anonymize: "anonimizar",
    permanent_delete: "eliminar para siempre",
};

const STATS_LABELS: Record<keyof UserDataSummary["stats"], string> = {
    quotations: "Cotizaciones",
    clients: "Clientes",
    transactions: "Movimientos",
    cvVersions: "Versiones del CV",
    financeAccounts: "Cuentas",
    receipts: "Comprobantes",
};

export function UserLifecycleModal({ isOpen, onClose, user, onUserUpdated }: UserLifecycleModalProps) {
    const [loading, setLoading] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
    const [reason, setReason] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [dataSummary, setDataSummary] = useState<UserDataSummary | null>(null);
    const [exportedData, setExportedData] = useState<Record<string, unknown> | null>(null);
    // No hay <Toaster> montado en el panel: los errores también se muestran aquí.
    const [aviso, setAviso] = useState<string | null>(null);
    const id = useId();

    const avisar = (texto: string) => {
        toast.error(texto);
        setAviso(texto);
    };

    const fetchDataSummary = useCallback(async () => {
        if (!user) return;
        setLoadingSummary(true);
        try {
            const res = await fetch("/api/admin/users/lifecycle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get_summary", userId: user.id })
            });
            const data = await res.json();
            if (data.success) {
                setDataSummary(data.data);
            }
        } catch (error) {
            console.error("Error fetching summary:", error);
        } finally {
            setLoadingSummary(false);
        }
    }, [user]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen && user) {
            setSelectedAction(null);
            setReason("");
            setConfirmText("");
            setExportedData(null);
            setAviso(null);
            fetchDataSummary();
        }
    }, [isOpen, user, fetchDataSummary]);

    const getAvailableActions = (): ActionType[] => {
        if (!user) return [];

        const status = user.deletionStatus || "ACTIVE";

        switch (status) {
            case "ACTIVE":
                return ["suspend", "request_deletion", "export_data"];
            case "SUSPENDED":
                return ["reactivate", "request_deletion", "export_data"];
            case "DELETION_REQUESTED":
            case "DELETION_SCHEDULED":
                return ["cancel_deletion", "anonymize", "export_data"];
            case "ANONYMIZED":
                return ["permanent_delete"];
            default:
                return [];
        }
    };

    const handleExecuteAction = async () => {
        if (!user || !selectedAction) return;
        setAviso(null);

        // Validation
        if (["suspend", "request_deletion", "permanent_delete"].includes(selectedAction) && !reason.trim()) {
            avisar("Escribe el motivo.");
            return;
        }

        const frase = FRASE[selectedAction];
        if (frase && confirmText.trim().toLowerCase() !== frase) {
            avisar(`Escribe «${frase}» para confirmar.`);
            return;
        }

        setLoading(true);
        try {
            const body: Record<string, unknown> = {
                action: selectedAction,
                userId: user.id,
            };

            if (reason) body.reason = reason;
            if (selectedAction === "anonymize") body.confirm = "ANONYMIZE";
            if (selectedAction === "permanent_delete") body.confirm = "DELETE_PERMANENTLY";

            const res = await fetch("/api/admin/users/lifecycle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                avisar(data.error || "No se pudo completar la acción.");
                return;
            }

            if (selectedAction === "export_data") {
                setExportedData(data.data);
                toast.success("Datos exportados correctamente");
            } else {
                toast.success(data.message || "Acción completada");
                onUserUpdated();
                onClose();
            }
        } catch (error) {
            console.error("Error:", error);
            avisar("No se pudo completar la acción.");
        } finally {
            setLoading(false);
        }
    };

    const downloadExportedData = () => {
        if (!exportedData || !user) return;

        const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user-data-export-${user.id}-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Archivo descargado");
    };

    const getStatusBadge = () => {
        if (!user) return null;
        const status = user.deletionStatus || "ACTIVE";

        const badges: Record<string, { color: string; label: string }> = {
            ACTIVE: { color: "bg-emerald-500/10 text-emerald-400", label: "Activo" },
            SUSPENDED: { color: "bg-amber-500/10 text-amber-400", label: "Suspendido" },
            DELETION_REQUESTED: { color: "bg-rose-500/10 text-rose-400", label: "Eliminación solicitada" },
            DELETION_SCHEDULED: { color: "bg-red-500/10 text-red-400", label: "Eliminación programada" },
            ANONYMIZED: { color: "bg-violet-500/10 text-violet-400", label: "Anonimizado" },
            DELETED: { color: "bg-[color-mix(in_srgb,var(--txt)_8%,transparent)] text-[var(--mut)]", label: "Eliminado" },
        };

        const badge = badges[status] || badges.ACTIVE;
        return <span className={`${cls.insignia} ${badge.color}`}>{badge.label}</span>;
    };

    const getActionIcon = (action: ActionType) => {
        const icons: Record<ActionType, React.ReactNode> = {
            suspend: <ShieldOff size={18} aria-hidden="true" />,
            reactivate: <RotateCcw size={18} aria-hidden="true" />,
            request_deletion: <Clock size={18} aria-hidden="true" />,
            cancel_deletion: <RotateCcw size={18} aria-hidden="true" />,
            anonymize: <UserX size={18} aria-hidden="true" />,
            permanent_delete: <Trash2 size={18} aria-hidden="true" />,
            export_data: <Download size={18} aria-hidden="true" />
        };
        return icons[action];
    };

    const abierto = isOpen && !!user;
    const destructiva = selectedAction === "anonymize" || selectedAction === "permanent_delete";

    return (
        <Dialogo
            abierto={abierto}
            alCerrar={onClose}
            titulo="Ciclo de vida de la cuenta"
            subtitulo={user ? user.name || user.email : undefined}
            ancho="max-w-2xl"
        >
            {user ? (
                <div className="space-y-6">
                    {/* Estado actual */}
                    <dl className="grid grid-cols-1 border-y border-[var(--linea)] sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 px-1 py-3">
                            <dt className="text-[13.5px] text-[var(--mut)]">Estado actual</dt>
                            <dd className="m-0">{getStatusBadge()}</dd>
                        </div>
                        {user.deletionScheduledAt && (
                            <div className="flex flex-col gap-1.5 border-[var(--linea)] px-1 py-3 max-sm:border-t sm:border-l sm:pl-4">
                                <dt className="text-[13.5px] text-[var(--mut)]">Eliminación programada</dt>
                                <dd className="m-0 text-sm font-medium text-red-400">
                                    {new Date(user.deletionScheduledAt).toLocaleDateString("es-CL", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric"
                                    })}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {/* Resumen de datos */}
                    {loadingSummary ? (
                        <p className="flex items-center gap-2 text-sm text-[var(--mut)]" role="status">
                            <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando sus datos…
                        </p>
                    ) : dataSummary && (
                        <section aria-labelledby={`${id}-datos`}>
                            <h3 id={`${id}-datos`} className="mb-2 text-[15px] font-semibold text-[var(--mut)]">Sus datos</h3>
                            <dl className="grid grid-cols-2 border-t border-[var(--linea)] sm:grid-cols-3">
                                {(Object.entries(dataSummary.stats) as [keyof UserDataSummary["stats"], number][]).map(([key, value]) => (
                                    <div key={key} className="flex flex-col-reverse border-b border-[var(--linea)] px-1 py-3">
                                        <dt className="text-[13px] text-[var(--mut)]">{STATS_LABELS[key] ?? key}</dt>
                                        <dd className="m-0 text-xl font-bold tabular-nums tracking-tight text-[var(--txt)]">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    {/* Exportación lista */}
                    {exportedData && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--linea)] bg-[var(--fondo-2)] px-4 py-3" role="status">
                            <p className="flex items-center gap-2 text-sm font-medium text-[var(--txt)]">
                                <CheckCircle size={16} className="text-emerald-400" aria-hidden="true" />
                                Datos listos para descargar
                            </p>
                            <button type="button" onClick={downloadExportedData} className={cls.principal}>
                                <Download size={16} aria-hidden="true" />
                                Descargar JSON
                            </button>
                        </div>
                    )}

                    {/* Acciones disponibles */}
                    <section aria-labelledby={`${id}-acciones`}>
                        <h3 id={`${id}-acciones`} className="mb-2 text-[15px] font-semibold text-[var(--mut)]">Acciones disponibles</h3>
                        <ul className="border-t border-[var(--linea)]">
                            {getAvailableActions().map((action) => {
                                const elegida = selectedAction === action;
                                return (
                                    <li key={action} className="border-b border-[var(--linea)]">
                                        <button
                                            type="button"
                                            aria-pressed={elegida}
                                            onClick={() => {
                                                setSelectedAction(action);
                                                setConfirmText("");
                                                setAviso(null);
                                            }}
                                            className={`flex w-full items-start gap-3 px-2 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)] motion-reduce:transition-none ${elegida
                                                ? "bg-[color-mix(in_srgb,var(--acento)_10%,transparent)]"
                                                : "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]"}`}
                                        >
                                            <span className={`mt-0.5 shrink-0 ${actionTone[action]}`}>{getActionIcon(action)}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium text-[var(--txt)]">{actionLabels[action]}</span>
                                                <span className="mt-0.5 block text-sm text-[var(--mut)]">{actionDescriptions[action]}</span>
                                            </span>
                                            {elegida && <CheckCircle size={18} className="mt-0.5 shrink-0 text-[var(--acento)]" aria-hidden="true" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    {/* Formulario de la acción */}
                    {selectedAction && selectedAction !== "export_data" && (
                        <div className="space-y-4">
                            {["suspend", "request_deletion", "permanent_delete"].includes(selectedAction) && (
                                <div>
                                    <label htmlFor={`${id}-motivo`} className={cls.etiqueta}>
                                        Motivo <span className="text-red-400" aria-hidden="true">*</span>
                                    </label>
                                    <textarea
                                        id={`${id}-motivo`}
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Por qué haces esto"
                                        className={`${cls.campo} resize-none py-2`}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {FRASE[selectedAction] && (
                                <div>
                                    <p className="mb-2 flex items-center gap-2 text-sm text-red-400">
                                        <AlertTriangle size={16} aria-hidden="true" />
                                        No se puede deshacer.
                                    </p>
                                    <label htmlFor={`${id}-frase`} className={cls.etiqueta}>
                                        Escribe <code className="rounded bg-[var(--fondo-2)] px-1.5 py-0.5 font-mono text-red-400">{FRASE[selectedAction]}</code> para confirmar
                                    </label>
                                    <input
                                        id={`${id}-frase`}
                                        type="text"
                                        autoComplete="off"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        className={`${cls.campo} font-mono`}
                                    />
                                </div>
                            )}

                            {aviso && <p role="alert" className="text-sm text-red-400">{aviso}</p>}

                            <button
                                type="button"
                                onClick={handleExecuteAction}
                                disabled={loading}
                                className={`${destructiva ? cls.peligro : cls.principal} w-full`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Procesando…
                                    </>
                                ) : (
                                    <>
                                        {getActionIcon(selectedAction)}
                                        {actionLabels[selectedAction]}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Exportar */}
                    {selectedAction === "export_data" && !exportedData && (
                        <div className="space-y-3">
                            {aviso && <p role="alert" className="text-sm text-red-400">{aviso}</p>}
                            <button
                                type="button"
                                onClick={handleExecuteAction}
                                disabled={loading}
                                className={`${cls.principal} w-full`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                        Exportando…
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} aria-hidden="true" />
                                        Generar exportación
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            ) : null}
        </Dialogo>
    );
}
