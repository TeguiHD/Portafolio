"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Star, Grid2X2, List, X, Clock3 } from "lucide-react";
import { ToolArtwork } from "./ToolArtwork";
import { useRecentTools } from "@/hooks/useRecentTools";
import { TOOL_ICONS, CATEGORY_CONFIG, CATEGORY_ICONS } from "./ToolIcons";
import { useToolFavorites } from "@/hooks/useToolFavorites";
import type { PublicToolCatalogEntry } from "@/lib/tool-registry";

const CATEGORY_ORDER = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes"];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const FEATURED = ["quitar-fondo", "recortar-imagen", "qr", "json"];
const SHORT_DESCRIPTIONS: Record<string, string> = {
    "quitar-fondo": "Un fondo menos. Todas las posibilidades.",
    "recortar-imagen": "El encuadre exacto, a tu manera.",
    qr: "Tu enlace, listo para escanear.",
    json: "Del caos a un JSON legible.",
};

export default function ToolsGrid({ tools }: { tools: PublicToolCatalogEntry[] }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<string | null>(null);
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [view, setView] = useState<"grid" | "list">("grid");
    const { favorites, ready, sessionOnly, toggleFavorite } = useToolFavorites();
    const { recents, clearRecents } = useRecentTools();
    const recentTools = recents.flatMap(slug => { const tool = tools.find(item => item.slug === slug); return tool ? [tool] : []; });
    const favoriteCount = tools.filter((tool) => favorites.includes(tool.slug)).length;
    const filtered = useMemo(() => tools.filter((tool) =>
        (!category || tool.category === category) &&
        (!onlyFavorites || favorites.includes(tool.slug)) &&
        normalize(`${tool.name} ${tool.description} ${tool.category} ${tool.slug}`).includes(normalize(query.trim()))
    ), [tools, category, onlyFavorites, favorites, query]);
    const filtering = Boolean(query.trim() || category || onlyFavorites);
    const ordered = filtering ? filtered : [...filtered].sort((a, b) => {
        const rank = (slug: string) => { const index = FEATURED.indexOf(slug); return index < 0 ? FEATURED.length : index; };
        return rank(a.slug) - rank(b.slug);
    });
    const clear = () => { setQuery(""); setCategory(null); setOnlyFavorites(false); };

    return (
        <section aria-label="Catálogo de herramientas">
            <div className="tools-catalog-search flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1 basis-60">
                    <Search size={18} aria-hidden="true" className="absolute left-4 top-3.5 text-slate-500" />
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar herramientas" placeholder="¿Qué necesitas hacer?" autoComplete="off" onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} className="h-12 w-full rounded-xl border border-white/10 bg-[#111923] pl-11 pr-12 text-sm text-white placeholder:text-slate-500" />
                    {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="studio-icon-button absolute right-1 top-0.5"><X size={16} /></button>}
                </div>
                <button type="button" disabled={!ready} onClick={() => setOnlyFavorites(!onlyFavorites)} aria-pressed={onlyFavorites} className={`studio-button h-12 ${onlyFavorites ? "border-amber-300/40 bg-amber-300/5 text-amber-200" : ""}`}><Star size={16} aria-hidden="true" className={onlyFavorites ? "fill-amber-300 text-amber-300" : ""} />Mis favoritas <span className="text-slate-400">{favoriteCount}</span></button>
                <div className="flex rounded-xl border border-white/10 bg-[#111923] p-0.5" role="group" aria-label="Vista del catálogo">
                    <button type="button" aria-label="Vista de cuadrícula" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`studio-icon-button ${view === "grid" ? "bg-white/10 text-white" : ""}`}><Grid2X2 size={17} /></button>
                    <button type="button" aria-label="Vista de lista" aria-pressed={view === "list"} onClick={() => setView("list")} className={`studio-icon-button ${view === "list" ? "bg-white/10 text-white" : ""}`}><List size={18} /></button>
                </div>
            </div>
            <div className="tools-category-tabs mt-3 flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Filtrar por categoría">
                <button type="button" onClick={() => setCategory(null)} aria-pressed={category === null} className="studio-segment">Todas <span className="ml-1 text-slate-500">{tools.length}</span></button>
                {CATEGORY_ORDER.map((item) => {
                    const count = tools.filter((tool) => tool.category === item).length;
                    if (!count) return null;
                    const CategoryIcon = CATEGORY_ICONS[item];
                    return <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(category === item ? null : item)} className="studio-segment inline-flex shrink-0 items-center gap-1.5">{CategoryIcon && <CategoryIcon className="h-4 w-4" aria-hidden="true" />}{CATEGORY_CONFIG[item].name}<span className="ml-1.5 text-[10px] text-slate-500">{count}</span></button>;
                })}
            </div>
            {!filtering && recentTools.length > 0 && <div aria-label="Herramientas recientes" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                <span className="inline-flex items-center gap-1.5 px-2 text-[11px] text-slate-400"><Clock3 size={13} aria-hidden="true" />Recientes</span>
                {recentTools.map(tool => { const Icon = TOOL_ICONS[tool.slug] ?? Grid2X2; return <Link key={tool.slug} href={`/herramientas/${tool.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-teal-200"><Icon className="h-4 w-4" aria-hidden="true" />{tool.name}</Link>; })}
                <button type="button" onClick={clearRecents} aria-label="Borrar herramientas recientes" title="Borrar recientes" className="studio-icon-button ml-auto"><X size={14} aria-hidden="true" /></button>
            </div>}
            <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                <h2 aria-live="polite" aria-atomic="true" className="text-sm font-medium text-slate-200">{onlyFavorites ? "Tus favoritas" : filtering ? "Resultados" : "Todas las herramientas"}<span className="ml-2 text-xs text-slate-500">{filtered.length}</span></h2>
                {filtering ? <button type="button" onClick={clear} className="flex min-h-11 items-center gap-1.5 text-xs text-slate-400 hover:text-white"><X size={13} aria-hidden="true" />Limpiar filtros</button> : <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-1 w-1 rounded-full bg-teal-300" />Listas para usar</span>}
            </div>
            {filtered.length ? <div className={view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1600px]:grid-cols-4" : "grid gap-2"}>
                {ordered.map((tool) => {
                    const Icon = TOOL_ICONS[tool.slug] ?? Grid2X2;
                    const config = CATEGORY_CONFIG[tool.category] ?? CATEGORY_CONFIG.productividad;
                    const saved = favorites.includes(tool.slug);
                    const hero = view === "grid" && !filtering && FEATURED.includes(tool.slug);
                    return <article key={tool.id} className={`tool-tile group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111923] transition-colors duration-200 hover:border-white/20 hover:bg-[#151f2b] ${hero ? "tool-tile-featured" : ""}`}>
                        <Link href={`/herramientas/${tool.slug}`} className={`tools-tile-enter flex h-full min-w-0 gap-3 rounded-2xl p-4 pr-14 ${view === "list" || !hero ? "items-center" : "flex-col"}`}>
                            {hero && <ToolArtwork slug={tool.slug} />}
                            <span className={`tool-glyph flex shrink-0 items-center justify-center rounded-xl border border-white/5 ${hero ? "absolute left-4 top-4 h-9 w-9" : "h-11 w-11"}`} style={{ backgroundColor: `${config.color}12`, color: config.color }}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                            <div className="min-w-0 flex-1">
                                <h3 className={`font-semibold text-white ${hero ? "text-base" : "text-sm"}`}>{tool.name}</h3>
                                <p className={`mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2`}>{SHORT_DESCRIPTIONS[tool.slug] ?? tool.description}</p>
                                <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{config.name}</span>
                            </div>
                            <ArrowUpRight size={16} aria-hidden="true" className="absolute bottom-5 right-5 text-slate-500 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-teal-300" />
                        </Link>
                        <button type="button" disabled={!ready} onClick={() => toggleFavorite(tool.slug)} aria-label={`${saved ? "Quitar de" : "Añadir a"} favoritas: ${tool.name}`} aria-pressed={saved} title={saved ? "Quitar de favoritas" : "Guardar en favoritas"} className="studio-icon-button absolute right-2 top-2"><Star size={17} aria-hidden="true" className={saved ? "fill-amber-300 text-amber-300" : ""} /></button>
                    </article>;
                })}
            </div> : <div className="studio-panel px-5 py-14 text-center"><Search className="mx-auto mb-4 h-8 w-8 text-slate-500" aria-hidden="true" /><h3 className="text-lg font-medium text-white">{onlyFavorites && !favoriteCount ? "Tu colección empieza aquí" : "Sin resultados"}</h3><p className="mx-auto mb-5 mt-2 max-w-sm text-sm text-slate-400">{onlyFavorites && !favoriteCount ? "Aún no tienes favoritas. Guarda las herramientas que más usas con la estrella." : "Prueba con otro nombre o selecciona una categoría diferente."}</p><button type="button" onClick={clear} className="studio-button">Ver todas las herramientas</button></div>}
            <p role="status" className="mt-4 text-xs leading-relaxed text-slate-500">{sessionOnly ? "Tu navegador no permite guardar: las favoritas durarán mientras esta página siga abierta." : "Favoritas y recientes guardadas en este navegador."}</p>
        </section>
    );
}
