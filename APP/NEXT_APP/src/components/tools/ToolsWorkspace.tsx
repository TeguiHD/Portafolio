"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Grid2X2, Search, Star, PanelLeftClose, PanelLeftOpen, X, Command } from "lucide-react";
import { TOOL_ICONS, CATEGORY_CONFIG } from "./ToolIcons";
import { useToolFavorites } from "@/hooks/useToolFavorites";
import { useRecentTools } from "@/hooks/useRecentTools";
import { ToolsMark } from "./ToolsMark";
import type { PublicToolCatalogEntry } from "@/lib/tool-registry";

export function ToolsWorkspace({ tools, children }: { tools: PublicToolCatalogEntry[]; children: React.ReactNode }) {
    const pathname = usePathname();
    const previousPath = useRef(pathname);
    const slug = pathname.split("/")[2];
    const current = tools.find((tool) => tool.slug === slug);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [compact, setCompact] = useState(true);
    const sidebarRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const { favorites, ready, sessionOnly, toggleFavorite } = useToolFavorites();
    useRecentTools(current?.slug);
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const visible = tools.filter((tool) => normalize(`${tool.name} ${tool.category}`).includes(normalize(query)));

    useEffect(() => {
        if (previousPath.current === pathname) return;
        previousPath.current = pathname;
        setOpen(false);
        setQuery("");
    }, [pathname]);
    useEffect(() => {
        const media = window.matchMedia("(min-width: 1280px)");
        const update = () => { setCompact(!media.matches); if (media.matches) setOpen(false); };
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    // On small screens the sidebar is a dialog: keep its focus and scrolling local.
    useEffect(() => {
        if (!open || !compact) return;
        const toggle = toggleRef.current;
        const scrollRoots = [document.documentElement, document.body].map(element => ({
            element,
            value: element.style.getPropertyValue("overflow-y"),
            priority: element.style.getPropertyPriority("overflow-y"),
        }));
        // Global overflow rules use !important; lock both browser scroll roots.
        for (const { element } of scrollRoots) element.style.setProperty("overflow-y", "hidden", "important");
        const frame = requestAnimationFrame(() => searchRef.current?.focus());
        const trapFocus = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;
            const sidebar = sidebarRef.current;
            if (!sidebar) return;
            const controls = [...sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
            const first = controls[0];
            const last = controls.at(-1);
            if (!first || !last) return;
            const current = document.activeElement;
            if (!sidebar.contains(current) || (!event.shiftKey && current === last)) {
                event.preventDefault(); first.focus();
            } else if (event.shiftKey && current === first) {
                event.preventDefault(); last.focus();
            }
        };
        document.addEventListener("keydown", trapFocus);
        return () => {
            cancelAnimationFrame(frame);
            for (const { element, value, priority } of scrollRoots) {
                if (value) element.style.setProperty("overflow-y", value, priority);
                else element.style.removeProperty("overflow-y");
            }
            document.removeEventListener("keydown", trapFocus);
            if (toggle?.getClientRects().length) toggle.focus();
        };
    }, [open, compact]);
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                if (compact) setOpen(true);
                else searchRef.current?.focus();
            }
            if (event.key === "Escape" && open) {
                setOpen(false);
                if (!compact) searchRef.current?.blur();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, compact]);

    return (
        <div className="tools-workspace min-h-screen bg-[#0b1017] text-slate-300">
            <a href="#tools-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal-300 focus:p-3 focus:text-slate-950">Ir a la herramienta</a>
            <header inert={compact && open} className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0d131d] px-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <button ref={toggleRef} type="button" aria-label={open ? "Cerrar navegación de herramientas" : "Abrir navegación de herramientas"} aria-expanded={open} aria-controls="tools-sidebar" onClick={() => setOpen(!open)} className="studio-icon-button tools-nav-toggle">
                        {open ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
                    </button>
                    <Link href="/herramientas" aria-label="Herramientas" className="flex min-h-11 items-center gap-2 text-sm font-semibold tracking-tight text-white sm:text-base">
                        <ToolsMark className="h-8 w-8 shrink-0" />
                        <span>Herramientas</span>
                    </Link>
                    <span className="hidden h-5 w-px bg-white/10 sm:block" />
                    <span className="hidden truncate text-xs text-slate-400 sm:block">{current?.name ?? "Tu espacio de trabajo"}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                    <button type="button" onClick={() => { if (compact) setOpen(true); else searchRef.current?.focus(); }} aria-label="Buscar una herramienta" title="Buscar herramientas (Ctrl / ⌘ K)" className="studio-icon-button"><Search size={18} aria-hidden="true" /></button>
                    {current && <button type="button" disabled={!ready} onClick={() => toggleFavorite(current.slug)} aria-label={favorites.includes(current.slug) ? "Guardada" : "Guardar herramienta"} title={favorites.includes(current.slug) ? "Quitar de favoritas" : "Guardar herramienta"} aria-pressed={favorites.includes(current.slug)} className="studio-icon-button"><Star size={18} aria-hidden="true" className={favorites.includes(current.slug) ? "fill-amber-300 text-amber-300" : ""} /></button>}
                <Link href="/" aria-label="Portafolio" title="Volver al portafolio" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 text-xs text-slate-400 hover:text-white"><span className="hidden sm:inline">Portafolio</span><ArrowUpRight size={17} aria-hidden="true" /></Link>
                </div>
            </header>
            {compact && open && <button type="button" tabIndex={-1} aria-label="Cerrar panel de herramientas" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/60" />}
            <aside ref={sidebarRef} id="tools-sidebar" role={compact && open ? "dialog" : undefined} aria-modal={compact && open ? true : undefined} aria-label="Navegación de herramientas" className={`${open ? "block" : "hidden"} fixed bottom-0 left-0 top-16 z-40 w-full overflow-y-auto border-r border-white/[0.08] bg-[#0d131d] p-4 sm:w-72 xl:block xl:w-60`}>
                {compact && <div className="mb-4 flex items-center justify-between gap-3 xl:hidden"><p className="text-sm font-semibold text-white">Tus herramientas</p><button type="button" aria-label="Cerrar navegación de herramientas" onClick={() => setOpen(false)} className="studio-icon-button"><X size={18} aria-hidden="true" /></button></div>}
                <div className="relative mb-5">
                    <Search size={15} aria-hidden="true" className="absolute left-3 top-3.5 text-slate-500" />
                    <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sidebarRef.current?.querySelector<HTMLAnchorElement>('a[data-tool-link]')?.click(); }} aria-label="Buscar en la navegación" placeholder="Buscar herramienta…" autoComplete="off" className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 pl-9 pr-2 text-xs text-white placeholder:text-slate-500" />
                </div>
                {!query && <Link href="/herramientas" onClick={() => setOpen(false)} aria-current={!slug ? "page" : undefined} className="tools-sidebar-home mb-5 flex min-h-11 items-center gap-2.5 rounded-lg border border-teal-300/10 bg-teal-300/5 px-3 text-xs text-teal-200"><Grid2X2 size={16} aria-hidden="true" />Todas las herramientas<span className="ml-auto text-[10px] text-teal-300/70">{tools.length}</span></Link>}
                {["imágenes", "generación", "conversión", "productividad", "seguridad", "redes"].map((category) => {
                    const config = CATEGORY_CONFIG[category];
                    const items = visible.filter((tool) => tool.category === category);
                    if (!items.length) return null;
                    return <div key={category} className="mb-5"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{config.name}</p><div className="space-y-0.5">{items.map((tool) => {
                        const Icon = TOOL_ICONS[tool.slug] ?? Grid2X2;
                        return <Link data-tool-link key={tool.slug} href={`/herramientas/${tool.slug}`} onClick={() => setOpen(false)} aria-current={slug === tool.slug ? "page" : undefined} className={`tools-sidebar-link flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-xs transition-colors ${slug === tool.slug ? "bg-teal-300/[0.08] text-teal-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="flex-1">{tool.name}</span>{favorites.includes(tool.slug) && <Star size={12} aria-label="Favorita" className="fill-amber-300 text-amber-300" />}</Link>;
                    })}</div></div>;
                })}
                {!visible.length && <p role="status" className="px-3 text-sm text-slate-400">No hay herramientas con ese nombre.</p>}
                <p className="mt-6 flex items-center gap-2 border-t border-white/10 px-3 pt-4 text-[11px] text-slate-400"><Command size={13} aria-hidden="true" /><kbd>Ctrl / ⌘ K</kbd><span className="ml-auto">Buscar</span></p>
            </aside>
            <div inert={compact && open} id="tools-content" tabIndex={-1} className="min-w-0 pt-16 outline-none xl:pl-60">
                {current && sessionOnly && <p role="status" className="px-6 pt-3 text-xs text-amber-200">El navegador no permite conservar tus favoritas al cerrar esta página.</p>}
                {children}
            </div>
        </div>
    );
}
