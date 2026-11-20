"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMateria, useSeccionActiva } from "@/modules/materia/Materia";
import { tecnologias } from "@/modules/landing/portada/datos/tecnologias";

/** "#61DAFB" → "97 218 251". El blanco no tiñe: la materia queda en su color base. */
function tinta(hex: string): string | null {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m || m[1].toLowerCase() === "ffffff") return null;
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(" ");
}

export interface Tecno { name: string; category: string }

/**
 * El stack de Sobre mí: las tecnologías con logo (las de la portada) son botones; al elegir uno, la materia lo dibuja.
 * Mientras la sección está al centro y nadie elige, rota sola. Las que no tienen logo van como texto.
 */
export function StackVivo({ stack }: { stack: Tecno[] }) {
    const motor = useMateria(), activa = useSeccionActiva("stack");
    const conLogo = useMemo(() => stack.flatMap((s) => { const t = tecnologias.find((x) => x.name === s.name && x.path); return t ? [{ ...s, path: t.path!, color: t.color }] : []; }), [stack]);
    const sinLogo = useMemo(() => stack.filter((s) => !conLogo.some((c) => c.name === s.name)), [stack, conLogo]);
    const [sel, setSel] = useState(0);
    const fijaHasta = useRef(0);

    const dibujar = useCallback((k: number) => {
        const t = conLogo[k]; if (!motor || !t) return;
        motor.figuraDesdeTrazo(t.path, tinta(t.color));
    }, [motor, conLogo]);

    useEffect(() => { if (activa) dibujar(sel); }, [activa, sel, dibujar]);
    useEffect(() => {
        if (!activa || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const id = setInterval(() => { if (performance.now() > fijaHasta.current && !document.hidden) setSel((s) => (s + 1) % conLogo.length); }, 3600);
        return () => clearInterval(id);
    }, [activa, conLogo.length]);

    const elegir = (k: number) => { fijaHasta.current = performance.now() + 9000; setSel(k); };
    return (
        <div className="sm-stack">
            <div id="ancla-marca" aria-hidden="true" />
            <div>
                <ul className="sm-logos" aria-label="Tecnologías con las que trabajo">
                    {conLogo.map((t, k) => (
                        <li key={t.name}>
                            <button type="button" aria-pressed={k === sel} style={{ "--c": t.color.toLowerCase() === "#ffffff" ? "var(--txt)" : t.color } as CSSProperties /* un logo blanco desaparecería en tema claro */} onClick={() => elegir(k)} onFocus={() => elegir(k)} onPointerEnter={() => elegir(k)}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={t.path} /></svg>
                                <span>{t.name}</span><small>{t.category}</small>
                            </button>
                        </li>
                    ))}
                </ul>
                {sinLogo.length ? <p className="sm-tambien">También: {sinLogo.map((s) => `${s.name} (${s.category})`).join(" · ")}.</p> : null}
            </div>
        </div>
    );
}
