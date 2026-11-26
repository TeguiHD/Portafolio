"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSeccion } from "@/modules/materia/Materia";
import { cambiarTema } from "./tema";
import { BotonInstalar } from "@/components/pwa/BotonInstalar";
import { PanelHerramientas, PanelIndice } from "./MenusBarra";
import "./barra.css";

/** Un destino de la barra. Con `menu`, es un botón que abre un panel (popover en ancho, lista desplegable en el menú del celular). */
export interface EnlaceBarra { href: string; texto: string; menu?: "herramientas" | "indice" }

const ENLACES: EnlaceBarra[] = [
    { href: "/servicios", texto: "Servicios" },
    { href: "/#proyectos", texto: "Proyectos" },
    { href: "/herramientas", texto: "Herramientas", menu: "herramientas" },
    { href: "/indice-web-chilena", texto: "Índice", menu: "indice" },
    { href: "/blog", texto: "Blog" },
];

/** El id de sección al que apunta un enlace («/#proyectos» → «proyectos»), o null si va a otra página. */
const ancla = (href: string) => (href.includes("#") ? href.slice(href.indexOf("#") + 1) : null);

/**
 * La barra del sitio: marca, destinos, tema y «Hablemos».
 * Arriba va abierta; al bajar se recoge en una cápsula de vidrio; si sigues bajando se esconde y vuelve al subir.
 */
export function Barra({ enlaces = ENLACES, inicio = "/", contacto = "/#contacto", conTema = true }: { enlaces?: EnlaceBarra[]; inicio?: string; contacto?: string; conTema?: boolean }) {
    const barra = useRef<HTMLElement>(null), ir = useRef<HTMLElement>(null), boton = useRef<HTMLAnchorElement>(null), lista = useRef<HTMLDivElement>(null), menu = useRef<HTMLButtonElement>(null);
    const ruta = usePathname();
    const seccion = useSeccion();
    const actual = seccion ? enlaces.findIndex((e) => ancla(e.href) === seccion.id) : -1;

    // La pastilla descansa en la sección actual y sigue al cursor. Se mide solo al cambiar, nunca por cuadro.
    const encima = useRef(-1);
    const posar = () => {
        const nav = ir.current; if (!nav) return;
        const i = encima.current >= 0 ? encima.current : actual, a = nav.querySelectorAll<HTMLElement>(".nb-item")[i];
        if (!a) { nav.style.setProperty("--o", "0"); return; }
        nav.style.setProperty("--x", `${a.offsetLeft - (innerWidth <= 760 ? 5 : 0)}px`);
        nav.style.setProperty("--w", `${a.offsetWidth}px`);
        nav.style.setProperty("--o", "1"); nav.style.setProperty("--p", i === actual ? "1" : "0");
    };
    // Los oyentes llaman siempre al `posar` del último render: el del primero no sabe qué sección está activa.
    const ultimoPosar = useRef(posar);
    useEffect(() => { ultimoPosar.current = posar; posar(); });
    useEffect(() => {
        const reposar = () => ultimoPosar.current();
        addEventListener("resize", reposar); document.fonts?.ready.then(reposar);
        return () => removeEventListener("resize", reposar);
    }, []);

    // Recogerse, esconderse y volver.
    useEffect(() => {
        const b = barra.current; if (!b) return;
        let antes = scrollY, escondida = false, pendiente = false;
        const ya = () => {
            pendiente = false;
            const y = scrollY, baja = y > antes + 6, sube = y < antes - 6;
            b.classList.toggle("nb-baja", y > 60);
            if (y < 200 || sube) escondida = false; else if (baja && y > 500) escondida = true;
            b.classList.toggle("nb-oculta", escondida && !b.matches(":hover, :focus-within"));
            if (baja || sube) antes = y;
        };
        const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(ya); } };
        const finEntrada = (e: AnimationEvent) => { if (e.target === b) b.style.animation = "none"; };
        // Si el foco entra a la barra escondida (con Tab), vuelve: nunca queda el foco fuera de la vista.
        const alFoco = () => { escondida = false; b.classList.remove("nb-oculta"); };
        addEventListener("scroll", pedir, { passive: true }); b.addEventListener("animationend", finEntrada); b.addEventListener("focusin", alFoco); ya();
        return () => { removeEventListener("scroll", pedir); b.removeEventListener("animationend", finEntrada); b.removeEventListener("focusin", alFoco); };
    }, []);

    // En celular la misma lista de enlaces es un popover nativo que abre «Menú» (un solo <nav> en todos los tamaños).
    // El atributo popover solo existe en angosto; en ancho la lista vuelve a la fila. Donde no hay Popover API, el botón
    // muestra la lista con un atributo propio.
    useEffect(() => {
        const l = lista.current, b = menu.current; if (!l || !b) return;
        const conPopover = Object.hasOwn(HTMLElement.prototype, "popover");
        const angosto = matchMedia("(max-width: 860px)"); // mismo corte que barra.css
        const aplicar = () => {
            if (angosto.matches && conPopover) l.setAttribute("popover", "auto");
            else { if (l.matches?.(":popover-open")) l.hidePopover(); l.removeAttribute("popover"); }
            l.removeAttribute("data-abierta"); b.setAttribute("aria-expanded", "false");
        };
        const alCambiar = (e: Event) => b.setAttribute("aria-expanded", String((e as ToggleEvent).newState === "open"));
        const sinApi = () => { if (conPopover) return; const abierta = !l.hasAttribute("data-abierta"); l.toggleAttribute("data-abierta", abierta); b.setAttribute("aria-expanded", String(abierta)); };
        aplicar(); angosto.addEventListener("change", aplicar); l.addEventListener("toggle", alCambiar); b.addEventListener("click", sinApi);
        return () => { angosto.removeEventListener("change", aplicar); l.removeEventListener("toggle", alCambiar); b.removeEventListener("click", sinApi); };
    }, []);
    // Al elegir un destino, el menú se cierra (también si es una sección de esta misma página), y los paneles también.
    const cerrarMenu = () => {
        const l = lista.current; if (!l) return;
        if (l.matches?.(":popover-open")) l.hidePopover();
        l.removeAttribute("data-abierta");
        for (const p of l.querySelectorAll<HTMLElement>(".nb-sub")) { if (p.matches?.(":popover-open")) p.hidePopover(); }
    };
    useEffect(cerrarMenu, [ruta]);

    // Los paneles (patrón navbar anidado): en ancho son popovers que abre el botón (popovertarget) o el cursor al pasar;
    // en el menú del celular son listas desplegables con hidden. Se sincronizan con el mismo corte que la lista.
    useEffect(() => {
        const l = lista.current; if (!l) return;
        const angosto = matchMedia("(max-width: 860px)"), conHover = matchMedia("(hover: hover)");
        const grupos = [...l.querySelectorAll<HTMLElement>(".nb-grupo")];
        const limpiezas: (() => void)[] = [];
        const anclaje = CSS.supports("position-area", "block-end");
        const aplicar = () => {
            for (const g of grupos) {
                const b = g.querySelector<HTMLButtonElement>(".nb-abre")!, p = g.querySelector<HTMLElement>(".nb-sub")!;
                if (p.matches?.(":popover-open")) p.hidePopover();
                if (angosto.matches) { p.removeAttribute("popover"); p.hidden = true; } else { p.setAttribute("popover", "auto"); p.hidden = false; }
                b.setAttribute("aria-expanded", "false");
            }
        };
        for (const g of grupos) {
            const b = g.querySelector<HTMLButtonElement>(".nb-abre")!, p = g.querySelector<HTMLElement>(".nb-sub")!;
            // Intención: el cursor que cruza la barra no abre nada; quedarse un instante sí. Salir cierra con un respiro,
            // y volver al grupo (al botón o al panel) antes de que venza lo deja abierto.
            let vistaPrevia = false, abrir = 0, cerrar = 0;
            const alCambiar = (e: Event) => {
                // Abrir o cerrar (clic, Escape, otro panel) anula la espera del cursor: si no, al vencer lo volvía a abrir.
                clearTimeout(abrir);
                const abierto = (e as ToggleEvent).newState === "open";
                b.setAttribute("aria-expanded", String(abierto));
                if (!abierto) vistaPrevia = false;
                // Sin anchor positioning: el panel se ubica bajo su botón con su caja, sin salirse de la pantalla.
                if (abierto && !anclaje) {
                    const r = b.getBoundingClientRect(), t = p.getBoundingClientRect();
                    const arriba = r.bottom + 10 + t.height > innerHeight ? Math.max(0, r.top - 10 - t.height) : r.bottom + 10;
                    p.style.top = `${arriba}px`; p.style.left = `${Math.min(Math.max(0, r.left + r.width / 2 - t.width / 2), innerWidth - t.width)}px`;
                }
            };
            const clic = (e: MouseEvent) => {
                clearTimeout(abrir);
                if (angosto.matches) { p.hidden = !p.hidden; b.setAttribute("aria-expanded", String(!p.hidden)); return; }
                // Si el cursor ya lo abrió, el clic lo deja fijo en vez de cerrarlo.
                if (vistaPrevia) { vistaPrevia = false; e.preventDefault(); }
            };
            const entra = (e: PointerEvent) => {
                if (angosto.matches || !conHover.matches || e.pointerType === "touch") return;
                clearTimeout(cerrar);
                if (p.matches(":popover-open")) return;
                clearTimeout(abrir);
                abrir = window.setTimeout(() => {
                    if (p.matches(":popover-open")) return;
                    // Con source, el botón queda como ancla implícita del panel (los tipos de TypeScript aún no lo traen).
                    try { (p.showPopover as (o?: { source?: HTMLElement }) => void)({ source: b }); } catch { try { p.showPopover(); } catch { return; } }
                    vistaPrevia = true;
                }, 150);
            };
            const sale = () => {
                clearTimeout(abrir);
                // Con el foco del teclado adentro no se cierra: el foco quedaría en algo que ya no se ve.
                if (vistaPrevia && p.matches(":popover-open")) cerrar = window.setTimeout(() => { if (vistaPrevia && p.matches(":popover-open") && !g.matches(":focus-within")) p.hidePopover(); }, 200);
            };
            const foco = (e: FocusEvent) => { if (e.relatedTarget && !g.contains(e.relatedTarget as Node) && p.matches?.(":popover-open")) p.hidePopover(); };
            p.addEventListener("toggle", alCambiar); b.addEventListener("click", clic); g.addEventListener("pointerenter", entra); g.addEventListener("pointerleave", sale); g.addEventListener("focusout", foco);
            limpiezas.push(() => { clearTimeout(abrir); clearTimeout(cerrar); p.removeEventListener("toggle", alCambiar); b.removeEventListener("click", clic); g.removeEventListener("pointerenter", entra); g.removeEventListener("pointerleave", sale); g.removeEventListener("focusout", foco); });
        }
        aplicar(); angosto.addEventListener("change", aplicar);
        return () => { angosto.removeEventListener("change", aplicar); limpiezas.forEach((f) => f()); };
    }, []);

    // El botón se deja atraer por el cursor (solo con puntero fino y sin la preferencia de menos movimiento).
    useEffect(() => {
        const b = boton.current; if (!b) return;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover)").matches) return;
        const mover = (e: PointerEvent) => { const r = b.getBoundingClientRect(); b.style.setProperty("--ix", `${((e.clientX - r.left) / r.width - 0.5) * 10}px`); b.style.setProperty("--iy", `${((e.clientY - r.top) / r.height - 0.5) * 8}px`); };
        const soltar = () => { b.style.setProperty("--ix", "0px"); b.style.setProperty("--iy", "0px"); };
        b.addEventListener("pointermove", mover); b.addEventListener("pointerleave", soltar);
        return () => { b.removeEventListener("pointermove", mover); b.removeEventListener("pointerleave", soltar); };
    }, []);

    return (
        <header className="nb" id="nb" ref={barra}>
            <Link className="nb-marca" href={inicio} aria-label="nicoholas.dev, inicio" style={{ "--n": 0 } as React.CSSProperties}>nicoholas<i>.</i><span>dev</span></Link>
            <nav className="nb-ir" id="nb-ir" aria-label="Secciones" ref={ir} style={{ "--n": 1 } as React.CSSProperties}
                onPointerLeave={() => { encima.current = -1; posar(); }}>
                <i className="nb-luz" aria-hidden="true" />
                <button className="nb-menu" type="button" ref={menu} popoverTarget="nb-lista" aria-controls="nb-lista" aria-expanded="false">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path className="nb-menu-a" d="M4 8h16" /><path className="nb-menu-b" d="M4 16h16" /></svg>
                    <span>Menú</span>
                </button>
                <div className="nb-lista" id="nb-lista" ref={lista}>
                    {enlaces.map((e, k) => {
                        const aqui = k === actual ? "location" : !e.href.includes("#") && (ruta === e.href || ruta.startsWith(`${e.href}/`)) ? "page" : undefined;
                        const pastilla = { onPointerEnter: () => { encima.current = k; posar(); }, onFocus: () => { encima.current = k; posar(); }, onBlur: () => { encima.current = -1; posar(); } };
                        if (!e.menu) return <Link key={e.href} className="nb-item" href={e.href} aria-current={aqui} onClick={cerrarMenu} {...pastilla}>{e.texto}</Link>;
                        const id = `nb-sub-${e.menu}`;
                        return (
                            <div key={e.href} className="nb-grupo">
                                <button type="button" className="nb-item nb-abre" aria-expanded="false" aria-controls={id} popoverTarget={id} aria-current={aqui} {...pastilla}>
                                    {e.texto}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                <div className="nb-sub" id={id}>
                                    {e.menu === "herramientas" ? <PanelHerramientas alElegir={cerrarMenu} /> : <PanelIndice alElegir={cerrarMenu} />}
                                </div>
                            </div>
                        );
                    })}
                    {/* Solo en el menú del celular: lo que en ancho vive en el pie o en el botón de al lado. */}
                    <Link className="nb-solo-menu" href="/sobre-mi" onClick={cerrarMenu} aria-current={ruta === "/sobre-mi" ? "page" : undefined}>Sobre mí</Link>
                    <BotonInstalar className="nb-solo-menu nb-instalar" />
                    <Link className="nb-solo-menu boton lleno nb-menu-hablar" href={contacto} onClick={cerrarMenu}>Hablemos de tu proyecto</Link>
                </div>
            </nav>
            {/* El modo escritorio (/escritorio): el sitio en ventanas. Con mouse y en pantallas anchas; en el celular está en el pie. */}
            {/* <a> y no <Link>: el escritorio carga entero (su propia política de permisos e historial). */}
            <a className="nb-escritorio" href="/escritorio" aria-label="Modo escritorio" title="Modo escritorio" style={{ "--n": 2 } as React.CSSProperties}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
            </a>
            {conTema && (
                <button className="nb-tema" id="nb-tema" type="button" aria-label="Cambiar entre tema claro y oscuro" style={{ "--n": 2 } as React.CSSProperties} onClick={(e) => cambiarTema(e)}>
                    <svg className="nb-luna" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.5A7 7 0 0 1 12 3Z" /></svg>
                    <svg className="nb-sol" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
                </button>
            )}
            <Link href={contacto} className="boton lleno chico nb-hablar" id="nb-hablar" ref={boton} style={{ "--n": 3 } as React.CSSProperties}>Hablemos</Link>
        </header>
    );
}
