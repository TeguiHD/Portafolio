"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as PE, type ReactNode } from "react";
import { contener, MIN_ALTO, MIN_ANCHO, zonaEncaje, type Rect, type Zona } from "./geometria";
import { Glifo, UI } from "./Glifo";
import { navegarMenu } from "./menu";
import type { AccionesVentana, VentanaAbierta } from "./tipos";

const PASO = 16;
const BORDES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const transformar = (r: Rect, extra = "") => `translate(${r.x}px, ${r.y}px) ${extra}`.trim();

/** Cuánto hay que correr la ventana para que su centro caiga en su botón de la barra de tareas. */
function haciaTarea(id: string, r: Rect) {
    const b = document.querySelector<HTMLElement>(`[data-tarea="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    return { dx: (b ? b.left + b.width / 2 : innerWidth / 2) - (r.x + r.w / 2), dy: (b ? b.top + b.height / 2 : innerHeight) - (r.y + r.h / 2) };
}

/**
 * Una ventana: se arrastra por el título, se encaja al soltarla en un borde, cambia de tamaño por los bordes y se
 * mueve con las flechas desde su ícono (con Mayúsculas cambia de tamaño). El ícono abre además un menú con lo mismo,
 * para quien no puede arrastrar. Muestra una página del sitio en un iframe del mismo origen o una vista propia.
 */
export function Ventana({ v, activa, celular, acciones, children }: { v: VentanaAbierta; activa: boolean; celular: boolean; acciones: AccionesVentana; children?: ReactNode }) {
    const ref = useRef<HTMLElement>(null), marco = useRef<HTMLIFrameElement>(null), asa = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
    const idTitulo = useId(), idMenu = useId();
    const [cargada, setCargada] = useState(false);
    const [ruta, setRuta] = useState(v.app.ruta ?? null);
    const { app } = v;
    const enMarco = Boolean(app.ruta && !app.vista);
    const encajada = v.zona !== null;

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

    // Al aparecer: toma el foco si la abrió la persona y, si la materia no la arma, entra con un fundido corto.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (v.foco) el.focus({ preventScroll: true });
        if (!v.naciendo && !v.min && !quieto()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // La materia terminó de escribir su nombre: la ventana se arma en su lugar.
    const nacia = useRef(v.naciendo);
    useLayoutEffect(() => {
        const el = ref.current;
        if (el && nacia.current && !v.naciendo && !quieto()) {
            el.animate([{ opacity: 0, transform: transformar(v.r, "translateY(14px) scale(.965)") }, { opacity: 1, transform: transformar(v.r) }], { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" });
        }
        nacia.current = v.naciendo;
    }, [v.naciendo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Minimizar y restaurar: se encoge hacia su botón de la barra de tareas y vuelve desde ahí.
    const minAntes = useRef(v.min), minAhora = useRef(v.min);
    useLayoutEffect(() => {
        const el = ref.current;
        minAhora.current = v.min;
        if (!el) return;
        if (v.min === minAntes.current) { if (v.min) el.hidden = true; return; }
        minAntes.current = v.min;
        const { dx, dy } = haciaTarea(v.id, v.r);
        const cuadros = [{ opacity: 1, transform: transformar(v.r) }, { opacity: 0, transform: `translate(${v.r.x + dx}px, ${v.r.y + dy}px) scale(.12)` }];
        if (v.min) {
            el.animate(cuadros, { duration: quieto() ? 1 : 260, easing: "cubic-bezier(.4,0,.7,.2)" }).finished
                .then(() => { if (minAhora.current) el.hidden = true; }).catch(() => undefined);
        } else {
            el.hidden = false;
            el.animate([...cuadros].reverse(), { duration: quieto() ? 1 : 300, easing: "cubic-bezier(.2,.8,.2,1)" });
        }
    }, [v.min]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cerrar: se desvanece y recién entonces sale del escritorio. Si se vuelve a abrir mientras se desvanece, la animación
    // se cancela y la ventana sigue ahí (el escritorio solo quita las que siguen cerrándose).
    useEffect(() => {
        if (!v.cerrando) return;
        const el = ref.current;
        if (!el || quieto()) { acciones.cerrada(v.id); return; }
        const an = el.animate([{ opacity: 1, transform: transformar(v.r) }, { opacity: 0, transform: transformar(v.r, "translateY(8px) scale(.97)") }], { duration: 170, easing: "ease-in", fill: "forwards" });
        an.finished.then(() => acciones.cerrada(v.id)).catch(() => undefined);
        return () => an.cancel();
    }, [v.cerrando]); // eslint-disable-line react-hooks/exhaustive-deps

    // El menú de la ventana se abre bajo su ícono.
    useEffect(() => {
        const m = menu.current;
        if (!m) return;
        const antes = (e: Event) => {
            if ((e as ToggleEvent).newState !== "open" || !asa.current) return;
            const r = asa.current.getBoundingClientRect();
            Object.assign(m.style, { left: `${Math.min(r.left, innerWidth - 240)}px`, top: `${r.bottom + 6}px` });
        };
        const alAbrir = (e: Event) => { if ((e as ToggleEvent).newState === "open") m.querySelector<HTMLElement>("[role=menuitem]")?.focus(); };
        m.addEventListener("beforetoggle", antes); m.addEventListener("toggle", alAbrir);
        return () => { m.removeEventListener("beforetoggle", antes); m.removeEventListener("toggle", alAbrir); };
    }, [celular]);

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
                    // Sale del encaje: recupera su tamaño, con el puntero en el mismo lugar relativo del título.
                    const p = v.previo ?? { ...v.r, w: Math.round(v.r.w * 0.7), h: Math.round(v.r.h * 0.7) };
                    const rel = (ini.px - v.r.x) / v.r.w;
                    actual = { ...p, x: Math.round(ev.clientX - rel * p.w), y: Math.round(ev.clientY - 22) };
                    ini.r = { ...actual }; ini.px = ev.clientX; ini.py = ev.clientY;
                    ref.current?.removeAttribute("data-zona");
                }
            }
            const a = acciones.area();
            actual = { ...actual, x: Math.round(ini.r.x + ev.clientX - ini.px), y: Math.round(Math.max(a.y, Math.min(a.y + a.h - 44, ini.r.y + ev.clientY - ini.py))) };
            poner(actual);
            zona = zonaEncaje(ev.clientX, ev.clientY, innerWidth);
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
        if (e.button !== 0 || encajada) return;
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
        const base = encajada ? (v.previo ?? v.r) : v.r;
        const r = e.shiftKey ? { ...base, w: base.w + d[0] * PASO, h: base.h + d[1] * PASO } : { ...base, x: base.x + d[0] * PASO, y: base.y + d[1] * PASO };
        acciones.mover(v.id, contener(r, acciones.area()));
    };

    const alCargar = () => {
        const f = marco.current;
        if (!f) return;
        setCargada(true);
        const leer = () => {
            try { const l = f.contentWindow?.location; if (l && l.origin === location.origin) setRuta(l.pathname + l.search); } catch { /* otra página: queda la última */ }
        };
        leer();
        // Las páginas del sitio navegan sin recargar: la dirección se relee después de cada clic.
        try { f.contentDocument?.addEventListener("click", () => setTimeout(leer, 400), true); } catch { /* sin acceso */ }
        acciones.cargar(v.id, f);
    };

    const abrirAparte = () => {
        // Una herramienta abierta como app se abre aparte en su página del sitio, no en la ruta de app.
        const destino = enMarco && !ruta?.startsWith("/escritorio/app/") ? ruta : app.enlace;
        if (destino) window.open(destino, "_blank", "noopener");
    };
    const accionMenu = (f: () => void) => () => { menu.current?.hidePopover(); f(); };

    const estilo = { "--x": `${v.r.x}px`, "--y": `${v.r.y}px`, "--w": `${v.r.w}px`, "--h": `${v.r.h}px`, "--c": app.color, zIndex: v.z } as CSSProperties;
    return (
        <section ref={ref} className="es-ventana" role="dialog" aria-modal="false" aria-labelledby={idTitulo} tabIndex={-1} style={estilo}
            data-app={v.id} data-activa={activa || undefined} data-zona={v.zona ?? undefined} data-naciendo={v.naciendo || undefined}
            onPointerDownCapture={() => acciones.enfocar(v.id)}>
            <header className="es-cab" onPointerDown={arrastrar} onDoubleClick={(e) => { if (!celular && !(e.target as Element).closest("button, a")) acciones.alternarMax(v.id); }}>
                {celular ? (
                    <button type="button" className="es-ctl-boton" aria-label="Volver" onClick={() => acciones.cerrar(v.id)}><Glifo d={UI.volver} /></button>
                ) : (
                    <button type="button" ref={asa} className="es-asa" popoverTarget={idMenu}
                        aria-label={`Mover ${app.titulo}: flechas para moverla y Mayúsculas con flechas para cambiar su tamaño. Enter abre sus opciones.`}
                        onKeyDown={conTeclas}>
                        <Glifo d={app.glifo} />
                    </button>
                )}
                <h2 className="es-tit" id={idTitulo}>{app.titulo}</h2>
                <span className="es-dir" aria-hidden="true" />
                <div className="es-ctl">
                    {(enMarco || app.enlace) && (
                        <button type="button" className="es-ctl-boton" aria-label="Abrir en una pestaña" title="Abrir en una pestaña" onClick={abrirAparte}><Glifo d={UI.aparte} /></button>
                    )}
                    {!celular && (
                        <>
                            <button type="button" className="es-ctl-boton" aria-label="Minimizar" title="Minimizar" onClick={() => acciones.minimizar(v.id)}><Glifo d={UI.min} /></button>
                            <button type="button" className="es-ctl-boton" aria-label={encajada ? "Restaurar" : "Maximizar"} title={encajada ? "Restaurar" : "Maximizar"} onClick={() => acciones.alternarMax(v.id)}>
                                <Glifo d={encajada ? UI.restaurar : UI.max} />
                            </button>
                            <button type="button" className="es-ctl-boton es-cerrar" aria-label="Cerrar" title="Cerrar" onClick={() => acciones.cerrar(v.id)}><Glifo d={UI.cerrar} /></button>
                        </>
                    )}
                </div>
            </header>
            <div className="es-cuerpo">
                {enMarco ? (
                    <>
                        {!cargada && <span className="es-cargando" aria-hidden="true" />}
                        <iframe ref={marco} src={app.ruta} title={app.titulo} allow="clipboard-write; fullscreen; geolocation" onLoad={alCargar} />
                    </>
                ) : children}
            </div>
            {!celular && BORDES.map((b) => <i key={b} className="es-borde" data-b={b} onPointerDown={redimensionar(b)} aria-hidden="true" />)}
            {!celular && (
                <div ref={menu} id={idMenu} popover="auto" role="menu" aria-label={`Opciones de ${app.titulo}`} className="es-panel es-menu" onKeyDown={navegarMenu}>
                    <button type="button" role="menuitem" onClick={accionMenu(() => acciones.encajar(v.id, "izq", v.r))}>Acoplar a la izquierda</button>
                    <button type="button" role="menuitem" onClick={accionMenu(() => acciones.encajar(v.id, "der", v.r))}>Acoplar a la derecha</button>
                    <button type="button" role="menuitem" onClick={accionMenu(() => acciones.alternarMax(v.id))}>{encajada ? "Restaurar el tamaño" : "Maximizar"}</button>
                    <button type="button" role="menuitem" onClick={accionMenu(() => acciones.minimizar(v.id))}>Minimizar</button>
                    <hr />
                    <button type="button" role="menuitem" onClick={accionMenu(() => acciones.cerrar(v.id))}>Cerrar</button>
                </div>
            )}
        </section>
    );
}
