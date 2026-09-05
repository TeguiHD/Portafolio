"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Star, Grid2X2, List, X, SlidersHorizontal } from "lucide-react";
import { TOOL_ICONS, CATEGORY_CONFIG } from "./ToolIcons";
import { useToolFavorites } from "@/hooks/useToolFavorites";
import type { PublicToolCatalogEntry } from "@/lib/tool-registry";

const CATEGORY_ORDER = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes"];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Mosaico: las herramientas que más se usan ocupan más superficie, para que el
 * catálogo se lea de un vistazo en vez de como una lista uniforme. Al filtrar
 * todas vuelven al mismo tamaño: con pocos resultados la jerarquía estorba.
 */
const HERO_TILES = new Set(["qr", "claves", "quitar-fondo", "json"]);
const WIDE_TILES = new Set(["jwt", "regex", "comprimir-imagen", "subredes", "favicon", "impuestos"]);

function tileClass(slug: string, uniform: boolean): string {
    if (uniform) return "col-span-2";
    if (HERO_TILES.has(slug)) return "col-span-2 sm:row-span-2";
    if (WIDE_TILES.has(slug)) return "col-span-2 sm:col-span-4";
    return "col-span-2";
}

export default function ToolsGrid({ tools }: { tools: PublicToolCatalogEntry[] }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<string | null>(null);
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [view, setView] = useState<"grid" | "list">("grid");
    const { favorites, ready, sessionOnly, toggleFavorite } = useToolFavorites();
    const favoriteCount = tools.filter((tool) => favorites.includes(tool.slug)).length;
    const filtered = useMemo(() => tools.filter((tool) =>
        (!category || tool.category === category) &&
        (!onlyFavorites || favorites.includes(tool.slug)) &&
        normalize(`${tool.name} ${tool.description} ${tool.category} ${tool.slug}`).includes(normalize(query.trim()))
    ), [tools, category, onlyFavorites, favorites, query]);
    const filtering = Boolean(query.trim() || category || onlyFavorites);
    const clear = () => { setQuery(""); setCategory(null); setOnlyFavorites(false); };

    return (
        <section aria-label="Catálogo de herramientas">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1 basis-60">
                    <Search size={18} aria-hidden="true" className="absolute left-4 top-3.5 text-slate-500" />
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar herramientas" placeholder="¿Qué necesitas hacer? Busca una herramienta…" className="h-12 w-full rounded-xl border border-white/10 bg-[#111923] pl-11 pr-12 text-sm text-white placeholder:text-slate-500" />
                    {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="studio-icon-button absolute right-1 top-0.5"><X size={16} /></button>}
                </div>
                <button type="button" disabled={!ready} onClick={() => setOnlyFavorites(!onlyFavorites)} aria-pressed={onlyFavorites} className={`studio-button h-12 ${onlyFavorites ? "border-amber-300/40 bg-amber-300/5 text-amber-200" : ""}`}><Star size={16} aria-hidden="true" className={onlyFavorites ? "fill-amber-300 text-amber-300" : ""} />Mis favoritas <span className="text-slate-400">{favoriteCount}</span></button>
                <div className="flex rounded-xl border border-white/10 bg-[#111923] p-0.5" role="group" aria-label="Vista del catálogo">
                    <button type="button" aria-label="Vista de cuadrícula" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`studio-icon-button ${view === "grid" ? "bg-white/10 text-white" : ""}`}><Grid2X2 size={17} /></button>
                    <button type="button" aria-label="Vista de lista" aria-pressed={view === "list"} onClick={() => setView("list")} className={`studio-icon-button ${view === "list" ? "bg-white/10 text-white" : ""}`}><List size={18} /></button>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Filtrar por categoría">
                <button type="button" onClick={() => setCategory(null)} aria-pressed={category === null} className="studio-segment">Todas <span className="ml-1 text-slate-500">{tools.length}</span></button>
                {CATEGORY_ORDER.map((item) => {
                    const count = tools.filter((tool) => tool.category === item).length;
                    if (!count) return null;
                    return <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(category === item ? null : item)} className="studio-segment">{CATEGORY_CONFIG[item].name}<span className="ml-1.5 text-[10px] text-slate-500">{count}</span></button>;
                })}
            </div>
            <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
                <h2 aria-live="polite" aria-atomic="true" className="text-sm font-medium text-slate-200">{onlyFavorites ? "Tus favoritas" : filtering ? "Resultados" : "Todas las herramientas"}<span className="ml-2 text-xs text-slate-500">{filtered.length}</span></h2>
                {filtering ? <button type="button" onClick={clear} className="flex min-h-11 items-center gap-1.5 text-xs text-slate-400 hover:text-white"><X size={13} aria-hidden="true" />Limpiar filtros</button> : <span className="flex items-center gap-1.5 text-xs text-slate-500"><SlidersHorizontal size={13} aria-hidden="true" />Hechas para el trabajo diario</span>}
            </div>
            {filtered.length ? <div className={view === "grid" ? "grid grid-flow-row-dense auto-rows-[minmax(150px,auto)] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" : "grid gap-2"}>
                {filtered.map((tool) => {
                    const Icon = TOOL_ICONS[tool.slug] ?? Grid2X2;
                    const config = CATEGORY_CONFIG[tool.category] ?? CATEGORY_CONFIG.productividad;
                    const saved = favorites.includes(tool.slug);
                    const hero = view === "grid" && !filtering && HERO_TILES.has(tool.slug);
                    return <article key={tool.id} className={`group relative min-w-0 rounded-xl border border-white/[0.08] bg-[#111923] transition-colors duration-150 hover:border-white/20 hover:bg-[#151f2b] ${view === "grid" ? tileClass(tool.slug, filtering) : ""}`}>
                        <Link href={`/herramientas/${tool.slug}`} className={`tools-tile-enter flex h-full min-w-0 gap-4 rounded-xl p-5 pr-16 ${view === "list" ? "items-center" : "flex-col"}`}>
                            <span className={`flex shrink-0 items-center justify-center rounded-xl border border-white/5 ${hero ? "h-14 w-14" : "h-10 w-10"}`} style={{ backgroundColor: `${config.color}12`, color: config.color }}><Icon className={hero ? "h-7 w-7" : "h-5 w-5"} aria-hidden="true" /></span>
                            <div className="min-w-0 flex-1">
                                <h3 className={`font-semibold text-white ${hero ? "text-base" : "text-sm"}`}>{tool.name}</h3>
                                <p className={`mt-2 text-xs leading-relaxed text-slate-400 ${view === "grid" && !hero ? "min-h-10" : ""}`}>{tool.description}</p>
                                <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{config.name}{tool.slug === "qr" && <span className="rounded bg-violet-400/10 px-1.5 py-0.5 text-violet-300">3D / AR</span>}</span>
                            </div>
                            <ArrowUpRight size={16} aria-hidden="true" className="absolute bottom-5 right-5 text-slate-600 transition-colors group-hover:text-teal-300" />
                        </Link>
                        <button type="button" disabled={!ready} onClick={() => toggleFavorite(tool.slug)} aria-label={`${saved ? "Quitar de" : "Añadir a"} favoritas: ${tool.name}`} aria-pressed={saved} className="studio-icon-button absolute right-2 top-2"><Star size={17} aria-hidden="true" className={saved ? "fill-amber-300 text-amber-300" : ""} /></button>
                    </article>;
                })}
            </div> : <div className="studio-panel px-5 py-14 text-center"><Search className="mx-auto mb-4 h-8 w-8 text-slate-500" aria-hidden="true" /><h3 className="text-lg font-medium text-white">{onlyFavorites && !favoriteCount ? "Tu colección empieza aquí" : "Sin resultados"}</h3><p className="mx-auto mb-5 mt-2 max-w-sm text-sm text-slate-400">{onlyFavorites && !favoriteCount ? "Aún no tienes favoritas. Guarda las herramientas que más usas con la estrella." : "Prueba con otro nombre o selecciona una categoría diferente."}</p><button type="button" onClick={clear} className="studio-button">Ver todas las herramientas</button></div>}
            <p role="status" className="mt-4 text-xs leading-relaxed text-slate-500">{sessionOnly ? "Tu navegador no permite guardar: las favoritas durarán mientras esta página siga abierta." : "Tus favoritas se guardan solo en este navegador. No necesitas una cuenta."}</p>
        </section>
    );
}
