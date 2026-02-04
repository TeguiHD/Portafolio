"use client";

import { useState, useEffect } from "react";
import { Copy, UserPlus, Check, X, User } from "lucide-react";
import { toast } from "sonner";

interface Connection {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        avatar: string | null;
    };
    addressee: {
        id: string;
        name: string | null;
        email: string | null;
        avatar: string | null;
    };
}

export default function ConnectionManager({ sharingCode, currentUserId }: { sharingCode: string, currentUserId: string }) {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [inputCode, setInputCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/user/connection");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setConnections(data);
        } catch {
            toast.error("Error al cargar conexiones");
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputCode.trim()) return;

        try {
            setSending(true);
            const res = await fetch("/api/user/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sharingCode: inputCode.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al enviar solicitud");
            }

            toast.success("Solicitud enviada correctamente");
            setInputCode("");
            fetchConnections();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error desconocido");
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (connectionId: string, status: "ACCEPTED" | "REJECTED") => {
        try {
            const res = await fetch(`/api/user/connection?id=${connectionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) throw new Error("Error al actualizar estado");

            toast.success(status === "ACCEPTED" ? "Conexión aceptada" : "Solicitud rechazada");
            fetchConnections();
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tu Código de Conexión</h3>
                <p className="text-slate-400 mb-4 text-sm">Comparte este código con otros usuarios para que puedan encontrarte y compartir clientes contigo.</p>
                <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 max-w-md">
                    <code className="flex-1 text-indigo-400 font-mono text-lg">{sharingCode || "Generando..."}</code>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(sharingCode);
                            toast.success("Código copiado");
                        }}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Copiar código"
                    >
                        <Copy size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Conectar con Usuario</h3>
                <form onSubmit={handleSendRequest} className="flex gap-3 max-w-md">
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="Ingresa el código de usuario..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                        type="submit"
                        disabled={sending || !inputCode}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        {sending ? "Enviando..." : "Conectar"}
                    </button>
                </form>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Conexiones</h3>

                {loading ? (
                    <div className="text-slate-400">Cargando...</div>
                ) : connections.length === 0 ? (
                    <div className="text-slate-500 italic">No tienes conexiones activas.</div>
                ) : (
                    <div className="grid gap-4">
                        {connections.map(connection => (
                            <ConnectionItem
                                key={connection.id}
                                connection={connection}
                                currentUserId={currentUserId}
                                onUpdate={handleUpdateStatus}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ConnectionItem({ connection, currentUserId, onUpdate }: { connection: Connection, currentUserId: string, onUpdate: (id: string, status: "ACCEPTED" | "REJECTED") => void }) {
    const isIncoming = connection.addresseeId === currentUserId;
    const otherUser = isIncoming ? connection.requester : connection.addressee;

    return (
        <div className="bg-slate-800/50 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700 rounded-full">
                    <User size={20} className="text-slate-300" />
                </div>
                <div>
                    <p className="font-medium text-white">
                        {otherUser.name || otherUser.email || "Usuario Desconocido"}
                    </p>
                    <p className="text-xs text-slate-400 mb-1">
                        {isIncoming ? "Solicitud entrante" : "Solicitud enviada"} • {connection.status}
                    </p>
                    {connection.status === "PENDING" && !isIncoming && (
                        <span className="text-xs text-amber-500 italic">Esperando aprobación...</span>
                    )}
                </div>
            </div>

            {connection.status === "PENDING" && isIncoming && (
                <div className="flex gap-2">
                    <button
                        onClick={() => onUpdate(connection.id, "ACCEPTED")}
                        className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                        title="Aceptar"
                    >
                        <Check size={18} />
                    </button>
                    <button
                        onClick={() => onUpdate(connection.id, "REJECTED")}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Rechazar"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
