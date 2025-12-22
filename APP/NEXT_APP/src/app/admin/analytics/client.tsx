"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { ReferrerIcon, getReferrerDisplayName } from "@/components/admin/ReferrerIcons";
import { AnalyticsPageSkeleton } from "@/components/ui/Skeleton";

type AnalyticsData = {
    pageViews: number;
    uniqueVisitors: number;
    pageViewsByDay: { date: string; label: string; views: number }[];
    ctaClicks: Record<string, number>;
    topReferrers: { source: string | null; visits: number }[];
    topPages: { path: string; visits: number }[];
};

type DateRangeOption = {
    label: string;
    days: number;
};

const dateRangeOptions: DateRangeOption[] = [
    { label: "Hoy", days: 1 },
    { label: "7 días", days: 7 },
    { label: "30 días", days: 30 },
    { label: "90 días", days: 90 },
];

// Path to friendly name mapping
const pathDisplayNames: Record<string, string> = {
    "/": "Inicio",
    "/tools": "Herramientas",
    "/tools/qr-generator": "Generador QR",
    "/tools/base64-converter": "Convertidor Base64",
    "/tools/unit-converter": "Convertidor Unidades",
    "/tools/regex-tester": "Regex Tester",
    "/admin": "Dashboard Admin",
    "/admin/analytics": "Analytics",
    "/login": "Login",
};

function getPathDisplayName(path: string): string {
    // Check exact match first
    if (pathDisplayNames[path]) return pathDisplayNames[path];

    // Check prefix matches for tool pages
    if (path.startsWith("/tools/")) {
        const toolName = path.replace("/tools/", "").replace(/-/g, " ");
        return toolName.charAt(0).toUpperCase() + toolName.slice(1);
    }

    if (path.startsWith("/admin/")) {
        const section = path.replace("/admin/", "").replace(/-/g, " ");
        return "Admin: " + section.charAt(0).toUpperCase() + section.slice(1);
    }

    return path;
}

export default function AnalyticsPageClient() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(7);
    const [chartType, setChartType] = useState<"area" | "bar">("area");

    // Track if chart animations have already played (for optimization)
    const hasAnimatedRef = useRef(false);
    const dataLoadCountRef = useRef(0);
    const areaChartRef = useRef<HTMLDivElement>(null);

    // Chart hover/click states (for tooltips - works on mobile with click)
    const [hoveredPoint, setHoveredPoint] = useState<{ index: number; views: number; label: string } | null>(null);
    const [pointPositions, setPointPositions] = useState<{ x: number; y: number }[]>([]);
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    const loadData = useCallback(async (days: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?days=${days}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch analytics");
            const json = await res.json();
            setData(json);
            dataLoadCountRef.current += 1;
        } catch (error) {
            console.error("Analytics page error", error);
        } finally {
            setLoading(false);
            // Mark animations as played after first successful load
            if (!hasAnimatedRef.current) {
                setTimeout(() => { hasAnimatedRef.current = true; }, 1500);
            }
        }
    }, []);

    useEffect(() => {
        loadData(selectedDays);
    }, [selectedDays, loadData]);

    const handleDateRangeChange = (days: number) => {
        setSelectedDays(days);
    };

    // Only animate charts on first data load (not on chart type switch)
    const shouldAnimateCharts = !hasAnimatedRef.current;

    const maxViews = useMemo(() => {
        if (!data?.pageViewsByDay?.length) return 0;
        return Math.max(...data.pageViewsByDay.map((d) => d.views));
    }, [data]);

    const ctaEntries = useMemo(() => {
        if (!data?.ctaClicks) return [] as { action: string; clicks: number; percentage: number }[];
        const total = Object.values(data.ctaClicks).reduce((acc, n) => acc + n, 0) || 1;
        return Object.entries(data.ctaClicks)
            .sort((a, b) => b[1] - a[1])
            .map(([action, clicks]) => ({
                action,
                clicks,
                percentage: Math.round((clicks / total) * 100),
            }));
    }, [data]);

    const referrers = useMemo(() => {
        if (!data?.topReferrers) return [];
        return data.topReferrers.map((ref) => ({
            source: ref.source,
            displayName: getReferrerDisplayName(ref.source || "Directo"),
            visits: ref.visits,
        }));
    }, [data]);

    const topPages = useMemo(() => {
        if (!data?.topPages) return [];
        const totalViews = data.topPages.reduce((acc, p) => acc + p.visits, 0) || 1;
        return data.topPages.map((page) => ({
            path: page.path,
            displayName: getPathDisplayName(page.path),
            visits: page.visits,
            percentage: Math.round((page.visits / totalViews) * 100),
        }));
    }, [data]);

    const overviewStats = [
        { label: "Visitas totales", value: data?.pageViews ?? "--" },
        { label: "Visitantes únicos", value: data?.uniqueVisitors ?? "--" },
        { label: "Eventos CTA", value: ctaEntries.reduce((acc, c) => acc + c.clicks, 0) || "0" },
        { label: "Páginas únicas", value: topPages.length },
    ];

    const selectedOption = dateRangeOptions.find(opt => opt.days === selectedDays);

    // Show full page skeleton on initial load only
    if (loading && !data) {
        return <AnalyticsPageSkeleton />;
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header with Date Range Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-sm sm:text-base text-neutral-400 mt-1">
                        Métricas de tu portafolio - {selectedOption?.label || `${selectedDays} días`}
                    </p>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2 flex-wrap">
                    {dateRangeOptions.map((option) => (
                        <button
                            key={option.days}
                            onClick={() => handleDateRangeChange(option.days)}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${selectedDays === option.days
                                ? "bg-accent-1 text-white"
                                : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10"
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {overviewStats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-3 sm:p-5"
                    >
                        <p className="text-xs sm:text-sm text-neutral-400 truncate">{stat.label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-white mt-1">{loading ? "--" : stat.value}</p>
                        <span className="text-[10px] sm:text-xs text-neutral-500">{selectedOption?.label || `${selectedDays} días`}</span>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Page Views Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className="font-semibold text-white text-sm sm:text-base">Visitas por día</h3>

                        {/* Chart Type Toggle */}
                        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setChartType("area")}
                                className={`p-1.5 rounded transition-all ${chartType === "area" ? "bg-accent-1 text-white shadow-lg" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
                                title="Área"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <path d="M2 17L7 12L12 15L17 8L22 12V20H2V17Z" fill="currentColor" fillOpacity="0.4" />
                                    <path d="M2 17L7 12L12 15L17 8L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="7" cy="12" r="1.5" fill="currentColor" />
                                    <circle cx="12" cy="15" r="1.5" fill="currentColor" />
                                    <circle cx="17" cy="8" r="1.5" fill="currentColor" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setChartType("bar")}
                                className={`p-1.5 rounded transition-all ${chartType === "bar" ? "bg-accent-1 text-white shadow-lg" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
                                title="Barras"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <rect x="4" y="14" width="4" height="6" rx="1" fill="currentColor" />
                                    <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" />
                                    <rect x="16" y="11" width="4" height="9" rx="1" fill="currentColor" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-36 sm:h-48 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : chartType === "bar" ? (
                        /* Bar Chart with Axes */
                        <div className="relative" onClick={() => setSelectedBarIndex(null)}>
                            {/* Y-Axis */}
                            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[9px] sm:text-[10px] text-neutral-500 font-medium">
                                <span>{maxViews}</span>
                                <span>{Math.round(maxViews * 0.75)}</span>
                                <span>{Math.round(maxViews * 0.5)}</span>
                                <span>{Math.round(maxViews * 0.25)}</span>
                                <span>0</span>
                            </div>

                            {/* Chart area with scroll */}
                            <div className="ml-9 relative">
                                {/* Scroll indicator left */}
                                <div className="absolute left-0 top-0 bottom-8 w-6 bg-gradient-to-r from-[#1a1a2e] to-transparent z-10 pointer-events-none opacity-0 transition-opacity" id="scroll-left-indicator" />

                                {/* Scroll indicator right */}
                                {selectedDays > 14 && (
                                    <div className="absolute right-0 top-0 bottom-8 w-8 bg-gradient-to-l from-[#1a1a2e] to-transparent z-10 pointer-events-none flex items-center justify-end pr-1">
                                        <svg className="w-4 h-4 text-neutral-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                )}

                                {/* Scrollable container with padding for tooltips */}
                                <div
                                    className="overflow-x-auto overflow-y-visible pb-2"
                                    style={{ scrollbarWidth: 'thin' }}
                                >
                                    <div
                                        className="flex items-end gap-1 pt-14"
                                        style={{
                                            minWidth: selectedDays > 14 ? `${selectedDays * 36}px` : 'auto',
                                            height: '180px',
                                            paddingRight: selectedDays > 14 ? '20px' : '0'
                                        }}
                                    >
                                        {(data?.pageViewsByDay || []).map((day, idx) => {
                                            const barHeight = maxViews ? Math.max((day.views / maxViews) * 100, 5) : 5;
                                            const isSelected = selectedBarIndex === idx;
                                            return (
                                                <div
                                                    key={day.date}
                                                    className={`flex-1 min-w-[28px] max-w-[45px] flex flex-col items-center h-full relative ${isSelected ? '' : 'group/bar'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedBarIndex(isSelected ? null : idx);
                                                    }}
                                                >
                                                    {/* Tooltip Cloud */}
                                                    <div
                                                        className={`absolute left-1/2 -translate-x-1/2 transition-all duration-150 pointer-events-none ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/bar:opacity-100'}`}
                                                        style={{ bottom: 'calc(100% + 8px)', zIndex: 50 }}
                                                    >
                                                        <div
                                                            className="px-3 py-2 rounded-lg whitespace-nowrap"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                                                border: '1px solid rgba(34, 211, 238, 0.5)',
                                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 211, 238, 0.15)'
                                                            }}
                                                        >
                                                            <p className="text-cyan-300 font-bold text-lg text-center">{day.views}</p>
                                                            <p className="text-neutral-400 text-[10px] text-center">{day.label}</p>
                                                        </div>
                                                        {/* Arrow */}
                                                        <div
                                                            className="absolute left-1/2 w-3 h-3 rotate-45"
                                                            style={{
                                                                transform: 'translateX(-50%)',
                                                                bottom: '-6px',
                                                                background: '#0f172a',
                                                                borderRight: '1px solid rgba(34, 211, 238, 0.5)',
                                                                borderBottom: '1px solid rgba(34, 211, 238, 0.5)'
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Bar container */}
                                                    <div className="flex-1 flex flex-col items-center justify-end w-full">
                                                        {/* Bar */}
                                                        <motion.div
                                                            initial={shouldAnimateCharts ? { height: 0, opacity: 0 } : false}
                                                            animate={{ height: `${barHeight}%`, opacity: 1 }}
                                                            transition={shouldAnimateCharts ? { delay: Math.min(0.03 + idx * 0.012, 0.5), duration: 0.3, ease: "easeOut" } : { duration: 0 }}
                                                            className={`w-full rounded-t cursor-pointer relative transition-all ${isSelected ? 'brightness-125' : 'group-hover/bar:brightness-125'}`}
                                                            style={{
                                                                minHeight: '8px',
                                                                background: 'linear-gradient(180deg, #22d3ee 0%, #0891b2 50%, #0e7490 100%)',
                                                                boxShadow: isSelected ? '0 0 20px rgba(34, 211, 238, 0.5)' : '0 0 10px rgba(34, 211, 238, 0.3)'
                                                            }}
                                                        >
                                                            {/* Inner highlight */}
                                                            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent rounded-t" />

                                                            {/* Value inside bar */}
                                                            {barHeight > 20 && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-lg">
                                                                        {day.views}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    </div>

                                                    {/* X-Axis Label */}
                                                    <span className={`text-[8px] sm:text-[10px] whitespace-nowrap mt-1.5 font-medium transition-colors ${isSelected ? 'text-cyan-400' : 'text-neutral-500 group-hover/bar:text-cyan-400'}`}>
                                                        {selectedDays > 30 ? day.date.slice(8) : day.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* X-Axis line */}
                                <div className="absolute left-0 right-0 bottom-7 h-px bg-neutral-700" />
                            </div>

                            {/* Scroll hint text */}
                            {selectedDays > 14 && (
                                <div className="text-center mt-1">
                                    <span className="text-[9px] text-neutral-500 flex items-center justify-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                        </svg>
                                        Desliza para ver más
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Area Chart */
                        <div className="relative" onClick={() => setHoveredPoint(null)}>
                            {/* SVG Chart */}
                            <div className="h-40 sm:h-48 relative" ref={areaChartRef}>
                                {(() => {
                                    const chartData = data?.pageViewsByDay || [];
                                    if (chartData.length === 0) return <p className="text-neutral-500 text-sm">Sin datos</p>;

                                    const width = 400;
                                    const height = 150;
                                    const padding = { top: 20, right: 15, bottom: 5, left: 15 };
                                    const chartWidth = width - padding.left - padding.right;
                                    const chartHeight = height - padding.top - padding.bottom;

                                    const max = maxViews || 1;
                                    const points = chartData.map((d, i) => ({
                                        x: padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth,
                                        y: padding.top + chartHeight - (d.views / max) * chartHeight,
                                        views: d.views,
                                        label: d.label,
                                    }));

                                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

                                    const handlePointInteraction = (i: number, p: typeof points[0], e: React.MouseEvent<SVGCircleElement>) => {
                                        e.stopPropagation();
                                        if (hoveredPoint?.index === i) {
                                            setHoveredPoint(null);
                                            return;
                                        }

                                        // Get the actual position of the circle element relative to the container
                                        const circle = e.currentTarget;
                                        const container = areaChartRef.current;
                                        if (container) {
                                            const containerRect = container.getBoundingClientRect();
                                            const circleRect = circle.getBoundingClientRect();

                                            // Calculate pixel position relative to container
                                            const relativeX = circleRect.left - containerRect.left + circleRect.width / 2;
                                            const relativeY = circleRect.top - containerRect.top;

                                            setPointPositions([{ x: relativeX, y: relativeY }]);
                                        }

                                        setHoveredPoint({ index: i, views: p.views, label: p.label });
                                    };

                                    return (
                                        <>
                                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                                {/* Grid lines */}
                                                {[0, 25, 50, 75, 100].map(pct => (
                                                    <line
                                                        key={pct}
                                                        x1={padding.left}
                                                        y1={padding.top + chartHeight * (1 - pct / 100)}
                                                        x2={width - padding.right}
                                                        y2={padding.top + chartHeight * (1 - pct / 100)}
                                                        stroke="rgba(255,255,255,0.08)"
                                                        strokeWidth="1"
                                                        strokeDasharray="4,4"
                                                    />
                                                ))}

                                                {/* Gradient definition */}
                                                <defs>
                                                    <linearGradient id="areaGradientCyan" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                                                        <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.15" />
                                                        <stop offset="100%" stopColor="#0891b2" stopOpacity="0.02" />
                                                    </linearGradient>
                                                </defs>

                                                {/* Area fill */}
                                                <motion.path
                                                    d={areaPath}
                                                    fill="url(#areaGradientCyan)"
                                                    initial={shouldAnimateCharts ? { opacity: 0 } : false}
                                                    animate={{ opacity: 1 }}
                                                    transition={shouldAnimateCharts ? { duration: 0.6, delay: 0.2 } : { duration: 0 }}
                                                />

                                                {/* Line */}
                                                <motion.path
                                                    d={linePath}
                                                    fill="none"
                                                    stroke="#22d3ee"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    initial={shouldAnimateCharts ? { pathLength: 0 } : false}
                                                    animate={{ pathLength: 1 }}
                                                    transition={shouldAnimateCharts ? { duration: 0.8, ease: "easeOut" } : { duration: 0 }}
                                                />

                                                {/* Data points - interactive */}
                                                {points.map((p, i) => (
                                                    <circle
                                                        key={i}
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={hoveredPoint?.index === i ? "8" : "6"}
                                                        fill={hoveredPoint?.index === i ? "#22d3ee" : "#0e7490"}
                                                        stroke="#22d3ee"
                                                        strokeWidth="2"
                                                        className="cursor-pointer"
                                                        style={{ transition: 'all 0.15s ease' }}
                                                        onMouseEnter={(e) => handlePointInteraction(i, p, e)}
                                                        onMouseLeave={() => setHoveredPoint(null)}
                                                        onClick={(e) => handlePointInteraction(i, p, e)}
                                                    />
                                                ))}
                                            </svg>

                                            {/* HTML Tooltip overlay - using pixel positions */}
                                            {hoveredPoint !== null && pointPositions.length > 0 && (
                                                <div
                                                    className="absolute pointer-events-none"
                                                    style={{
                                                        left: `${pointPositions[0].x}px`,
                                                        top: `${pointPositions[0].y}px`,
                                                        transform: 'translate(-50%, calc(-100% - 12px))',
                                                        zIndex: 50
                                                    }}
                                                >
                                                    <div
                                                        className="px-3 py-2 rounded-lg"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                                            border: '1px solid rgba(34, 211, 238, 0.5)',
                                                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 211, 238, 0.15)'
                                                        }}
                                                    >
                                                        <p className="text-cyan-300 font-bold text-lg text-center">{hoveredPoint.views}</p>
                                                        <p className="text-neutral-400 text-[10px] text-center">{hoveredPoint.label}</p>
                                                    </div>
                                                    {/* Arrow pointing down */}
                                                    <div
                                                        className="absolute left-1/2 w-3 h-3 rotate-45"
                                                        style={{
                                                            transform: 'translateX(-50%)',
                                                            bottom: '-6px',
                                                            background: '#0f172a',
                                                            borderRight: '1px solid rgba(34, 211, 238, 0.5)',
                                                            borderBottom: '1px solid rgba(34, 211, 238, 0.5)'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* X-axis labels (HTML for proper rendering) */}
                            <div className="flex justify-between px-2 mt-1">
                                {(() => {
                                    const chartData = data?.pageViewsByDay || [];
                                    const step = Math.max(1, Math.ceil(chartData.length / 7));
                                    return chartData
                                        .filter((_, i) => i % step === 0 || i === chartData.length - 1)
                                        .map((day, i) => (
                                            <span key={i} className="text-[10px] sm:text-xs text-neutral-500 font-medium">
                                                {selectedDays > 14 ? day.date.slice(8) : day.label}
                                            </span>
                                        ));
                                })()}
                            </div>

                            {/* Stats overlay */}
                            <div className="absolute top-2 right-2 flex gap-3 text-[10px] sm:text-xs bg-black/30 rounded-lg px-2 py-1">
                                <span className="text-neutral-400">Max: <span className="text-cyan-400 font-semibold">{maxViews}</span></span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Top Pages */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <h3 className="font-semibold text-white mb-4 sm:mb-6 text-sm sm:text-base">Páginas más visitadas</h3>
                    {loading ? (
                        <div className="h-36 sm:h-48 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                            {topPages.slice(0, 6).map((page, idx) => (
                                <div key={page.path}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs sm:text-sm text-neutral-300 truncate pr-2 flex-1">
                                            {page.displayName}
                                        </span>
                                        <span className="text-xs sm:text-sm font-medium text-accent-1 whitespace-nowrap">
                                            {page.visits} <span className="text-neutral-500">({page.percentage}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${page.percentage}%` }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.3 + idx * 0.05, duration: 0.5 }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}
                            {topPages.length === 0 && (
                                <p className="text-sm text-neutral-500">Sin datos de páginas en el periodo.</p>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* CTA Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <h3 className="font-semibold text-white mb-4 sm:mb-6 text-sm sm:text-base">Clics en CTAs</h3>
                    {loading ? (
                        <div className="h-36 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            {ctaEntries.map((cta, idx) => (
                                <div key={cta.action}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs sm:text-sm text-neutral-300 truncate pr-2">{cta.action}</span>
                                        <span className="text-xs sm:text-sm font-medium text-accent-1">{cta.clicks}</span>
                                    </div>
                                    <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${cta.percentage}%` }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.4 + idx * 0.05, duration: 0.5 }}
                                            className="h-full bg-gradient-to-r from-accent-1 to-accent-2 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}

                            {ctaEntries.length === 0 && (
                                <p className="text-sm text-neutral-500">Sin eventos de CTA en el periodo.</p>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Top Referrers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.35 }}
                    className="glass-panel rounded-xl sm:rounded-2xl border border-accent-1/20 p-4 sm:p-6"
                >
                    <h3 className="font-semibold text-white mb-4 sm:mb-6 text-sm sm:text-base">Fuentes de tráfico</h3>
                    {loading ? (
                        <div className="h-36 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                            {referrers.map((ref, idx) => (
                                <motion.div
                                    key={`${ref.source}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + idx * 0.05 }}
                                    className="flex items-center gap-3 p-2 sm:p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <ReferrerIcon source={ref.source} className="flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white">{ref.visits}</p>
                                        <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{ref.displayName}</p>
                                    </div>
                                </motion.div>
                            ))}

                            {referrers.length === 0 && (
                                <p className="col-span-full text-sm text-neutral-500">Sin referers registrados.</p>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
