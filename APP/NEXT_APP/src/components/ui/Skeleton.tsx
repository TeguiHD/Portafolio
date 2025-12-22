"use client";

import { motion } from "framer-motion";

// Base skeleton pulse animation
const skeletonPulse = "animate-pulse bg-neutral-800";

// ===================
// Generic Skeleton Primitives
// ===================

export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`${skeletonPulse} rounded ${className}`} />;
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`${skeletonPulse} h-4 rounded ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
                        }`}
                />
            ))}
        </div>
    );
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
    return (
        <div
            className={`${skeletonPulse} rounded-full`}
            style={{ width: size, height: size }}
        />
    );
}

export function SkeletonCard({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={`p-5 rounded-2xl border border-white/10 bg-white/5 ${className}`}>
            {children}
        </div>
    );
}

// ===================
// Admin Dashboard Skeleton (/admin)
// ===================

export function DashboardPageSkeleton() {
    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </div>

            {/* Stats Grid - 5 columns on lg, 2 on mobile */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-3 sm:p-4 lg:p-6"
                    >
                        <div className="flex items-start justify-between mb-2 sm:mb-4">
                            <Skeleton className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-24 mt-1" />
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions - 3 columns */}
            <div>
                <Skeleton className="h-5 w-32 mb-3 sm:mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                        >
                            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl mb-3 sm:mb-4" />
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-4 w-40 mt-1" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <Skeleton className="h-5 w-36 mb-4" />
                <div className="glass-panel rounded-2xl border border-accent-1/20 divide-y divide-accent-1/10">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                            className="flex items-center gap-4 p-4"
                        >
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-20 mt-1" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ===================
// Analytics Page Skeleton
// ===================

export function AnalyticsPageSkeleton() {
    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header with Date Range */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-4 w-52 mt-1" />
                </div>
                <div className="flex gap-2">
                    {["Hoy", "7 días", "30 días", "90 días"].map((_, idx) => (
                        <Skeleton
                            key={idx}
                            className={`h-9 rounded-lg sm:rounded-xl ${idx === 1 ? "w-20 bg-neutral-700" : "w-16"}`}
                        />
                    ))}
                </div>
            </div>

            {/* Overview Stats - 4 columns */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {[
                    { label: "Visitas totales", width: "w-12" },
                    { label: "Visitantes únicos", width: "w-14" },
                    { label: "Eventos CTA", width: "w-10" },
                    { label: "Páginas únicas", width: "w-8" },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-3 sm:p-5"
                    >
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className={`h-7 ${stat.width} mt-2`} />
                        <Skeleton className="h-3 w-16 mt-1" />
                    </motion.div>
                ))}
            </div>

            {/* 2-Column Grid: Chart + Top Pages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Page Views Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <Skeleton className="h-5 w-28" />
                        {/* Chart Type Toggle Skeleton */}
                        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                            <Skeleton className="h-7 w-7 rounded bg-neutral-700" />
                            <Skeleton className="h-7 w-7 rounded" />
                        </div>
                    </div>

                    {/* Realistic Bar Chart Skeleton */}
                    <div className="h-36 sm:h-48 flex items-end justify-between gap-1 px-2">
                        {[40, 65, 45, 80, 55, 70, 90].map((height, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ delay: 0.3 + idx * 0.05, duration: 0.4, ease: "easeOut" }}
                                className="flex-1 rounded-t bg-gradient-to-t from-neutral-700 to-neutral-600 min-w-[20px]"
                            />
                        ))}
                    </div>

                    {/* X-axis labels */}
                    <div className="flex justify-between mt-2 px-2">
                        {Array.from({ length: 7 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-3 w-6" />
                        ))}
                    </div>
                </motion.div>

                {/* Top Pages */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <Skeleton className="h-5 w-40 mb-4 sm:mb-6" />
                    <div className="space-y-4">
                        {[85, 62, 45, 30, 18].map((width, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + idx * 0.05 }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${width}%` }}
                                        transition={{ delay: 0.4 + idx * 0.05, duration: 0.5 }}
                                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* 2-Column Grid: CTA + Referrers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* CTA Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <Skeleton className="h-5 w-28 mb-4 sm:mb-6" />
                    <div className="space-y-4">
                        {[
                            { name: "download_cv", width: 75 },
                            { name: "whatsapp", width: 55 },
                            { name: "contact", width: 35 },
                            { name: "github", width: 20 },
                        ].map((cta, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.35 + idx * 0.05 }}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-8" />
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cta.width}%` }}
                                        transition={{ delay: 0.45 + idx * 0.05, duration: 0.5 }}
                                        className="h-full bg-gradient-to-r from-accent-1 to-accent-2 rounded-full"
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Referrers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <Skeleton className="h-5 w-36 mb-4 sm:mb-6" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { icon: "🌐", visits: "128" },
                            { icon: "🔗", visits: "64" },
                            { icon: "📱", visits: "42" },
                            { icon: "🐦", visits: "28" },
                            { icon: "💼", visits: "19" },
                            { icon: "📧", visits: "8" },
                        ].map((ref, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + idx * 0.04 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                            >
                                <div className="w-9 h-9 rounded-lg bg-neutral-700 animate-pulse flex items-center justify-center shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <Skeleton className="h-5 w-10" />
                                    <Skeleton className="h-3 w-14 mt-1" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ===================
// Users Page Skeleton
// ===================

export function UsersPageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-28 rounded-xl" />
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
            </div>

            {/* Search and Filters */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-sm">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Skeleton className="h-10 w-40 rounded-xl" />
                        <Skeleton className="h-10 w-40 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Results summary */}
            <Skeleton className="h-4 w-48" />

            {/* Users List */}
            <div className="grid gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <SkeletonCard>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <Skeleton className="w-12 h-12 rounded-xl" />
                                <div className="flex-1 min-w-0 w-full space-y-2">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-4 w-56" />
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                    <Skeleton className="h-8 w-24 rounded-lg" />
                                    <div className="flex items-center gap-1 ml-auto sm:ml-0">
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        </SkeletonCard>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ===================
// Tools Page Skeleton
// ===================

export function ToolsPageSkeleton() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded" />
                            <Skeleton className="h-7 w-32" />
                        </div>
                        <Skeleton className="h-4 w-56 mt-2" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-28 rounded-xl" />
                        <Skeleton className="h-10 w-28 rounded-xl" />
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <div>
                                <Skeleton className="h-5 w-10" />
                                <Skeleton className="h-3 w-12 mt-1" />
                            </div>
                            {idx < 3 && <div className="w-px h-8 bg-white/10 hidden sm:block ml-4" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tools List */}
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-xl border border-white/10 bg-white/[0.01] p-4"
                    >
                        <div className="flex items-center gap-3 sm:gap-4">
                            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <div className="hidden md:flex items-center gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="px-3 text-center">
                                        <Skeleton className="h-4 w-8 mx-auto" />
                                        <Skeleton className="h-3 w-10 mt-1 mx-auto" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Skeleton className="h-8 w-20 rounded-lg" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ===================
// Quotations Page Skeleton
// ===================

export function QuotationsPageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-4 w-52 mt-2" />
                </div>
                <Skeleton className="h-11 w-44 rounded-xl" />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-9 w-24 rounded-lg" />
                ))}
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl border border-accent-1/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-accent-1/10">
                                {["Folio", "Cliente", "Proyecto", "Total", "Estado", "Acciones"].map((header, idx) => (
                                    <th key={idx} className={`p-4 ${idx === 2 ? "hidden md:table-cell" : ""}`}>
                                        <Skeleton className="h-3 w-16" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <motion.tr
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-b border-accent-1/10"
                                >
                                    <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                                    <td className="p-4">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-3 w-20 mt-1" />
                                    </td>
                                    <td className="p-4 hidden md:table-cell"><Skeleton className="h-5 w-40" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-5 w-20 ml-auto" /></td>
                                    <td className="p-4 text-center"><Skeleton className="h-6 w-20 rounded-full mx-auto" /></td>
                                    <td className="p-4">
                                        <div className="flex justify-end gap-1">
                                            <Skeleton className="h-8 w-8 rounded-lg" />
                                            <Skeleton className="h-8 w-8 rounded-lg" />
                                            <Skeleton className="h-8 w-8 rounded-lg" />
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="glass-panel rounded-xl border border-accent-1/10 p-4 text-center">
                        <Skeleton className="h-8 w-16 mx-auto" />
                        <Skeleton className="h-3 w-20 mx-auto mt-2" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===================
// Notifications Page Skeleton
// ===================

export function NotificationsPageSkeleton() {
    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header with stats */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-xl" />
                        <div>
                            <Skeleton className="h-7 w-36" />
                            <Skeleton className="h-4 w-28 mt-1" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-48 rounded-xl" />
                </div>

                {/* Stats Pills */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-11 w-28 rounded-xl shrink-0" />
                    ))}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
                <Skeleton className="h-11 w-full rounded-xl" />
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <Skeleton className="h-9 w-28 rounded-xl" />
                    <Skeleton className="h-9 w-24 rounded-xl" />
                    <Skeleton className="h-9 w-20 rounded-xl" />
                </div>
            </div>

            {/* Notification Cards */}
            <div className="space-y-2 sm:space-y-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="relative p-4 rounded-xl border-l-4 border-l-neutral-500 bg-white/[0.02]"
                    >
                        <div className="flex gap-3 sm:gap-4">
                            <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-full max-w-[300px] mt-1" />
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-5 w-14 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ===================
// CV Editor Page Skeleton
// ===================

export function CvEditorPageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-44 rounded-xl" />
                    <Skeleton className="h-11 w-28 rounded-xl" />
                </div>
            </div>

            {/* Tabs */}
            <div className="glass-panel rounded-xl border border-accent-1/20 p-1 flex gap-1 overflow-x-auto">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-10 w-28 rounded-lg shrink-0" />
                ))}
            </div>

            {/* Content - Personal Info Form */}
            <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
                <Skeleton className="h-6 w-40 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className={idx === 7 ? "md:col-span-2" : ""}>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className={`h-11 w-full rounded-xl ${idx === 7 ? "h-24" : ""}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ===================
// Audit Page Skeleton
// ===================

export function AuditPageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                    <Skeleton className="h-4 w-72 mt-1" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-32 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
            </div>

            {/* Filters - Updated to match new responsive design */}
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
                {/* Filter Header */}
                <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>

                {/* Filter Content */}
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {/* Search + Category Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto] gap-3">
                        <Skeleton className="h-11 sm:h-10 w-full rounded-xl" />
                        <Skeleton className="h-11 sm:h-10 w-full sm:w-[200px] rounded-xl" />
                    </div>

                    {/* Date Range Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                            <Skeleton className="h-4 w-12 hidden sm:block" />
                        </div>
                        <div className="flex flex-1 flex-col sm:flex-row items-stretch gap-2">
                            <Skeleton className="h-11 sm:h-9 flex-1 rounded-xl" />
                            <Skeleton className="h-4 w-4 hidden sm:block self-center" />
                            <Skeleton className="h-11 sm:h-9 flex-1 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                {["Fecha", "Acción", "Categoría", "Usuario", "Detalles"].map((header, idx) => (
                                    <th key={idx} className="px-4 py-3 text-left">
                                        <Skeleton className="h-3 w-16" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {Array.from({ length: 8 }).map((_, idx) => (
                                <motion.tr
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.02 }}
                                >
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-4 w-4 rounded" />
                                            <Skeleton className="h-4 w-28" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><Skeleton className="h-6 w-24 rounded-lg" /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="w-6 h-6 rounded-full" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
        </div>
    );
}
