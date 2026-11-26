"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
// El motor (~35 KB con las figuras) se pide aparte, cuando la página ya cargó: así no va en el JS inicial de cada página
// (antes viajaba duplicado en dos chunks de la portada, del blog y de cada herramienta).
import type { Forma, Motor, crearMotor as CrearMotor } from "./motor";
import "./materia.css";

type Oyente = (seccion: HTMLElement | null) => void;
interface Contexto { motor: Motor | null; suscribir: (f: Oyente) => () => void }

const MateriaContexto = createContext<Contexto>({ motor: null, suscribir: () => () => undefined });

/** El motor de partículas de la página, o null mientras todavía no se monta. */
export function useMateria(): Motor | null {
    return useContext(MateriaContexto).motor;
}

/** true mientras la sección con ese id es la que está más cerca del centro de la pantalla. */
export function useSeccionActiva(id: string): boolean {
    const { suscribir } = useContext(MateriaContexto);
    const [activa, setActiva] = useState(false);
    useEffect(() => suscribir((s) => setActiva(!!s && s.id === id)), [suscribir, id]);
    return activa;
}

/** La sección que manda ahora (la más cercana al centro de la pantalla), o null. */
export function useSeccion(): HTMLElement | null {
    const { suscribir } = useContext(MateriaContexto);
    const [seccion, setSeccion] = useState<HTMLElement | null>(null);
    useEffect(() => suscribir(setSeccion), [suscribir]);
    return seccion;
}

const FORMAS: Forma[] = ["figuras", "texto", "imagen", "olas", "marco", "anillo", "firma"];

/**
 * Monta el lienzo fijo de la materia y decide su forma según la sección que está al centro.
 * Cada sección la declara así: <section data-forma="imagen" data-ancla="#id-del-ancla">.
 * Una página sin secciones declaradas deja la materia en olas, al pie de la pantalla.
 */
export function Materia({ children }: { children: ReactNode }) {
    const lienzo = useRef<HTMLCanvasElement>(null), frente = useRef<HTMLDivElement>(null);
    const [motor, setMotor] = useState<Motor | null>(null);
    const oyentes = useRef(new Set<Oyente>()), ultima = useRef<HTMLElement | null>(null), evaluar = useRef<() => void>(() => undefined);
    const ruta = usePathname();

    const suscribir = useCallback((f: Oyente) => {
        oyentes.current.add(f); f(ultima.current);
        return () => { oyentes.current.delete(f); };
    }, []);

    /** Crea el motor y las escuchas que deciden su forma. Devuelve cómo deshacerlo. */
    const montar = useCallback((crearMotor: typeof CrearMotor, canvas: HTMLCanvasElement, capa: HTMLDivElement) => {
        const m = crearMotor(canvas, { frente: capa, quieto: matchMedia("(prefers-reduced-motion: reduce)").matches });
        let pendiente = false, avanceAnt = -1;
        const ya = () => {
            pendiente = false;
            const medio = innerHeight / 2; let mejor: HTMLElement | null = null, dist = Infinity;
            for (const s of document.querySelectorAll<HTMLElement>("section[data-forma]")) {
                const b = s.getBoundingClientRect(), d = Math.abs((b.top + b.bottom) / 2 - medio);
                if (d < dist) { dist = d; mejor = s; }
            }
            const pedida = mejor?.dataset.forma as Forma | undefined;
            const f: Forma = pedida && FORMAS.includes(pedida) ? pedida : "olas";
            const sel = mejor?.dataset.ancla;
            m.forma(f, sel ? document.querySelector<HTMLElement>(sel) : null);
            const max = document.documentElement.scrollHeight - innerHeight, av = max > 0 ? Math.min(1, scrollY / max) : 0;
            if (Math.abs(av - avanceAnt) > 0.004) { avanceAnt = av; document.documentElement.style.setProperty("--avance", av.toFixed(3)); }
            if (mejor !== ultima.current) { ultima.current = mejor; for (const o of oyentes.current) o(mejor); }
        };
        const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(ya); } };
        evaluar.current = pedir;
        addEventListener("scroll", pedir, { passive: true }); addEventListener("resize", pedir);
        pedir(); setMotor(m);
        // A mano para las pruebas y la consola: no expone nada que la página no muestre ya.
        const w = window as unknown as { __materia?: Motor }; w.__materia = m;
        return () => { removeEventListener("scroll", pedir); removeEventListener("resize", pedir); m.destruir(); setMotor(null); delete w.__materia; };
    }, []);

    useEffect(() => {
        if (!lienzo.current || !frente.current) return;
        // Dentro de una ventana del modo escritorio la materia es la del escritorio: aquí no se gasta.
        if (document.documentElement.hasAttribute("data-ventana")) return;
        // El motor (muestrear figuras y texto, el primer cuadro) no compite con la carga: arranca cuando la página ya cargó
        // —o a los 2 s, si alguna imagen externa se demora— y el hilo queda libre. El contenido nunca lo espera.
        let cancelado = false, limpiar = () => undefined as void, espera = 0;
        const arrancar = () => {
            if (cancelado) return;
            void import("./motor").then(({ crearMotor }) => {
                if (cancelado || !lienzo.current || !frente.current) return;
                limpiar = montar(crearMotor, lienzo.current, frente.current);
            });
        };
        const enReposo = () => {
            removeEventListener("load", enReposo); clearTimeout(espera);
            if ("requestIdleCallback" in window) requestIdleCallback(arrancar, { timeout: 1200 }); else setTimeout(arrancar, 200);
        };
        if (document.readyState === "complete") enReposo();
        else { addEventListener("load", enReposo); espera = window.setTimeout(enReposo, 2000); }
        return () => { cancelado = true; removeEventListener("load", enReposo); clearTimeout(espera); limpiar(); };
    }, [montar]);

    // Al cambiar de página las secciones son otras: se vuelve a mirar cuál manda.
    useEffect(() => { evaluar.current(); }, [ruta]);

    const valor = useMemo(() => ({ motor, suscribir }), [motor, suscribir]);
    return (
        <MateriaContexto.Provider value={valor}>
            <canvas id="materia" ref={lienzo} aria-hidden="true" />
            <div className="frente" ref={frente} aria-hidden="true" />
            {children}
        </MateriaContexto.Provider>
    );
}
