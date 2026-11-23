"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMateria, useSeccionActiva } from "@/modules/materia/Materia";

/**
 * La materia dibuja lo que se construye, como en el hero de la portada: 0 = un sitio (tienda), 1 = un panel (sistema
 * interno), 2 = una herramienta. El lugar del dibujo es #sv-escena; la sección que lo contiene declara data-forma="figuras".
 */
export type Figura = 0 | 1 | 2;

export function EscenaServicio({ figura }: { figura: Figura }) {
    const motor = useMateria();
    useEffect(() => { motor?.figura(figura); }, [motor, figura]);
    return <div id="sv-escena" className="sv-escena" aria-hidden="true" />;
}

/**
 * El índice de servicios: al señalar o enfocar uno, la materia dibuja lo que se construye en él. Sin cursor (celular),
 * rota sola cada 4,2 s mientras la lista está a la vista, salvo con «menos movimiento».
 */
export function ListaServicios({ servicios }: { servicios: { slug: string; nombre: string; pregunta: string }[] }) {
    const motor = useMateria(), activa = useSeccionActiva("sv-lista");
    const [sel, setSel] = useState<Figura>(0);
    const atento = useRef(false), enVista = useRef(false);
    useEffect(() => { enVista.current = activa; }, [activa]);
    useEffect(() => { motor?.figura(sel); }, [motor, sel]);
    useEffect(() => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: hover)").matches) return;
        const id = setInterval(() => {
            if (!enVista.current || atento.current || document.hidden) return;
            setSel((s) => ((s + 1) % servicios.length) as Figura);
        }, 4200);
        return () => clearInterval(id);
    }, [servicios.length]);
    const elegir = (k: number) => { atento.current = true; setSel(k as Figura); };

    return (
        <div className="sv-indice">
            <ul className="sv-filas" onPointerLeave={() => { atento.current = false; }}>
                {servicios.map((s, k) => (
                    <li key={s.slug} data-activa={k === sel ? "" : undefined}>
                        <Link href={`/servicios/${s.slug}`} onPointerEnter={() => elegir(k)} onFocus={() => elegir(k)} onBlur={() => { atento.current = false; }}>
                            <span className="sv-fila-nombre">{s.nombre}</span>
                            <span className="sv-fila-pregunta">{s.pregunta}</span>
                            <svg className="sv-fila-ir" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                        </Link>
                    </li>
                ))}
            </ul>
            <div id="sv-escena" className="sv-escena" aria-hidden="true" />
        </div>
    );
}
