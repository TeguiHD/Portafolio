"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Un contenedor que revela su contenido al entrar en pantalla: le pone la clase «visto» (ver esqueleto.css). */
export function Vista({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
    const caja = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const e = caja.current; if (!e) return;
        // Se revela con el 18 % del bloque a la vista… o cuando ya ocupa un cuarto de la pantalla: un bloque muy alto
        // (el índice de 29 herramientas en celular) nunca llega a mostrar el 18 % de sí mismo y se quedaba invisible.
        const ojo = new IntersectionObserver((es) => {
            if (es.some((x) => x.isIntersecting && (x.intersectionRatio >= 0.18 || x.intersectionRect.height >= innerHeight * 0.25))) { e.classList.add("visto"); ojo.disconnect(); }
        }, { threshold: [0, 0.05, 0.1, 0.18] });
        ojo.observe(e);
        return () => ojo.disconnect();
    }, []);
    return <div ref={caja} className={className} id={id} data-vista="">{children}</div>;
}
