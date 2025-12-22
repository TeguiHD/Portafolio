"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { FinanceAlert, AlertPriority } from "../types";

interface AlertBannerProps {
    alerts: FinanceAlert[];
    onDismiss?: (alertId: string) => void;
    maxVisible?: number;
}

const priorityConfig: Record<AlertPriority, { bg: string; border: string; icon: string }> = {
    high: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: "text-red-400",
    },
    medium: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        icon: "text-yellow-400",
    },
    low: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        icon: "text-blue-400",
    },
};

const alertIcons = {
    budget_warning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    budget_exceeded: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    expense_spike: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    ),
    unusual_expense: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    recurring_due: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    goal_milestone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    ),
    low_balance: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

export function AlertBanner({ alerts, onDismiss, maxVisible = 2 }: AlertBannerProps) {
    // Sort by priority and show max visible
    const sortedAlerts = [...alerts]
        .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
        .slice(0, maxVisible);

    if (sortedAlerts.length === 0) return null;

    return (
        <div className="space-y-2">
            <AnimatePresence mode="popLayout">
                {sortedAlerts.map((alert, index) => {
                    const config = priorityConfig[alert.priority];
                    const Icon = alertIcons[alert.type];

                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-start gap-3 p-4 rounded-xl ${config.bg} border ${config.border}`}
                        >
                            <span className={config.icon}>{Icon}</span>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm">{alert.title}</h4>
                                <p className="text-sm text-neutral-400 mt-0.5">{alert.message}</p>
                            </div>

                            {onDismiss && (
                                <button
                                    onClick={() => onDismiss(alert.id)}
                                    className="text-neutral-500 hover:text-white transition-colors p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {alerts.length > maxVisible && (
                <button className="text-sm text-neutral-500 hover:text-accent-1 transition-colors">
                    Ver {alerts.length - maxVisible} alertas más
                </button>
            )}
        </div>
    );
}
