
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRightLeft, User, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface UserTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceUser: {
        id: string;
        name: string | null;
        email: string;
        _count?: { quotations: number };
    } | null;
    onTransferComplete: () => void;
}

interface TargetUser {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
}

export function UserTransferModal({ isOpen, onClose, sourceUser, onTransferComplete }: UserTransferModalProps) {
    const [step, setStep] = useState<"select_target" | "confirm">("select_target");
    const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<TargetUser | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [transferring, setTransferring] = useState(false);

    const fetchTargetUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (data.users) {
                // Filter out source user and inactive/deleted users if necessary
                // Ideally, backend should support filtering, but for now filtering locally
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const validTargets = data.users.filter((u: any) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    u.id !== sourceUser?.id && u.isActive && (u as any).deletionStatus !== "DELETED"
                );
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTargetUsers(validTargets.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    avatar: u.avatar
                })));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Error al cargar usuarios destino");
        } finally {
            setLoading(false);
        }
    }, [sourceUser?.id]);

    useEffect(() => {
        if (isOpen) {
            setStep("select_target");
            setSelectedTarget(null);
            setSearchQuery("");
            fetchTargetUsers();
        }
    }, [isOpen, fetchTargetUsers]);

    const filteredTargets = targetUsers.filter(user =>
    (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleTransfer = async () => {
        if (!sourceUser || !selectedTarget) return;

        setTransferring(true);
        try {
            const res = await fetch("/api/admin/users/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceUserId: sourceUser.id,
                    targetUserId: selectedTarget.id,
                    mode: "ALL_CLIENTS"
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success("Transferencia exitosa");
            onTransferComplete();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error en la transferencia");
        } finally {
            setTransferring(false);
        }
    };

    if (!isOpen || !sourceUser) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Transferir Datos</h2>
                                <p className="text-xs text-slate-400">Origen: {sourceUser.name || sourceUser.email}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 overflow-y-auto flex-1">
                        {step === "select_target" ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-300">Selecciona el usuario que recibirá todos los clientes y cotizaciones.</p>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar usuario destino..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {loading ? (
                                        <div className="text-center py-4 text-slate-500">Cargando usuarios...</div>
                                    ) : filteredTargets.length === 0 ? (
                                        <div className="text-center py-4 text-slate-500">No se encontraron usuarios activos</div>
                                    ) : (
                                        filteredTargets.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => setSelectedTarget(user)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedTarget?.id === user.id
                                                    ? "bg-indigo-500/20 border-indigo-500 text-white"
                                                    : "bg-slate-800/30 border-slate-700 text-slate-300 hover:bg-slate-800"
                                                    }`}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <User size={14} />
                                                    )}
                                                </div>
                                                <div className="text-left overflow-hidden">
                                                    <p className="font-medium truncate">{user.name || "Sin nombre"}</p>
                                                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                </div>
                                                {selectedTarget?.id === user.id && (
                                                    <Check size={16} className="ml-auto text-indigo-400" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button
                                    onClick={() => setStep("confirm")}
                                    disabled={!selectedTarget}
                                    className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                                >
                                    Continuar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center">
                                <div className="flex items-center justify-center gap-4 text-xl font-bold text-white mb-4">
                                    <div className="text-slate-400">{sourceUser.name?.split(" ")[0]}</div>
                                    <ArrowRightLeft className="text-indigo-400" />
                                    <div className="text-indigo-400">{selectedTarget?.name?.split(" ")[0]}</div>
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-left">
                                    <h4 className="text-amber-400 font-bold mb-2 text-sm">⚠️ Atención</h4>
                                    <ul className="text-sm text-amber-200/80 space-y-1 list-disc list-inside">
                                        <li>Se transferirán TODOS los clientes y cotizaciones.</li>
                                        <li>El usuario origen perderá el acceso a estos datos.</li>
                                        <li>Esta acción quedará registrada en el log de auditoría.</li>
                                    </ul>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setStep("select_target")}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        onClick={handleTransfer}
                                        disabled={transferring}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {transferring ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Transfiriendo...
                                            </>
                                        ) : (
                                            "Confirmar Transferencia"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
