"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { TOOL_ICONS, CATEGORY_ICONS, CATEGORY_CONFIG } from "./ToolIcons";

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

const CATEGORY_ORDER = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes"];

/**
 * Bento: jerarquía por tamaño, todo visible en un solo scroll.
 * Las herramientas de mayor tráfico van grandes; el resto compacto, y
 * `grid-flow-dense` rellena los huecos para que no queden agujeros.
 */
type TileSize = "hero" | "wide" | "sm";

const TILE_SIZE: Record<string, TileSize> = {
    qr: "hero",
    claves: "hero",
    "quitar-fondo": "hero",
    json: "hero",
    jwt: "wide",
    regex: "wide",
    "comprimir-imagen": "wide",
    subredes: "wide",
    favicon: "wide",
    impuestos: "wide",
};

const SIZE_CLASS: Record<TileSize, string> = {
    hero: "col-span-2 row-span-2",
    wide: "col-span-2",
    sm: "col-span-1",
};

const ArrowIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
);

export default function ToolsGrid({ tools }: ToolsGridProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isSticky, setIsSticky] = useState(false);
    const stickyRef = useRef<HTMLDivElement>(null);

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

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: tools.length };
        for (const cat of CATEGORY_ORDER) counts[cat] = tools.filter((t) => t.category === cat).length;
        return counts;
    }, [tools]);

    const filteredTools = useMemo(() => {
        let result = tools;
        if (selectedCategory) result = result.filter((t) => t.category === selectedCategory);
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [tools, searchQuery, selectedCategory]);

    const isFiltering = Boolean(searchQuery.trim() || selectedCategory);

    return (
        <div>
            <div ref={stickyRef} className="h-0" />

            {/* Barra pegajosa: búsqueda + categorías */}
            <div
                className={`sticky top-16 z-40 -mx-4 px-4 transition-all duration-300 sm:-mx-6 sm:px-6 ${
                    isSticky
                        ? "border-b border-white/5 bg-[#0F1724]/95 py-3 shadow-lg shadow-black/20 backdrop-blur-xl"
                        : "py-0"
                }`}
            >
                <div className="relative mx-auto mb-3 max-w-xl">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar entre las herramientas…"
                        aria-label="Buscar herramientas"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 transition-all focus:border-[#FF8A00]/30 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/40"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            aria-label="Limpiar búsqueda"
                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-500 transition-colors hover:text-white"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        aria-pressed={selectedCategory === null}
                        className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                            selectedCategory === null
                                ? "bg-white/[0.12] text-white ring-1 ring-white/20"
                                : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
                        }`}
                    >
                        Todas
                        <span className="text-[10px] tabular-nums opacity-60">{categoryCounts.all}</span>
                    </button>

                    {CATEGORY_ORDER.map((category) => {
                        const config = CATEGORY_CONFIG[category];
                        const CategoryIcon = CATEGORY_ICONS[category];
                        const count = categoryCounts[category];
                        if (!count) return null;
                        const isSelected = selectedCategory === category;
                        return (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setSelectedCategory(isSelected ? null : category)}
                                aria-pressed={isSelected}
                                className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                                    isSelected ? "ring-1" : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
                                }`}
                                style={
                                    isSelected
                                        ? {
                                              backgroundColor: `${config.color}18`,
                                              color: config.color,
                                              // @ts-expect-error - CSS custom property
                                              "--tw-ring-color": `${config.color}50`,
                                          }
                                        : undefined
                                }
                            >
                                {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                                <span className="hidden min-[400px]:inline">{config.name}</span>
                                <span className="min-[400px]:hidden">{config.name.slice(0, 4)}.</span>
                                <span className="text-[10px] tabular-nums opacity-60">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Encabezado de sección: es la señal de "hay 29" */}
            <div className="mb-5 mt-8 flex items-end justify-between gap-4 px-1">
                <h2 className="text-lg font-bold text-white sm:text-xl">
                    {isFiltering ? "Resultados" : "Todas las herramientas"}
                    <span className="ml-2 text-sm font-medium tabular-nums text-neutral-500">
                        {filteredTools.length}
                    </span>
                </h2>
                {isFiltering && (
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                        className="text-xs text-neutral-500 underline underline-offset-2 transition-colors hover:text-white"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {filteredTools.length > 0 ? (
                <div className="grid grid-flow-row-dense grid-cols-2 auto-rows-[120px] gap-3 sm:grid-cols-4 sm:auto-rows-[150px] sm:gap-4 lg:grid-cols-6">
                    {filteredTools.map((tool, index) => {
                        const config = CATEGORY_CONFIG[tool.category] ?? CATEGORY_CONFIG["productividad"];
                        const ToolIcon = TOOL_ICONS[tool.slug];
                        const CategoryIcon = CATEGORY_ICONS[tool.category];
                        // Al filtrar, todo pasa a compacto: una lista uniforme se escanea más rápido.
                        const size: TileSize = isFiltering ? "wide" : (TILE_SIZE[tool.slug] ?? "sm");
                        const isHero = size === "hero";
                        const isWide = size === "wide";

                        return (
                            <Link
                                key={tool.id}
                                href={`/herramientas/${tool.slug}` as never}
                                className={`tools-tile-enter group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.045] hover:shadow-2xl hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A00]/60 sm:p-5 ${SIZE_CLASS[size]}`}
                                style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
                            >
                                {/* Halo de categoría, solo en las grandes: sin blur, sin 3D */}
                                {isHero && (
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.16] transition-opacity duration-500 group-hover:opacity-30"
                                        style={{ background: `radial-gradient(closest-side, ${config.color}, transparent)` }}
                                    />
                                )}

                                <div className="relative flex items-start justify-between">
                                    <div
                                        className={`flex shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${isHero ? "h-12 w-12" : "h-10 w-10"}`}
                                        style={{ backgroundColor: `${config.color}14` }}
                                    >
                                        {ToolIcon ? (
                                            <ToolIcon className={isHero ? "h-6 w-6" : "h-5 w-5"} style={{ color: config.color }} aria-hidden="true" />
                                        ) : (
                                            <DefaultToolIcon color={config.color} />
                                        )}
                                    </div>
                                    {(isHero || isWide) && (
                                        <ArrowIcon
                                            className="h-5 w-5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                                            style={{ color: config.color }}
                                        />
                                    )}
                                </div>

                                <div className="relative mt-auto pt-3">
                                    <h3 className={`font-semibold text-white ${isHero ? "text-lg sm:text-xl" : isWide ? "text-[15px]" : "text-sm"}`}>
                                        {tool.name}
                                    </h3>
                                    {size !== "sm" && (
                                        <p
                                            className={`mt-1 leading-relaxed text-neutral-400 ${
                                                isHero ? "line-clamp-3 text-sm" : "line-clamp-2 text-[13px]"
                                            }`}
                                        >
                                            {tool.description}
                                        </p>
                                    )}
                                    {isHero && (
                                        <span
                                            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide"
                                            style={{ color: `${config.color}B0` }}
                                        >
                                            {CategoryIcon && <CategoryIcon className="h-3 w-3" aria-hidden="true" />}
                                            {config.name}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                        <svg className="h-8 w-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="mb-1.5 text-lg font-semibold text-white">Sin resultados</h3>
                    <p className="mx-auto mb-6 max-w-xs text-sm text-neutral-500">
                        No encontramos herramientas con esos filtros. Intenta con otro término.
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                        className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes toolsTileEnter {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tools-tile-enter { animation: toolsTileEnter 0.35s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .tools-tile-enter { animation: none; }
                }
            `}</style>
        </div>
    );
}

function DefaultToolIcon({ color }: { color: string }) {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color }} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}
