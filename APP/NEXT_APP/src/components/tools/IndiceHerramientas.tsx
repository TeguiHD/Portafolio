"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { useRecentTools } from "@/hooks/useRecentTools";
import { useToolFavorites } from "@/hooks/useToolFavorites";
import { COLOR_CATEGORIA, ICONOS } from "@/modules/landing/viva/siglas";
import { Vista } from "@/modules/landing/viva/Vista";
import type { PublicToolCatalogEntry } from "@/lib/tool-registry";
import type { Destacadas } from "@/lib/tool-destacadas";
import { coincide } from "./buscar-herramientas";

const FAMILIAS = ["imágenes", "generación", "conversión", "productividad", "seguridad", "redes"];
const mayuscula = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const color = (f: string) => COLOR_CATEGORIA[f] ?? "var(--acento)";

/** El ícono de cada herramienta: constante generada desde los íconos del propio repo (siglas.ts), sin contenido de terceros. */
const Icono = ({ slug }: { slug: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONOS[slug] ?? "" }} />;

/**
 * Los filtros sobreviven a ir a una herramienta y volver (atrás o «← Herramientas») mientras la pestaña siga abierta:
 * el módulo queda cargado entre navegaciones. En una carga nueva arranca vacío, igual que el HTML del servidor.
 */
const recuerdo = { consulta: "", familia: null as string | null, soloFavoritas: false };

/**
 * El catálogo: búsqueda y favoritas, recientes, las 6 destacadas en tarjetas y, debajo, todas por familia en filas
 * (ícono, nombre, una línea y la estrella). Favoritas y recientes quedan en este navegador.
 * `destacadas` y `nuevas` llegan del servidor (uso real y fecha de publicación).
 */
export function IndiceHerramientas({ tools, destacadas, nuevas = [] }: { tools: PublicToolCatalogEntry[]; destacadas: Destacadas; nuevas?: string[] }) {
    const [consulta, setConsultaEstado] = useState(() => recuerdo.consulta);
    const [familia, setFamiliaEstado] = useState<string | null>(() => recuerdo.familia);
    const [soloFavoritas, setSoloFavoritasEstado] = useState(() => recuerdo.soloFavoritas);
    const setConsulta = (v: string) => { recuerdo.consulta = v; setConsultaEstado(v); };
    const setFamilia = (v: string | null) => { recuerdo.familia = v; setFamiliaEstado(v); };
    const setSoloFavoritas = (v: boolean) => { recuerdo.soloFavoritas = v; setSoloFavoritasEstado(v); };
    const { favorites, ready, sessionOnly, toggleFavorite } = useToolFavorites();
    const { recents, clearRecents } = useRecentTools();
    const recientes = recents.flatMap((s) => tools.filter((t) => t.slug === s));
    const cuantasFavoritas = tools.filter((t) => favorites.includes(t.slug)).length;
    const filtradas = useMemo(() => tools.filter((t) =>
        (!familia || t.category === familia) && (!soloFavoritas || favorites.includes(t.slug))
        && coincide(t, consulta)), [tools, familia, soloFavoritas, favorites, consulta]);
    const filtrando = Boolean(consulta.trim() || familia || soloFavoritas);
    const limpiar = () => { setConsulta(""); setFamilia(null); setSoloFavoritas(false); };

    // data-al-cargar: está en la primera pantalla, así que entra al cargar (sin esperar al JavaScript) y sin la
    // animación por scroll de «plano», que lo dejaba desteñido y achicado arriba.
    return (
        <section id="catalogo" data-al-cargar="" aria-labelledby="ht-titulo">
            <span className="fantasma" aria-hidden="true">{tools.length}</span>
            <Vista className="ancho">
                <div className="ht-filtros" data-sube="" style={{ "--i": 1 } as CSSProperties}>
                    <label className="ht-buscar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                        <input type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="¿Qué necesitas hacer?" aria-label="Buscar herramientas" autoComplete="off"
                            onKeyDown={(e) => { if (e.key === "Escape") setConsulta(""); }} />
                    </label>
                    <button type="button" className="ht-favoritas" disabled={!ready} aria-pressed={soloFavoritas} onClick={() => setSoloFavoritas(!soloFavoritas)}>
                        <span aria-hidden="true">★</span> Mis favoritas <small>{cuantasFavoritas}</small>
                    </button>
                </div>
                {!filtrando && recientes.length ? (
                    <div className="ht-recientes" aria-label="Herramientas recientes">
                        <span>Recientes</span>
                        {recientes.map((t) => <Link key={t.slug} href={`/herramientas/${t.slug}`} style={{ "--c": color(t.category) } as CSSProperties}><Icono slug={t.slug} />{t.name}</Link>)}
                        <button type="button" onClick={clearRecents} aria-label="Borrar herramientas recientes" title="Borrar recientes">×</button>
                    </div>
                ) : null}

                {!filtrando && destacadas.slugs.length ? (
                    <section className="ht-destacadas" aria-labelledby="ht-dest-t">
                        {/* «Las más usadas» solo cuando las 6 salen del uso real; si no, son las del dueño. */}
                        <h2 id="ht-dest-t">{destacadas.porUso ? "Las más usadas" : "Destacadas"}</h2>
                        <ul>
                            {destacadas.slugs.flatMap((s) => tools.filter((t) => t.slug === s)).map((t) => (
                                <li key={t.slug}>
                                    <article className="ht-destacada" style={{ "--c": color(t.category) } as CSSProperties}>
                                        <Icono slug={t.slug} />
                                        <h3><Link className="ht-tarjeta" href={`/herramientas/${t.slug}`}>{t.name}</Link></h3>
                                        <p>{t.description}</p>
                                        {nuevas.includes(t.slug) ? <span className="ht-nueva">Nueva</span> : null}
                                    </article>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {/* Después de las destacadas: así los títulos siguen el orden en que se leen. */}
                <h2 id="ht-titulo" className="sr-only">Todas las herramientas</h2>
                <div className="ht-familias" role="group" aria-label="Filtrar por categoría" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                    <button type="button" aria-pressed={familia === null} onClick={() => setFamilia(null)}>Todas<small> {tools.length}</small></button>
                    {FAMILIAS.map((f) => {
                        const n = tools.filter((t) => t.category === f).length;
                        return n ? <button key={f} type="button" aria-pressed={familia === f} style={{ "--c": color(f) } as CSSProperties} onClick={() => setFamilia(familia === f ? null : f)}>{mayuscula(f)}<small> {n}</small></button> : null;
                    })}
                </div>

                <div className="ht-estado">
                    <p aria-live="polite" aria-atomic="true">{soloFavoritas ? "Tus favoritas" : filtrando ? "Resultados" : "Todas las herramientas"} <small>{filtradas.length}</small></p>
                    {filtrando ? <button type="button" onClick={limpiar}>Limpiar filtros</button> : null}
                </div>

                {filtradas.length ? FAMILIAS.map((f) => {
                    const grupo = filtradas.filter((t) => t.category === f);
                    if (!grupo.length) return null;
                    return (
                        <div key={f} className="ht-grupo" style={{ "--c": color(f) } as CSSProperties}>
                            <h3><i aria-hidden="true" />{mayuscula(f)}</h3>
                            <ul>
                                {grupo.map((t) => {
                                    const guardada = favorites.includes(t.slug);
                                    return (
                                        <li key={t.id} className="ht-fila">
                                            <Icono slug={t.slug} />
                                            <p className="ht-nombre"><Link className="tools-tile-enter" href={`/herramientas/${t.slug}`}>{t.name}</Link>{nuevas.includes(t.slug) ? <span className="ht-nueva">Nueva</span> : null}</p>
                                            <p className="ht-linea">{t.description}</p>
                                            <button type="button" className="ht-estrella" disabled={!ready} onClick={() => toggleFavorite(t.slug)} aria-pressed={guardada}
                                                aria-label={`${guardada ? "Quitar de" : "Añadir a"} favoritas: ${t.name}`} title={guardada ? "Quitar de favoritas" : "Guardar en favoritas"}>{guardada ? "★" : "☆"}</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                }) : (
                    <div className="ht-vacio">
                        <p>{soloFavoritas && !cuantasFavoritas ? "Aún no tienes favoritas. Toca la estrella de una herramienta para guardarla aquí." : "Nada con ese nombre."}</p>
                    </div>
                )}
                <p className="ht-nota" role="status">{sessionOnly ? "Tu navegador no permite guardar: las favoritas durarán mientras esta página siga abierta." : "Favoritas y recientes quedan en este navegador."}</p>
            </Vista>
        </section>
    );
}
