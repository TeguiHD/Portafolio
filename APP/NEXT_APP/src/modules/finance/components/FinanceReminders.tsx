"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Reminder {
    id: string;
    type: "daily_log" | "budget_check" | "bill_due" | "goal_update" | "weekly_review";
    title: string;
    message: string;
    scheduledFor: string;
    isActive: boolean;
    frequency: "daily" | "weekly" | "monthly" | "once";
    lastTriggered?: string;
}

interface ReminderSettings {
    dailyLogReminder: {
        enabled: boolean;
        time: string;
    };
    budgetAlerts: {
        enabled: boolean;
        threshold: number;
    };
    weeklyReview: {
        enabled: boolean;
        dayOfWeek: number;
        time: string;
    };
    emailNotifications: {
        enabled: boolean;
        email: string;
    };
}

export function FinanceReminders() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [settings, setSettings] = useState<ReminderSettings>({
        dailyLogReminder: { enabled: true, time: "20:00" },
        budgetAlerts: { enabled: true, threshold: 80 },
        weeklyReview: { enabled: true, dayOfWeek: 0, time: "10:00" },
        emailNotifications: { enabled: false, email: "" },
    });
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        fetchReminders();
        fetchSettings();
    }, []);

    const fetchReminders = async () => {
        try {
            const res = await fetch("/api/finance/reminders");
            if (res.ok) {
                const data = await res.json();
                setReminders(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching reminders:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/finance/reminders/settings");
            if (res.ok) {
                const data = await res.json();
                if (data.data) {
                    setSettings(data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            await fetch("/api/finance/reminders/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            setShowSettings(false);
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setSavingSettings(false);
        }
    };

    const dismissReminder = async (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        try {
            await fetch(`/api/finance/reminders/${id}/dismiss`, { method: "POST" });
        } catch (error) {
            console.error("Error dismissing reminder:", error);
        }
    };

    const typeConfig = {
        daily_log: { icon: "📝", color: "blue", label: "Registro Diario" },
        budget_check: { icon: "⚠️", color: "yellow", label: "Alerta de Presupuesto" },
        bill_due: { icon: "📅", color: "red", label: "Cuenta por Pagar" },
        goal_update: { icon: "🎯", color: "purple", label: "Meta de Ahorro" },
        weekly_review: { icon: "📊", color: "green", label: "Revisión Semanal" },
    };

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    if (loading) {
        return <RemindersSkeleton />;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                    <span>🔔</span> Recordatorios
                </h3>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Configurar recordatorios"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl space-y-4">
                            <h4 className="text-sm font-medium text-white">Configuración de Recordatorios</h4>

                            {/* Daily Log Reminder */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📝</span>
                                    <div>
                                        <p className="text-sm text-white">Recordatorio de registro diario</p>
                                        <p className="text-xs text-neutral-500">Te recordamos registrar tus gastos del día</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={settings.dailyLogReminder.time}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            dailyLogReminder: { ...prev.dailyLogReminder, time: e.target.value }
                                        }))}
                                        className="px-2 py-1 bg-neutral-700 rounded text-sm text-white"
                                    />
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            dailyLogReminder: { ...prev.dailyLogReminder, enabled: !prev.dailyLogReminder.enabled }
                                        }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            settings.dailyLogReminder.enabled ? "bg-accent-1" : "bg-neutral-600"
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: settings.dailyLogReminder.enabled ? 24 : 2 }}
                                            className="w-5 h-5 bg-white rounded-full"
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Budget Alerts */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <div>
                                        <p className="text-sm text-white">Alertas de presupuesto</p>
                                        <p className="text-xs text-neutral-500">Aviso cuando alcances el {settings.budgetAlerts.threshold}% del presupuesto</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={settings.budgetAlerts.threshold}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            budgetAlerts: { ...prev.budgetAlerts, threshold: parseInt(e.target.value) }
                                        }))}
                                        className="px-2 py-1 bg-neutral-700 rounded text-sm text-white"
                                    >
                                        <option value={50}>50%</option>
                                        <option value={70}>70%</option>
                                        <option value={80}>80%</option>
                                        <option value={90}>90%</option>
                                    </select>
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            budgetAlerts: { ...prev.budgetAlerts, enabled: !prev.budgetAlerts.enabled }
                                        }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            settings.budgetAlerts.enabled ? "bg-accent-1" : "bg-neutral-600"
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: settings.budgetAlerts.enabled ? 24 : 2 }}
                                            className="w-5 h-5 bg-white rounded-full"
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Weekly Review */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📊</span>
                                    <div>
                                        <p className="text-sm text-white">Revisión semanal</p>
                                        <p className="text-xs text-neutral-500">Resumen de tu semana financiera</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={settings.weeklyReview.dayOfWeek}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            weeklyReview: { ...prev.weeklyReview, dayOfWeek: parseInt(e.target.value) }
                                        }))}
                                        className="px-2 py-1 bg-neutral-700 rounded text-sm text-white"
                                    >
                                        {dayNames.map((day, idx) => (
                                            <option key={idx} value={idx}>{day}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            weeklyReview: { ...prev.weeklyReview, enabled: !prev.weeklyReview.enabled }
                                        }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            settings.weeklyReview.enabled ? "bg-accent-1" : "bg-neutral-600"
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: settings.weeklyReview.enabled ? 24 : 2 }}
                                            className="w-5 h-5 bg-white rounded-full"
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Email Notifications */}
                            <div className="pt-3 border-t border-neutral-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📧</span>
                                        <div>
                                            <p className="text-sm text-white">Notificaciones por correo</p>
                                            <p className="text-xs text-neutral-500">Recibe recordatorios en tu email</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSettings(prev => ({
                                            ...prev,
                                            emailNotifications: { ...prev.emailNotifications, enabled: !prev.emailNotifications.enabled }
                                        }))}
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            settings.emailNotifications.enabled ? "bg-accent-1" : "bg-neutral-600"
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: settings.emailNotifications.enabled ? 24 : 2 }}
                                            className="w-5 h-5 bg-white rounded-full"
                                        />
                                    </button>
                                </div>
                                {settings.emailNotifications.enabled && (
                                    <input
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={settings.emailNotifications.email}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            emailNotifications: { ...prev.emailNotifications, email: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 bg-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500"
                                    />
                                )}
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={saveSettings}
                                disabled={savingSettings}
                                className="w-full py-2 bg-accent-1 hover:bg-accent-1/90 disabled:bg-neutral-700 text-white rounded-lg transition-colors"
                            >
                                {savingSettings ? "Guardando..." : "Guardar configuración"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Reminders */}
            {reminders.length > 0 ? (
                <AnimatePresence>
                    <div className="space-y-2">
                        {reminders.map((reminder, index) => {
                            const config = typeConfig[reminder.type];
                            return (
                                <motion.div
                                    key={reminder.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-3 rounded-xl border ${
                                        config.color === "blue" ? "border-blue-500/30 bg-blue-500/5" :
                                        config.color === "yellow" ? "border-yellow-500/30 bg-yellow-500/5" :
                                        config.color === "red" ? "border-red-500/30 bg-red-500/5" :
                                        config.color === "purple" ? "border-purple-500/30 bg-purple-500/5" :
                                        "border-green-500/30 bg-green-500/5"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">{config.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white">{reminder.title}</p>
                                            <p className="text-xs text-neutral-400 mt-0.5">{reminder.message}</p>
                                        </div>
                                        <button
                                            onClick={() => dismissReminder(reminder.id)}
                                            className="p-1 text-neutral-500 hover:text-white transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
            ) : (
                <div className="p-4 text-center bg-neutral-800/30 rounded-xl">
                    <p className="text-neutral-500 text-sm">¡Todo al día! No tienes recordatorios pendientes.</p>
                </div>
            )}

            {/* Quick Action */}
            <a
                href="/admin/finance/transactions/new"
                className="flex items-center justify-center gap-2 p-3 bg-accent-1/20 hover:bg-accent-1/30 text-accent-1 rounded-xl transition-colors"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">Registrar gasto del día</span>
            </a>
        </div>
    );
}

function RemindersSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex justify-between">
                <div className="h-5 w-32 bg-neutral-800 rounded" />
                <div className="h-8 w-8 bg-neutral-800 rounded" />
            </div>
            <div className="space-y-2">
                {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-neutral-800 rounded-xl" />
                ))}
            </div>
            <div className="h-12 bg-neutral-800 rounded-xl" />
        </div>
    );
}
