"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ExternalLink, RefreshCw } from "lucide-react";
import type { PulseNewsItem } from "@/modules/pulse/types";
import { leerNoticias, TEMAS } from "./datos";

const HORA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * Noticias: los titulares del blog (seguridad, IA, desarrollo, producto y mercado, de fuentes oficiales), por tema.
 * Cada titular abre la fuente original en una pestaña nueva; el blog completo se abre en su ventana.
 */
export function Noticias({ alAbrirBlog }: { alAbrirBlog(): void }) {
    const [items, setItems] = useState<PulseNewsItem[] | null>(null);
    const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
    const [tema, setTema] = useState<(typeof TEMAS)[number]["id"]>("todo");
    const [hora, setHora] = useState<Date | null>(null);
    const cargar = useCallback(async () => {
        setEstado("cargando");
        const r = await leerNoticias();
        if (r) { setItems(r); setHora(new Date()); setEstado("listo"); } else setEstado("error");
    }, []);
    useEffect(() => { void cargar(); }, [cargar]);
    const visibles = (items ?? []).filter((n) => tema === "todo" || n.category === tema);
    const destacada = visibles[0];
    return (
        <div className="no">
            <nav className="no-temas" aria-label="Temas">
                {TEMAS.map((t) => <button key={t.id} type="button" aria-pressed={tema === t.id} onClick={() => setTema(t.id)}>{t.nombre}</button>)}
                <span className="no-relleno" />
                {hora && <small className="no-hora">Actualizado a las {HORA.format(hora)}</small>}
                <button type="button" className="es-b" aria-label="Actualizar" title="Actualizar" onClick={() => void cargar()} disabled={estado === "cargando"}><RefreshCw size={15} aria-hidden="true" /></button>
                <button type="button" className="es-boton-chico" onClick={alAbrirBlog}><BookOpen size={14} aria-hidden="true" />Abrir el blog</button>
            </nav>
            {estado === "error" && !items ? (
                <div className="no-vacio">
                    <p>Las fuentes no respondieron. Puede ser la conexión o que alguna fuente esté caída.</p>
                    <button type="button" className="es-primario" onClick={() => void cargar()}>Reintentar</button>
                </div>
            ) : estado === "cargando" && !items ? (
                <div className="no-lista" aria-busy="true" aria-label="Cargando titulares">{Array.from({ length: 6 }, (_, i) => <span key={i} className="no-fantasma" />)}</div>
            ) : (
                <div className="no-lista">
                    {destacada && (
                        <a className="no-destacada" href={destacada.url} target="_blank" rel="noopener noreferrer">
                            <small>{destacada.source}<span>{destacada.timestampLabel}</span></small>
                            <b>{destacada.title}</b>
                            {destacada.excerpt && <p>{destacada.excerpt}</p>}
                            <ExternalLink size={14} aria-hidden="true" />
                        </a>
                    )}
                    {visibles.slice(1, 40).map((n) => (
                        <a key={n.id} className="no-item" href={n.url} target="_blank" rel="noopener noreferrer">
                            <small>{n.source}<span>{n.timestampLabel}</span></small>
                            <b>{n.title}</b>
                        </a>
                    ))}
                    {!visibles.length && <p className="no-vacio">No hay titulares de este tema por ahora.</p>}
                </div>
            )}
        </div>
    );
}
