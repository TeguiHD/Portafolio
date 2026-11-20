"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { preload } from "react-dom";
import { Vista } from "./Vista";
import "./blog.css";

export interface Titular { titulo: string; fuente: string; hace: string; categoria: string; foto: string; ingles: boolean; url?: string }
export interface Dato { nombre: string; valor: string }

/** Posición de cada línea respecto de la del centro: 0 la actual, ±1 las vecinas, y el resto fuera de vista. */
function lugar(i: number, centro: number, n: number): string {
    let j = i - centro;
    if (j > n / 2) j -= n; if (j < -n / 2) j += n;
    return Math.abs(j) <= 1 ? String(j) : j > 0 ? "x" : "-x";
}

/**
 * El tambor: el titular actual al centro; el anterior y el siguiente, inclinados hacia el fondo. Solo transform y opacity.
 * Con `pagina` es la cabecera de /blog: título h1, `acciones` en lugar del enlace al blog y `extra` al final de las cifras.
 */
export function BlogTambor({ titulares, ahora, pagina = false, acciones, extra }: { titulares: Titular[]; ahora: Dato[]; pagina?: boolean; acciones?: ReactNode; extra?: ReactNode }) {
    const N = titulares.length;
    const [centro, setCentro] = useState(0);
    // En la portada el tambor queda muy abajo: sus fotos se piden recién cuando la sección se acerca (en /blog, ya).
    const [cerca, setCerca] = useState(pagina);
    // En /blog la foto del centro es lo más grande de la primera pantalla (el LCP): se anuncia en el <head> con prioridad alta.
    if (pagina && titulares[0]?.foto) preload(titulares[0].foto, { as: "image", fetchPriority: "high", referrerPolicy: "no-referrer" });
    const escena = useRef<HTMLDivElement>(null), encima = useRef(false), conFoco = useRef(false), visible = useRef(false), reinicio = useRef(0);
    const paso = (d: number) => { reinicio.current++; setCentro((c) => (c + d + N) % N); };

    // Una foto que falló antes de hidratar no avisa con onError: se revisan al montar y se marcan como rotas.
    useEffect(() => {
        const e = escena.current; if (cerca || !e) return;
        const ojo = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setCerca(true); ojo.disconnect(); } }, { rootMargin: "900px 0px" });
        ojo.observe(e);
        return () => ojo.disconnect();
    }, [cerca]);
    useEffect(() => {
        escena.current?.closest("section")?.querySelectorAll<HTMLImageElement>(".bg-foto img, .bg-lista img").forEach((img) => { if (img.complete && !img.naturalWidth) img.dataset.rota = ""; });
    }, []);

    // Avanza solo cada 4,4 s mientras se ve y nadie lo está mirando de cerca.
    useEffect(() => {
        const e = escena.current; if (!e || N < 2) return;
        const ojo = new IntersectionObserver((es) => { visible.current = es[es.length - 1].isIntersecting; }, { threshold: 0.45 });
        ojo.observe(e);
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => ojo.disconnect();
        let visto = reinicio.current;
        const id = setInterval(() => {
            if (visto !== reinicio.current) { visto = reinicio.current; return; } // alguien lo movió a mano: espera un ciclo
            if (visible.current && !encima.current && !conFoco.current && !document.hidden) setCentro((c) => (c + 1) % N);
        }, 4400);
        return () => { clearInterval(id); ojo.disconnect(); };
    }, [N]);

    return (
        <section id="blog" className={pagina ? "bg-pagina" : "plano"} data-al-cargar={pagina ? "" : undefined} data-forma="olas" aria-labelledby="bg-titulo">
            <span className="fantasma" aria-hidden="true">hoy</span>
            <Vista className="ancho">
                <div className="bg-cab">
                    {pagina
                        ? <h1 id="bg-titulo"><span className="linea-r"><span>Blog<i>.</i></span></span></h1>
                        : <h2 id="bg-titulo"><span className="linea-r"><span>Blog</span></span></h2>}
                    <div className="bg-acc" data-sube="">
                        {acciones ?? (<>
                        <Link className="bg-campana" href="/blog" aria-label="Activar los avisos de titulares nuevos, en el blog">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                        </Link>
                        <Link className="enlace-ir" href="/blog">Abrir el blog ↗</Link>
                        </>)}
                    </div>
                </div>
                {N === 0 ? (
                    <div className="bg-vacio" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                        <p>Sin titulares con foto por ahora.</p>
                        {pagina ? null : <Link className="boton linea" href="/blog">Abrir el blog</Link>}
                    </div>
                ) : (
                    <div className="bg-escena" id="bg-escena" ref={escena} tabIndex={0} role="group" aria-roledescription="carrusel" aria-label="Titulares de hoy" data-sube="" style={{ "--i": 1 } as CSSProperties}
                        onClick={(e) => {
                            // El titular del frente es un enlace a la nota: ese clic abre la nota, no mueve el tambor.
                            if ((e.target as HTMLElement).closest("a")) return;
                            const r = e.currentTarget.getBoundingClientRect(); paso(e.clientY < r.top + r.height * 0.36 ? -1 : 1);
                        }}
                        onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return; // Enter sobre el enlace del titular lo abre

                            if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) { e.preventDefault(); paso(1); }
                            if (["ArrowUp", "ArrowLeft"].includes(e.key)) { e.preventDefault(); paso(-1); }
                        }}
                        onPointerEnter={() => { encima.current = true; }} onPointerLeave={() => { encima.current = false; }}
                        onFocus={() => { conFoco.current = true; }} onBlur={() => { conFoco.current = false; }}>
                        <div className="bg-tambor" id="bg-tambor">
                            {titulares.map((t, i) => {
                                const j = lugar(i, centro, N);
                                return (
                                    <article key={t.titulo} className="bg-linea" data-j={j} aria-hidden={j !== "0"}>
                                        <p className="bg-meta"><i /><b>{t.fuente}</b><span>{t.hace}</span><span>{t.categoria}</span></p>
                                        <h3 lang={t.ingles ? "en" : undefined}>
                                            {j === "0" && t.url
                                                ? <a href={t.url} target="_blank" rel="noopener noreferrer">{t.titulo}</a>
                                                : t.titulo}
                                        </h3>
                                    </article>
                                );
                            })}
                            <div className="bg-cuenta" aria-hidden="true">{titulares.map((t, i) => <i key={t.titulo} className={i === centro ? "bg-aqui" : undefined} />)}</div>
                        </div>
                        <div className="bg-fotos" id="bg-fotos" aria-hidden="true">
                            {titulares.map((t, i) => {
                                const j = lugar(i, centro, N);
                                return (
                                    <figure key={t.titulo} className="bg-foto" data-j={j}>
                                        {/* Debajo de la foto, el medio en grande: si la foto tarda o no llega, el marco no queda vacío. */}
                                        <span className="bg-placa"><b>{t.fuente}</b><i>{t.categoria}</i></span>
                                        {/* La actual y sus vecinas se piden ya: al llegarles el turno, la foto está (antes, la perezosa
                                            empezaba a bajar recién en pantalla y se veía el marco vacío mientras llegaba). */}
                                        <img src={t.foto} alt="" loading={cerca && j !== "x" && j !== "-x" ? "eager" : "lazy"} fetchPriority={pagina && j === "0" ? "high" : undefined} decoding="async" referrerPolicy="no-referrer"
                                            onError={(e) => { e.currentTarget.dataset.rota = ""; }} />
                                    </figure>
                                );
                            })}
                        </div>
                    </div>
                )}
                {/* Celular: el tambor (3D, con foto grande) no cabía bien; aquí va una lista sobria de titulares, cada uno con su enlace. */}
                {N > 0 ? (
                    <ol className="bg-lista" aria-label="Titulares de hoy">
                        {titulares.slice(0, pagina ? 3 : 4).map((t) => (
                            <li key={t.titulo}>
                                <a href={t.url ?? "/blog"} {...(t.url ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                                    <img src={t.foto} alt="" width={76} height={76} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.dataset.rota = ""; }} />
                                    <span>
                                        <small>{t.fuente} · {t.hace}</small>
                                        <b lang={t.ingles ? "en" : undefined}>{t.titulo}</b>
                                        <em>{t.categoria}</em>
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ol>
                ) : null}
                {(ahora.length > 0 || extra) && <div className="bg-ahora" data-sube="" style={{ "--i": 2 } as CSSProperties}>{ahora.map((d) => <span key={d.nombre}>{d.nombre}<b>{d.valor}</b></span>)}{extra}</div>}
            </Vista>
        </section>
    );
}
