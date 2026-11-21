"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMateria } from "@/modules/materia/Materia";
import { getDefaultPublicToolCatalog } from "@/lib/tool-registry";
import { COLOR_CATEGORIA, ICONOS, SIGLAS } from "./siglas";
import { Vista } from "./Vista";
import { DESTACADAS_RESPALDO } from "@/lib/tool-destacadas";
import "./herramientas.css";

// Tres órbitas inclinadas, cada una a su ritmo: el centro queda libre para que la materia escriba.
const ORBITAS = [{ n: 8, r: 0.56, inc: 0.40, giro: 1, des: -0.10 }, { n: 10, r: 0.79, inc: 0.36, giro: -0.72, des: 0.10 }, { n: 11, r: 1, inc: 0.33, giro: 0.55, des: -0.04 }];
/** Tras elegir una a mano, la elección se respeta este tiempo (ms): alcanza para leer el nombre y llegar a «Abrir», también en pantallas táctiles. */
const SOSTENER = 12_000;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const primeraFrase = (t: string) => t.split(/(?<=\.)\s/)[0] ?? t;

/**
 * Las herramientas reales del catálogo giran en profundidad. La que pasa al frente, o la que se señala,
 * hace que la materia escriba algo propio de ella; debajo aparecen su nombre y el enlace para abrirla.
 */
/** Con `pagina` es la cabecera de /herramientas: título h1 y sin el enlace al catálogo (ya se está en él). */
export function Herramientas({ pagina = false }: { pagina?: boolean }) {
    const motor = useMateria();
    const T = useMemo(() => getDefaultPublicToolCatalog(), []);
    const categorias = useMemo(() => [...new Set(T.map((t) => t.category))], [T]);
    const [sel, setSel] = useState(() => Math.max(0, T.findIndex((t) => t.slug === "qr")));
    const [filtro, setFiltro] = useState<string | null>(null);
    const esfera = useRef<HTMLDivElement>(null);
    // `sobre`: el cursor está en un ícono; `pie`: en el nombre o en «Abrir»; `foco`: el teclado está dentro. Con cualquiera, nada cambia solo.
    const estado = useRef({ sobre: false, pie: false, foco: false, tocado: -1e9, filtro: null as string | null });
    const repintar = useRef<() => void>(() => undefined);
    useEffect(() => { estado.current.filtro = filtro; repintar.current(); }, [filtro]);

    const elegir = (i: number, manual: boolean) => { if (manual) estado.current.tocado = performance.now(); setSel(i); };
    // La materia escribe lo propio de la herramienta elegida.
    useEffect(() => { const t = T[sel]; if (motor && t) motor.escribir(SIGLAS[t.slug] ?? t.name.split(" ")[0]); }, [motor, sel, T]);

    // El giro: solo transform y opacity, y solo mientras la sección está a la vista.
    useEffect(() => {
        const caja = esfera.current; if (!caja) return;
        const nodos = [...caja.querySelectorAll<HTMLElement>(".he-nodo")];
        const P: [number, number][] = []; ORBITAS.forEach((o, k) => { for (let j = 0; j < o.n; j++) P.push([k, (j / o.n) * 6.2832]); });
        const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
        let ry = 0, vy = quieto ? 0 : 0.0022, R = 400, RY = 1, visible = false, arrastra: { x: number } | null = null, vivo = true, id = 0, ultimaVoz = 0;
        const medir = () => { const b = caja.getBoundingClientRect(); R = Math.min(b.width * 0.47, 520); RY = Math.min(1, (b.height * 0.46) / (R * 0.40)); };
        const pintar = (ahora: number) => {
            const e = estado.current;
            if (!arrastra && !quieto) { ry += vy; vy += ((e.sobre ? 0.0003 : 0.0022) * Math.sign(vy || 1) - vy) * 0.03; }
            let frente = -1, zMax = -9;
            for (let i = 0; i < nodos.length && i < P.length; i++) {
                const o = ORBITAS[P[i][0]], a = P[i][1] + ry * o.giro, z = Math.sin(a), n = nodos[i], fuera = !!e.filtro && n.dataset.c !== e.filtro;
                const prof = (z + 1) / 2;
                n.style.transform = `translate3d(${(Math.cos(a) * o.r * R).toFixed(1)}px,${((z * o.r * o.inc + o.des) * R * RY).toFixed(1)}px,0) scale(${(0.62 + prof * 0.58).toFixed(3)})`;
                n.style.opacity = fuera ? "" : (0.22 + prof * 0.78).toFixed(2); n.style.zIndex = String((prof * 100) | 0);
                n.classList.toggle("he-lejos", prof < 0.3); n.classList.toggle("he-fuera", fuera);
                if (!fuera && z > zMax) { zMax = z; frente = i; }
            }
            // Si nadie toca nada, la que pasa al frente toma la palabra.
            if (frente >= 0 && !quieto && !e.sobre && !e.pie && !e.foco && !arrastra && ahora - e.tocado > SOSTENER && ahora - ultimaVoz > 2600) { ultimaVoz = ahora; setSel(frente); }
        };
        // El cuadro se pide solo mientras la esfera está a la vista (antes corría siempre, aunque no pintara).
        const cuadro = (ahora: number) => { if (!vivo || !visible) { id = 0; return; } id = requestAnimationFrame(cuadro); if (!document.hidden) pintar(ahora); };
        const ojo = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible && !id && !quieto) id = requestAnimationFrame(cuadro); }, { rootMargin: "120px" });
        // Con «menos movimiento» no hay cuadros: arrastrar repinta a mano. Si no, la órbita no giraba nunca y las del fondo
        // (sin puntero: .he-lejos) quedaban fuera del alcance del mouse y del dedo.
        const mover = (ev: PointerEvent) => { if (!arrastra) return; const dx = ev.clientX - arrastra.x; arrastra = { x: ev.clientX }; ry += dx * 0.006; vy = dx * 0.0012 || vy; if (quieto) pintar(performance.now()); };
        const bajar = (ev: PointerEvent) => { arrastra = { x: ev.clientX }; };
        const soltar = () => { arrastra = null; };
        const redimensionar = () => { medir(); if (quieto) pintar(performance.now()); };
        repintar.current = () => pintar(performance.now());
        ojo.observe(caja); medir(); pintar(performance.now());
        caja.addEventListener("pointerdown", bajar); addEventListener("pointermove", mover, { passive: true }); addEventListener("pointerup", soltar); addEventListener("pointercancel", soltar); addEventListener("resize", redimensionar);
        return () => { vivo = false; cancelAnimationFrame(id); ojo.disconnect(); caja.removeEventListener("pointerdown", bajar); removeEventListener("pointermove", mover); removeEventListener("pointerup", soltar); removeEventListener("pointercancel", soltar); removeEventListener("resize", redimensionar); };
    }, [T]);

    // Un solo alto de tabulación: dentro se recorre con las flechas, y Tab sigue hacia «Abrir» con la herramienta elegida intacta.
    const conFlechas = (e: React.KeyboardEvent) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        let k = sel;
        for (let n = 0; n < T.length; n++) { k = (k + d + T.length) % T.length; if (!filtro || T[k].category === filtro) break; }
        esfera.current?.querySelectorAll<HTMLElement>(".he-nodo")[k]?.focus();
    };
    const foco = { onFocus: () => { estado.current.foco = true; }, onBlur: () => { estado.current.foco = false; } };

    const t = T[sel];
    return (
        <section id="herramientas" className={pagina ? "he-pagina" : "plano"} data-al-cargar={pagina ? "" : undefined} data-forma="texto" data-ancla="#ancla-texto" aria-labelledby="he-titulo">
            <span className="fantasma" aria-hidden="true">{T.length}</span>
            <Vista className="ancho">
                <div className="he-cab">
                    {pagina
                        ? <h1 id="he-titulo"><span className="linea-r"><span>Herramientas<i>.</i></span></span></h1>
                        : <h2 id="he-titulo"><span className="linea-r"><span>Herramientas</span></span></h2>}
                    {pagina
                        ? <a className="enlace-ir" href="#catalogo" data-sube="">Ver las {T.length} ↓</a>
                        : <Link className="enlace-ir he-cab-ir" href="/herramientas" data-sube="">Ver las {T.length} ↗</Link>}
                </div>
                <div className="he-esfera" id="he-esfera" ref={esfera} data-sube="" style={{ "--i": 1 } as CSSProperties}
                    onPointerOver={(e) => { const b = (e.target as HTMLElement).closest<HTMLElement>(".he-nodo"); estado.current.sobre = !!b; if (b) elegir(Number(b.dataset.i), true); }}
                    onPointerLeave={() => { estado.current.sobre = false; }} onKeyDown={conFlechas} {...foco}>
                    <div id="ancla-texto" />
                    {T.map((x, i) => (
                        <button key={x.slug} type="button" className="he-nodo" aria-label={x.name} aria-pressed={i === sel} tabIndex={i === sel ? 0 : -1} data-i={i} data-c={x.category}
                            style={{ "--c": COLOR_CATEGORIA[x.category] ?? "#5eead4" } as CSSProperties} onFocus={() => elegir(i, true)} onClick={() => elegir(i, true)}>
                            {/* ICONOS es una constante generada desde los íconos del propio repo (siglas.ts): no hay contenido de terceros. */}
                            <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONOS[x.slug] ?? "" }} />
                        </button>
                    ))}
                </div>
                <div className="he-pie" data-sube="" style={{ "--i": 2 } as CSSProperties} {...foco}
                    onPointerEnter={() => { estado.current.pie = true; }} onPointerLeave={() => { estado.current.pie = false; }}>
                    {/* Sin aria-live: el nombre rota solo y un lector de pantalla lo anunciaría sin fin. Cada ícono ya dice su nombre. */}
                    <p className="he-nombre he-cambia" id="he-nombre"><span key={t?.slug}>{t?.name}</span></p>
                    <p className="he-cat" id="he-cat" style={{ color: t ? COLOR_CATEGORIA[t.category] : undefined }}>{t ? mayuscula(t.category) : ""}</p>
                    <Link className="boton linea chico" id="he-abrir" href={t ? `/herramientas/${t.slug}` : "/herramientas"}>Abrir ↗</Link>
                </div>
                <div className="he-grupos" id="he-grupos" role="group" aria-label="Categorías" data-sube="" style={{ "--i": 3 } as CSSProperties}>
                    {categorias.map((c) => (
                        <button key={c} type="button" aria-pressed={c === filtro} style={{ "--c": COLOR_CATEGORIA[c] ?? "#5eead4" } as CSSProperties}
                            onClick={() => { const nuevo = filtro === c ? null : c; setFiltro(nuevo); if (nuevo) elegir(T.findIndex((x) => x.category === nuevo), true); }}>
                            {mayuscula(c)}<sup>{T.filter((x) => x.category === c).length}</sup>
                        </button>
                    ))}
                </div>
                {!pagina ? (
                    <div className="he-movil">
                        <ul className="he-destacadas" aria-label="Herramientas destacadas">
                            {/* En celular, en vez de la esfera: las de uso más amplio, en lista, y el enlace a todas. */}
                            {DESTACADAS_RESPALDO.flatMap((slug) => T.filter((x) => x.slug === slug)).map((x) => (
                                <li key={x.slug}>
                                    <Link href={`/herramientas/${x.slug}`} style={{ "--c": COLOR_CATEGORIA[x.category] ?? "#5eead4" } as CSSProperties}>
                                        <span className="he-ico" aria-hidden="true"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: ICONOS[x.slug] ?? "" }} /></span>
                                        <span className="he-txt"><b>{x.name}</b><small>{primeraFrase(x.description)}</small></span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link className="boton lleno he-todas" href="/herramientas">Ver las {T.length} herramientas</Link>
                    </div>
                ) : null}
            </Vista>
        </section>
    );
}
