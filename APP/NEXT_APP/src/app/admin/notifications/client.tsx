"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
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
    Filter,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Archive,
    Clock,
    Circle,
    Inbox,
    Sparkles,
    Loader2,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { NotificationsPageSkeleton } from "@/components/ui/Skeleton";
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

type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type StatusFilter = "ALL" | "READ" | "UNREAD";
type TypeFilter = "ALL" | "USER" | "SECURITY" | "QUOTATION" | "TOOL" | "SYSTEM";

const ITEMS_PER_PAGE = 15;

// Icon mapping
const typeIcons: Record<string, typeof Bell> = {
    USER_CREATED: UserPlus,
    USER_ROLE_CHANGED: UserCog,
    USER_SUSPENDED: UserMinus,
    USER_ACTIVATED: User,
    USER_DELETED: UserMinus,
    PASSWORD_CHANGED: Key,
    LOGIN_RATE_LIMITED: Shield,
    QUOTATION_CREATED: FileText,
    QUOTATION_STATUS_CHANGED: FileText,
    TOOL_STATUS_CHANGED: Wrench,
    TOOL_USAGE_SPIKE: TrendingUp,
    SYSTEM_ERROR: AlertTriangle,
    SYSTEM_MAINTENANCE: Server,
};

// Priority styles
const priorityStyles: Record<string, { border: string; bg: string; badge: string; text: string }> = {
    LOW: {
        border: "border-l-neutral-500",
        bg: "bg-neutral-500/5",
        badge: "bg-neutral-500/20 text-neutral-400",
        text: "Baja",
    },
    MEDIUM: {
        border: "border-l-blue-500",
        bg: "bg-blue-500/5",
        badge: "bg-blue-500/20 text-blue-400",
        text: "Media",
    },
    HIGH: {
        border: "border-l-amber-500",
        bg: "bg-amber-500/5",
        badge: "bg-amber-500/20 text-amber-400",
        text: "Alta",
    },
    CRITICAL: {
        border: "border-l-red-500",
        bg: "bg-red-500/5",
        badge: "bg-red-500/20 text-red-400",
        text: "Crítica",
    },
};

// Type category mapping
const typeCategories: Record<string, TypeFilter> = {
    USER_CREATED: "USER",
    USER_ROLE_CHANGED: "USER",
    USER_SUSPENDED: "USER",
    USER_ACTIVATED: "USER",
    USER_DELETED: "USER",
    PASSWORD_CHANGED: "SECURITY",
    LOGIN_RATE_LIMITED: "SECURITY",
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

// Notification Card Component
function NotificationCard({
    notification,
    isSelected,
    onSelect,
    onMarkRead,
    compact = false,
}: {
    notification: Notification;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onMarkRead: (id: string) => void;
    compact?: boolean;
}) {
    const Icon = typeIcons[notification.type] || Bell;
    const priority = priorityStyles[notification.priority];

    if (compact) {
        // Compact view for mobile
        return (
            <motion.div
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`
                    relative p-3 rounded-xl border-l-3 transition-all active:scale-[0.98]
                    ${priority.border}
                    ${notification.isRead ? "bg-white/[0.01]" : priority.bg}
                    ${isSelected ? "ring-1 ring-accent-1/50" : ""}
                `}
                onClick={() => !notification.isRead && onMarkRead(notification.id)}
            >
                <div className="flex items-start gap-3">
                    <div className={`
                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                        ${notification.isRead ? "bg-white/5" : "bg-white/10"}
                    `}>
                        <Icon className={`w-4 h-4 ${notification.isRead ? "text-neutral-500" : "text-accent-1"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className={`text-sm font-medium truncate ${notification.isRead ? "text-neutral-400" : "text-white"}`}>
                                {notification.title}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {!notification.isRead && <span className="w-1.5 h-1.5 rounded-full bg-accent-1" />}
                                <span className="text-[10px] text-neutral-500">{formatDate(notification.createdAt)}</span>
                            </div>
                        </div>
                        <p className={`text-xs line-clamp-1 mt-0.5 ${notification.isRead ? "text-neutral-500" : "text-neutral-400"}`}>
                            {notification.message}
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Full card view for desktop
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`
                relative p-4 rounded-xl border-l-4 transition-all cursor-pointer group
                ${priority.border}
                ${notification.isRead ? "bg-white/[0.02]" : priority.bg}
                ${isSelected ? "ring-2 ring-accent-1/50 bg-accent-1/5" : "hover:bg-white/[0.04]"}
            `}
            onClick={() => onSelect(notification.id)}
        >
            <div className="flex gap-3 sm:gap-4">
                {/* Selection Checkbox - Hidden on mobile */}
                <div className="hidden sm:flex items-start pt-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(notification.id);
                        }}
                        className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                            ${isSelected
                                ? "bg-accent-1 border-accent-1"
                                : "border-white/20 hover:border-white/40"
                            }
                        `}
                    >
                        {isSelected && <Check size={12} className="text-black" />}
                    </button>
                </div>

                {/* Icon */}
                <div className={`
                    w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
                    ${notification.isRead ? "bg-white/5" : "bg-white/10"}
                `}>
                    <Icon className={`w-5 h-5 ${notification.isRead ? "text-neutral-500" : "text-accent-1"}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className={`text-sm sm:text-base font-semibold truncate ${notification.isRead ? "text-neutral-400" : "text-white"}`}>
                                    {notification.title}
                                </h3>
                                {!notification.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-accent-1 shrink-0" />
                                )}
                            </div>
                            <p className={`text-xs sm:text-sm line-clamp-2 ${notification.isRead ? "text-neutral-500" : "text-neutral-300"}`}>
                                {notification.message}
                            </p>
                        </div>

                        {/* Meta info - Stacked on mobile, inline on desktop */}
                        <div className="flex flex-col items-end gap-1 sm:gap-1.5 shrink-0">
                            <span className="text-[10px] sm:text-xs text-neutral-500">{formatDate(notification.createdAt)}</span>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${priority.badge}`}>
                                {priority.text}
                            </span>
                        </div>
                    </div>

                    {/* Footer info - Hidden on very small screens */}
                    <div className="hidden xs:flex items-center gap-3 mt-2">
                        {notification.actorName && (
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                <User size={11} />
                                {notification.actorName}
                            </span>
                        )}
                        <span className="text-[10px] text-neutral-600 hidden sm:inline" title={formatFullDate(notification.createdAt)}>
                            <Clock size={10} className="inline mr-1" />
                            {formatFullDate(notification.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Quick Actions (on hover) - Desktop only */}
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-1">
                    {!notification.isRead && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkRead(notification.id);
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Marcar como leída"
                        >
                            <Check size={14} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Stats Pill Component - Compact inline stats
function StatsPill({ icon: Icon, value, label, color, active, onClick }: {
    icon: typeof Bell;
    value: number;
    label: string;
    color: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-2 rounded-xl transition-all
                ${active
                    ? "bg-accent-1/20 border-accent-1/30"
                    : "bg-white/[0.03] hover:bg-white/[0.06] border-white/5"
                }
                border
            `}
        >
            <Icon size={16} className={color} />
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-xs text-neutral-400 hidden sm:inline">{label}</span>
        </motion.button>
    );
}

export default function NotificationsPageClient() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isMarkingRead, setIsMarkingRead] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/notifications?limit=50");
            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setNotifications(data.notifications);
            setTotalCount(data.totalCount);
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Filtered notifications
    const filteredNotifications = useMemo(() => {
        let result = notifications;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.message.toLowerCase().includes(query) ||
                n.actorName?.toLowerCase().includes(query)
            );
        }

        // Priority filter
        if (priorityFilter !== "ALL") {
            result = result.filter(n => n.priority === priorityFilter);
        }

        // Status filter
        if (statusFilter !== "ALL") {
            result = result.filter(n => statusFilter === "READ" ? n.isRead : !n.isRead);
        }

        // Type filter
        if (typeFilter !== "ALL") {
            result = result.filter(n => typeCategories[n.type] === typeFilter);
        }

        return result;
    }, [notifications, searchQuery, priorityFilter, statusFilter, typeFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredNotifications.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredNotifications, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchQuery, priorityFilter, statusFilter, typeFilter]);

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

    // Mark as read handlers
    const markAsRead = async (notificationId: string) => {
        try {
            await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId }),
            });

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markSelectedAsRead = async () => {
        setIsMarkingRead(true);
        try {
            const unreadSelected = Array.from(selectedIds).filter(id =>
                notifications.find(n => n.id === id && !n.isRead)
            );

            for (const id of unreadSelected) {
                await markAsRead(id);
            }
            setSelectedIds(new Set());
        } finally {
            setIsMarkingRead(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    // Stats
    const stats = useMemo(() => ({
        total: totalCount,
        unread: unreadCount,
        critical: notifications.filter(n => n.priority === "CRITICAL" && !n.isRead).length,
        today: notifications.filter(n => {
            const date = new Date(n.createdAt);
            const today = new Date();
            return date.toDateString() === today.toDateString();
        }).length,
    }), [notifications, totalCount, unreadCount]);

    const hasActiveFilters = searchQuery || priorityFilter !== "ALL" || statusFilter !== "ALL" || typeFilter !== "ALL";

    // Detect mobile view
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header with integrated stats */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent-1/10">
                            <Bell className="w-5 h-5 text-accent-1" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white">Notificaciones</h1>
                            <p className="text-xs sm:text-sm text-neutral-500">Centro de actividad</p>
                        </div>
                    </div>

                    {/* Action button */}
                    {unreadCount > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={markAllAsRead}
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                        >
                            <CheckCheck size={16} />
                            <span className="sm:hidden">Leer todas</span>
                            <span className="hidden sm:inline">Marcar todas como leídas</span>
                        </motion.button>
                    )}
                </div>

                {/* Stats Pills - Horizontal scrollable on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                    <StatsPill
                        icon={Inbox}
                        value={stats.total}
                        label="Total"
                        color="text-neutral-400"
                    />
                    <StatsPill
                        icon={Circle}
                        value={stats.unread}
                        label="Sin leer"
                        color="text-accent-1"
                        active={statusFilter === "UNREAD"}
                        onClick={() => setStatusFilter(statusFilter === "UNREAD" ? "ALL" : "UNREAD")}
                    />
                    <StatsPill
                        icon={AlertTriangle}
                        value={stats.critical}
                        label="Críticas"
                        color="text-red-400"
                        active={priorityFilter === "CRITICAL"}
                        onClick={() => setPriorityFilter(priorityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                    />
                    <StatsPill
                        icon={Sparkles}
                        value={stats.today}
                        label="Hoy"
                        color="text-blue-400"
                    />
                </div>
            </div>

            {/* Search and Filters - More compact */}
            <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:border-accent-1/50 focus:bg-white/[0.05] outline-none transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filter chips - Horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                    <Select
                        value={priorityFilter}
                        onChange={(v) => setPriorityFilter(v as PriorityFilter)}
                        options={[
                            { value: "ALL", label: "Prioridad" },
                            { value: "CRITICAL", label: "🔴 Crítica" },
                            { value: "HIGH", label: "🟠 Alta" },
                            { value: "MEDIUM", label: "🔵 Media" },
                            { value: "LOW", label: "⚪ Baja" },
                        ]}
                        className="!py-2 !text-xs !min-w-[100px]"
                    />
                    <Select
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v as StatusFilter)}
                        options={[
                            { value: "ALL", label: "Estado" },
                            { value: "UNREAD", label: "Sin leer" },
                            { value: "READ", label: "Leídas" },
                        ]}
                        className="!py-2 !text-xs !min-w-[90px]"
                    />
                    <Select
                        value={typeFilter}
                        onChange={(v) => setTypeFilter(v as TypeFilter)}
                        options={[
                            { value: "ALL", label: "Tipo" },
                            { value: "USER", label: "👤 Usuarios" },
                            { value: "SECURITY", label: "🔒 Seguridad" },
                            { value: "QUOTATION", label: "📄 Cotizaciones" },
                            { value: "TOOL", label: "🔧 Herramientas" },
                            { value: "SYSTEM", label: "⚙️ Sistema" },
                        ]}
                        className="!py-2 !text-xs !min-w-[80px]"
                    />
                    {hasActiveFilters && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => {
                                setSearchQuery("");
                                setPriorityFilter("ALL");
                                setStatusFilter("ALL");
                                setTypeFilter("ALL");
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium whitespace-nowrap"
                        >
                            <X size={12} />
                            Limpiar
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Results Summary - Desktop only */}
            <div className="hidden sm:flex items-center justify-between text-sm px-1">
                <div className="flex items-center gap-4">
                    <button
                        onClick={selectAll}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        <div className={`
                            w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                            ${selectedIds.size === paginatedNotifications.length && paginatedNotifications.length > 0
                                ? "bg-accent-1 border-accent-1"
                                : "border-white/20"
                            }
                        `}>
                            {selectedIds.size === paginatedNotifications.length && paginatedNotifications.length > 0 && (
                                <Check size={10} className="text-black" />
                            )}
                        </div>
                        <span className="text-xs">Seleccionar todo</span>
                    </button>
                    <span className="text-neutral-600">|</span>
                    <span className="text-neutral-500 text-xs">
                        <span className="text-white font-medium">{filteredNotifications.length}</span> notificaciones
                    </span>
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-2 sm:space-y-3">
                {loading ? (
                    <NotificationsPageSkeleton />
                ) : paginatedNotifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4"
                    >
                        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-3 sm:mb-4">
                            {hasActiveFilters ? (
                                <Search size={24} className="sm:w-8 sm:h-8 text-neutral-600" />
                            ) : (
                                <Bell size={24} className="sm:w-8 sm:h-8 text-neutral-600" />
                            )}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
                            {hasActiveFilters ? "Sin resultados" : "No hay notificaciones"}
                        </h3>
                        <p className="text-neutral-400 text-xs sm:text-sm max-w-xs">
                            {hasActiveFilters
                                ? "Intenta ajustar los filtros de búsqueda"
                                : "Las nuevas actividades aparecerán aquí"
                            }
                        </p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {paginatedNotifications.map((notification, idx) => (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                            >
                                <NotificationCard
                                    notification={notification}
                                    isSelected={selectedIds.has(notification.id)}
                                    onSelect={toggleSelect}
                                    onMarkRead={markAsRead}
                                    compact={isMobile}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Pagination - Simplified for mobile */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 sm:gap-2 pt-2 sm:pt-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                    </button>

                    <div className="flex items-center gap-0.5 sm:gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                                // On mobile, show fewer pages
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
                                            <span className="text-neutral-600 px-1 sm:px-2 text-xs">...</span>
                                        )}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${page === currentPage
                                                ? "bg-accent-1 text-black"
                                                : "text-neutral-400 hover:text-white hover:bg-white/10"
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
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
            )}

            {/* Floating Bulk Actions Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (() => {
                    // Count how many selected notifications are unread
                    const unreadSelectedCount = Array.from(selectedIds).filter(id =>
                        notifications.find(n => n.id === id && !n.isRead)
                    ).length;
                    const allSelectedRead = unreadSelectedCount === 0;

                    return (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                        >
                            <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-accent-1/20 flex items-center justify-center">
                                        <span className="text-accent-1 font-bold text-sm">{selectedIds.size}</span>
                                    </div>
                                    <span className="text-sm text-neutral-300 hidden sm:inline">
                                        seleccionada{selectedIds.size !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {!allSelectedRead && (
                                    <>
                                        <div className="w-px h-6 bg-white/10" />

                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={markSelectedAsRead}
                                            disabled={isMarkingRead}
                                            className="flex items-center gap-2 px-4 py-2 bg-accent-1 text-black rounded-full text-sm font-medium hover:bg-accent-1/90 transition-colors disabled:opacity-50"
                                        >
                                            {isMarkingRead ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <Loader2 size={14} />
                                                </motion.div>
                                            ) : (
                                                <CheckCircle size={14} />
                                            )}
                                            <span className="hidden sm:inline">
                                                Marcar como leída{unreadSelectedCount !== 1 ? 's' : ''}
                                            </span>
                                            <span className="sm:hidden">Leer</span>
                                        </motion.button>
                                    </>
                                )}

                                {allSelectedRead && (
                                    <>
                                        <div className="w-px h-6 bg-white/10" />
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm">
                                            <CheckCheck size={14} />
                                            <span className="hidden sm:inline">Ya leída{selectedIds.size !== 1 ? 's' : ''}</span>
                                        </div>
                                    </>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedIds(new Set())}
                                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={16} />
                                </motion.button>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}
