"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Activity = {
    type: "page_view" | "cta" | "quotation";
    message: string;
    createdAt: string;
};

const typeIcon: Record<Activity["type"], string> = {
    page_view: "👀",
    cta: "⚡",
    quotation: "📝",
};

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "justo ahora";
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "ayer" : `hace ${days} días`;
};

export function RecentActivity() {
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/analytics?days=14", { cache: "no-store" });
                if (!res.ok) throw new Error("Failed to fetch activity");
                const json = await res.json();
                setActivities(json.recentEvents || []);
            } catch (error) {
                console.error("Recent activity error", error);
            }
        };

        load();
    }, []);

    return (
        <div>
            <h2 className="text-lg font-semibold text-white mb-4">Actividad reciente</h2>
            <div className="glass-panel rounded-2xl border border-accent-1/20 divide-y divide-accent-1/10">
                {activities.map((activity, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + idx * 0.05 }}
                        className="flex items-center gap-4 p-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
                            {typeIcon[activity.type]}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-white">{activity.message}</p>
                            <p className="text-xs text-neutral-500">{timeAgo(activity.createdAt)}</p>
                        </div>
                    </motion.div>
                ))}

                {activities.length === 0 && (
                    <div className="p-4 text-sm text-neutral-500 text-center">Sin actividad reciente.</div>
                )}
            </div>
        </div>
    );
}
