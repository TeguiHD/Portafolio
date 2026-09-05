"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Grid2X2, Search, Star, PanelLeftClose, PanelLeftOpen, Box } from "lucide-react";
import { TOOL_ICONS, CATEGORY_CONFIG } from "./ToolIcons";
import { useToolFavorites } from "@/hooks/useToolFavorites";
import type { PublicToolCatalogEntry } from "@/lib/tool-registry";

export function ToolsWorkspace({ tools, children }: { tools: PublicToolCatalogEntry[]; children: React.ReactNode }) {
    const pathname = usePathname();
    const slug = pathname.split("/")[2];
    const current = tools.find((tool) => tool.slug === slug);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const toggleRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const { favorites, ready, sessionOnly, toggleFavorite } = useToolFavorites();
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const visible = tools.filter((tool) => normalize(`${tool.name} ${tool.category}`).includes(normalize(query)));

    useEffect(() => { setOpen(false); setQuery(""); }, [pathname]);
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setOpen(true);
                requestAnimationFrame(() => searchRef.current?.focus());
            }
            if (event.key === "Escape" && open) {
                setOpen(false);
                toggleRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open]);

    return (
        <div className="tools-workspace min-h-screen bg-[#0b1017] text-slate-300">
            <a href="#tools-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal-300 focus:p-3 focus:text-slate-950">Ir a la herramienta</a>
            <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0d131d] px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <button ref={toggleRef} type="button" aria-label={open ? "Cerrar navegación de herramientas" : "Abrir navegación de herramientas"} aria-expanded={open} aria-controls="tools-sidebar" onClick={() => setOpen(!open)} className="studio-icon-button tools-nav-toggle">
                        {open ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
                    </button>
                    <Link href="/herramientas" className="flex min-h-11 items-center gap-2.5 font-semibold tracking-tight text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-300/10 font-mono text-sm text-teal-300">N/</span>
                        <span>tools<span className="text-teal-300">.</span></span>
                    </Link>
                    <span className="hidden h-5 w-px bg-white/10 sm:block" />
                    <span className="hidden truncate text-xs text-slate-400 sm:block">{current?.name ?? "Tu espacio de trabajo"}</span>
                </div>
                <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 text-xs text-slate-400 hover:text-white">Portafolio <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </header>
            <aside id="tools-sidebar" aria-label="Navegación de herramientas" className={`${open ? "block" : "hidden"} fixed bottom-0 left-0 top-16 z-40 w-full overflow-y-auto border-r border-white/[0.08] bg-[#0d131d] p-4 sm:w-72 xl:block xl:w-60`}>
                <Link href="/herramientas" onClick={() => setOpen(false)} aria-current={!slug ? "page" : undefined} className={`mb-5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${!slug ? "bg-teal-300/10 text-teal-200" : "text-slate-300 hover:bg-white/5"}`}><Grid2X2 size={17} aria-hidden="true" />Todas las herramientas<span className="ml-auto text-xs text-slate-500">{tools.length}</span></Link>
                <div className="relative mb-5">
                    <Search size={15} aria-hidden="true" className="absolute left-3 top-3.5 text-slate-500" />
                    <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar en la navegación" placeholder="Cambiar de herramienta" className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 pl-9 pr-2 text-xs text-white placeholder:text-slate-500" />
                </div>
                {!query && <Link href="/herramientas/qr?tipo=ar" onClick={() => setOpen(false)} className="mb-6 flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-3 text-sm text-violet-200"><Box size={18} aria-hidden="true" /><span>QR + realidad aumentada<span className="mt-0.5 block text-[11px] text-slate-400">Del modelo 3D a tu espacio</span></span></Link>}
                {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                    const items = visible.filter((tool) => tool.category === category);
                    if (!items.length) return null;
                    return <div key={category} className="mb-5"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{config.name}</p><div className="space-y-0.5">{items.map((tool) => {
                        const Icon = TOOL_ICONS[tool.slug] ?? Grid2X2;
                        return <Link key={tool.slug} href={`/herramientas/${tool.slug}`} onClick={() => setOpen(false)} aria-current={slug === tool.slug ? "page" : undefined} className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-xs transition-colors ${slug === tool.slug ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="flex-1">{tool.name}</span>{favorites.includes(tool.slug) && <Star size={12} aria-label="Favorita" className="fill-amber-300 text-amber-300" />}</Link>;
                    })}</div></div>;
                })}
                {!visible.length && <p role="status" className="px-3 text-sm text-slate-400">No hay herramientas con ese nombre.</p>}
                <p className="mt-6 border-t border-white/10 px-3 pt-4 text-[11px] leading-relaxed text-slate-500">Creado por Nicoholas Lopetegui.<br />Atajo de búsqueda: Ctrl / ⌘ + K</p>
            </aside>
            <div id="tools-content" tabIndex={-1} className="min-w-0 pt-16 outline-none xl:pl-60">
                {current && <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/[0.06] px-4 sm:px-8">
                    <Link href="/herramientas" className="text-xs text-slate-400 hover:text-white">Catálogo / <span className="text-slate-200">{CATEGORY_CONFIG[current.category]?.name ?? "Herramientas"}</span></Link>
                    <button type="button" disabled={!ready} onClick={() => toggleFavorite(current.slug)} aria-pressed={favorites.includes(current.slug)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-slate-300"><Star size={15} aria-hidden="true" className={favorites.includes(current.slug) ? "fill-amber-300 text-amber-300" : ""} />{favorites.includes(current.slug) ? "Guardada" : "Guardar herramienta"}</button>
                </div>}
                {current && sessionOnly && <p role="status" className="px-6 pt-3 text-xs text-amber-200">El navegador no permite conservar tus favoritas al cerrar esta página.</p>}
                {children}
            </div>
        </div>
    );
}
