"use client";

import { useState, useMemo } from "react";
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

// Category order - NEW CATEGORIES
const CATEGORY_ORDER = ["generación", "conversión", "productividad"];

// Search Icon Component
const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

// Clear Icon Component
const ClearIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default function ToolsGrid({ tools }: ToolsGridProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Count tools per category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        CATEGORY_ORDER.forEach(cat => {
            counts[cat] = tools.filter(t => t.category === cat).length;
        });
        counts["all"] = tools.length;
        return counts;
    }, [tools]);

    // Filter tools based on search and category
    const filteredTools = useMemo(() => {
        let result = [...tools];

        // Filter by category
        if (selectedCategory) {
            result = result.filter(t => t.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                t =>
                    t.name.toLowerCase().includes(query) ||
                    t.description.toLowerCase().includes(query)
            );
        }

        return result;
    }, [tools, searchQuery, selectedCategory]);

    // Group filtered tools by category for display
    const toolsByCategory = useMemo(() => {
        return CATEGORY_ORDER.reduce((acc, category) => {
            acc[category] = filteredTools.filter(t => t.category === category);
            return acc;
        }, {} as Record<string, Tool[]>);
    }, [filteredTools]);

    // Count filtered results
    const filteredCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        CATEGORY_ORDER.forEach(cat => {
            counts[cat] = filteredTools.filter(t => t.category === cat).length;
        });
        counts["all"] = filteredTools.length;
        return counts;
    }, [filteredTools]);

    return (
        <div className="space-y-8">
            {/* Search and Filter Bar */}
            <div className="space-y-4">
                {/* Search Input */}
                <div className="relative max-w-xl mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar herramientas..."
                        className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/50 focus:border-transparent transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-white transition-colors"
                        >
                            <ClearIcon />
                        </button>
                    )}
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {/* All Tab */}
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${selectedCategory === null
                            ? "bg-white/15 text-white border border-white/20"
                            : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        Todas
                        <span className={`px-2 py-0.5 rounded-full text-xs ${selectedCategory === null
                            ? "bg-white/20"
                            : "bg-white/5"
                            }`}>
                            {categoryCounts["all"]}
                        </span>
                    </button>

                    {/* Category Tabs */}
                    {CATEGORY_ORDER.map((category) => {
                        const config = CATEGORY_CONFIG[category];
                        const CategoryIcon = CATEGORY_ICONS[category];
                        const isSelected = selectedCategory === category;
                        const count = categoryCounts[category];

                        if (count === 0) return null;

                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(isSelected ? null : category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isSelected
                                    ? "border"
                                    : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10 hover:text-white"
                                    }`}
                                style={isSelected ? {
                                    backgroundColor: `${config.color}20`,
                                    borderColor: `${config.color}50`,
                                    color: config.color,
                                } : undefined}
                            >
                                {CategoryIcon && <CategoryIcon className="w-4 h-4" />}
                                {config.name}
                                <span className={`px-2 py-0.5 rounded-full text-xs ${isSelected
                                    ? "bg-black/20"
                                    : "bg-white/5"
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Results Info */}
            {(searchQuery || selectedCategory) && (
                <div className="text-center text-neutral-400 text-sm">
                    {filteredTools.length === 0 ? (
                        <span>No se encontraron herramientas</span>
                    ) : (
                        <span>
                            Mostrando {filteredTools.length} de {tools.length} herramientas
                            {searchQuery && <span> para &ldquo;<strong className="text-white">{searchQuery}</strong>&rdquo;</span>}
                        </span>
                    )}
                </div>
            )}

            {/* Tools Grid - Grouped by Category */}
            {filteredTools.length > 0 ? (
                <div className="space-y-12">
                    {CATEGORY_ORDER.map((category) => {
                        const categoryTools = toolsByCategory[category];
                        if (!categoryTools || categoryTools.length === 0) return null;

                        const config = CATEGORY_CONFIG[category];
                        const CategoryIcon = CATEGORY_ICONS[category];

                        return (
                            <section key={category} className="animate-fadeIn">
                                {/* Category Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div
                                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.iconBg} border ${config.borderColor} flex items-center justify-center`}
                                    >
                                        {CategoryIcon && (
                                            <CategoryIcon
                                                className="w-5 h-5"
                                                style={{ color: config.color }}
                                            />
                                        )}
                                    </div>
                                    <h2
                                        className="text-xl sm:text-2xl font-bold"
                                        style={{ color: config.color }}
                                    >
                                        {config.name}
                                    </h2>
                                    <span className="text-neutral-500 text-sm">
                                        ({categoryTools.length})
                                    </span>
                                    <div
                                        className="flex-1 h-px ml-4"
                                        style={{ background: `linear-gradient(to right, ${config.color}30, transparent)` }}
                                    />
                                </div>

                                {/* Tools Grid - 2 cols on mobile, 3 on desktop */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                                    {categoryTools.map((tool, index) => {
                                        const ToolIcon = TOOL_ICONS[tool.slug];

                                        return (
                                            <Link
                                                key={tool.id}
                                                href={`/tools/${tool.slug}` as never}
                                                className={`group relative flex flex-col items-center text-center p-4 sm:p-5 sm:items-start sm:text-left rounded-2xl border ${config.borderColor} bg-white/[0.02] sm:bg-gradient-to-br ${config.bgColor} backdrop-blur-sm active:scale-[0.98] sm:active:scale-100 sm:hover:bg-white/10 transition-all duration-200 sm:hover:scale-[1.02] sm:hover:shadow-lg animate-slideUp`}
                                                style={{
                                                    animationDelay: `${index * 50}ms`,
                                                }}
                                            >
                                                {/* Icon */}
                                                <div
                                                    className={`w-12 h-12 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${config.iconBg} border ${config.borderColor} flex items-center justify-center mb-2 sm:mb-4 sm:group-hover:scale-110 transition-transform`}
                                                >
                                                    {ToolIcon ? (
                                                        <ToolIcon
                                                            className="w-6 h-6"
                                                            style={{ color: config.color }}
                                                        />
                                                    ) : (
                                                        <svg
                                                            className="w-6 h-6"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            style={{ color: config.color }}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Title - always visible */}
                                                <h3 className="text-xs sm:text-base font-medium sm:font-semibold text-white sm:mb-1.5 leading-tight">
                                                    {tool.name}
                                                </h3>

                                                {/* Description - desktop only */}
                                                <p className="hidden sm:block text-sm text-neutral-400 line-clamp-2 mb-3">
                                                    {tool.description}
                                                </p>

                                                {/* Category badge - desktop only */}
                                                <span
                                                    className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full border"
                                                    style={{
                                                        borderColor: `${config.color}40`,
                                                        backgroundColor: `${config.color}15`,
                                                        color: config.color,
                                                    }}
                                                >
                                                    {config.name.toLowerCase()}
                                                </span>

                                                {/* Arrow - desktop only */}
                                                <div className="hidden sm:block absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        style={{ color: config.color }}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                /* Empty State */
                <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No se encontraron herramientas</h3>
                    <p className="text-neutral-400 mb-6">Intenta con otro término de búsqueda o categoría</p>
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory(null);
                        }}
                        className="px-6 py-2 bg-[#FF8A00]/20 text-[#FF8A00] rounded-lg border border-[#FF8A00]/30 hover:bg-[#FF8A00]/30 transition-colors"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0; 
                        transform: translateY(20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.4s ease-out both;
                }
            `}</style>
        </div>
    );
}
