"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type AnalyticsResponse = {
  pageViews: number;
  uniqueVisitors: number;
  ctaClicks: Record<string, number>;
  quotationsTotal: number;
};

const formatNumber = (value: number) => value.toLocaleString("es-CL");

export function DashboardStats() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/analytics?days=30", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Dashboard stats error", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const ctaClicks = data?.ctaClicks || {};
  const cvDownloads = ctaClicks["download_cv"] || 0;
  const whatsappClicks = ctaClicks["whatsapp"] || 0;

  const stats: Array<{
    label: string;
    value: string;
    change: string;
    changeType: "positive" | "negative" | "neutral";
    icon: JSX.Element;
  }> = [
      {
        label: "Visitas totales",
        value: data ? formatNumber(data.pageViews) : "--",
        change: "últimos 30 días",
        changeType: "neutral",
        icon: (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
      },
      {
        label: "Visitantes únicos",
        value: data ? formatNumber(data.uniqueVisitors) : "--",
        change: "últimos 30 días",
        changeType: "neutral",
        icon: (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0zM21 12a3 3 0 11-6 0 3 3 0 016 0zM9 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: "Descargas CV",
        value: data ? formatNumber(cvDownloads) : "--",
        change: "últimos 30 días",
        changeType: "neutral",
        icon: (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: "Clics WhatsApp",
        value: data ? formatNumber(whatsappClicks) : "--",
        change: "últimos 30 días",
        changeType: "neutral",
        icon: (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
      {
        label: "Cotizaciones",
        value: data ? formatNumber(data.quotationsTotal || 0) : "--",
        change: "totales",
        changeType: "neutral",
        icon: (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-3 sm:p-4 lg:p-6"
        >
          <div className="flex items-start justify-between mb-2 sm:mb-4">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-accent-1/10 border border-accent-1/20 flex items-center justify-center text-accent-1">
              {stat.icon}
            </div>
            <span
              className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${stat.changeType === "positive"
                ? "bg-green-500/10 text-green-400"
                : stat.changeType === "negative"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-neutral-500/10 text-neutral-400"
                }`}
            >
              {stat.change}
            </span>
          </div>

          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-none">
            {loading ? "--" : stat.value}
          </p>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 truncate">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
