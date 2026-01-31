"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    X,
    CheckCheck,
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
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

// Types
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

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadCountChange?: (count: number) => void;
}

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

// Priority colors
const priorityColors: Record<string, string> = {
    LOW: "border-l-neutral-500",
    MEDIUM: "border-l-blue-500",
    HIGH: "border-l-amber-500",
    CRITICAL: "border-l-red-500",
};

const priorityBgColors: Record<string, string> = {
    LOW: "bg-neutral-500/10",
    MEDIUM: "bg-blue-500/10",
    HIGH: "bg-amber-500/10",
    CRITICAL: "bg-red-500/10",
};

// Time ago helper
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `hace ${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} días`;

    return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short"
    });
}

// Notification Item Component
function NotificationItem({
    notification,
    onMarkRead,
}: {
    notification: Notification;
    onMarkRead: (id: string) => void;
}) {
    const Icon = typeIcons[notification.type] || Bell;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`
                relative flex gap-3 p-4 border-l-4 transition-all cursor-pointer
                ${priorityColors[notification.priority]}
                ${notification.isRead
                    ? "bg-transparent opacity-60"
                    : priorityBgColors[notification.priority]
                }
                hover:bg-white/5
            `}
            onClick={() => !notification.isRead && onMarkRead(notification.id)}
        >
            {/* Icon */}
            <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${notification.isRead ? "bg-white/5" : "bg-white/10"}
            `}>
                <Icon className={`w-5 h-5 ${notification.isRead ? "text-neutral-500" : "text-accent-1"}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-medium truncate ${notification.isRead ? "text-neutral-400" : "text-white"}`}>
                        {notification.title}
                    </h4>
                    <span className="text-xs text-neutral-500 shrink-0">
                        {timeAgo(notification.createdAt)}
                    </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                    {notification.message}
                </p>
                {notification.actorName && (
                    <p className="text-xs text-neutral-500 mt-1">
                        por {notification.actorName}
                    </p>
                )}
            </div>

            {/* Unread indicator */}
            {!notification.isRead && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-accent-1" />
            )}
        </motion.div>
    );
}

// Main Panel Component
export function NotificationPanel({ isOpen, onClose, onUnreadCountChange }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/notifications?limit=20");
            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
            onUnreadCountChange?.(data.unreadCount);
        } catch (error) {
            console.error("Notification fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [onUnreadCountChange]);

    // Initial fetch and polling
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // Mark single notification as read
    const handleMarkRead = async (notificationId: string) => {
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
            onUnreadCountChange?.(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    // Mark all as read
    const handleMarkAllRead = async () => {
        try {
            await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            onUnreadCountChange?.(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        }

        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[#0F1724] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-accent-1" />
                            <h3 className="font-semibold text-white">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-accent-1 text-black">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Marcar todas como leídas"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="w-6 h-6 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                                    <Bell className="w-6 h-6 text-neutral-500" />
                                </div>
                                <p className="text-neutral-400 text-sm">No hay notificaciones</p>
                                <p className="text-neutral-500 text-xs mt-1">Las nuevas actividades aparecerán aquí</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                <AnimatePresence mode="popLayout">
                                    {notifications.map(notification => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkRead={handleMarkRead}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-white/10">
                            <Link
                                href="/admin/notifications"
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-accent-1 hover:text-accent-2 transition-all text-sm font-medium group"
                            >
                                <span>Ver todas las notificaciones</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Notification Button with Badge
export function NotificationButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count on mount and poll every 30s
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch("/api/admin/notifications?limit=1&unread=true");
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.unreadCount);
                }
            } catch {
                // Silently fail
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-accent-2 text-black"
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                )}
            </motion.button>

            <NotificationPanel
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onUnreadCountChange={setUnreadCount}
            />
        </div>
    );
}
