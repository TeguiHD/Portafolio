"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    AlertTriangle,
    Shield,
    Trash2,
    RotateCcw,
    Download,
    UserX,
    Clock,
    ShieldOff,
    FileText,
    Loader2
} from "lucide-react";
import { toast } from "sonner";

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
    suspend: "Suspender Cuenta",
    reactivate: "Reactivar Cuenta",
    request_deletion: "Programar Eliminación",
    cancel_deletion: "Cancelar Eliminación",
    anonymize: "Anonimizar Datos",
    permanent_delete: "Eliminar Permanentemente",
    export_data: "Exportar Datos (GDPR)"
};

const actionDescriptions: Record<ActionType, string> = {
    suspend: "El usuario no podrá acceder al sistema, pero sus datos se mantienen intactos. Se puede reactivar en cualquier momento.",
    reactivate: "Restaura el acceso completo del usuario al sistema.",
    request_deletion: "Inicia el proceso de eliminación con un período de gracia de 30 días. El usuario puede solicitar la cancelación durante este tiempo.",
    cancel_deletion: "Cancela el proceso de eliminación programado y restaura la cuenta.",
    anonymize: "Reemplaza toda la información personal identificable (PII) con datos anónimos. Los datos estadísticos se conservan. IRREVERSIBLE.",
    permanent_delete: "Elimina completamente al usuario y TODOS sus datos del sistema. Solo queda el registro de auditoría. IRREVERSIBLE.",
    export_data: "Genera un archivo JSON con todos los datos del usuario (derecho de portabilidad GDPR)."
};

export function UserLifecycleModal({ isOpen, onClose, user, onUserUpdated }: UserLifecycleModalProps) {
    const [loading, setLoading] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
    const [reason, setReason] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [dataSummary, setDataSummary] = useState<UserDataSummary | null>(null);
    const [exportedData, setExportedData] = useState<Record<string, unknown> | null>(null);

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

        // Validation
        if (["suspend", "request_deletion", "permanent_delete"].includes(selectedAction) && !reason.trim()) {
            toast.error("Debes proporcionar una razón");
            return;
        }

        if (selectedAction === "anonymize" && confirmText !== "ANONYMIZE") {
            toast.error("Escribe ANONYMIZE para confirmar");
            return;
        }

        if (selectedAction === "permanent_delete" && confirmText !== "DELETE_PERMANENTLY") {
            toast.error("Escribe DELETE_PERMANENTLY para confirmar");
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
                toast.error(data.error || "Error al ejecutar acción");
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
            toast.error("Error al ejecutar la acción");
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
            ACTIVE: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Activo" },
            SUSPENDED: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Suspendido" },
            DELETION_REQUESTED: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Eliminación Solicitada" },
            DELETION_SCHEDULED: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Eliminación Programada" },
            ANONYMIZED: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Anonimizado" },
            DELETED: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Eliminado" },
        };

        const badge = badges[status] || badges.ACTIVE;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getActionIcon = (action: ActionType) => {
        const icons: Record<ActionType, React.ReactNode> = {
            suspend: <ShieldOff size={18} />,
            reactivate: <RotateCcw size={18} />,
            request_deletion: <Clock size={18} />,
            cancel_deletion: <RotateCcw size={18} />,
            anonymize: <UserX size={18} />,
            permanent_delete: <Trash2 size={18} />,
            export_data: <Download size={18} />
        };
        return icons[action];
    };

    const getActionColor = (action: ActionType) => {
        const colors: Record<ActionType, string> = {
            suspend: "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400",
            reactivate: "border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400",
            request_deletion: "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400",
            cancel_deletion: "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400",
            anonymize: "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400",
            permanent_delete: "border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400",
            export_data: "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400"
        };
        return colors[action];
    };

    if (!isOpen || !user) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/20">
                                <Shield size={20} className="text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Gestión del Ciclo de Vida</h2>
                                <p className="text-sm text-slate-400">{user.name || user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {/* User Status */}
                        <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                            <div>
                                <p className="text-sm text-slate-400 mb-1">Estado actual</p>
                                {getStatusBadge()}
                            </div>
                            {user.deletionScheduledAt && (
                                <div className="text-right">
                                    <p className="text-sm text-slate-400 mb-1">Eliminación programada</p>
                                    <p className="text-sm text-red-400 font-medium">
                                        {new Date(user.deletionScheduledAt).toLocaleDateString("es-CL", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric"
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Data Summary */}
                        {loadingSummary ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin text-indigo-400" />
                            </div>
                        ) : dataSummary && (
                            <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={16} className="text-slate-400" />
                                    <p className="text-sm font-medium text-white">Datos del Usuario</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Object.entries(dataSummary.stats).map(([key, value]) => (
                                        <div key={key} className="p-2 rounded-lg bg-slate-700/50">
                                            <p className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                            <p className="text-lg font-bold text-white">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Export Data Result */}
                        {exportedData && (
                            <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Download size={18} className="text-cyan-400" />
                                        <p className="text-sm font-medium text-cyan-400">Datos listos para descargar</p>
                                    </div>
                                    <button
                                        onClick={downloadExportedData}
                                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors"
                                    >
                                        Descargar JSON
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Available Actions */}
                        <div className="mb-6">
                            <p className="text-sm font-medium text-white mb-3">Acciones Disponibles</p>
                            <div className="grid gap-2">
                                {getAvailableActions().map((action) => (
                                    <button
                                        key={action}
                                        onClick={() => {
                                            setSelectedAction(action);
                                            setConfirmText("");
                                        }}
                                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedAction === action
                                            ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-500"
                                            : ""
                                            } ${getActionColor(action)}`}
                                    >
                                        {getActionIcon(action)}
                                        <div className="text-left flex-1">
                                            <p className="font-medium">{actionLabels[action]}</p>
                                            <p className="text-xs opacity-70">{actionDescriptions[action]}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Form */}
                        {selectedAction && selectedAction !== "export_data" && (
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                {/* Reason Input */}
                                {["suspend", "request_deletion", "permanent_delete"].includes(selectedAction) && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Razón <span className="text-red-400">*</span>
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Describe la razón de esta acción..."
                                            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {/* Confirmation Input */}
                                {["anonymize", "permanent_delete"].includes(selectedAction) && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                            <AlertTriangle size={18} className="text-red-400" />
                                            <p className="text-sm text-red-400">
                                                Esta acción es <strong>IRREVERSIBLE</strong>
                                            </p>
                                        </div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Escribe <code className="px-2 py-0.5 rounded bg-slate-700 text-red-400">
                                                {selectedAction === "anonymize" ? "ANONYMIZE" : "DELETE_PERMANENTLY"}
                                            </code> para confirmar
                                        </label>
                                        <input
                                            type="text"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder="Escribe aquí..."
                                            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500 outline-none font-mono"
                                        />
                                    </div>
                                )}

                                {/* Execute Button */}
                                <button
                                    onClick={handleExecuteAction}
                                    disabled={loading}
                                    className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${["anonymize", "permanent_delete"].includes(selectedAction)
                                        ? "bg-red-600 hover:bg-red-500 text-white"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                        } disabled:opacity-50`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Procesando...
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

                        {/* Export Action */}
                        {selectedAction === "export_data" && !exportedData && (
                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                <button
                                    onClick={handleExecuteAction}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Exportando...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            Generar Exportación GDPR
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
