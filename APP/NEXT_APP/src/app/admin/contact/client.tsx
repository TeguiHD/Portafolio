"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
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
    ChevronDown,
    X,
    Send,
    Trash2,
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

// Estados: texto + ícono + color (el color nunca va solo). `punto` es el círculo de la lista.
const STATUS_CONFIG = {
    UNREAD: { label: "Sin leer", punto: "bg-sky-400", insignia: "bg-sky-500/10 text-sky-400", icon: Mail },
    READ: { label: "Leído", punto: "bg-[var(--mut)]", insignia: "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]", icon: MailOpen },
    RESPONDED: { label: "Respondido", punto: "bg-emerald-400", insignia: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2 },
    ARCHIVED: { label: "Archivado", punto: "bg-[var(--linea-2)]", insignia: "bg-[color-mix(in_srgb,var(--txt)_7%,transparent)] text-[var(--mut)]", icon: Archive },
    SPAM: { label: "Spam", punto: "bg-red-400", insignia: "bg-red-500/10 text-red-400", icon: AlertTriangle },
};

const PRIORITY_CONFIG = {
    LOW: { label: "Prioridad baja", color: "text-[var(--mut)]" },
    NORMAL: { label: "Prioridad normal", color: "text-[var(--mut)]" },
    HIGH: { label: "Prioridad alta", color: "text-amber-400" },
    URGENT: { label: "Urgente", color: "text-red-400" },
};

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const CAMPO = "min-h-10 max-sm:min-h-11 rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] text-sm text-[var(--txt)] placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)]";
const ICONO = `grid size-10 max-sm:size-11 place-items-center rounded-lg text-[var(--mut)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)] disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`;

export default function ContactPageClient() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [responseText, setResponseText] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Filters. `search` es lo escrito; `busqueda`, lo que se consulta (300 ms después de dejar de escribir).
    const [search, setSearch] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [showSpam, setShowSpam] = useState(false);
    const [page, setPage] = useState(1);

    const toast = useToast();
    const router = useRouter();
    const detalle = useRef<HTMLElement>(null);
    // Solo la última consulta pinta la lista: una respuesta lenta de antes no pisa la nueva.
    const consulta = useRef(0);

    useEffect(() => {
        const t = setTimeout(() => setBusqueda(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchMessages = useCallback(async () => {
        const esta = ++consulta.current;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "15",
                ...(busqueda && { search: busqueda }),
                ...(statusFilter && { status: statusFilter }),
                ...(showSpam && { showSpam: "true" }),
            });

            const res = await fetch(`/api/admin/contact?${params}`);
            const data = await res.json().catch(() => ({}));
            if (esta !== consulta.current) return;

            if (res.ok) {
                setMessages(data.messages);
                setPagination(data.pagination);
                setUnreadCount(data.unreadCount);
            } else {
                toast.error(data.error || "No se pudieron cargar los mensajes");
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            if (esta === consulta.current) toast.error("No se pudieron cargar los mensajes: revisa la conexión");
        } finally {
            if (esta === consulta.current) setIsLoading(false);
        }
    }, [page, busqueda, statusFilter, showSpam, toast]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const openMessage = async (msg: ContactMessage) => {
        setSelectedMessage(msg);
        setResponseText(msg.response || "");
        // En celular el detalle queda debajo de toda la lista: se lleva a la vista.
        if (window.matchMedia("(max-width: 1023px)").matches) {
            const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            requestAnimationFrame(() => detalle.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" }));
        }

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
                // El contador del menú lateral también baja.
                router.refresh();
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

            const updated = await res.json().catch(() => ({}));
            if (res.ok) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
                );
                if (selectedMessage?.id === id) {
                    setSelectedMessage({ ...selectedMessage, ...updated });
                }
                // Archivar o marcar spam lo saca del filtro actual y cambia los contadores: se vuelve a leer la lista.
                if ("status" in data || "isSpam" in data) {
                    fetchMessages();
                    router.refresh();
                }
                return true;
            }
            toast.error(updated.error || "No se pudo actualizar el mensaje");
        } catch (error) {
            console.error("Error updating message:", error);
            toast.error("No se pudo actualizar el mensaje: revisa la conexión");
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
        if (!(await confirmar({ titulo: "¿Eliminar este mensaje?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;

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
                fetchMessages();
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "No se pudo eliminar el mensaje");
            }
        } catch {
            toast.error("No se pudo eliminar el mensaje: revisa la conexión");
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
        return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" });
    };

    return (
        <div className="max-w-[1180px] space-y-8">
            {/* Encabezado */}
            <header>
                <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl sm:text-[28px] font-bold tracking-tight text-[var(--txt)]">
                    Mensajes de contacto
                    {unreadCount > 0 && (
                        <span className="text-[15px] font-semibold tracking-normal text-[var(--acento)]">
                            {unreadCount} sin leer
                        </span>
                    )}
                </h1>
                <p className="mt-1 text-[15px] text-[var(--mut)]">
                    Gestiona los mensajes del formulario de contacto.
                </p>
            </header>

            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-3" role="search" aria-label="Filtrar mensajes">
                <div className="relative min-w-0 flex-1 basis-60">
                    <label htmlFor="contacto-buscar" className="sr-only">Buscar por correo o contenido</label>
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mut)]" />
                    <input
                        id="contacto-buscar"
                        type="search"
                        placeholder="Buscar por correo o contenido…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className={`${CAMPO} w-full pl-9 pr-3`}
                    />
                </div>

                <div className="relative">
                    <label htmlFor="contacto-estado" className="sr-only">Estado</label>
                    <select
                        id="contacto-estado"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className={`${CAMPO} min-w-[160px] cursor-pointer appearance-none pl-3 pr-8`}
                    >
                        <option value="">Todos los estados</option>
                        <option value="UNREAD">Sin leer</option>
                        <option value="READ">Leídos</option>
                        <option value="RESPONDED">Respondidos</option>
                        <option value="ARCHIVED">Archivados</option>
                    </select>
                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--mut)]" />
                </div>

                <label className="flex min-h-10 max-sm:min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--linea-2)] px-3 text-sm text-[var(--txt)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--acento)]">
                    <input
                        type="checkbox"
                        checked={showSpam}
                        onChange={(e) => {
                            setShowSpam(e.target.checked);
                            setPage(1);
                        }}
                        className="size-4 accent-[var(--acento)]"
                    />
                    Ver spam
                </label>
            </div>

            {/* Contenido */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                {/* Lista */}
                <section aria-label="Lista de mensajes" className="min-w-0 lg:col-span-2" aria-busy={isLoading}>
                    {isLoading ? (
                        <div role="status" className="flex items-center justify-center border-t border-[var(--linea)] p-12">
                            <span className="sr-only">Cargando mensajes…</span>
                            <Loader2 aria-hidden="true" className="size-6 animate-spin text-[var(--acento)] motion-reduce:animate-none" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center border-t border-[var(--linea)] p-12 text-center">
                            <Inbox aria-hidden="true" className="mb-3 size-8 text-[var(--mut)]" />
                            <p className="text-[var(--mut)]">No hay mensajes</p>
                        </div>
                    ) : (
                        <ul className="border-t border-[var(--linea)]">
                            {messages.map((msg) => {
                                const estado = STATUS_CONFIG[msg.status];
                                const isSelected = selectedMessage?.id === msg.id;
                                const sinLeer = msg.status === "UNREAD";

                                return (
                                    <li key={msg.id} className="border-b border-[var(--linea)]">
                                        <button
                                            type="button"
                                            onClick={() => openMessage(msg)}
                                            aria-current={isSelected ? "true" : undefined}
                                            className={`relative w-full px-3 py-3.5 text-left transition-colors duration-150 motion-reduce:transition-none ${FOCO} focus-visible:outline-offset-[-2px] ${isSelected
                                                ? "bg-[color-mix(in_srgb,var(--acento)_10%,transparent)]"
                                                : "hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]"
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-full ${estado.punto}`} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`truncate ${sinLeer ? "font-semibold text-[var(--txt)]" : "font-medium text-[var(--txt)]"}`}>
                                                            {msg.name || msg.email}
                                                        </span>
                                                        {sinLeer && <span className="sr-only">(sin leer)</span>}
                                                        {msg.isSpam && (
                                                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-red-500/10 text-red-400">
                                                                Spam
                                                            </span>
                                                        )}
                                                    </div>
                                                    {msg.name && (
                                                        <p className="truncate text-xs text-[var(--mut)]">{msg.email}</p>
                                                    )}
                                                    <p className="mt-1 line-clamp-2 text-sm text-[var(--mut)]">{msg.message}</p>
                                                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--mut)]">
                                                        <Clock aria-hidden="true" className="size-3" />
                                                        {formatDate(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* Paginación */}
                    {pagination && pagination.totalPages > 1 && (
                        <nav aria-label="Páginas de mensajes" className="flex items-center justify-between pt-3">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                aria-label="Página anterior"
                                className={ICONO}
                            >
                                <ChevronLeft aria-hidden="true" className="size-[18px]" />
                            </button>
                            <span className="text-sm tabular-nums text-[var(--mut)]">
                                {page} / {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                aria-label="Página siguiente"
                                className={ICONO}
                            >
                                <ChevronRight aria-hidden="true" className="size-[18px]" />
                            </button>
                        </nav>
                    )}
                </section>

                {/* Detalle */}
                <section ref={detalle} aria-label="Mensaje abierto" className="min-w-0 scroll-mt-20 rounded-xl border border-[var(--linea)] bg-[var(--sup)] lg:col-span-3">
                    {selectedMessage ? (
                        <div key={selectedMessage.id} className="flex h-full flex-col">
                            <div className="border-b border-[var(--linea)] p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[selectedMessage.status].insignia}`}>
                                            {STATUS_CONFIG[selectedMessage.status].label}
                                        </span>
                                        <span className={`text-xs ${PRIORITY_CONFIG[selectedMessage.priority].color}`}>
                                            {PRIORITY_CONFIG[selectedMessage.priority].label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={async () => { if (await updateMessage(selectedMessage.id, { status: "ARCHIVED" })) toast.success("Mensaje archivado"); }}
                                            className={ICONO}
                                            title="Archivar"
                                            aria-label="Archivar"
                                        >
                                            <Archive aria-hidden="true" className="size-4" />
                                        </button>
                                        {selectedMessage.isSpam ? (
                                            <button
                                                type="button"
                                                onClick={async () => { if (await updateMessage(selectedMessage.id, { isSpam: false })) toast.success("Vuelve a la bandeja"); }}
                                                className={ICONO}
                                                title="No es spam"
                                                aria-label="No es spam"
                                            >
                                                <Inbox aria-hidden="true" className="size-4" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={async () => { if (await updateMessage(selectedMessage.id, { isSpam: true })) toast.success("Marcado como spam"); }}
                                                className={`${ICONO} hover:text-red-400`}
                                                title="Marcar como spam"
                                                aria-label="Marcar como spam"
                                            >
                                                <AlertTriangle aria-hidden="true" className="size-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => deleteMessage(selectedMessage.id)}
                                            className={`${ICONO} hover:text-red-400`}
                                            title="Eliminar"
                                            aria-label="Eliminar"
                                        >
                                            <Trash2 aria-hidden="true" className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMessage(null)}
                                            className={ICONO}
                                            title="Cerrar"
                                            aria-label="Cerrar mensaje"
                                        >
                                            <X aria-hidden="true" className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                <h2 className="text-lg font-semibold text-[var(--txt)]">
                                    {selectedMessage.name || "Sin nombre"}
                                </h2>
                                <p className="break-all text-sm text-[var(--acento)]">{selectedMessage.email}</p>
                                <p className="mt-1 text-xs text-[var(--mut)]">
                                    {new Date(selectedMessage.createdAt).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" })}
                                </p>
                            </div>

                            {/* Mensaje */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <p className="whitespace-pre-wrap break-words text-[var(--txt)]">{selectedMessage.message}</p>

                                {selectedMessage.isSpam && (
                                    <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                                        <AlertTriangle aria-hidden="true" className="mt-px size-4 shrink-0" />
                                        <span>
                                            Detectado como spam (puntaje: {selectedMessage.spamScore})
                                            {selectedMessage.spamReason && ` · ${selectedMessage.spamReason}`}
                                        </span>
                                    </p>
                                )}

                                {selectedMessage.response && (
                                    <div className="mt-5 border-t border-[var(--linea)] pt-4">
                                        <p className="mb-1.5 text-[13.5px] font-semibold text-[var(--mut)]">Tu respuesta</p>
                                        <p className="whitespace-pre-wrap break-words text-[var(--txt)]">{selectedMessage.response}</p>
                                    </div>
                                )}
                            </div>

                            {/* Respuesta */}
                            <div className="border-t border-[var(--linea)] p-4">
                                <label htmlFor="contacto-respuesta" className="mb-1.5 block text-sm font-medium text-[var(--txt)]">Respuesta</label>
                                <textarea
                                    id="contacto-respuesta"
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    placeholder="Escribe una respuesta…"
                                    rows={3}
                                    className={`${CAMPO} w-full resize-none px-3 py-2.5`}
                                />
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={sendResponse}
                                        disabled={!responseText.trim() || isSending}
                                        className={`inline-flex min-h-10 max-sm:min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--acento-tinta)] transition-opacity duration-150 motion-reduce:transition-none hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`}
                                    >
                                        {isSending ? (
                                            <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                                        ) : (
                                            <Send aria-hidden="true" className="size-4" />
                                        )}
                                        {isSending ? "Guardando…" : "Guardar respuesta"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full min-h-60 flex-col items-center justify-center p-12 text-center">
                            <MailOpen aria-hidden="true" className="mb-3 size-8 text-[var(--mut)]" />
                            <p className="text-[var(--mut)]">Selecciona un mensaje para ver los detalles.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
