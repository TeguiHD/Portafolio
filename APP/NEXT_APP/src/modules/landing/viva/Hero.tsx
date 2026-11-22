"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useMateria, useSeccionActiva } from "@/modules/materia/Materia";
import { tecnologias } from "@/modules/landing/portada/datos/tecnologias";
import { Vista } from "./Vista";
import "./hero.css";

const OPCIONES = ["Tiendas y sitios", "Sistemas internos", "Herramientas"] as const;
/** Lo que cada opción muestra en palabras (la materia lo dibuja; sin ella, o con lector de pantalla, esto es lo que cambia).
 *  Cada una apunta a su proyecto, más abajo en la misma página. */
const EJEMPLOS = [
    "Como FloresDyD, una tienda en línea a medida.",
    "Como la intranet de una OTEC: cursos, aula virtual y certificados.",
    "Como las herramientas gratis de este mismo sitio.",
] as const;
const MARCAS = tecnologias.filter((t) => t.path);

/** "#61DAFB" → "97 218 251". El blanco no tiñe: la materia queda en su color base. */
function tinta(hex: string): string | null {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m || m[1].toLowerCase() === "ffffff") return null;
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(" ");
}

/**
 * El hero absorbe «lo que hago»: la materia dibuja lo que se construye (un sitio, un panel, una herramienta)
 * y rota sola cada 4,2 s. Si el visitante elige, se respeta 14 s. Al señalar una tecnología, dibuja su logo 5,2 s.
 */
export function Hero() {
    const motor = useMateria(), activa = useSeccionActiva("inicio");
    const [sel, setSel] = useState(0), [fija, setFija] = useState(false), [logo, setLogo] = useState(-1);
    // El cursor está sobre el selector, o el teclado dentro de él: mientras tanto no rota (la opción cambiaba bajo el cursor
    // o bajo el foco). El foco que deja un clic no cuenta: si no, tras elegir con el mouse ya nunca volvería a rotar.
    const fijaHasta = useRef(0), enVista = useRef(false), atento = useRef({ sobre: false, teclado: false });
    useEffect(() => { enVista.current = activa; }, [activa]);

    useEffect(() => { if (motor && logo < 0) motor.figura(sel as 0 | 1 | 2); }, [motor, sel, logo]);
    useEffect(() => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // con «menos movimiento» solo cambia si se elige
        const id = setInterval(() => {
            if (!enVista.current || atento.current.sobre || atento.current.teclado || document.hidden || performance.now() < fijaHasta.current) return;
            setFija(false); setLogo(-1); setSel((s) => (s + 1) % OPCIONES.length);
        }, 4200);
        return () => clearInterval(id);
    }, []);

    const elegir = (k: number) => { fijaHasta.current = performance.now() + 14_000; setFija(true); setLogo(-1); setSel(k); };
    // Pestañas: un solo alto de tabulación y las flechas para recorrerlas, como en Proyectos.
    const conFlechas = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const k = (sel + d + OPCIONES.length) % OPCIONES.length;
        elegir(k); e.currentTarget.querySelectorAll<HTMLElement>("[role=tab]")[k]?.focus();
    };
    const verLogo = useCallback((k: number) => {
        const t = MARCAS[k];
        if (!motor || !enVista.current || !t?.path) return;
        fijaHasta.current = performance.now() + 5200;
        motor.figuraDesdeTrazo(t.path, tinta(t.color)); setLogo(k);
    }, [motor]);

    return (
        <section id="inicio" data-forma="figuras" data-ancla="#ancla-marca">
            <Vista className="ancho heroe">
                <div>
                    <span className="vivo" data-sube=""><b />Disponible para proyectos nuevos</span>
                    <h1><span className="linea-r"><span>Desarrollo</span></span> <strong className="linea-r" style={{ "--i": 1 } as CSSProperties}><span>soluciones.</span></strong></h1>
                    <p className="bajada" data-sube="" style={{ "--i": 2 } as CSSProperties}>Herramientas útiles, interfaces cuidadas y desarrollo web a medida.</p>
                    <div className="acciones" data-sube="" style={{ "--i": 3 } as CSSProperties}>
                        <a href="#contacto" className="boton lleno">Hablemos de tu proyecto <svg className="flecha" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg></a>
                        <a href="#herramientas" className="boton linea">Probar las herramientas</a>
                    </div>
                </div>
                <div className="escenario" data-sube="" style={{ "--i": 2 } as CSSProperties}>
                    <div id="ancla-marca" />
                    <div className={`elige${fija ? " fija" : ""}`} role="tablist" aria-label="Lo que construyo" onKeyDown={conFlechas}
                        onPointerEnter={() => { atento.current.sobre = true; }} onPointerLeave={() => { atento.current.sobre = false; }}
                        onFocus={(e) => { atento.current.teclado = e.target.matches(":focus-visible"); }} onBlur={() => { atento.current.teclado = false; }}>
                        {OPCIONES.map((o, k) => (
                            <button key={o} id={`elige-${k}`} type="button" role="tab" aria-selected={logo < 0 && k === sel} tabIndex={k === sel ? 0 : -1} onClick={() => elegir(k)}>{o}</button>
                        ))}
                    </div>
                    <p className="elige-ejemplo" role="tabpanel" aria-labelledby={`elige-${sel}`}>
                        <a href="#proyectos">{EJEMPLOS[sel]}</a>
                    </p>
                </div>
            </Vista>
            {/* Botones nativos (antes <li role="button">, un rol que no le corresponde a un ítem de lista: lo marcaban
                Lighthouse y los lectores de pantalla). Enter y espacio ya los maneja el navegador. */}
            <div className="marcas" role="group" aria-label="Tecnologías con las que trabajo">
                {MARCAS.map((t, k) => (
                    <button key={t.name} type="button" aria-label={t.name} aria-pressed={k === logo} data-n={t.name} className={k === logo ? "activa" : undefined}
                        style={{ "--c": t.color.toUpperCase() === "#FFFFFF" ? "var(--txt)" : t.color, "--k": k } as CSSProperties}
                        onPointerEnter={() => verLogo(k)} onFocus={() => verLogo(k)} onClick={() => verLogo(k)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={t.path} /></svg>
                    </button>
                ))}
            </div>
        </section>
    );
}
