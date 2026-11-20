"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    ArrowRight,
    Check,
    CheckCheck,
    CheckCircle,
    User,
    Shield,
    FileText,
    AlertTriangle,
    Key,
    UserPlus,
    UserMinus,
    UserCog,
    Wrench,
    TrendingUp,
    Server,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Loader2,
} from "lucide-react";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import { BLOQUE } from "@/modules/admin/armazon/EsqueletoSeccion";

/*
 * Centro de notificaciones. «Leída» es de cada persona: la API responde `isRead` según quien mira
 * (tabla AdminNotificationRead), así que marcar aquí no cambia lo que ven los demás administradores.
 */
interface Notification {
    id: string;
    type: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    createdAt: string;
    actorName?: string;
}

/** Respuesta de GET /api/admin/notifications?page=N. */
interface PaginaNotificaciones {
    notifications: Notification[];
    filteredCount: number;
    totalPages: number;
    totalCount: number;
    unreadCount: number;
    criticalUnread: number;
    todayCount: number;
}

type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type StatusFilter = "ALL" | "READ" | "UNREAD";
type TypeFilter = "ALL" | "USER" | "SECURITY" | "QUOTATION" | "TOOL" | "SYSTEM";

const ITEMS_PER_PAGE = 15;

// Clases compartidas (tokens del tema: valen en claro y oscuro).
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]";
const BOTON = `inline-flex items-center justify-center gap-2 min-h-10 max-sm:min-h-11 px-4 rounded-lg text-sm font-semibold whitespace-nowrap transition-[color,background-color,opacity] duration-150 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed ${FOCO}`;
const PRINCIPAL = `${BOTON} bg-[var(--acento)] text-[var(--acento-tinta)] hover:opacity-90`;
const SECUNDARIO = `${BOTON} border border-[var(--linea-2)] text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)]`;
const ICONO = `grid place-items-center size-10 max-sm:size-11 shrink-0 rounded-lg text-[var(--mut)] transition-colors duration-150 motion-reduce:transition-none hover:text-[var(--txt)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed ${FOCO}`;
// Las listas nativas siguen el tema (en oscuro, su menú desplegable también es oscuro).
const ESQUEMA = "[color-scheme:dark] [:root[data-tema=claro]_&]:[color-scheme:light]";
const CAMPO = `w-full min-h-10 max-sm:min-h-11 px-3 rounded-lg bg-[var(--fondo-2)] border border-[var(--linea-2)] text-[var(--txt)] text-sm placeholder:text-[var(--mut)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acento)] ${ESQUEMA}`;
const CASILLA = "size-4 cursor-pointer accent-[var(--acento)]";

// Icon mapping
const typeIcons: Record<string, typeof Bell> = {
    USER_CREATED: UserPlus,
    USER_ROLE_CHANGED: UserCog,
    USER_SUSPENDED: UserMinus,
    USER_ACTIVATED: User,
    USER_DELETED: UserMinus,
    PASSWORD_CHANGED: Key,
    LOGIN_RATE_LIMITED: Shield,
    CONCURRENT_SESSION_DETECTED: Monitor,
    SESSION_FROM_NEW_LOCATION: Shield,
    SESSION_REVOKED: CheckCircle,
    QUOTATION_CREATED: FileText,
    QUOTATION_STATUS_CHANGED: FileText,
    TOOL_STATUS_CHANGED: Wrench,
    TOOL_USAGE_SPIKE: TrendingUp,
    SYSTEM_ERROR: AlertTriangle,
    SYSTEM_MAINTENANCE: Server,
};

// Prioridad: insignia con texto (el color acompaña, no reemplaza a la palabra).
const priorityStyles: Record<string, { badge: string; text: string }> = {
    LOW: { badge: "bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] text-[var(--mut)]", text: "Baja" },
    MEDIUM: { badge: "bg-sky-500/10 text-sky-400", text: "Media" },
    HIGH: { badge: "bg-amber-500/10 text-amber-400", text: "Alta" },
    CRITICAL: { badge: "bg-red-500/10 text-red-400", text: "Crítica" },
};
const prioridadDe = (n: Notification) => priorityStyles[n.priority] ?? priorityStyles.MEDIUM;

// Type category mapping
const typeCategories: Record<string, TypeFilter> = {
    USER_CREATED: "USER",
    USER_ROLE_CHANGED: "USER",
    USER_SUSPENDED: "USER",
    USER_ACTIVATED: "USER",
    USER_DELETED: "USER",
    PASSWORD_CHANGED: "SECURITY",
    LOGIN_RATE_LIMITED: "SECURITY",
    CONCURRENT_SESSION_DETECTED: "SECURITY",
    SESSION_FROM_NEW_LOCATION: "SECURITY",
    SESSION_REVOKED: "SECURITY",
    QUOTATION_CREATED: "QUOTATION",
    QUOTATION_STATUS_CHANGED: "QUOTATION",
    TOOL_STATUS_CHANGED: "TOOL",
    TOOL_USAGE_SPIKE: "TOOL",
    SYSTEM_ERROR: "SYSTEM",
    SYSTEM_MAINTENANCE: "SYSTEM",
};

// Time formatting
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Justo ahora";
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "Ayer";
    if (days < 7) return `hace ${days} días`;

    return date.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function humanizeMetadataKey(key: string): string {
    const labels: Record<string, string> = {
        newIP: "IP detectada",
        ip: "IP",
        newBrowser: "Navegador",
        browser: "Navegador",
        newDevice: "Dispositivo",
        device: "Dispositivo",
        existingSessions: "Sesiones adicionales",
        userId: "Usuario afectado",
        toolId: "Herramienta",
        quotationId: "Cotización",
        oldRole: "Rol anterior",
        newRole: "Rol nuevo",
        oldStatus: "Estado anterior",
        newStatus: "Estado nuevo",
        folio: "Folio",
        usageCount: "Usos",
        attempts: "Intentos",
        identifier: "Identificador",
        scheduledAt: "Programado para",
    };

    return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function formatMetadataValue(key: string, value: unknown): string {
    if (value == null) return "—";

    if (typeof value === "string") {
        if (key.toLowerCase().includes("ip")) {
            if (value.length <= 6) return value;
            return `${value.slice(0, 6)}•••`;
        }

        const parsedDate = new Date(value);
        if (!Number.isNaN(parsedDate.getTime()) && value.includes("T")) {
            return formatFullDate(parsedDate.toISOString());
        }

        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => formatMetadataValue(key, entry)).join(", ");
    }

    try {
        return JSON.stringify(value);
    } catch {
        return "Dato no disponible";
    }
}

function resolveNotificationAction(notification: Notification): { label: string; href: string } | null {
    const metadata = notification.metadata || {};
    const toolId = typeof metadata.toolId === "string" ? metadata.toolId : null;

    if (
        notification.type === "CONCURRENT_SESSION_DETECTED" ||
        notification.type === "SESSION_FROM_NEW_LOCATION" ||
        notification.type === "SESSION_REVOKED"
    ) {
        return { label: "Ver sesiones activas", href: "/admin/profile?tab=sessions" };
    }

    if (toolId) {
        return { label: "Ver herramienta", href: `/admin/herramientas/${toolId}` };
    }

    if (typeCategories[notification.type] === "USER") {
        return { label: "Abrir usuarios", href: "/admin/users" };
    }

    if (typeCategories[notification.type] === "QUOTATION") {
        return { label: "Abrir propuestas", href: "/admin/cotizaciones" };
    }

    if (typeCategories[notification.type] === "TOOL") {
        return { label: "Abrir herramientas", href: "/admin/herramientas" };
    }

    if (typeCategories[notification.type] === "SECURITY" || typeCategories[notification.type] === "SYSTEM") {
        return { label: "Ir al centro de seguridad", href: "/admin/security" };
    }

    return null;
}

function NotificationDetailsModal({
    notification,
    onClose,
    onMarkRead,
    onNavigate,
}: {
    notification: Notification;
    onClose: () => void;
    onMarkRead: (id: string) => Promise<void>;
    onNavigate: (href: string) => void;
}) {
    const Icon = typeIcons[notification.type] || Bell;
    const priority = prioridadDe(notification);
    const action = resolveNotificationAction(notification);
    const metadataEntries = Object.entries(notification.metadata || {}).filter(([, value]) => value !== null && value !== undefined);

    return (
        <DialogoFormulario titulo={notification.title} descripcion={formatFullDate(notification.createdAt)} alCerrar={onClose} ancho="max-w-2xl">
            {(cerrar) => (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <Icon size={16} aria-hidden="true" className={notification.isRead ? "text-[var(--mut)]" : "text-[var(--acento)]"} />
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priority.badge}`}>
                            Prioridad {priority.text.toLowerCase()}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${notification.isRead ? "bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] text-[var(--mut)]" : "bg-[color-mix(in_srgb,var(--acento)_14%,transparent)] text-[var(--txt)]"}`}>
                            {notification.isRead ? <Check size={12} aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-[var(--acento)]" aria-hidden="true" />}
                            {notification.isRead ? "Leída" : "Sin leer"}
                        </span>
                    </div>
                    {notification.actorName && (
                        <p className="mt-2 text-sm text-[var(--mut)]">Acción registrada por {notification.actorName}</p>
                    )}

                    <p className="mt-4 text-[15px] leading-relaxed text-[var(--txt)]">{notification.message}</p>

                    {metadataEntries.length > 0 && (
                        <section className="mt-6" aria-labelledby="notif-contexto">
                            <h3 id="notif-contexto" className="text-[15px] font-semibold text-[var(--mut)]">Contexto del evento</h3>
                            <dl className="mt-2 grid border-t border-[var(--linea)] sm:grid-cols-2 sm:gap-x-6">
                                {metadataEntries.map(([key, value]) => (
                                    <div key={key} className="border-b border-[var(--linea)] py-3">
                                        <dt className="text-[13px] text-[var(--mut)]">{humanizeMetadataKey(key)}</dt>
                                        <dd className="mt-0.5 break-words text-sm text-[var(--txt)]">{formatMetadataValue(key, value)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={cerrar} className={SECUNDARIO}>Cerrar</button>
                        {!notification.isRead && (
                            <button type="button" onClick={() => void onMarkRead(notification.id)} className={SECUNDARIO}>
                                <Check size={16} aria-hidden="true" />
                                Marcar como leída
                            </button>
                        )}
                        {action && (
                            <button type="button" onClick={() => onNavigate(action.href)} className={PRINCIPAL}>
                                {action.label}
                                <ArrowRight size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </DialogoFormulario>
    );
}

/** Una fila de la lista: casilla, punto de «sin leer», título (abre el detalle) y marcar como leída. */
function NotificationRow({
    notification,
    isSelected,
    onSelect,
    onOpen,
    onMarkRead,
}: {
    notification: Notification;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onOpen: (notification: Notification) => void;
    onMarkRead: (id: string) => void;
}) {
    const Icon = typeIcons[notification.type] || Bell;
    const priority = prioridadDe(notification);
    const leida = notification.isRead;

    return (
        <li
            className={`relative flex items-start gap-2 border-b border-[var(--linea)] px-1 py-3 transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] sm:gap-3 ${isSelected ? "bg-[color-mix(in_srgb,var(--acento)_7%,transparent)]" : ""}`}
        >
            {/* La casilla y el botón van sobre el área que abre el detalle (z-10). */}
            <label className="relative z-10 -my-1 grid size-10 shrink-0 cursor-pointer place-items-center max-sm:size-11">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(notification.id)}
                    aria-label={`Seleccionar «${notification.title}»`}
                    className={CASILLA}
                />
            </label>
            <Icon size={18} aria-hidden="true" className={`mt-1 shrink-0 ${leida ? "text-[var(--mut)]" : "text-[var(--acento)]"}`} />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <h2 className="min-w-0 flex-1 text-[15px] leading-snug">
                        <button
                            type="button"
                            onClick={() => onOpen(notification)}
                            className={`text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--acento)] ${leida ? "font-medium text-[var(--mut)]" : "font-semibold text-[var(--txt)]"}`}
                        >
                            {!leida && <span className="mr-2 inline-block size-2 rounded-full bg-[var(--acento)] align-middle" aria-hidden="true" />}
                            {!leida && <span className="sr-only">Sin leer: </span>}
                            {notification.title}
                        </button>
                    </h2>
                    <time dateTime={notification.createdAt} title={formatFullDate(notification.createdAt)} className="whitespace-nowrap text-[13px] tabular-nums text-[var(--mut)]">
                        {formatDate(notification.createdAt)}
                    </time>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-[var(--mut)]">{notification.message}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--mut)]">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priority.badge}`}>
                        Prioridad {priority.text.toLowerCase()}
                    </span>
                    {notification.actorName && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                            <User size={14} aria-hidden="true" />
                            <span className="truncate">{notification.actorName}</span>
                        </span>
                    )}
                </div>
            </div>
            {!leida && (
                <button
                    type="button"
                    onClick={() => onMarkRead(notification.id)}
                    aria-label={`Marcar «${notification.title}» como leída`}
                    title="Marcar como leída"
                    className={`relative z-10 -my-1 ${ICONO}`}
                >
                    <Check size={16} aria-hidden="true" />
                </button>
            )}
        </li>
    );
}

/** Cifra de la franja de arriba; si trae `alternar`, es un botón que filtra la lista (aria-pressed). */
function Cifra({ valor, etiqueta, tono, activo, alternar }: {
    valor: number;
    etiqueta: string;
    tono?: string;
    activo?: boolean;
    alternar?: () => void;
}) {
    const contenido = (
        <>
            <span className={`block text-[28px] font-bold leading-tight tracking-tight tabular-nums ${tono ?? "text-[var(--txt)]"}`}>{valor}</span>
            <span className="flex items-center gap-1 text-[13.5px] text-[var(--mut)]">
                {etiqueta}
                {activo && <Check size={14} aria-hidden="true" className="text-[var(--acento)]" />}
            </span>
        </>
    );
    const caja = "flex min-h-[84px] flex-col justify-center border-[var(--linea)] px-4 py-3 max-md:[&:nth-child(even)]:border-l max-md:[&:nth-child(n+3)]:border-t md:[&:not(:first-child)]:border-l";
    if (!alternar) return <div className={caja}>{contenido}</div>;
    return (
        <button
            type="button"
            aria-pressed={activo}
            onClick={alternar}
            title={activo ? "Quitar este filtro" : "Ver solo estas"}
            className={`${caja} text-left transition-colors duration-150 motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--acento)_9%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]`}
        >
            {contenido}
        </button>
    );
}

/** Lista nativa con su etiqueta visible. */
function Filtro<T extends string>({ id, etiqueta, valor, alCambiar, opciones }: {
    id: string;
    etiqueta: string;
    valor: T;
    alCambiar: (v: T) => void;
    opciones: { value: T; label: string }[];
}) {
    return (
        <div className="min-w-0">
            <label htmlFor={id} className="mb-1 block text-[13px] text-[var(--mut)]">{etiqueta}</label>
            <select
                id={id}
                value={valor}
                onChange={(e) => alCambiar(e.target.value as T)}
                className={`${CAMPO} cursor-pointer pr-8 md:min-w-[140px]`}
            >
                {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

export default function NotificationsPageClient() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Cifras contadas en el servidor sobre todas las notificaciones visibles, no solo sobre la página cargada.
    const [stats, setStats] = useState({ total: 0, unread: 0, critical: 0, today: 0 });
    const [filteredCount, setFilteredCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const unreadCount = stats.unread;

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [recarga, setRecarga] = useState(0);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isMarkingRead, setIsMarkingRead] = useState(false);
    const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

    // La búsqueda va al servidor 300 ms después de dejar de escribir.
    useEffect(() => {
        const t = setTimeout(() => setBusqueda(searchQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [busqueda, priorityFilter, statusFilter, typeFilter]);

    // Una página filtrada en el servidor; si cambian los filtros a medio camino, la respuesta vieja se descarta.
    useEffect(() => {
        const control = new AbortController();
        const params = new URLSearchParams({ page: String(currentPage), limit: String(ITEMS_PER_PAGE) });
        if (busqueda) params.set("q", busqueda);
        if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter === "READ" ? "read" : "unread");
        if (typeFilter !== "ALL") params.set("category", typeFilter);

        setLoading(true);
        setError(null);
        fetch(`/api/admin/notifications?${params}`, { signal: control.signal, cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: PaginaNotificaciones = await res.json();
                setNotifications(data.notifications);
                setFilteredCount(data.filteredCount);
                setTotalPages(data.totalPages);
                setStats({ total: data.totalCount, unread: data.unreadCount, critical: data.criticalUnread, today: data.todayCount });
                // Si la página quedó vacía (por ejemplo, tras marcar leídas con el filtro «Sin leer»), se vuelve a la última.
                if (data.notifications.length === 0 && currentPage > data.totalPages) setCurrentPage(data.totalPages);
                setLoading(false);
            })
            .catch((e: unknown) => {
                if (e instanceof DOMException && e.name === "AbortError") return;
                setError("No se pudieron cargar las notificaciones. Vuelve a intentarlo.");
                setLoading(false);
            });
        return () => control.abort();
    }, [currentPage, busqueda, priorityFilter, statusFilter, typeFilter, recarga]);

    const paginatedNotifications = notifications;

    // Selection handlers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === paginatedNotifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedNotifications.map(n => n.id)));
        }
    };

    // Marca en pantalla sin volver a pedir la página.
    const marcarEnPantalla = (ids: string[]) => {
        const cambiadas = notifications.filter(n => ids.includes(n.id) && !n.isRead);
        setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n));
        setActiveNotification(prev => prev && ids.includes(prev.id) ? { ...prev, isRead: true } : prev);
        setStats(prev => ({
            ...prev,
            unread: Math.max(0, prev.unread - cambiadas.length),
            critical: Math.max(0, prev.critical - cambiadas.filter(n => n.priority === "CRITICAL").length),
        }));
    };

    // Mark as read handlers
    const markAsRead = async (notificationId: string) => {
        try {
            const res = await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            marcarEnPantalla([notificationId]);
        } catch {
            setError("No se pudo marcar como leída.");
        }
    };

    const openNotificationDetails = (notification: Notification) => {
        setActiveNotification(notification);

        if (!notification.isRead) {
            void markAsRead(notification.id);
        }
    };

    const markSelectedAsRead = async () => {
        setIsMarkingRead(true);
        try {
            const unreadSelected = Array.from(selectedIds).filter(id =>
                notifications.find(n => n.id === id && !n.isRead)
            );
            if (unreadSelected.length > 0) {
                const res = await fetch("/api/admin/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notificationIds: unreadSelected }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                marcarEnPantalla(unreadSelected);
            }
            setSelectedIds(new Set());
            if (statusFilter === "UNREAD") setRecarga(n => n + 1);
        } catch {
            setError("No se pudieron marcar las seleccionadas.");
        } finally {
            setIsMarkingRead(false);
        }
    };

    const markAllAsRead = async () => {
        // «Leída» es de cada persona: esto solo cambia lo que ve quien lo hace.
        if (!(await confirmar({ titulo: "¿Marcar todas como leídas?", detalle: "Solo cambia para ti: los demás administradores las siguen viendo como estaban.", accion: "Marcar todas" }))) return;
        try {
            const res = await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setRecarga(n => n + 1);
        } catch {
            setError("No se pudieron marcar todas como leídas.");
        }
    };

    const hasActiveFilters = searchQuery || priorityFilter !== "ALL" || statusFilter !== "ALL" || typeFilter !== "ALL";

    // Detect mobile view (solo para cuántos números de página caben)
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const todasMarcadas = paginatedNotifications.length > 0 && selectedIds.size === paginatedNotifications.length;
    const unreadSelectedCount = Array.from(selectedIds).filter(id =>
        notifications.find(n => n.id === id && !n.isRead)
    ).length;
    const allSelectedRead = unreadSelectedCount === 0;

    return (
        <div className="max-w-[1180px]">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--txt)] sm:text-[28px]">Notificaciones</h1>
                    <p className="mt-1 max-w-[60ch] text-[15px] text-[var(--mut)]">
                        Avisos de cuentas, seguridad, propuestas y herramientas. Lo que marcas como leído cambia solo para ti.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button type="button" onClick={markAllAsRead} className={`${SECUNDARIO} self-start sm:self-auto`}>
                        <CheckCheck size={16} aria-hidden="true" />
                        Marcar todas como leídas
                    </button>
                )}
            </header>

            {/* Cifras: «Sin leer» y «Críticas sin leer» también sirven de filtro rápido. */}
            <div role="group" aria-label="Cifras de notificaciones" className="mt-8 grid grid-cols-2 border-y border-[var(--linea)] md:grid-cols-4">
                <Cifra valor={stats.total} etiqueta="En total" />
                <Cifra
                    valor={stats.unread}
                    etiqueta="Sin leer"
                    activo={statusFilter === "UNREAD"}
                    alternar={() => setStatusFilter(statusFilter === "UNREAD" ? "ALL" : "UNREAD")}
                />
                <Cifra
                    valor={stats.critical}
                    etiqueta="Críticas sin leer"
                    tono={stats.critical > 0 ? "text-red-400" : undefined}
                    activo={priorityFilter === "CRITICAL"}
                    alternar={() => setPriorityFilter(priorityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                />
                <Cifra valor={stats.today} etiqueta="Hoy" />
            </div>

            {/* Búsqueda y filtros */}
            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
                <div className="min-w-0 flex-1">
                    <label htmlFor="notif-buscar" className="mb-1 block text-[13px] text-[var(--mut)]">Buscar en título, mensaje o autor</label>
                    <div className="relative">
                        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" />
                        <input
                            id="notif-buscar"
                            type="search"
                            placeholder="Buscar…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${CAMPO} pl-9 pr-11 [&::-webkit-search-cancel-button]:hidden`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Borrar búsqueda"
                                onClick={() => setSearchQuery("")}
                                className={`absolute right-0.5 top-1/2 -translate-y-1/2 ${ICONO} max-sm:size-10`}
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 md:flex">
                    <Filtro
                        id="notif-prioridad"
                        etiqueta="Prioridad"
                        valor={priorityFilter}
                        alCambiar={setPriorityFilter}
                        opciones={[
                            { value: "ALL", label: "Todas" },
                            { value: "CRITICAL", label: "Crítica" },
                            { value: "HIGH", label: "Alta" },
                            { value: "MEDIUM", label: "Media" },
                            { value: "LOW", label: "Baja" },
                        ]}
                    />
                    <Filtro
                        id="notif-estado"
                        etiqueta="Estado"
                        valor={statusFilter}
                        alCambiar={setStatusFilter}
                        opciones={[
                            { value: "ALL", label: "Todas" },
                            { value: "UNREAD", label: "Sin leer" },
                            { value: "READ", label: "Leídas" },
                        ]}
                    />
                    <Filtro
                        id="notif-tipo"
                        etiqueta="Tipo"
                        valor={typeFilter}
                        alCambiar={setTypeFilter}
                        opciones={[
                            { value: "ALL", label: "Todos" },
                            { value: "USER", label: "Usuarios" },
                            { value: "SECURITY", label: "Seguridad" },
                            { value: "QUOTATION", label: "Propuestas" },
                            { value: "TOOL", label: "Herramientas" },
                            { value: "SYSTEM", label: "Sistema" },
                        ]}
                    />
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery("");
                            setPriorityFilter("ALL");
                            setStatusFilter("ALL");
                            setTypeFilter("ALL");
                        }}
                        className={`${SECUNDARIO} self-start md:self-auto`}
                    >
                        <X size={16} aria-hidden="true" />
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Selección y acciones en lote */}
            <div className="mt-6 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 pb-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[var(--txt)] max-sm:min-h-11">
                    <input
                        type="checkbox"
                        checked={todasMarcadas}
                        ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && !todasMarcadas; }}
                        onChange={selectAll}
                        disabled={paginatedNotifications.length === 0}
                        className={CASILLA}
                    />
                    Seleccionar todo
                </label>
                <p className="text-sm text-[var(--mut)]" aria-live="polite">
                    <span className="font-semibold tabular-nums text-[var(--txt)]">{filteredCount}</span> {filteredCount === 1 ? "notificación" : "notificaciones"}
                </p>
                {selectedIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                        <span className="text-sm text-[var(--txt)]">
                            <span className="font-semibold tabular-nums">{selectedIds.size}</span> seleccionada{selectedIds.size !== 1 ? "s" : ""}
                        </span>
                        {allSelectedRead ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                                <CheckCheck size={16} aria-hidden="true" />
                                Ya leída{selectedIds.size !== 1 ? "s" : ""}
                            </span>
                        ) : (
                            <button type="button" onClick={markSelectedAsRead} disabled={isMarkingRead} className={PRINCIPAL}>
                                {isMarkingRead ? (
                                    <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                                ) : (
                                    <CheckCircle size={16} aria-hidden="true" />
                                )}
                                Marcar como leída{unreadSelectedCount !== 1 ? "s" : ""}
                            </button>
                        )}
                        <button type="button" aria-label="Quitar la selección" onClick={() => setSelectedIds(new Set())} className={ICONO}>
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}

            {/* Lista */}
            <div aria-busy={loading}>
                {loading ? (
                    <div role="status">
                        <span className="sr-only">Cargando notificaciones…</span>
                        <ul aria-hidden="true" className="animate-pulse border-t border-[var(--linea)] motion-reduce:animate-none">
                            {Array.from({ length: 6 }, (_, i) => (
                                <li key={i} className="flex gap-3 border-b border-[var(--linea)] px-1 py-4">
                                    <div className={`${BLOQUE} mt-1 size-4 shrink-0`} />
                                    <div className="min-w-0 flex-1">
                                        <div className={`${BLOQUE} h-4 ${i % 2 ? "w-1/3" : "w-2/5"}`} />
                                        <div className={`${BLOQUE} mt-2 h-3 ${i % 3 ? "w-3/4" : "w-2/3"}`} />
                                        <div className={`${BLOQUE} mt-2 h-3 w-20`} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : paginatedNotifications.length === 0 ? (
                    <div className="flex flex-col items-center border-y border-[var(--linea)] px-4 py-14 text-center">
                        {hasActiveFilters ? (
                            <Search size={20} aria-hidden="true" className="text-[var(--mut)]" />
                        ) : (
                            <Bell size={20} aria-hidden="true" className="text-[var(--mut)]" />
                        )}
                        <h2 className="mt-3 text-base font-semibold text-[var(--txt)]">
                            {hasActiveFilters ? "Sin resultados" : "No hay notificaciones"}
                        </h2>
                        <p className="mt-1 max-w-xs text-sm text-[var(--mut)]">
                            {hasActiveFilters
                                ? "Prueba con otra búsqueda o limpia los filtros."
                                : "Lo nuevo aparecerá aquí."
                            }
                        </p>
                    </div>
                ) : (
                    <ul className="border-t border-[var(--linea)]">
                        {paginatedNotifications.map((notification) => (
                            <NotificationRow
                                key={notification.id}
                                notification={notification}
                                isSelected={selectedIds.has(notification.id)}
                                onSelect={toggleSelect}
                                onOpen={openNotificationDetails}
                                onMarkRead={markAsRead}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <nav aria-label="Páginas" className="mt-6 flex items-center justify-center gap-1">
                    <button
                        type="button"
                        aria-label="Página anterior"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={ICONO}
                    >
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                                // En celular caben menos números.
                                if (isMobile) {
                                    return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                                }
                                return Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
                            })
                            .map((page, idx, arr) => {
                                const prev = arr[idx - 1];
                                const showEllipsis = prev && page - prev > 1;

                                return (
                                    <div key={page} className="flex items-center">
                                        {showEllipsis && (
                                            <span className="px-1 text-sm text-[var(--mut)]" aria-hidden="true">…</span>
                                        )}
                                        <button
                                            type="button"
                                            aria-label={`Página ${page}`}
                                            aria-current={page === currentPage ? "page" : undefined}
                                            onClick={() => setCurrentPage(page)}
                                            className={`size-10 rounded-lg text-sm font-medium tabular-nums transition-colors duration-150 motion-reduce:transition-none max-sm:size-11 ${FOCO} ${page === currentPage
                                                ? "bg-[var(--acento)] text-[var(--acento-tinta)]"
                                                : "text-[var(--mut)] hover:bg-[color-mix(in_srgb,var(--txt)_6%,transparent)] hover:text-[var(--txt)]"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    </div>
                                );
                            })
                        }
                    </div>

                    <button
                        type="button"
                        aria-label="Página siguiente"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={ICONO}
                    >
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </nav>
            )}

            {activeNotification && (
                <NotificationDetailsModal
                    key={activeNotification.id}
                    notification={activeNotification}
                    onClose={() => setActiveNotification(null)}
                    onMarkRead={markAsRead}
                    onNavigate={(href) => {
                        setActiveNotification(null);
                        router.push(href);
                    }}
                />
            )}
        </div>
    );
}
