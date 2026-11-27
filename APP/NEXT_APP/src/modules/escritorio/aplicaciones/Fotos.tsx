"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Info, Maximize2, Minimize2 } from "lucide-react";
import type { ProyectoEscritorio } from "../tipos";
import { fotosDe } from "./vfs";

/**
 * Fotos: el visor de las capturas reales de los proyectos. Anterior y siguiente (también con las flechas), ajustar a la
 * ventana o ver en tamaño real, la tira de miniaturas, el álbum de cada proyecto y su información, y el sitio real.
 */
export function Fotos({ proyectos, proyecto, indice, alCambiar, alVisitar }: {
    proyectos: ProyectoEscritorio[];
    proyecto?: string;
    indice?: number;
    alCambiar(proyecto: string, indice: number): void;
    alVisitar(href: string): void;
}) {
    const p = proyectos.find((x) => x.id === proyecto) ?? proyectos[0];
    const fotos = p ? fotosDe(p) : [];
    const i = Math.min(Math.max(0, Number(indice) || 0), Math.max(0, fotos.length - 1));
    const [ajustar, setAjustar] = useState(true);
    const [info, setInfo] = useState(false);
    const tira = useRef<HTMLDivElement>(null);
    useEffect(() => { tira.current?.querySelector<HTMLElement>("[aria-current]")?.scrollIntoView({ block: "nearest", inline: "center" }); }, [i, p?.id]);
    if (!p) return <p className="ex-vacio">No hay fotos.</p>;
    const f = fotos[i];
    const ir = (j: number) => alCambiar(p.id, (j + fotos.length) % fotos.length);
    const alTeclado = (e: KeyboardEvent<HTMLDivElement>) => {
        if ((e.target as Element).matches("select")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); ir(i + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); ir(i - 1); }
        else if (e.key === "Home") { e.preventDefault(); ir(0); }
        else if (e.key === "End") { e.preventDefault(); ir(fotos.length - 1); }
    };
    return (
        <div className="fo" onKeyDown={alTeclado} tabIndex={-1}>
            <div className="fo-barra">
                <label className="fo-album"><span className="es-sr">Álbum</span>
                    <select value={p.id} onChange={(e) => alCambiar(e.target.value, 0)}>
                        {proyectos.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
                    </select>
                </label>
                <span className="fo-nombre">{f.nombre}<small>{i + 1} de {fotos.length}</small></span>
                <span className="fo-acciones">
                    <button type="button" className="es-boton-chico" aria-pressed={!ajustar} onClick={() => setAjustar((a) => !a)}>
                        {ajustar ? <><Maximize2 size={14} aria-hidden="true" />Tamaño real</> : <><Minimize2 size={14} aria-hidden="true" />Ajustar</>}
                    </button>
                    <button type="button" className="es-boton-chico" aria-pressed={info} onClick={() => setInfo((v) => !v)}><Info size={14} aria-hidden="true" />Información</button>
                    {p.href && /^https?:/.test(p.href) && <button type="button" className="es-boton-chico" onClick={() => alVisitar(p.href)}><ExternalLink size={14} aria-hidden="true" />{p.cta}</button>}
                </span>
            </div>
            <div className="fo-cuerpo" data-info={info || undefined}>
                <figure className="fo-lienzo" data-ajustar={ajustar || undefined}>
                    <img key={f.src} src={f.src} alt={f.alt} decoding="async" />
                    <button type="button" className="fo-flecha fo-ant" aria-label="Foto anterior" onClick={() => ir(i - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>
                    <button type="button" className="fo-flecha fo-sig" aria-label="Foto siguiente" onClick={() => ir(i + 1)}><ChevronRight size={22} aria-hidden="true" /></button>
                </figure>
                {info && (
                    <aside className="fo-info" aria-label={`Sobre ${p.titulo}`}>
                        <b>{p.titulo}</b><small>{p.tipo}</small><p>{p.texto}</p>
                        <dl><dt>Archivo</dt><dd>{f.nombre}</dd><dt>Dirección</dt><dd>{p.direccion ?? p.href}</dd></dl>
                    </aside>
                )}
            </div>
            <div ref={tira} className="fo-tira" role="listbox" aria-label="Miniaturas">
                {fotos.map((x, j) => (
                    <button key={x.src} type="button" role="option" aria-selected={j === i} aria-current={j === i || undefined} aria-label={x.nombre} onClick={() => ir(j)}>
                        <img src={x.src} alt="" loading="lazy" decoding="async" />
                    </button>
                ))}
            </div>
        </div>
    );
}
