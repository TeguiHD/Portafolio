"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as PE, type ReactNode } from "react";
import { ArrowLeft, Copy, ExternalLink, Info, LayoutGrid, Minus, Square, X } from "lucide-react";
import { anclarPanel } from "./anclaje";
import { contener, DISENOS, MIN_ALTO, MIN_ANCHO, NOMBRE_ZONA, zonaEncaje, type Rect, type Zona } from "./geometria";
import { IconoDe } from "./iconos/Icono";
import { navegarMenu } from "./menu";
import type { AccionesVentana, VentanaAbierta } from "./tipos";

const PASO = 16;
const BORDES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector(".es")?.getAttribute("data-animaciones") === "no";
const transformar = (r: Rect, extra = "") => `translate(${r.x}px, ${r.y}px) ${extra}`.trim();
/** La curva de Windows 11 al abrir: rápida al principio y muy suave al llegar. */
const DESACELERA = "cubic-bezier(0.1, 0.9, 0.2, 1)";

/** Cuánto hay que correr la ventana para que su centro caiga en su botón de la barra de tareas. */
function haciaTarea(id: string, r: Rect) {
    const b = document.querySelector<HTMLElement>(`[data-tarea="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    return { dx: (b ? b.left + b.width / 2 : innerWidth / 2) - (r.x + r.w / 2), dy: (b ? b.top + b.height / 2 : innerHeight) - (r.y + r.h / 2) };
}

/**
 * Una ventana como las de Windows 11: barra de título con su ícono y su nombre, y a la derecha minimizar, maximizar
 * (al pasar por encima ofrece los diseños de acople) y cerrar. Se arrastra por el título y se acopla al soltarla en un
 * borde o una esquina; cambia de tamaño por los bordes; el ícono abre su menú y, con las flechas, la mueve (con
 * Mayúsculas cambia su tamaño). Muestra una app propia, una herramienta como app o una página del sitio.
 */
export function Ventana({ v, activa, celular, acciones, children }: { v: VentanaAbierta; activa: boolean; celular: boolean; acciones: AccionesVentana; children?: ReactNode }) {
    const ref = useRef<HTMLElement>(null), marco = useRef<HTMLIFrameElement>(null), asa = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null), acople = useRef<HTMLDivElement>(null), botonMax = useRef<HTMLButtonElement>(null);
    const idTitulo = useId(), idMenu = useId(), idAcople = useId();
    const [cargada, setCargada] = useState(false);
    const { app } = v;
    const enMarco = app.tipo !== "vista" && Boolean(app.ruta);
    const acoplada = v.zona !== null;

    const poner = (r: Rect) => {
        const s = ref.current?.style;
        if (!s) return;
        s.setProperty("--x", `${r.x}px`); s.setProperty("--y", `${r.y}px`); s.setProperty("--w", `${r.w}px`); s.setProperty("--h", `${r.h}px`);
    };

    // Tras arrastrar o redimensionar, el estilo y la zona se tocaron a mano: cada vez que el estado de esta ventana cambia
    // (aunque quede igual que antes, p. ej. soltarla otra vez arriba), el DOM vuelve a lo que dice el estado.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || el.classList.contains("es-arrastrando")) return;
        poner(v.r);
        if (v.zona) el.setAttribute("data-zona", v.zona); else el.removeAttribute("data-zona");
    }, [v]);

    // Al aparecer: toma el foco si la abrió la persona y entra como en Windows 11 (crece un poco y se aclara).
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (v.foco) el.focus({ preventScroll: true });
        if (!v.min && !quieto()) el.animate([{ opacity: 0, transform: transformar(v.r, "scale(.94)") }, { opacity: 1, transform: transformar(v.r) }], { duration: 190, easing: DESACELERA });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Minimizar y restaurar: se encoge hacia su botón de la barra de tareas y vuelve desde ahí.
    const minAntes = useRef(v.min), minAhora = useRef(v.min);
    useLayoutEffect(() => {
        const el = ref.current;
        minAhora.current = v.min;
        if (!el) return;
        if (v.min === minAntes.current) { if (v.min) el.hidden = true; return; }
        minAntes.current = v.min;
        const { dx, dy } = haciaTarea(v.id, v.r);
        const cuadros = [{ opacity: 1, transform: transformar(v.r) }, { opacity: 0, transform: `translate(${v.r.x + dx}px, ${v.r.y + dy}px) scale(.18)` }];
        if (v.min) {
            el.animate(cuadros, { duration: quieto() ? 1 : 210, easing: "cubic-bezier(.6,0,.9,.4)" }).finished
                .then(() => { if (minAhora.current) el.hidden = true; }).catch(() => undefined);
        } else {
            el.hidden = false;
            el.animate([...cuadros].reverse(), { duration: quieto() ? 1 : 260, easing: DESACELERA });
        }
    }, [v.min]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cerrar: se achica un poco y se desvanece; recién entonces sale del escritorio. Si se vuelve a abrir mientras tanto,
    // la animación se cancela y la ventana sigue ahí (el escritorio solo quita las que siguen cerrándose).
    useEffect(() => {
        if (!v.cerrando) return;
        const el = ref.current;
        if (!el || quieto()) { acciones.cerrada(v.id); return; }
        const an = el.animate([{ opacity: 1, transform: transformar(v.r) }, { opacity: 0, transform: transformar(v.r, "scale(.95)") }], { duration: 130, easing: "cubic-bezier(.6,0,.9,.4)", fill: "forwards" });
        an.finished.then(() => acciones.cerrada(v.id)).catch(() => undefined);
        return () => an.cancel();
    }, [v.cerrando]); // eslint-disable-line react-hooks/exhaustive-deps

    // El menú de la ventana se abre bajo su ícono; los diseños de acople, bajo el botón de maximizar. Cerca del borde de
    // abajo (una ventana pegada abajo) se abren hacia arriba (anclarPanel).
    useEffect(() => {
        const m = menu.current, d = acople.current;
        const quitar: (() => void)[] = [];
        const enfocarPrimero = (panel: HTMLElement, sel: string) => (e: Event) => { if ((e as ToggleEvent).newState === "open" && panel.matches(":focus-within, [data-teclado]")) panel.querySelector<HTMLElement>(sel)?.focus(); };
        if (m && asa.current) {
            quitar.push(anclarPanel(m, asa.current));
            const b = (e: Event) => { if ((e as ToggleEvent).newState === "open") m.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus(); };
            m.addEventListener("toggle", b);
            quitar.push(() => m.removeEventListener("toggle", b));
        }
        if (d && botonMax.current) {
            quitar.push(anclarPanel(d, botonMax.current, { borde: "der", corrimiento: 46 }));
            const b = enfocarPrimero(d, "button");
            d.addEventListener("toggle", b);
            quitar.push(() => d.removeEventListener("toggle", b));
        }
        return () => quitar.forEach((f) => f());
    }, [celular]);

    // Pasar por maximizar un momento muestra los diseños de acople (como en Windows 11); salir de ambos los esconde.
    const espera = useRef(0);
    const mostrarAcople = (teclado = false) => {
        const d = acople.current;
        if (!d || celular) return;
        d.toggleAttribute("data-teclado", teclado);
        try { if (!d.matches(":popover-open")) d.showPopover(); } catch { /* sin popover */ }
        if (teclado) d.querySelector<HTMLElement>("button")?.focus();
    };
    const entrarMax = () => { clearTimeout(espera.current); espera.current = window.setTimeout(() => mostrarAcople(), 480); };
    const salirMax = () => {
        clearTimeout(espera.current);
        espera.current = window.setTimeout(() => { const d = acople.current; if (d && !d.matches(":hover, :focus-within")) { try { d.hidePopover(); } catch { /* ya cerrado */ } } }, 280);
    };
    useEffect(() => () => clearTimeout(espera.current), []);
    const acoplar = (z: Zona) => { try { acople.current?.hidePopover(); } catch { /* ya cerrado */ } acciones.encajar(v.id, z, v.zona ? (v.previo ?? v.r) : v.r); };

    const arrastrar = (e: PE<HTMLElement>) => {
        if (celular || e.button !== 0 || (e.target as Element).closest("button, a")) return;
        const cab = e.currentTarget;
        cab.setPointerCapture(e.pointerId);
        const ini = { px: e.clientX, py: e.clientY, r: { ...v.r } };
        let movido = false, zona: Zona | null = null, actual = { ...v.r };
        // Sacudir la ventana (ir y volver rápido varias veces) minimiza las demás.
        let dir = 0, xGiro = e.clientX, xAnt = e.clientX, giros: number[] = [], sacudida = false;
        const mover = (ev: PointerEvent) => {
            if (!movido) {
                if (Math.hypot(ev.clientX - ini.px, ev.clientY - ini.py) < 4) return;
                movido = true;
                acciones.moviendo(true);
                ref.current?.classList.add("es-arrastrando");
                if (v.zona) {
                    // Sale del acople: recupera su tamaño, con el puntero en el mismo lugar relativo del título.
                    const p = v.previo ?? { ...v.r, w: Math.round(v.r.w * 0.7), h: Math.round(v.r.h * 0.7) };
                    const rel = (ini.px - v.r.x) / v.r.w;
                    actual = { ...p, x: Math.round(ev.clientX - rel * p.w), y: Math.round(ev.clientY - 16) };
                    ini.r = { ...actual }; ini.px = ev.clientX; ini.py = ev.clientY;
                    ref.current?.removeAttribute("data-zona");
                }
            }
            const a = acciones.area();
            actual = { ...actual, x: Math.round(ini.r.x + ev.clientX - ini.px), y: Math.round(Math.max(a.y, Math.min(a.y + a.h - 32, ini.r.y + ev.clientY - ini.py))) };
            poner(actual);
            zona = zonaEncaje(ev.clientX, ev.clientY, innerWidth, innerHeight);
            acciones.guia(zona);
            const d = Math.sign(ev.clientX - xAnt);
            if (d && d !== dir) { if (dir && Math.abs(ev.clientX - xGiro) > 25) giros.push(ev.timeStamp); dir = d; xGiro = ev.clientX; }
            xAnt = ev.clientX;
            giros = giros.filter((t) => ev.timeStamp - t < 750);
            if (!sacudida && giros.length >= 5) { sacudida = true; acciones.sacudida(v.id); }
        };
        const fin = () => {
            cab.removeEventListener("pointermove", mover);
            cab.removeEventListener("lostpointercapture", fin);
            acciones.guia(null);
            acciones.moviendo(false);
            ref.current?.classList.remove("es-arrastrando");
            if (!movido) return;
            if (zona) acciones.encajar(v.id, zona, ini.r);
            else acciones.mover(v.id, actual);
        };
        cab.addEventListener("pointermove", mover);
        cab.addEventListener("lostpointercapture", fin);
    };

    const redimensionar = (b: (typeof BORDES)[number]) => (e: PE<HTMLElement>) => {
        if (e.button !== 0 || acoplada) return;
        e.preventDefault(); e.stopPropagation();
        const h = e.currentTarget;
        h.setPointerCapture(e.pointerId);
        acciones.moviendo(true);
        ref.current?.classList.add("es-arrastrando");
        const s = { px: e.clientX, py: e.clientY, ...v.r }, a = acciones.area();
        let actual = { ...v.r };
        const mover = (ev: PointerEvent) => {
            const dx = ev.clientX - s.px, dy = ev.clientY - s.py;
            let { x, y, w, h: alto } = s;
            if (b.includes("e")) w = Math.min(a.x + a.w - s.x, Math.max(MIN_ANCHO, s.w + dx));
            if (b.includes("s")) alto = Math.min(a.y + a.h - s.y, Math.max(MIN_ALTO, s.h + dy));
            if (b.includes("w")) { w = Math.min(s.x + s.w - a.x, Math.max(MIN_ANCHO, s.w - dx)); x = s.x + s.w - w; }
            if (b.includes("n")) { alto = Math.min(s.y + s.h - a.y, Math.max(MIN_ALTO, s.h - dy)); y = s.y + s.h - alto; }
            actual = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(alto) };
            poner(actual);
        };
        const fin = () => {
            h.removeEventListener("pointermove", mover);
            h.removeEventListener("lostpointercapture", fin);
            acciones.moviendo(false);
            ref.current?.classList.remove("es-arrastrando");
            acciones.mover(v.id, contener(actual, acciones.area()));
        };
        h.addEventListener("pointermove", mover);
        h.addEventListener("lostpointercapture", fin);
    };

    // Flechas sobre el ícono: mover; con Mayúsculas, cambiar el tamaño.
    const conTeclas = (e: KeyboardEvent<HTMLButtonElement>) => {
        const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
        if (!d || celular) return;
        e.preventDefault();
        const base = acoplada ? (v.previo ?? v.r) : v.r;
        const r = e.shiftKey ? { ...base, w: base.w + d[0] * PASO, h: base.h + d[1] * PASO } : { ...base, x: base.x + d[0] * PASO, y: base.y + d[1] * PASO };
        acciones.mover(v.id, contener(r, acciones.area()));
    };

    const alCargar = () => {
        const f = marco.current;
        if (!f) return;
        setCargada(true);
        acciones.cargar(v.id, f);
    };

    const abrirAparte = () => {
        // Aparte, en su página del sitio: una página, donde esté ahora; una herramienta, con lo que guarda en la dirección
        // (el tipo de QR, la magnitud de Unidades); una app propia, en su enlace.
        let destino = app.enlace;
        try {
            const l = marco.current?.contentWindow?.location;
            if (l && l.origin === location.origin) destino = app.tipo === "pagina" ? l.pathname + l.search + l.hash : `${app.enlace ?? l.pathname}${l.search}${l.hash}`;
        } catch { /* queda el enlace de la app */ }
        if (destino) window.open(destino, "_blank", "noopener");
    };
    const accionMenu = (f: () => void) => () => { menu.current?.hidePopover(); f(); };

    const estilo = { "--x": `${v.r.x}px`, "--y": `${v.r.y}px`, "--w": `${v.r.w}px`, "--h": `${v.r.h}px`, zIndex: v.z } as CSSProperties;
    return (
        <section ref={ref} className="es-ventana" role="dialog" aria-modal="false" aria-labelledby={idTitulo} tabIndex={-1} style={estilo}
            data-app={v.id} data-tipo={app.tipo} data-activa={activa || undefined} data-zona={v.zona ?? undefined}
            onPointerDownCapture={() => acciones.enfocar(v.id)}>
            <header className="es-cab" onPointerDown={arrastrar} onDoubleClick={(e) => { if (!celular && !(e.target as Element).closest("button, a")) acciones.alternarMax(v.id); }}>
                {celular && <button type="button" className="es-volver" aria-label="Volver" onClick={() => acciones.cerrar(v.id)}><ArrowLeft size={18} aria-hidden="true" /></button>}
                <button type="button" ref={asa} className="es-cab-icono" popoverTarget={celular ? undefined : idMenu} tabIndex={celular ? -1 : 0}
                    aria-label={`Opciones de ${app.titulo}. Con las flechas se mueve la ventana y con Mayúsculas y flechas cambia su tamaño.`}
                    onKeyDown={conTeclas}>
                    <IconoDe icono={app.icono} tam={16} />
                </button>
                <h2 className="es-tit" id={idTitulo}>{app.titulo}</h2>
                {!celular && (
                    <div className="es-ctl">
                        <button type="button" className="es-ctl-b" aria-label="Minimizar" title="Minimizar" onClick={() => acciones.minimizar(v.id)}><Minus size={16} strokeWidth={1.25} aria-hidden="true" /></button>
                        <button type="button" ref={botonMax} className="es-ctl-b" aria-label={acoplada ? "Restaurar" : "Maximizar"} title={acoplada ? "Restaurar" : "Maximizar"}
                            onClick={() => acciones.alternarMax(v.id)} onPointerEnter={entrarMax} onPointerLeave={salirMax}>
                            {acoplada ? <Copy size={13} strokeWidth={1.25} aria-hidden="true" style={{ transform: "scaleX(-1)" }} /> : <Square size={13} strokeWidth={1.25} aria-hidden="true" />}
                        </button>
                        <button type="button" className="es-ctl-b es-cerrar" aria-label="Cerrar" title="Cerrar" onClick={() => acciones.cerrar(v.id)}><X size={17} strokeWidth={1.25} aria-hidden="true" /></button>
                    </div>
                )}
            </header>
            <div className="es-cuerpo">
                {enMarco ? (
                    <>
                        {!cargada && <span className="es-cargando" aria-hidden="true" />}
                        <iframe ref={marco} src={app.ruta} title={app.titulo} allow="clipboard-write; fullscreen; geolocation" onLoad={alCargar} />
                    </>
                ) : children}
            </div>
            {!celular && !acoplada && BORDES.map((b) => <i key={b} className="es-borde" data-b={b} onPointerDown={redimensionar(b)} aria-hidden="true" />)}
            {!celular && (
                <>
                    <div ref={menu} id={idMenu} popover="auto" role="menu" aria-label={`Opciones de ${app.titulo}`} className="es-flota es-menu" onKeyDown={navegarMenu}>
                        <button type="button" role="menuitem" disabled={!acoplada} onClick={accionMenu(() => acciones.alternarMax(v.id))}><Copy size={14} aria-hidden="true" />Restaurar</button>
                        <button type="button" role="menuitem" onClick={accionMenu(() => acciones.minimizar(v.id))}><Minus size={14} aria-hidden="true" />Minimizar</button>
                        <button type="button" role="menuitem" disabled={v.zona === "max"} onClick={accionMenu(() => acciones.encajar(v.id, "max", v.r))}><Square size={13} aria-hidden="true" />Maximizar</button>
                        <button type="button" role="menuitem" onClick={accionMenu(() => mostrarAcople(true))}><LayoutGrid size={14} aria-hidden="true" />Diseños de acople</button>
                        <hr />
                        {app.enlace && <button type="button" role="menuitem" onClick={accionMenu(abrirAparte)}><ExternalLink size={14} aria-hidden="true" />Abrir en una pestaña</button>}
                        {app.tipo === "herramienta" && <button type="button" role="menuitem" onClick={accionMenu(() => acciones.acerca(v.id))}><Info size={14} aria-hidden="true" />Acerca de {app.titulo}</button>}
                        <hr />
                        <button type="button" role="menuitem" onClick={accionMenu(() => acciones.cerrar(v.id))}><X size={14} aria-hidden="true" />Cerrar</button>
                    </div>
                    <div ref={acople} id={idAcople} popover="auto" className="es-flota es-acople" aria-label="Diseños de acople" role="group"
                        onPointerEnter={() => clearTimeout(espera.current)} onPointerLeave={salirMax}>
                        {DISENOS.map((d) => (
                            <div key={d.nombre} className="es-diseno" role="group" aria-label={d.nombre} data-zonas={d.zonas.length}
                                style={{ gridTemplateColumns: d.zonas[0] === "t12" ? "2fr 1fr" : `repeat(${d.zonas.length === 4 ? 2 : d.zonas.length}, 1fr)`, gridTemplateRows: d.zonas.length === 4 ? "1fr 1fr" : "1fr" }}>
                                {d.zonas.map((z) => <button key={z} type="button" aria-label={`Acoplar en ${NOMBRE_ZONA[z]}`} title={`Acoplar en ${NOMBRE_ZONA[z]}`} onClick={() => acoplar(z)} />)}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
