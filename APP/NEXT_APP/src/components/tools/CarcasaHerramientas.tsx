"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useToolFavorites } from "@/hooks/useToolFavorites";
import { useRecentTools } from "@/hooks/useRecentTools";
import { COLOR_CATEGORIA, ICONOS } from "@/modules/landing/viva/siglas";
import type { PublicToolCatalogEntry } from "@/lib/tool-registry";
import { coincide } from "./buscar-herramientas";
import "./carcasa.css";
import { sinCortes } from "@/lib/sin-cortes";
import { useAtajo } from "@/hooks/useAtajo";

const FAMILIAS = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes", "chile"];
const mayuscula = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/**
 * El armazón de /herramientas dentro del esqueleto del sitio (barra, pie y materia).
 * Reemplaza al espacio de trabajo anterior (barra propia y panel lateral): en cada herramienta, a la derecha de las migas
 * (que ya dicen dónde se está), quedan «Buscar» (también con Ctrl/⌘ K) y la estrella de favorita. La búsqueda es un <dialog> modal agrupado por familia.
 * Conserva lo que hacía el anterior: registrar la visita en recientes, marcar favorita y avisar si no se pueden guardar.
 */
export function CarcasaHerramientas({ tools, relacionadas = {}, children }: { tools: PublicToolCatalogEntry[]; relacionadas?: Record<string, string[]>; children: React.ReactNode }) {
    const ruta = usePathname();
    const slug = ruta.split("/")[2];
    const actual = tools.find((t) => t.slug === slug);
    /* El ancho lo dice el catálogo: la herramienta, su guía y las relacionadas lo comparten (tools.css). */
    const ancho = actual?.ancho;
    const { favorites, ready, sessionOnly, toggleFavorite } = useToolFavorites();
    useRecentTools(actual?.slug);
    // Una visita por herramienta y sesión, en las 29 por igual: con esto se ordenan «Las más usadas» del catálogo
    // (antes solo 8 registraban uso y el ranking habría medido solo a esas).
    const slugActual = actual?.slug;
    useEffect(() => {
        // Un navegador automatizado (pruebas, robots con Chrome) no cuenta: su agente no siempre dice «headless».
        if (!slugActual || navigator.webdriver) return;
        const clave = `visita:${slugActual}`;
        try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* sin almacenamiento: se registra igual */ }
        fetch(`/api/tools/public/${slugActual}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }), keepalive: true }).catch(() => undefined);
    }, [slugActual]);
    const sugeridas = actual ? (relacionadas[actual.slug] ?? []).flatMap((s) => tools.filter((t) => t.slug === s)) : [];
    const dialogo = useRef<HTMLDialogElement>(null), buscador = useRef<HTMLInputElement>(null);
    const atajo = useAtajo("K");
    const [consulta, setConsulta] = useState("");
    const visibles = tools.filter((t) => coincide(t, consulta));

    const abrir = () => { const d = dialogo.current; if (!d || d.open) return; d.showModal(); requestAnimationFrame(() => buscador.current?.focus()); };
    // Ctrl/⌘ K abre la búsqueda desde cualquier herramienta (y desde el catálogo).
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrir(); } };
        addEventListener("keydown", tecla);
        return () => removeEventListener("keydown", tecla);
    }, []);
    // Al cambiar de herramienta, la búsqueda se cierra y se limpia.
    useEffect(() => { dialogo.current?.close(); setConsulta(""); }, [ruta]);
    // Cerrar tocando fuera: nativo con closedby="any"; donde no existe, se mira el punto.
    useEffect(() => {
        const d = dialogo.current;
        if (!d || "closedBy" in HTMLDialogElement.prototype) return;
        const fuera = (ev: MouseEvent) => {
            if (ev.target !== d) return;
            const r = d.getBoundingClientRect();
            if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) d.close();
        };
        d.addEventListener("click", fuera);
        return () => d.removeEventListener("click", fuera);
    }, []);

    const guardada = actual ? favorites.includes(actual.slug) : false;
    const contenido = (
        <>
            {actual ? (
                <div className="hc-riel">
                    {/* Solo en celular: la vuelta al catálogo reemplaza a las migas visibles (no caben junto a las acciones). */}
                    <Link className="hc-volver" href="/herramientas">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                        Herramientas
                    </Link>
                    <div className="hc-acciones">
                        <button type="button" className="hc-boton" onClick={abrir} aria-label="Abrir navegación de herramientas" aria-haspopup="dialog" title={`Buscar herramientas (${atajo})`}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                            <span>Buscar</span><kbd>{atajo}</kbd>
                        </button>
                        <button type="button" className="hc-boton hc-estrella" disabled={!ready} onClick={() => toggleFavorite(actual.slug)} aria-pressed={guardada}
                            aria-label={guardada ? "Guardada" : "Guardar herramienta"} title={guardada ? "Quitar de favoritas" : "Guardar en favoritas"}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill={guardada ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        </button>
                    </div>
                    {sessionOnly ? <p className="hc-aviso" role="status">El navegador no permite conservar tus favoritas al cerrar esta página.</p> : null}
                </div>
            ) : null}
            <div id="tools-content" tabIndex={-1} className="hc-contenido">{children}</div>
            {/* Al terminar, las que suelen venir antes o después en el mismo trabajo: así las menos conocidas aparecen
                justo cuando vienen al caso. Llegan del servidor ya filtradas a las visibles. */}
            {sugeridas.length ? (
                <nav className="hc-relacionadas" aria-labelledby="hc-rel-t">
                    <h2 id="hc-rel-t">También te puede servir</h2>
                    <ul>
                        {sugeridas.map((t) => (
                            <li key={t.slug} style={{ "--c": COLOR_CATEGORIA[t.category] ?? "var(--acento)" } as CSSProperties}>
                                <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONOS[t.slug] ?? "" }} />
                                <Link href={`/herramientas/${t.slug}`}>{t.name}</Link>
                                <p>{sinCortes(t.description)}</p>
                            </li>
                        ))}
                    </ul>
                </nav>
            ) : null}
        </>
    );

    return (
        <div className="tools-workspace hc" data-ancho={ancho}>
            {/* En cada herramienta la materia se queda en el marco (quieta: se duerme y no le resta a la herramienta).
                El catálogo trae sus propias secciones. */}
            {actual ? <section className="hc-marco" data-forma="marco" aria-label={actual.name}>{contenido}</section> : contenido}

            {/* closedby="any": se cierra con Escape o tocando fuera (React todavía no tipa el atributo). */}
            <dialog ref={dialogo} className="hc-dialogo" aria-label="Navegación de herramientas" {...{ closedby: "any" }}>
                <div className="hc-dialogo-cab">
                    <label className="hc-buscar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                        <input ref={buscador} type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="¿Qué necesitas hacer?" aria-label="Buscar en la navegación" autoComplete="off"
                            onKeyDown={(e) => {
                                // Enter abre la primera que coincide; con el campo vacío no hay una «primera» que tenga sentido.
                                if (e.key === "Enter" && consulta.trim()) dialogo.current?.querySelector<HTMLAnchorElement>("a[data-tool-link]")?.click();
                                // En un campo de búsqueda con texto, el primer Escape solo lo vaciaba: aquí cierra siempre.
                                if (e.key === "Escape") { e.preventDefault(); dialogo.current?.close(); }
                            }} />
                    </label>
                    <button type="button" className="hc-cerrar" aria-label="Cerrar navegación de herramientas" onClick={() => dialogo.current?.close()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                </div>
                <div className="hc-lista">
                    {!consulta.trim() ? <Link className="hc-todas" href="/herramientas" onClick={() => dialogo.current?.close()}>Todas las herramientas <small>{tools.length}</small></Link> : null}
                    {FAMILIAS.map((f) => {
                        const items = visibles.filter((t) => t.category === f);
                        if (!items.length) return null;
                        return (
                            <div key={f} className="hc-familia" style={{ "--c": COLOR_CATEGORIA[f] ?? "var(--acento)" } as CSSProperties}>
                                <p>{mayuscula(f)}</p>
                                <ul>
                                    {items.map((t) => (
                                        <li key={t.slug}>
                                            <Link data-tool-link href={`/herramientas/${t.slug}`} aria-current={t.slug === slug ? "page" : undefined} onClick={() => dialogo.current?.close()}>
                                                {/* ICONOS es una constante generada desde los íconos del propio repo (siglas.ts): no hay contenido de terceros. */}
                                                <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONOS[t.slug] ?? "" }} />
                                                <span>{t.name}</span>
                                                {favorites.includes(t.slug) ? <em aria-label="favorita">★</em> : null}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                    {!visibles.length ? <p className="hc-nada" role="status">No hay herramientas con ese nombre.</p> : null}
                </div>
            </dialog>
        </div>
    );
}
