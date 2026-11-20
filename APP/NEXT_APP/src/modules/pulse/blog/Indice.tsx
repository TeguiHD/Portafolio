"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fotoLiviana } from "@/modules/landing/viva/foto-liviana";
import { useMateria } from "@/modules/materia/Materia";
import { Vista } from "@/modules/landing/viva/Vista";
import type { PulseCategory, PulseNewsItem } from "@/modules/pulse/types";

const POR_TANDA = 12;
type Tema = PulseCategory | "all";

/** El color de cada tema: un punto junto a la fuente y el subrayado del tema elegido. */
const TEMAS: { id: Tema; nombre: string; tono: string }[] = [
    { id: "all", nombre: "Todo", tono: "var(--acento)" },
    { id: "ai", nombre: "IA", tono: "#a78bfa" },
    { id: "security", nombre: "Seguridad", tono: "#fb7185" },
    { id: "dev", nombre: "Desarrollo", tono: "#7dd3fc" },
    { id: "startup", nombre: "Producto", tono: "#fbbf24" },
    { id: "market", nombre: "Mercado", tono: "#60a5fa" },
];
const tema = (id: Tema) => TEMAS.find((t) => t.id === id) ?? TEMAS[0];
const INGLES = /\b(the|and|of|to|for|with|is|in|on|from|how|new|your|are)\b/i;
/** Sin mayúsculas ni tildes: «codigo» encuentra «código» (casi nadie escribe las tildes al buscar). */
const plano = (texto: string) => texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const enIngles = (texto: string) => INGLES.test(texto) && !/[áéíóúñ¿¡]/i.test(texto);

/** «Publicado hace 52 min» → «52 min». Sin fecha conocida, «sin fecha» (antes «Fecha no disponible» partía la columna en tres líneas). */
const corto = (etiqueta: string) => (/\bhace\b/i.test(etiqueta) ? etiqueta.replace(/^publicado\s+(hace\s+)?/i, "") : "sin fecha");
/** Las notas sin fecha llegan con una de relleno (1 de enero de 2000): no se anuncia como fecha real. */
const fechaReal = (n: PulseNewsItem) => (n.publishedAt.startsWith("2000-01-01") ? undefined : n.publishedAt);
const minutos = (n: PulseNewsItem) => Math.max(1, Math.round(`${n.title} ${n.excerpt ?? ""}`.trim().split(/\s+/).length / 90));
function dominio(n: PulseNewsItem) {
    if (n.sourceDomain) return n.sourceDomain;
    try { return new URL(n.url).hostname.replace(/^www\./, ""); } catch { return n.source; }
}
const tienePortada = (n: PulseNewsItem) => Boolean(n.imageUrl && !n.imageUrl.startsWith("/api/pulse/placeholder") && !n.imageUrl.includes("avatars."));

/**
 * «Todo lo de hoy»: el sumario del día en filas (hora, titular, fuente), con temas, búsqueda y orden.
 * El titular abre una ficha con el resumen del medio; la fuente lleva al artículo (también sin JavaScript).
 * La materia escribe el tema elegido.
 */
export function Indice({ inicial }: { inicial: PulseNewsItem[] }) {
    const motor = useMateria();
    const [busqueda, setBusqueda] = useState("");
    const [elegido, setElegido] = useState<Tema>("all");
    const [orden, setOrden] = useState<"reciente" | "relevancia">("reciente");
    const [cuantos, setCuantos] = useState(POR_TANDA);
    const [abierto, setAbierto] = useState<PulseNewsItem | null>(null);
    const consulta = useDeferredValue(busqueda);
    const ficha = useRef<HTMLDialogElement>(null), origen = useRef<HTMLElement | null>(null), buscador = useRef<HTMLInputElement>(null);
    // La ficha sigue mostrando la última nota mientras se desvanece al cerrar (si no, se veía un marco vacío).
    const ultima = useRef<PulseNewsItem | null>(null);
    if (abierto) ultima.current = abierto;
    const nota = abierto ?? ultima.current;

    const filtradas = useMemo(() => {
        const texto = plano(consulta.trim());
        const lista = inicial.filter((n) => (elegido === "all" || n.category === elegido)
            && (!texto || plano(`${n.title} ${n.excerpt ?? ""} ${n.source}`).includes(texto)));
        return orden === "relevancia"
            ? [...lista].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
            : [...lista].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    }, [inicial, consulta, elegido, orden]);
    const visibles = filtradas.slice(0, cuantos);
    const conteo = (id: Tema) => (id === "all" ? inicial.length : inicial.filter((n) => n.category === id).length);

    useEffect(() => { setCuantos(POR_TANDA); }, [consulta, elegido, orden]);
    // La materia escribe el tema: «hoy» con todo, o el nombre del tema.
    useEffect(() => { motor?.escribir(elegido === "all" ? "hoy" : tema(elegido).nombre.toLowerCase()); }, [motor, elegido]);

    // La ficha es un <dialog> modal. Cerrar tocando fuera: nativo con closedby="any"; donde no existe, se mira el punto.
    useEffect(() => {
        const d = ficha.current;
        if (abierto && d && !d.open) d.showModal();
    }, [abierto]);
    useEffect(() => {
        const d = ficha.current;
        if (!d || "closedBy" in HTMLDialogElement.prototype) return;
        const fuera = (ev: MouseEvent) => {
            if (ev.target !== d) return;
            const r = d.getBoundingClientRect();
            if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) d.close();
        };
        d.addEventListener("click", fuera);
        return () => d.removeEventListener("click", fuera);
    }, []);

    // El botón desaparece al quitar los filtros: el foco pasa al buscador, no se pierde.
    const quitar = () => { setBusqueda(""); setElegido("all"); buscador.current?.focus(); };
    const t = nota ? tema(nota.category) : null;

    const fila = (n: PulseNewsItem, i: number) => (
        <li key={n.id} className="bp-fila" style={{ "--c": tema(n.category).tono, "--k": i % POR_TANDA } as CSSProperties}>
            <time dateTime={fechaReal(n)}>{corto(n.timestampLabel)}</time>
            <h3 lang={enIngles(n.title) ? "en" : undefined}>
                <button type="button" onClick={(e) => { origen.current = e.currentTarget; setAbierto(n); }}>{n.title}</button>
            </h3>
            <a className="bp-fuente" href={n.url} target="_blank" rel="noopener noreferrer nofollow">
                <i aria-hidden="true" />{n.source}<span className="sr-only">, abre el artículo en su sitio</span>
            </a>
        </li>
    );

    return (
        <section id="indice" className="plano" data-forma="texto" data-ancla="#ancla-texto" aria-labelledby="bp-titulo">
            <span className="fantasma" aria-hidden="true">{inicial.length}</span>
            <Vista className="ancho">
                <div className="bp-cab">
                    <div>
                        <h2 id="bp-titulo"><span className="linea-r"><span>Todo lo de hoy</span></span></h2>
                        <div className="bp-temas" id="bp-temas" role="group" aria-label="Tema" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                            {TEMAS.filter((x) => conteo(x.id) > 0).map((x) => (
                                <button key={x.id} type="button" aria-pressed={elegido === x.id} style={{ "--c": x.tono } as CSSProperties} onClick={() => setElegido(x.id)}>
                                    {x.nombre}<small> {conteo(x.id)}</small>
                                </button>
                            ))}
                        </div>
                        <div className="bp-herramientas" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                            <label className="bp-buscar">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                <input ref={buscador} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar un titular o una fuente" aria-label="Buscar en las noticias" />
                            </label>
                            <div className="bp-orden" role="group" aria-label="Orden">
                                <button type="button" aria-pressed={orden === "reciente"} onClick={() => setOrden("reciente")}>Lo último</button>
                                <button type="button" aria-pressed={orden === "relevancia"} onClick={() => setOrden("relevancia")}>Relevancia</button>
                            </div>
                        </div>
                    </div>
                    <div id="ancla-texto" aria-hidden="true" />
                </div>

                <p className="sr-only" role="status">{filtradas.length} titulares{elegido === "all" ? "" : ` en ${tema(elegido).nombre}`}{consulta.trim() ? ` para «${consulta.trim()}»` : ""}.</p>
                {visibles.length === 0 ? (
                    <div className="bp-vacio">
                        {inicial.length === 0
                            ? <p>Las fuentes no trajeron titulares esta vez. Vuelve en unos minutos.</p>
                            : <><p>Nada coincide con esa búsqueda.</p><button type="button" className="boton linea" onClick={quitar}>Quitar filtros</button></>}
                    </div>
                ) : (
                    <>
                        <ol className="bp-lista">{visibles.map(fila)}</ol>
                        {/* Sin JavaScript «Ver más» no hace nada: el resto de los titulares llega ya escrito dentro de un
                            <noscript> (con scripts, el navegador lo ignora y React no lo hidrata). */}
                        {filtradas.length > cuantos ? (
                            <noscript>
                                <ol className="bp-lista bp-lista-resto" start={cuantos + 1}>{filtradas.slice(cuantos).map((n, i) => fila(n, cuantos + i))}</ol>
                            </noscript>
                        ) : null}
                    </>
                )}
                {filtradas.length > cuantos ? (
                    <div className="bp-pie"><button type="button" className="boton linea" onClick={() => setCuantos((c) => c + POR_TANDA)}>Ver más titulares</button></div>
                ) : null}
            </Vista>

            {/* closedby="any": se cierra con Escape o tocando fuera (React todavía no tipa el atributo). */}
            <dialog ref={ficha} className="bp-ficha" aria-labelledby="bp-ficha-titulo" {...{ closedby: "any" }}
                onClose={() => { setAbierto(null); origen.current?.focus(); }}>
                {nota && t ? (
                    <article style={{ "--c": t.tono } as CSSProperties}>
                        <header>
                            <p className="bp-ficha-meta"><i aria-hidden="true" />{t.nombre}<span>{nota.source}</span><span>{corto(nota.timestampLabel)}</span><span>{minutos(nota)} min</span></p>
                            <button type="button" className="bp-ficha-cerrar" aria-label="Cerrar" onClick={() => ficha.current?.close()}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                            </button>
                        </header>
                        {tienePortada(nota) ? (
                            // Las portadas son de los propios medios: se piden sin referente y, si no llegan, la ficha sigue sin foto.
                            <img className="bp-ficha-foto" src={nota.imageUrl ? fotoLiviana(nota.imageUrl) : undefined} alt={nota.imageAlt || ""} loading="lazy" decoding="async" referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.hidden = true; }} />
                        ) : null}
                        {/* El resumen viene del medio, en su idioma: el lector de pantalla lo pronuncia en inglés si lo es. */}
                        <h2 id="bp-ficha-titulo" lang={enIngles(nota.title) ? "en" : undefined}>{nota.title}</h2>
                        {nota.excerpt ? <p className="bp-ficha-resumen" lang={enIngles(nota.excerpt) ? "en" : undefined}>{nota.excerpt}</p> : null}
                        <footer>
                            {/* Casi todas las fuentes publican en inglés: se avisa antes de salir hacia el artículo. */}
                            <p>Resumen tomado del propio medio{enIngles(nota.title) ? ", en inglés" : ""}. El artículo completo se lee en su sitio.</p>
                            <a className="boton lleno" href={nota.url} target="_blank" rel="noopener noreferrer nofollow">
                                Leer en {dominio(nota)}
                                <svg className="flecha" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                            </a>
                        </footer>
                    </article>
                ) : null}
            </dialog>
        </section>
    );
}
