
"use client";

import { useState, useEffect } from "react";
import { X, Share2, Copy, Check, Clock, Trash2, Shield, RefreshCcw, User } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: {
        id: string;
        name: string;
    };
    // currentUserId removed as unused
}

interface SharedUser {
    userId: string;
    userName: string | null;
    permission: string;
    sharedAt: string;
}

export default function ShareModal({ isOpen, onClose, client }: ShareModalProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"invite" | "manage">("invite");

    // Invite State
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [expiration, setExpiration] = useState(24);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Manage State
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const fetchSharingStats = async () => {
        try {
            setIsLoadingUsers(true);
            const res = await fetch(`/api/clients/share?clientId=${client.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.sharedWith) {
                    setSharedUsers(data.sharedWith);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            fetchSharingStats();
        } else {
            document.body.style.overflow = 'unset';
            // Reset state on close
            setGeneratedCode(null);
            setActiveTab("invite");
        }

        // Escape key listener
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener("keydown", handleEsc);
        };
    }, [isOpen]); // Missing deps ignored intentionally for simple fetch on open


    const handleGenerateCode = async () => {
        try {
            setIsGenerating(true);
            const res = await fetch("/api/clients/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: client.id,
                    permission: "VIEW", // Default permission
                    expiresInHours: expiration,
                    maxUses: 1 // One-time use for security
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al generar código");

            setGeneratedCode(data.code);
            toast.success("Código generado correctamente");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al generar código");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyCode = async () => {
        if (!generatedCode) return;
        try {
            await navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            toast.success("Código copiado al portapapeles");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Error al copiar");
        }
    };

    const handleRevokeAccess = async (targetUserId: string) => {
        if (!confirm("¿Estás seguro de querer revocar el acceso a este usuario?")) return;

        try {
            setIsRevoking(targetUserId);
            const res = await fetch("/api/clients/share", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: client.id,
                    action: "remove-access",
                    sharedWithUserId: targetUserId
                }),
            });

            if (!res.ok) throw new Error("Error al revocar acceso");

            setSharedUsers(prev => prev.filter(u => u.userId !== targetUserId));
            toast.success("Acceso revocado correctamente");
        } catch {
            toast.error("Error al revocar acceso");
        } finally {
            setIsRevoking(null);
        }
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose} // Close on backdrop click
        >
            <div
                className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()} // Prevent close on content click
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Share2 className="text-indigo-400" size={24} />
                        Compartir Cliente
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Gestiona el acceso a <span className="text-white font-medium">{client.name}</span>
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => setActiveTab("invite")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "invite"
                            ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                            : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        Generar Invitación
                    </button>
                    <button
                        onClick={() => setActiveTab("manage")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "manage"
                            ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                            : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        Usuarios con Acceso ({sharedUsers.length})
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {activeTab === "invite" ? (
                        <div className="space-y-6">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                                <h3 className="text-sm font-medium text-indigo-400 mb-2 flex items-center gap-2">
                                    <Shield size={16} />
                                    Compartición Segura
                                </h3>
                                <p className="text-xs text-indigo-300/80 leading-relaxed">
                                    Genera un código temporal único. Compártelo solo con el destinatario.
                                    Por seguridad, el código expirará automáticamente.
                                </p>
                            </div>

                            {!generatedCode ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Expiración del código</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[1, 24, 168].map((hours) => (
                                                <button
                                                    key={hours}
                                                    onClick={() => setExpiration(hours)}
                                                    className={`py-2 px-3 rounded-lg text-sm border transition-colors ${expiration === hours
                                                        ? "bg-white/10 border-indigo-500 text-white"
                                                        : "bg-transparent border-white/10 text-gray-400 hover:border-white/20"
                                                        }`}
                                                >
                                                    {hours === 1 ? "1 Hora" : hours === 24 ? "24 Horas" : "1 Semana"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerateCode}
                                        disabled={isGenerating}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCcw className="animate-spin" size={18} />
                                                Generando...
                                            </>
                                        ) : (
                                            <>
                                                <Share2 size={18} />
                                                Generar Código de Acceso
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-400 mb-2">Tu código de acceso es:</div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 group hover:border-white/20 transition-colors">
                                            <code className="text-2xl font-mono text-white font-bold tracking-wider">
                                                {generatedCode}
                                            </code>
                                            <button
                                                onClick={handleCopyCode}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                title="Copiar"
                                            >
                                                {copied ? <Check className="text-green-400" size={20} /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-amber-400/80 mt-3 flex items-center justify-center gap-1.5">
                                            <Clock size={12} />
                                            Este código expira en {expiration === 1 ? "1 hora" : expiration === 24 ? "24 horas" : "1 semana"}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setGeneratedCode(null)}
                                        className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                    >
                                        Generar otro código
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isLoadingUsers ? (
                                <div className="text-center py-8 text-gray-500">Cargando usuarios...</div>
                            ) : sharedUsers.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                                    <User className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Nadie tiene acceso a este cliente aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sharedUsers.map((user) => (
                                        <div
                                            key={user.userId}
                                            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {user.userName?.substring(0, 2).toUpperCase() || "U"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{user.userName || "Usuario"}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Desde: {new Date(user.sharedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleRevokeAccess(user.userId)}
                                                disabled={isRevoking === user.userId}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Revocar acceso"
                                            >
                                                {isRevoking === user.userId ? (
                                                    <RefreshCcw className="animate-spin" size={16} />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
