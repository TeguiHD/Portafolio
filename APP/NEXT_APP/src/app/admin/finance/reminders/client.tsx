"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { Bell, AlertTriangle, Target, CalendarClock, ClipboardList, RefreshCw, Check, ChevronRight } from "lucide-react";

interface Reminder {
    id: string;
    type: "daily_log" | "budget_check" | "bill_due" | "goal_update" | "weekly_review";
    title: string;
    message: string;
    scheduledFor: string;
    isActive: boolean;
    frequency: "daily" | "weekly" | "monthly" | "once";
}

interface RecurringPayment {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    nextDueDate: string | null;
    isActive: boolean;
    category?: {
        name: string;
        icon: string;
    } | null;
}

const REMINDER_ICONS: Record<Reminder["type"], { icon: typeof Bell; color: string; bg: string }> = {
    daily_log: { icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-500/20" },
    budget_check: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20" },
    bill_due: { icon: CalendarClock, color: "text-red-400", bg: "bg-red-500/20" },
    goal_update: { icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    weekly_review: { icon: RefreshCw, color: "text-purple-400", bg: "bg-purple-500/20" },
};

const REMINDER_ACTIONS: Record<Reminder["type"], { label: string; href: "/admin/finance/transactions/new" | "/admin/finance/budgets" | "/admin/finance/recurring" | "/admin/finance/goals" | "/admin/finance/reports" }> = {
    daily_log: { label: "Registrar gasto", href: "/admin/finance/transactions/new" },
    budget_check: { label: "Ver presupuestos", href: "/admin/finance/budgets" },
    bill_due: { label: "Ver pagos", href: "/admin/finance/recurring" },
    goal_update: { label: "Ver metas", href: "/admin/finance/goals" },
    weekly_review: { label: "Ver reportes", href: "/admin/finance/reports" },
};

export default function RemindersPageClient() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            
            const [remindersRes, recurringRes] = await Promise.all([
                fetch("/api/finance/reminders"),
                fetch("/api/finance/recurring"),
            ]);

            if (remindersRes.ok) {
                const { data } = await remindersRes.json();
                setReminders(data || []);
            }

            if (recurringRes.ok) {
                const { data } = await recurringRes.json();
                setRecurringPayments(data || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDismiss = (id: string) => {
        setDismissedIds((prev) => new Set([...prev, id]));
    };

    const activeReminders = reminders.filter((r) => !dismissedIds.has(r.id));

    // Upcoming payments (next 7 days)
    const upcomingPayments = recurringPayments.filter((p) => {
        if (!p.nextDueDate || !p.isActive) return false;
        const dueDate = new Date(p.nextDueDate);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <FinanceBreadcrumbs />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-neutral-400">Cargando recordatorios...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <FinanceBreadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white"
                    >
                        🔔 Recordatorios
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-neutral-400 text-sm mt-1"
                    >
                        Alertas y recordatorios de tus finanzas
                    </motion.p>
                </div>

                <Link
                    href="/admin/finance/recurring"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors"
                >
                    <CalendarClock className="w-5 h-5" />
                    Pagos recurrentes
                </Link>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Active Reminders */}
            <div>
                <h2 className="text-sm font-medium text-neutral-500 mb-3">Alertas activas</h2>
                
                {activeReminders.length > 0 ? (
                    <div className="space-y-3">
                        {activeReminders.map((reminder, index) => {
                            const { icon: Icon, color, bg } = REMINDER_ICONS[reminder.type];
                            const action = REMINDER_ACTIONS[reminder.type];

                            return (
                                <motion.div
                                    key={reminder.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl ${bg}`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium">{reminder.title}</h3>
                                            <p className="text-sm text-neutral-400 mt-0.5">{reminder.message}</p>
                                            
                                            <div className="flex items-center gap-3 mt-3">
                                                <Link
                                                    href={action.href}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                                >
                                                    {action.label}
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDismiss(reminder.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Descartar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-emerald-400" />
                        </div>
                        <p className="text-white font-medium mb-1">¡Todo en orden!</p>
                        <p className="text-neutral-400 text-sm">No tienes alertas pendientes por el momento</p>
                    </div>
                )}
            </div>

            {/* Upcoming Payments */}
            <div>
                <h2 className="text-sm font-medium text-neutral-500 mb-3">Próximos pagos (7 días)</h2>
                
                {upcomingPayments.length > 0 ? (
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl divide-y divide-neutral-800/50">
                        {upcomingPayments.map((payment) => {
                            const dueDate = new Date(payment.nextDueDate!);
                            const now = new Date();
                            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                                <div key={payment.id} className="flex items-center gap-4 p-4">
                                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                                        <span className="text-lg">{payment.category?.icon || "💳"}</span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{payment.name}</p>
                                        <p className="text-sm text-neutral-500">
                                            {payment.category?.name || "Sin categoría"}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className={`text-sm font-medium ${
                                            diffDays <= 1 ? "text-red-400" : 
                                            diffDays <= 3 ? "text-amber-400" : 
                                            "text-neutral-400"
                                        }`}>
                                            {diffDays === 0 ? "Hoy" : 
                                             diffDays === 1 ? "Mañana" : 
                                             `En ${diffDays} días`}
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            {dueDate.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-6 text-center">
                        <p className="text-neutral-400">No hay pagos próximos en los siguientes 7 días</p>
                        <Link
                            href="/admin/finance/recurring"
                            className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                        >
                            Configurar pagos recurrentes →
                        </Link>
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                    { href: "/admin/finance/budgets" as const, icon: "📋", label: "Presupuestos" },
                    { href: "/admin/finance/goals" as const, icon: "🎯", label: "Metas" },
                    { href: "/admin/finance/recurring" as const, icon: "🔄", label: "Recurrentes" },
                    { href: "/admin/finance/reports" as const, icon: "📈", label: "Reportes" },
                ]).map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col items-center gap-2 p-4 bg-neutral-900/30 border border-neutral-800/50 rounded-xl hover:bg-neutral-800/30 transition-colors text-center"
                    >
                        <span className="text-2xl">{link.icon}</span>
                        <span className="text-xs text-neutral-400">{link.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

