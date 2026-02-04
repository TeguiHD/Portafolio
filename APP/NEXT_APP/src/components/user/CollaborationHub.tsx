
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Share2, ArrowRightLeft, Shield, RefreshCw, Copy,
    Check, X, Link as LinkIcon, Activity, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Types
interface Connection {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    requester: UserProfile;
    addressee: UserProfile;
    createdAt: string;
}

interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
}



export default function CollaborationHub({
    initialSharingCode,
    currentUserId
}: {
    initialSharingCode: string,
    currentUserId: string
}) {
    const [sharingCode, setSharingCode] = useState(initialSharingCode);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ active: 0, pending: 0, blocked: 0 });

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await fetch("/api/user/connection");
            if (res.ok) {
                const data = await res.json();
                setConnections(data);

                // Calculate stats
                const active = data.filter((c: Connection) => c.status === "ACCEPTED").length;
                const pending = data.filter((c: Connection) => c.status === "PENDING" && c.addresseeId === currentUserId).length;
                setStats({ active, pending, blocked: 0 });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    label="Conexiones Activas"
                    value={stats.active}
                    icon={Users}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <StatsCard
                    label="Solicitudes Pendientes"
                    value={stats.pending}
                    icon={ArrowRightLeft}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
                <StatsCard
                    label="Recursos Compartidos"
                    value="--"
                    icon={Share2}
                    color="text-indigo-400"
                    bg="bg-indigo-500/10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Connection Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity size={20} className="text-indigo-400" />
                            Red de Colaboración
                        </h2>
                        {/* New Connection Input could go here or in sidebar */}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-900/50 rounded-xl animate-pulse" />)}
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-12 bg-slate-900/30 border border-slate-800/50 rounded-2xl">
                            <Users size={48} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-400">No tienes conexiones activas aún.</p>
                            <p className="text-sm text-slate-500">Comparte tu código para empezar.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {connections.map(conn => (
                                <ConnectionCard
                                    key={conn.id}
                                    connection={conn}
                                    currentUserId={currentUserId}
                                    onUpdate={fetchConnections}
                                />
                            ))}
                        </div>
                    )}

                    {/* Shared Resources Browser */}
                    <div className="pt-8 border-t border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Share2 size={20} className="text-indigo-400" />
                            Recursos Compartidos Contigo
                        </h2>
                        <SharedResourceBrowser />
                    </div>
                </div>

                {/* Sidebar: Your Code & Actions */}
                <div className="space-y-6">
                    <SecurityPanel
                        code={sharingCode}
                        setCode={setSharingCode}
                    />

                    <ConnectRequestPanel
                        onSent={fetchConnections}
                    />
                </div>
            </div>
        </div>
    );
}

// Sub-components

function SharedResourceBrowser() {
    const [activeTab, setActiveTab] = useState<"clients" | "quotations">("clients");

    return (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setActiveTab("clients")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "clients" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                >
                    Clientes Compartidos
                </button>
                <button
                    onClick={() => setActiveTab("quotations")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "quotations" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                >
                    Cotizaciones (Pronto)
                </button>
            </div>

            {activeTab === "clients" ? (
                <div className="text-center py-8">
                    <Users className="mx-auto text-slate-700 mb-4" size={32} />
                    <p className="text-slate-400 mb-4">
                        Puedes ver y gestionar los clientes que te han compartido en el módulo de Clientes.
                    </p>
                    <a
                        href="/admin/clientes"
                        className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Ir a Clientes <ExternalLink size={14} />
                    </a>
                </div>
            ) : (
                <div className="text-center py-8">
                    <p className="text-slate-500 italic">Próximamente: Vista directa de cotizaciones compartidas.</p>
                </div>
            )}
        </div>
    );
}

function StatsCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${bg}`}>
                <Icon size={24} className={color} />
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</p>
            </div>
        </div>
    );
}

function SecurityPanel({ code, setCode }: { code: string, setCode: (c: string) => void }) {
    const handleRotate = async () => {
        if (!confirm("¿Estás seguro? El código anterior dejará de funcionar.")) return;
        try {
            const res = await fetch("/api/user/connection/rotate", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setCode(data.newCode);
                toast.success("Código rotado exitosamente");
            }
        } catch (e) {
            toast.error("Error al rotar código");
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-indigo-500/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield size={18} className="text-emerald-400" />
                Tu Credencial
            </h3>

            <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-4">
                <p className="text-xs text-slate-500 mb-1">CÓDIGO DE ACCESO SEGURO</p>
                <div className="flex items-center justify-between gap-2">
                    <code className="text-xl font-mono text-indigo-400 tracking-wider">
                        {code || "••••••••"}
                    </code>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(code);
                            toast.success("Copiado al portapapeles");
                        }}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copiar"
                    >
                        <Copy size={18} />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Expira: Nunca</span>
                <button
                    onClick={handleRotate}
                    className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors"
                >
                    <RefreshCw size={12} />
                    Rotar Código
                </button>
            </div>
        </div>
    );
}

function ConnectRequestPanel({ onSent }: { onSent: () => void }) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/user/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sharingCode: code })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Solicitud enviada");
                setCode("");
                onSent();
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <LinkIcon size={18} className="text-indigo-400" />
                Conectar
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="text"
                    placeholder="Pegar código de usuario..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={loading || !code}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : "Enviar Solicitud"}
                </button>
            </form>
        </div>
    );
}

function ConnectionCard({ connection, currentUserId, onUpdate }: any) {
    const isIncoming = connection.addresseeId === currentUserId;
    const isPending = connection.status === "PENDING";
    const otherUser = isIncoming ? connection.requester : connection.addressee;

    const handleAction = async (status: string) => {
        try {
            await fetch(`/api/user/connection?id=${connection.id}`, {
                method: "PUT",
                body: JSON.stringify({ status })
            });
            onUpdate();
            toast.success(status === "ACCEPTED" ? "Conectado" : "Actualizado");
        } catch (e) {
            toast.error("Error");
        }
    };

    return (
        <div className={`p-5 rounded-2xl border transition-all ${isPending && isIncoming
            ? "bg-indigo-500/5 border-indigo-500/30"
            : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-white">
                        {otherUser.name?.[0] || otherUser.email?.[0] || "?"}
                    </div>
                    <div>
                        <h4 className="font-bold text-white">{otherUser.name || "Usuario"}</h4>
                        <p className="text-xs text-slate-400 truncate max-w-[150px]">{otherUser.email}</p>

                        {isPending && (
                            <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${isIncoming ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"
                                }`}>
                                {isIncoming ? "Solicita conectar" : "Enviada"}
                            </span>
                        )}
                        {!isPending && (
                            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                                Conectado
                            </span>
                        )}
                    </div>
                </div>

                {isPending && isIncoming && (
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => handleAction("ACCEPTED")}
                            className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors"
                            title="Aceptar"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={() => handleAction("REJECTED")}
                            className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Ignorar"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
