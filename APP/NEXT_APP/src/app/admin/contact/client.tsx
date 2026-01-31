"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import {
    Mail,
    Search,
    Inbox,
    CheckCircle2,
    Archive,
    AlertTriangle,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
    Send,
    Trash2,
    Eye,
    MailOpen,
    Loader2,
} from "lucide-react";

interface ContactMessage {
    id: string;
    email: string;
    name: string | null;
    message: string;
    status: "UNREAD" | "READ" | "RESPONDED" | "ARCHIVED" | "SPAM";
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    isSpam: boolean;
    spamScore: number;
    spamReason?: string;
    response?: string;
    respondedAt?: string;
    respondedBy?: string;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const STATUS_CONFIG = {
    UNREAD: { label: "Sin leer", color: "bg-blue-500", icon: Mail },
    READ: { label: "Leído", color: "bg-neutral-500", icon: MailOpen },
    RESPONDED: { label: "Respondido", color: "bg-green-500", icon: CheckCircle2 },
    ARCHIVED: { label: "Archivado", color: "bg-gray-500", icon: Archive },
    SPAM: { label: "Spam", color: "bg-red-500", icon: AlertTriangle },
};

const PRIORITY_CONFIG = {
    LOW: { label: "Baja", color: "text-neutral-400" },
    NORMAL: { label: "Normal", color: "text-white" },
    HIGH: { label: "Alta", color: "text-amber-400" },
    URGENT: { label: "Urgente", color: "text-red-400" },
};

export default function ContactPageClient() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [responseText, setResponseText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [showSpam, setShowSpam] = useState(false);
    const [page, setPage] = useState(1);

    const toast = useToast();

    const fetchMessages = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "15",
                ...(search && { search }),
                ...(statusFilter && { status: statusFilter }),
                ...(showSpam && { showSpam: "true" }),
            });

            const res = await fetch(`/api/admin/contact?${params}`);
            const data = await res.json();

            if (res.ok) {
                setMessages(data.messages);
                setPagination(data.pagination);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast.error("Error al cargar mensajes");
        } finally {
            setIsLoading(false);
        }
    }, [page, search, statusFilter, showSpam, toast]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const openMessage = async (msg: ContactMessage) => {
        setSelectedMessage(msg);
        setResponseText(msg.response || "");

        // Mark as read if unread
        if (msg.status === "UNREAD") {
            try {
                await fetch(`/api/admin/contact/${msg.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "READ" }),
                });
                setMessages((prev) =>
                    prev.map((m) => (m.id === msg.id ? { ...m, status: "READ" } : m))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch {
                // Silently fail - UI already shows message as read
            }
        }
    };

    const updateMessage = async (id: string, data: Record<string, unknown>) => {
        try {
            const res = await fetch(`/api/admin/contact/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                const updated = await res.json();
                setMessages((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
                );
                if (selectedMessage?.id === id) {
                    setSelectedMessage({ ...selectedMessage, ...updated });
                }
                toast.success("Mensaje actualizado");
                return true;
            }
        } catch (error) {
            console.error("Error updating message:", error);
            toast.error("Error al actualizar");
        }
        return false;
    };

    const sendResponse = async () => {
        if (!selectedMessage || !responseText.trim()) return;

        setIsSending(true);
        const success = await updateMessage(selectedMessage.id, {
            response: responseText.trim(),
        });
        setIsSending(false);

        if (success) {
            toast.success("Respuesta guardada");
        }
    };

    const deleteMessage = async (id: string) => {
        if (!confirm("¿Eliminar este mensaje permanentemente?")) return;

        try {
            const res = await fetch(`/api/admin/contact/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setMessages((prev) => prev.filter((m) => m.id !== id));
                if (selectedMessage?.id === id) {
                    setSelectedMessage(null);
                }
                toast.success("Mensaje eliminado");
            }
        } catch {
            toast.error("Error al eliminar");
        }
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffHours < 24) return `hace ${diffHours}h`;
        if (diffDays < 7) return `hace ${diffDays}d`;
        return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Mail className="w-7 h-7 text-accent-1" />
                        Mensajes de Contacto
                        {unreadCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                                {unreadCount} sin leer
                            </span>
                        )}
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        Gestiona los mensajes del formulario de contacto
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel rounded-xl border border-accent-1/20 p-4 overflow-visible">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar por email o contenido..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:border-accent-1/50 text-sm"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-4 py-2.5 pr-8 rounded-xl bg-[#0a0e1a] border border-white/10 text-white text-sm focus:outline-none focus:border-accent-1/50 appearance-none cursor-pointer"
                            style={{ minWidth: '160px' }}
                        >
                            <option value="">Todos los estados</option>
                            <option value="UNREAD">Sin leer</option>
                            <option value="READ">Leídos</option>
                            <option value="RESPONDED">Respondidos</option>
                            <option value="ARCHIVED">Archivados</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                            type="checkbox"
                            checked={showSpam}
                            onChange={(e) => {
                                setShowSpam(e.target.checked);
                                setPage(1);
                            }}
                            className="rounded border-white/20 bg-white/10 text-accent-1 focus:ring-accent-1/50"
                        />
                        <span className="text-sm text-neutral-300">Ver spam</span>
                    </label>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Messages list */}
                <div className="lg:col-span-2 glass-panel rounded-2xl border border-accent-1/20 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 text-accent-1 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Inbox className="w-12 h-12 text-neutral-600 mb-4" />
                            <p className="text-neutral-400">No hay mensajes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {messages.map((msg) => {
                                const _StatusIcon = STATUS_CONFIG[msg.status].icon;
                                const isSelected = selectedMessage?.id === msg.id;

                                return (
                                    <motion.button
                                        key={msg.id}
                                        onClick={() => openMessage(msg)}
                                        className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${isSelected ? "bg-accent-1/10 border-l-2 border-accent-1" : ""
                                            } ${msg.status === "UNREAD" ? "bg-blue-500/5" : ""}`}
                                        whileHover={{ x: 2 }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-2 ${STATUS_CONFIG[msg.status].color}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-medium truncate ${msg.status === "UNREAD" ? "text-white" : "text-neutral-300"}`}>
                                                        {msg.name || msg.email}
                                                    </span>
                                                    {msg.isSpam && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">
                                                            SPAM
                                                        </span>
                                                    )}
                                                </div>
                                                {msg.name && (
                                                    <p className="text-xs text-neutral-500 truncate mb-1">{msg.email}</p>
                                                )}
                                                <p className="text-sm text-neutral-400 line-clamp-2">{msg.message}</p>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-white/5">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-neutral-400">
                                {page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Message detail */}
                <div className="lg:col-span-3 glass-panel rounded-2xl border border-accent-1/20 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedMessage ? (
                            <motion.div
                                key={selectedMessage.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-4 border-b border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs ${STATUS_CONFIG[selectedMessage.status].color}/20 text-white`}>
                                                {STATUS_CONFIG[selectedMessage.status].label}
                                            </span>
                                            <span className={`text-xs ${PRIORITY_CONFIG[selectedMessage.priority].color}`}>
                                                {PRIORITY_CONFIG[selectedMessage.priority].label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateMessage(selectedMessage.id, { status: "ARCHIVED" })}
                                                className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                                                title="Archivar"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => updateMessage(selectedMessage.id, { isSpam: true })}
                                                className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-red-400"
                                                title="Marcar como spam"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteMessage(selectedMessage.id)}
                                                className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-red-400"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedMessage(null)}
                                                className="p-2 rounded-lg hover:bg-white/10 text-neutral-400"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-white">
                                        {selectedMessage.name || "Sin nombre"}
                                    </h3>
                                    <p className="text-sm text-accent-1">{selectedMessage.email}</p>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        {new Date(selectedMessage.createdAt).toLocaleString("es-CL")}
                                    </p>
                                </div>

                                {/* Message */}
                                <div className="flex-1 p-4 overflow-y-auto">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-white whitespace-pre-wrap">{selectedMessage.message}</p>
                                    </div>

                                    {selectedMessage.isSpam && (
                                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <p className="text-xs text-red-400">
                                                ⚠️ Detectado como spam (score: {selectedMessage.spamScore})
                                                {selectedMessage.spamReason && ` - ${selectedMessage.spamReason}`}
                                            </p>
                                        </div>
                                    )}

                                    {selectedMessage.response && (
                                        <div className="mt-4">
                                            <p className="text-xs text-neutral-500 mb-2">Tu respuesta:</p>
                                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                                <p className="text-green-300 whitespace-pre-wrap">{selectedMessage.response}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Response form */}
                                <div className="p-4 border-t border-white/5">
                                    <textarea
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        placeholder="Escribe una respuesta..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:border-accent-1/50 resize-none text-sm"
                                    />
                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={sendResponse}
                                            disabled={!responseText.trim() || isSending}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-1 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-1/90 transition-colors"
                                        >
                                            {isSending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            {isSending ? "Guardando..." : "Guardar respuesta"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center p-12 text-center"
                            >
                                <Eye className="w-12 h-12 text-neutral-600 mb-4" />
                                <p className="text-neutral-400">Selecciona un mensaje para ver los detalles</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
