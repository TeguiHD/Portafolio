"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { TOOL_ICONS, CATEGORY_ICONS, CATEGORY_CONFIG } from "./ToolIcons";

// Types
interface Tool {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
}

interface ToolsGridProps {
    tools: Tool[];
}

// Category order
const CATEGORY_ORDER = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes"];

// Chevron for mobile cards
const ChevronRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

export default function ToolsGrid({ tools }: ToolsGridProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isSticky, setIsSticky] = useState(false);
    const stickyRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Sticky observer
    useEffect(() => {
        const el = stickyRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsSticky(!entry.isIntersecting),
            { threshold: 1, rootMargin: "-65px 0px 0px 0px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Scroll active category pill into view
    const scrollCategoryIntoView = useCallback((cat: string | null) => {
        if (!scrollContainerRef.current) return;
        const id = cat ?? "__all";
        const btn = scrollContainerRef.current.querySelector(`[data-cat="${id}"]`) as HTMLElement;
        if (btn) {
            btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, []);

    const handleCategoryClick = useCallback((cat: string | null) => {
        setSelectedCategory(prev => {
            const next = prev === cat ? null : cat;
            scrollCategoryIntoView(next);
            if (next && window.innerWidth < 640) {
                setTimeout(() => {
                    const section = document.getElementById(`cat-${next}`);
                    section?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
            }
            return next;
        });
    }, [scrollCategoryIntoView]);

    // Count tools per category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        CATEGORY_ORDER.forEach(cat => {
            counts[cat] = tools.filter(t => t.category === cat).length;
        });
        counts["all"] = tools.length;
        return counts;
    }, [tools]);

    // Filter tools
    const filteredTools = useMemo(() => {
        let result = [...tools];
        if (selectedCategory) {
            result = result.filter(t => t.category === selectedCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [tools, searchQuery, selectedCategory]);

    // Group by category
    const toolsByCategory = useMemo(() => {
        return CATEGORY_ORDER.reduce((acc, category) => {
            acc[category] = filteredTools.filter(t => t.category === category);
            return acc;
        }, {} as Record<string, Tool[]>);
    }, [filteredTools]);

    return (
        <div>
            {/* Sentinel for sticky detection */}
            <div ref={stickyRef} className="h-0" />

            {/* Sticky Search + Category Bar */}
            <div className={`sticky top-16 z-40 transition-all duration-300 -mx-4 sm:-mx-6 px-4 sm:px-6 ${isSticky ? "bg-[#0F1724]/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20 py-3" : "py-0"}`}>
                {/* Search */}
                <div className="relative max-w-xl mx-auto mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar herramientas..."
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/40 focus:border-[#FF8A00]/30 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Horizontally scrollable category pills */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center sm:overflow-visible"
                >
                    {/* All pill */}
                    <button
                        data-cat="__all"
                        onClick={() => handleCategoryClick(null)}
                        className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === null
                            ? "bg-white/[0.12] text-white ring-1 ring-white/20"
                            : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
                            }`}
                    >
                        Todas
                        <span className="tabular-nums text-[10px] opacity-60">{categoryCounts["all"]}</span>
                    </button>

                    {CATEGORY_ORDER.map((category) => {
                        const config = CATEGORY_CONFIG[category];
                        const CategoryIcon = CATEGORY_ICONS[category];
                        const isSelected = selectedCategory === category;
                        const count = categoryCounts[category];
                        if (count === 0) return null;

                        return (
                            <button
                                key={category}
                                data-cat={category}
                                onClick={() => handleCategoryClick(isSelected ? null : category)}
                                className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${isSelected
                                    ? "ring-1"
                                    : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
                                    }`}
                                style={isSelected ? {
                                    backgroundColor: `${config.color}18`,
                                    color: config.color,
                                    // @ts-expect-error - CSS custom property
                                    "--tw-ring-color": `${config.color}50`,
                                } : undefined}
                            >
                                {CategoryIcon && <CategoryIcon className="w-3.5 h-3.5" />}
                                <span className="hidden min-[400px]:inline">{config.name}</span>
                                <span className="min-[400px]:hidden">{config.name.slice(0, 4)}.</span>
                                <span className="tabular-nums text-[10px] opacity-60">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filter info bar */}
            {(searchQuery || selectedCategory) && (
                <div className="flex items-center justify-between mt-5 mb-2 px-1">
                    <p className="text-xs text-neutral-500">
                        {filteredTools.length === 0
                            ? "Sin resultados"
                            : `${filteredTools.length} herramienta${filteredTools.length !== 1 ? "s" : ""}`}
                        {searchQuery && (
                            <span> &middot; &ldquo;<span className="text-neutral-300">{searchQuery}</span>&rdquo;</span>
                        )}
                    </p>
                    <button
                        onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                        className="text-xs text-neutral-500 hover:text-white transition-colors underline underline-offset-2"
                    >
                        Limpiar
                    </button>
                </div>
            )}

            {/* Tools by Category */}
            {filteredTools.length > 0 ? (
                <div className="mt-8 space-y-10 sm:space-y-14">
                    {CATEGORY_ORDER.map((category) => {
                        const categoryTools = toolsByCategory[category];
                        if (!categoryTools || categoryTools.length === 0) return null;

                        const config = CATEGORY_CONFIG[category];
                        const CategoryIcon = CATEGORY_ICONS[category];

                        return (
                            <section key={category} id={`cat-${category}`} className="scroll-mt-36 tools-section-fade">
                                {/* Category header */}
                                <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
                                    <div
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${config.color}15` }}
                                    >
                                        {CategoryIcon && (
                                            <CategoryIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" style={{ color: config.color }} />
                                        )}
                                    </div>
                                    <h2 className="text-base sm:text-lg font-bold text-white">{config.name}</h2>
                                    <span className="text-neutral-600 text-xs font-medium">{categoryTools.length}</span>
                                    <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(to right, ${config.color}20, transparent)` }} />
                                </div>

                                {/* MOBILE: horizontal list cards */}
                                <div className="flex flex-col gap-2 sm:hidden">
                                    {categoryTools.map((tool) => {
                                        const ToolIcon = TOOL_ICONS[tool.slug];
                                        return (
                                            <Link
                                                key={tool.id}
                                                href={`/herramientas/${tool.slug}` as never}
                                                className="group flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] active:scale-[0.98] active:bg-white/[0.06] transition-all"
                                            >
                                                {/* Icon */}
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `${config.color}12` }}
                                                >
                                                    {ToolIcon ? (
                                                        <ToolIcon className="w-5 h-5" style={{ color: config.color }} />
                                                    ) : (
                                                        <DefaultToolIcon color={config.color} />
                                                    )}
                                                </div>
                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-medium text-white truncate">{tool.name}</h3>
                                                    <p className="text-xs text-neutral-500 truncate mt-0.5">{tool.description}</p>
                                                </div>
                                                {/* Chevron */}
                                                <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0 group-active:translate-x-0.5 transition-transform" />
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* DESKTOP: card grid */}
                                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryTools.map((tool, index) => {
                                        const ToolIcon = TOOL_ICONS[tool.slug];
                                        return (
                                            <Link
                                                key={tool.id}
                                                href={`/herramientas/${tool.slug}` as never}
                                                className="group relative flex flex-col p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 hover:shadow-xl hover:shadow-black/10 tools-card-enter"
                                                style={{ animationDelay: `${index * 40}ms` }}
                                            >
                                                {/* Top row: icon + arrow */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div
                                                        className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                                                        style={{ backgroundColor: `${config.color}12` }}
                                                    >
                                                        {ToolIcon ? (
                                                            <ToolIcon className="w-5 h-5" style={{ color: config.color }} />
                                                        ) : (
                                                            <DefaultToolIcon color={config.color} />
                                                        )}
                                                    </div>
                                                    {/* Hover arrow */}
                                                    <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: config.color }}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-[15px] font-semibold text-white mb-1.5 group-hover:text-white/90">{tool.name}</h3>

                                                {/* Description */}
                                                <p className="text-[13px] text-neutral-400 line-clamp-2 leading-relaxed flex-1">{tool.description}</p>

                                                {/* Bottom: category badge */}
                                                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase"
                                                        style={{ color: `${config.color}90` }}
                                                    >
                                                        {CategoryIcon && <CategoryIcon className="w-3 h-3" style={{ color: config.color }} />}
                                                        {config.name}
                                                    </span>
                                                </div>

                                                {/* Hover gradient border effect */}
                                                <div
                                                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${config.color}08, transparent 40%, ${config.color}05)`,
                                                    }}
                                                />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                /* Empty state */
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1.5">Sin resultados</h3>
                    <p className="text-sm text-neutral-500 mb-6 max-w-xs mx-auto">
                        No encontramos herramientas con esos filtros. Intenta con otro término.
                    </p>
                    <button
                        onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                        className="px-5 py-2 text-sm font-medium bg-white/[0.06] text-white rounded-lg border border-white/[0.1] hover:bg-white/[0.1] transition-colors"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* Styles */}
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes toolsCardEnter {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tools-card-enter {
                    animation: toolsCardEnter 0.35s ease-out both;
                }
                .tools-section-fade {
                    animation: toolsSectionFade 0.3s ease-out;
                }
                @keyframes toolsSectionFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// Default tool icon fallback
function DefaultToolIcon({ color }: { color: string }) {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}
