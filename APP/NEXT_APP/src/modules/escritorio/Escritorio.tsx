"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent as ME, type PointerEvent as PE } from "react";
import type { Clima, Motor } from "@/modules/materia/motor";
import { climaDe } from "@/modules/pulse/blog/clima";
import { enmarcableEnEscritorio } from "@/lib/escritorio/enmarcable";
import { ANCLADAS, APPS, EN_ESCRITORIO, appHerramienta, idDeRuta, type App, type HerramientaEscritorio, type Vista } from "./apps";
import { areaUtil, contener, posicionInicial, rectZona, type Rect, type Zona } from "./geometria";
import { Glifo, UI } from "./Glifo";
import { Iconos } from "./Iconos";
import { Calendario, Inicio, MenuEscritorio, PanelSonido, type ControlInicio, type ControlMenu } from "./Paneles";
import { SonidoEscritorio, leerPreferencias, type PreferenciasSonido } from "./sonido";
import type { AccionesVentana, Fondo, ProyectoEscritorio, VentanaAbierta } from "./tipos";
import { Ventana } from "./Ventana";
import { VistaAtajos, VistaConfiguracion, VistaHerramientas, VistaProyectos, type Ajustes } from "./Vistas";
import "./escritorio.css";

declare global {
    interface Window {
        /** Lo llama cada página del sitio que se abre dentro de una ventana (TemaInicial), apenas empieza a cargar. */
        __escritorio?: { enlazar(w: Window): void };
    }
}

/* ---------- Estado de las ventanas ---------- */
interface Estado { wins: VentanaAbierta[]; z: number }
type Accion =
    | { t: "abrir"; app: App; r: Rect; zona: Zona | null; naciendo: boolean; foco: boolean }
    | { t: "enfocar"; id: string }
    | { t: "nacida"; id: string }
    | { t: "mover"; id: string; r: Rect }
    | { t: "encajar"; id: string; zona: Zona; desde: Rect; area: Rect }
    | { t: "alternarMax"; id: string; area: Rect }
    | { t: "minimizar"; id: string }
    | { t: "minimizarOtras"; id: string }
    | { t: "cerrar"; id: string }
    | { t: "quitar"; id: string }
    | { t: "acomodar"; area: Rect; celular: boolean }
    | { t: "restaurar"; wins: VentanaAbierta[] };

function reducir(e: Estado, a: Accion): Estado {
    const cambiar = (id: string, f: (w: VentanaAbierta) => VentanaAbierta) => e.wins.map((w) => (w.id === id ? f(w) : w));
    switch (a.t) {
        case "abrir": {
            const z = e.z + 1;
            if (e.wins.some((w) => w.id === a.app.id)) return { z, wins: cambiar(a.app.id, (w) => ({ ...w, min: false, cerrando: false, z, foco: a.foco })) };
            return { z, wins: [...e.wins, { id: a.app.id, app: a.app, r: a.r, previo: null, zona: a.zona, min: false, z, naciendo: a.naciendo, cerrando: false, foco: a.foco }] };
        }
        case "enfocar": {
            const z = e.z + 1;
            return { z, wins: cambiar(a.id, (w) => ({ ...w, min: false, z })) };
        }
        case "nacida": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, naciendo: false })) };
        case "mover": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, r: a.r, zona: null, previo: null })) };
        case "encajar": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, previo: w.zona ? (w.previo ?? a.desde) : a.desde, zona: a.zona, r: rectZona(a.zona, a.area) })) };
        case "alternarMax": return {
            ...e, wins: cambiar(a.id, (w) => (w.zona
                ? { ...w, zona: null, previo: null, r: contener(w.previo ?? { ...w.r, x: w.r.x + 40, y: w.r.y + 40, w: Math.round(w.r.w * 0.7), h: Math.round(w.r.h * 0.7) }, a.area) }
                : { ...w, previo: w.r, zona: "max", r: rectZona("max", a.area) })),
        };
        case "minimizar": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, min: true })) };
        case "minimizarOtras": return { ...e, wins: e.wins.map((w) => (w.id === a.id ? w : { ...w, min: true })) };
        case "cerrar": return { ...e, wins: cambiar(a.id, (w) => ({ ...w, cerrando: true })) };
        case "quitar": return { ...e, wins: e.wins.filter((w) => !(w.id === a.id && w.cerrando)) };
        case "acomodar": return {
            ...e, wins: e.wins.map((w) => (a.celular ? { ...w, zona: "max" as const, r: { ...a.area } } : w.zona ? { ...w, r: rectZona(w.zona, a.area) } : { ...w, r: contener(w.r, a.area) })),
        };
        case "restaurar": return { z: Math.max(e.z, ...a.wins.map((w) => w.z)), wins: a.wins };
    }
}
const activaDe = (e: Estado) => e.wins.filter((w) => !w.min && !w.cerrando).reduce<VentanaAbierta | null>((m, w) => (!m || w.z > m.z ? w : m), null);

/* ---------- Celular ---------- */
const CONSULTA_CELULAR = "(max-width: 760px), (pointer: coarse) and (max-width: 1100px)";
const suscribirCelular = (f: () => void) => { const m = matchMedia(CONSULTA_CELULAR); m.addEventListener("change", f); return () => m.removeEventListener("change", f); };
const esCelular = () => matchMedia(CONSULTA_CELULAR).matches;
const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const FONDOS_VALIDOS: Fondo[] = ["olas", "clima", "firma", "quieto"];
const HORA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const CORTA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "short", day: "numeric", month: "short" });
const climaPorHora = (): Clima => { const h = Number(new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23" }).format(new Date())); return h >= 7 && h < 21 ? "sol" : "noche"; };
const CAMPO = "input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable='true']";

/**
 * El modo escritorio: nicoholas.dev como un escritorio con ventanas, sobre la materia de partículas del sitio.
 * Las ventanas muestran las páginas reales (iframe del mismo origen en «modo ventana») o vistas propias; suenan los
 * clics al presionar y al soltar (sintetizados), se arrastran, se encajan, se minimizan y recuerdan la sesión.
 */
export function Escritorio({ herramientas, proyectos }: { herramientas: HerramientaEscritorio[]; proyectos: ProyectoEscritorio[] }) {
    const [estado, despachar] = useReducer(reducir, { wins: [], z: 10 });
    const celular = useSyncExternalStore(suscribirCelular, esCelular, () => false);
    const [arranque, setArranque] = useState<"espera" | "encendiendo" | "listo">("espera");
    const [bloqueado, setBloqueado] = useState(false);
    const [tema, setTema] = useState<"oscuro" | "claro">("oscuro");
    const [fondo, setFondo] = useState<Fondo>("olas");
    const [prefs, setPrefs] = useState<PreferenciasSonido | null>(null);
    const [sonidoListo, setSonidoListo] = useState(false);
    const [recientes, setRecientes] = useState<string[]>([]);
    const [ahora, setAhora] = useState<Date | null>(null);
    const [tiempo, setTiempo] = useState<string | null>(null);
    const [anuncio, setAnuncio] = useState("");
    const [ordenar, setOrdenar] = useState(0);

    const raiz = useRef<HTMLDivElement>(null), lienzo = useRef<HTMLCanvasElement>(null), frente = useRef<HTMLDivElement>(null), guia = useRef<HTMLDivElement>(null);
    const anclaCentro = useRef<HTMLDivElement>(null), anclaFirma = useRef<HTMLDivElement>(null), anclaVentana = useRef<HTMLDivElement>(null);
    const inicio = useRef<ControlInicio>(null), menu = useRef<ControlMenu>(null);
    const motor = useRef<Motor | null>(null), sonido = useRef<SonidoEscritorio | null>(null);
    const volverFondo = useRef(0), recientesListos = useRef(false), enlazados = useRef(new WeakSet<Document>());
    /** En el celular, las ventanas que abrieron un paso del historial (la última arriba). */
    const pila = useRef<string[]>([]);
    /** Lo último de cada cosa, para los oyentes que viven fuera de React (iframes, teclado global). */
    const vivo = useRef({ estado, celular, fondo, arranque, clima: null as Clima | null, maxActiva: false });
    const activa = activaDe(estado);
    const maxActiva = !!activa && activa.zona === "max";
    useLayoutEffect(() => { Object.assign(vivo.current, { estado, celular, fondo, arranque, maxActiva }); });

    const herramientasApp = useMemo(() => new Map(herramientas.map((t) => [`herramientas/${t.slug}`, appHerramienta(t)])), [herramientas]);
    const resolver = useCallback((id: string): App | null => APPS[id] ?? herramientasApp.get(id) ?? null, [herramientasApp]);
    const area = useCallback(() => areaUtil(innerWidth, innerHeight, vivo.current.celular), []);
    const anunciar = useCallback((t: string) => { setAnuncio(""); requestAnimationFrame(() => setAnuncio(t)); }, []);

    /* ---------- La materia del fondo ---------- */
    const aplicarFondo = useCallback(() => {
        const m = motor.current;
        if (!m) return;
        const { fondo: f, clima, maxActiva: tapado } = vivo.current;
        m.pausar(false);
        if (f === "clima") { m.forma("olas"); m.clima(clima ?? climaPorHora()); }
        else { m.clima(null); if (f === "firma" && anclaCentro.current) m.forma("firma", anclaCentro.current); else m.forma("olas"); }
        // Quieta, o tapada por una ventana maximizada, no gasta: se detiene cuando termina de acomodarse.
        if (f === "quieto" || tapado) setTimeout(() => { if (vivo.current.fondo === "quieto" || vivo.current.maxActiva) motor.current?.pausar(true); }, 1400);
    }, []);

    const pedirTiempo = useCallback(async () => {
        if (vivo.current.clima) return;
        try {
            const r = await fetch("/api/pulse/context?city=Santiago", { signal: AbortSignal.timeout(8000) });
            if (!r.ok) return;
            const d = (await r.json()) as { weatherCode?: number; isDay?: boolean; temperature?: number; weatherLabel?: string };
            if (typeof d.weatherCode === "number") { vivo.current.clima = climaDe(d.weatherCode, d.isDay !== false); if (vivo.current.fondo === "clima") aplicarFondo(); }
            if (typeof d.temperature === "number") setTiempo(`${Math.round(d.temperature)} °C${d.weatherLabel ? `, ${d.weatherLabel.toLowerCase()}` : ""}`);
        } catch { /* sin tiempo: el fondo sigue la hora del día */ }
    }, [aplicarFondo]);

    const ponerFondo = useCallback((f: Fondo) => {
        setFondo(f); vivo.current.fondo = f;
        try { localStorage.setItem("escritorio:fondo", f); } catch { /* vale para esta visita */ }
        if (f === "clima") void pedirTiempo();
        aplicarFondo();
    }, [aplicarFondo, pedirTiempo]);

    /* ---------- Abrir, enfocar, cerrar ---------- */
    const abrir = useCallback((id: string, op: { historial?: boolean; foco?: boolean } = {}) => {
        const app = resolver(id);
        if (!app) return;
        const e = vivo.current.estado, cel = vivo.current.celular, a = areaUtil(innerWidth, innerHeight, cel);
        const ya = e.wins.find((w) => w.id === id && !w.cerrando);
        if (ya) {
            despachar({ t: "abrir", app, r: ya.r, zona: ya.zona, naciendo: false, foco: op.foco ?? true });
            if (ya.min) sonido.current?.efecto("abrir");
            return;
        }
        const r = cel ? { ...a } : posicionInicial(e.wins.filter((w) => !w.cerrando).length, app.tam[0], app.tam[1], a);
        const materializar = !!motor.current && !cel && vivo.current.fondo !== "quieto" && vivo.current.arranque === "listo" && !reducido();
        despachar({ t: "abrir", app, r, zona: cel ? "max" : null, naciendo: materializar, foco: op.foco ?? true });
        sonido.current?.efecto("abrir");
        anunciar(`${app.titulo}: ventana abierta`);
        setRecientes((rs) => [id, ...rs.filter((x) => x !== id)].slice(0, 6));
        if (materializar && motor.current && anclaVentana.current) {
            // La materia escribe el nombre donde va a aparecer la ventana; después la ventana se arma encima.
            const m = motor.current;
            Object.assign(anclaVentana.current.style, { left: `${r.x + 30}px`, top: `${r.y + 50}px`, width: `${Math.max(120, r.w - 60)}px`, height: `${Math.max(80, r.h - 100)}px` });
            m.pausar(false); m.escribir(app.sigla); m.forma("texto", anclaVentana.current); m.medir();
            setTimeout(() => despachar({ t: "nacida", id: app.id }), 420);
            clearTimeout(volverFondo.current);
            volverFondo.current = window.setTimeout(aplicarFondo, 1350);
        }
        if (cel && op.historial !== false) { pila.current.push(app.id); history.pushState({ escritorio: app.id }, "", `/escritorio?abrir=${app.id}`); }
    }, [resolver, anunciar, aplicarFondo]);

    const enfocar = useCallback((id: string) => {
        if (activaDe(vivo.current.estado)?.id !== id) despachar({ t: "enfocar", id });
    }, []);

    const cerrar = useCallback((id: string) => {
        const w = vivo.current.estado.wins.find((x) => x.id === id);
        if (!w || w.cerrando) return;
        // En el celular cada ventana es un paso del historial: cerrar la de más arriba es volver atrás (popstate la cierra).
        if (vivo.current.celular && pila.current.at(-1) === id) { history.back(); return; }
        despachar({ t: "cerrar", id });
        sonido.current?.efecto("cerrar");
        anunciar(`${w.app.titulo}: ventana cerrada`);
    }, [anunciar]);

    const minimizar = useCallback((id: string) => {
        const w = vivo.current.estado.wins.find((x) => x.id === id);
        if (!w || w.min) return;
        despachar({ t: "minimizar", id });
        sonido.current?.efecto("minimizar");
        anunciar(`${w.app.titulo}: minimizada`);
    }, [anunciar]);

    /* ---------- Las páginas dentro de las ventanas ---------- */
    const sonarTecla = useCallback((e: KeyboardEvent) => {
        const s = sonido.current;
        if (!s || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target as HTMLElement | null;
        if (t?.matches?.(CAMPO)) s.tecla(e.key === "Enter" || e.key === " " || e.key === "Backspace");
        else if ((e.key === "Enter" || e.key === " ") && t?.matches?.("button, [role=option], [role^=menuitem], a[href]")) s.presionar(0.9);
    }, []);

    const enlazar = useCallback((id: string, doc: Document) => {
        if (enlazados.current.has(doc)) return;
        enlazados.current.add(doc);
        try { doc.documentElement.dataset.tema = document.documentElement.dataset.tema ?? "oscuro"; } catch { /* sin acceso */ }
        doc.addEventListener("pointerdown", () => {
            sonido.current?.presionar();
            enfocar(id);
            try { document.querySelectorAll<HTMLElement>(":popover-open").forEach((p) => p.hidePopover()); } catch { /* sin paneles */ }
        }, true);
        doc.addEventListener("pointerup", () => sonido.current?.soltar(), true);
        doc.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); inicio.current?.alternar(); return; }
            sonarTecla(e);
        }, true);
        // Un enlace a otra parte del sitio abre su propia ventana; uno a la misma página sigue dentro de la ventana.
        doc.addEventListener("click", (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
            let url: URL;
            try { url = new URL(a.href, doc.baseURI); } catch { return; }
            if (url.origin !== location.origin) return;
            if (url.pathname === "/escritorio") { e.preventDefault(); e.stopPropagation(); return; }
            if (!enmarcableEnEscritorio(url.pathname)) { e.preventDefault(); e.stopPropagation(); window.open(url.href, "_blank", "noopener"); return; }
            const destino = idDeRuta(url.pathname, url.hash);
            if (!destino || destino === id || !resolver(destino)) return;
            e.preventDefault(); e.stopPropagation();
            abrir(destino);
        }, true);
    }, [abrir, enfocar, resolver, sonarTecla]);

    // Cada página que carga dentro de una ventana se presenta apenas empieza (antes de pintar), así sus clics ya suenan.
    useEffect(() => {
        window.__escritorio = {
            enlazar(w: Window) {
                for (const f of document.querySelectorAll<HTMLIFrameElement>(".es-ventana iframe")) {
                    if (f.contentWindow !== w) continue;
                    const id = f.closest<HTMLElement>(".es-ventana")?.dataset.app;
                    try { if (id && w.document) enlazar(id, w.document); } catch { /* sin acceso */ }
                }
            },
        };
        return () => { delete window.__escritorio; };
    }, [enlazar]);

    const acciones = useMemo<AccionesVentana>(() => ({
        area,
        enfocar,
        mover: (id, r) => despachar({ t: "mover", id, r }),
        encajar: (id, zona, desde) => {
            despachar({ t: "encajar", id, zona, desde, area: area() });
            const w = vivo.current.estado.wins.find((x) => x.id === id);
            if (w) anunciar(`${w.app.titulo}: ${zona === "max" ? "maximizada" : zona === "izq" ? "a la izquierda" : "a la derecha"}`);
        },
        alternarMax: (id) => despachar({ t: "alternarMax", id, area: area() }),
        minimizar,
        cerrar,
        cerrada: (id) => despachar({ t: "quitar", id }),
        cargar: (id, marco) => { try { if (marco.contentDocument) enlazar(id, marco.contentDocument); } catch { /* sin acceso */ } },
        sacudida: (id) => {
            if (!vivo.current.estado.wins.some((w) => w.id !== id && !w.min && !w.cerrando)) return;
            despachar({ t: "minimizarOtras", id });
            sonido.current?.efecto("minimizar");
            anunciar("Las demás ventanas se minimizaron");
        },
        guia: (z) => {
            const g = guia.current;
            if (!g) return;
            if (!z) { g.removeAttribute("data-ver"); return; }
            const r = rectZona(z, area());
            Object.assign(g.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
            g.setAttribute("data-ver", "");
        },
        moviendo: (v) => { raiz.current?.toggleAttribute("data-moviendo", v); },
    }), [area, enfocar, minimizar, cerrar, enlazar, anunciar]);

    /* ---------- Tema, encendido, bloqueo ---------- */
    const alternarTema = useCallback(() => {
        const nuevo = document.documentElement.dataset.tema === "claro" ? "oscuro" : "claro";
        document.documentElement.dataset.tema = nuevo;
        try { localStorage.setItem("tema", nuevo); } catch { /* vale para esta visita */ }
        setTema(nuevo);
        document.querySelectorAll<HTMLIFrameElement>(".es-ventana iframe").forEach((f) => {
            try { if (f.contentDocument) f.contentDocument.documentElement.dataset.tema = nuevo; } catch { /* sin acceso */ }
        });
    }, []);

    const encender = useCallback(() => {
        setArranque("encendiendo"); vivo.current.arranque = "encendiendo";
        if (motor.current && anclaCentro.current) { motor.current.pausar(false); motor.current.clima(null); motor.current.forma("firma", anclaCentro.current); }
        let hecho = false;
        const listo = () => {
            if (hecho) return;
            hecho = true;
            clearTimeout(espera);
            removeEventListener("pointerdown", listo, true); removeEventListener("keydown", listo, true);
            try { localStorage.setItem("escritorio:visto", "1"); } catch { /* vale para esta visita */ }
            setArranque("listo"); vivo.current.arranque = "listo";
            aplicarFondo();
        };
        const espera = window.setTimeout(listo, reducido() ? 300 : 1700);
        setTimeout(() => { if (!hecho) { addEventListener("pointerdown", listo, true); addEventListener("keydown", listo, true); } }, 250);
    }, [aplicarFondo]);

    const bloquear = useCallback(() => {
        setBloqueado(true);
        const m = motor.current;
        if (m && anclaFirma.current) { m.pausar(false); m.clima(null); m.forma("firma", anclaFirma.current); }
    }, []);
    useEffect(() => {
        if (!bloqueado) return;
        document.querySelector<HTMLElement>(".es-bloqueo")?.focus();
        let hecho = false;
        const salir = (e: Event) => { if (hecho) return; hecho = true; e.preventDefault(); setBloqueado(false); aplicarFondo(); };
        const t = setTimeout(() => { addEventListener("pointerdown", salir, true); addEventListener("keydown", salir, true); }, 350);
        return () => { clearTimeout(t); removeEventListener("pointerdown", salir, true); removeEventListener("keydown", salir, true); };
    }, [bloqueado, aplicarFondo]);

    /* ---------- Al entrar ---------- */
    useEffect(() => {
        setTema(document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro");
        let f: Fondo = "olas";
        try { const g = localStorage.getItem("escritorio:fondo") as Fondo | null; if (g && FONDOS_VALIDOS.includes(g)) f = g; } catch { /* de fábrica */ }
        setFondo(f); vivo.current.fondo = f;
        if (f === "clima") void pedirTiempo();
        try {
            const r = JSON.parse(localStorage.getItem("escritorio:recientes") ?? "[]") as unknown;
            if (Array.isArray(r)) setRecientes(r.filter((x): x is string => typeof x === "string").slice(0, 6));
        } catch { /* nada reciente */ }
        recientesListos.current = true;

        const s = new SonidoEscritorio(leerPreferencias(matchMedia("(pointer: coarse)").matches));
        sonido.current = s;
        setPrefs({ ...s.prefs });
        s.listo.then(() => setSonidoListo(true)).catch(() => undefined);

        setAhora(new Date());
        const reloj = setInterval(() => setAhora(new Date()), 15000);

        let vigente = true;
        void import("@/modules/materia/motor").then(({ crearMotor }) => {
            if (!vigente || !lienzo.current || !frente.current) return;
            motor.current = crearMotor(lienzo.current, { frente: frente.current, quieto: reducido() });
            if (vivo.current.arranque === "encendiendo" && anclaCentro.current) motor.current.forma("firma", anclaCentro.current);
            else aplicarFondo();
        });

        // La sesión de esta pestaña: las ventanas que estaban abiertas vuelven donde estaban.
        try {
            const guardadas = JSON.parse(sessionStorage.getItem("escritorio:sesion") ?? "[]") as Partial<VentanaAbierta>[];
            const cel = esCelular(), a = areaUtil(innerWidth, innerHeight, cel);
            const num = (r: unknown): r is Rect => !!r && typeof r === "object" && ["x", "y", "w", "h"].every((k) => Number.isFinite((r as Record<string, number>)[k]));
            const wins: VentanaAbierta[] = Array.isArray(guardadas) ? guardadas.flatMap((g) => {
                const app = typeof g.id === "string" ? resolver(g.id) : null;
                if (!app || !num(g.r)) return [];
                const zona = cel ? "max" : g.zona === "izq" || g.zona === "der" || g.zona === "max" ? g.zona : null;
                return [{ id: app.id, app, r: zona ? rectZona(zona, a) : contener(g.r, a), previo: num(g.previo) ? g.previo : null, zona, min: g.min === true, z: Number(g.z) || 11, naciendo: false, cerrando: false, foco: false }];
            }) : [];
            if (wins.length) despachar({ t: "restaurar", wins });
        } catch { /* sesión rota: escritorio vacío */ }

        const pedida = new URLSearchParams(location.search).get("abrir");
        let visto = false;
        try { visto = localStorage.getItem("escritorio:visto") === "1"; } catch { /* sin almacenamiento */ }
        if (!visto && !pedida) encender();
        else { setArranque("listo"); vivo.current.arranque = "listo"; }
        if (pedida) abrir(pedida, { historial: false });

        return () => { vigente = false; clearInterval(reloj); motor.current?.destruir(); motor.current = null; s.cerrar(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!recientesListos.current) return;
        try { localStorage.setItem("escritorio:recientes", JSON.stringify(recientes)); } catch { /* vale para esta visita */ }
    }, [recientes]);

    useEffect(() => {
        if (arranque === "espera") return;
        try {
            sessionStorage.setItem("escritorio:sesion", JSON.stringify(estado.wins.filter((w) => !w.cerrando).map(({ id, r, previo, zona, min, z }) => ({ id, r, previo, zona, min, z }))));
        } catch { /* sin almacenamiento */ }
    }, [estado.wins, arranque]);

    // La dirección dice qué ventana está al frente (se puede copiar y compartir). En el celular la lleva el historial.
    const idActiva = activa?.id ?? null;
    useEffect(() => {
        if (arranque === "espera" || celular) return;
        history.replaceState(history.state, "", idActiva ? `/escritorio?abrir=${idActiva}` : "/escritorio");
    }, [idActiva, celular, arranque]);

    // Ventana maximizada al frente: la materia de atrás no se ve, así que descansa.
    useEffect(() => {
        const m = motor.current;
        if (!m || arranque !== "listo" || bloqueado) return;
        if (maxActiva || fondo === "quieto") { const t = setTimeout(() => m.pausar(true), 600); return () => clearTimeout(t); }
        m.pausar(false);
    }, [maxActiva, fondo, arranque, bloqueado]);

    useEffect(() => {
        const abajo = () => sonido.current?.presionar(), arriba = () => sonido.current?.soltar();
        const teclas = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); inicio.current?.alternar(); return; }
            sonarTecla(e);
        };
        const visibilidad = () => sonido.current?.suspender(document.hidden);
        // En el celular, Atrás cierra la ventana que abrió ese paso del historial. Fuera del celular, o al salir de
        // /escritorio con Atrás, no toca nada (las ventanas se quedan guardadas en la sesión).
        const atras = () => {
            if (!vivo.current.celular || location.pathname !== "/escritorio") return;
            const id = pila.current.pop();
            const w = id ? vivo.current.estado.wins.find((x) => x.id === id && !x.cerrando) : undefined;
            if (w) { despachar({ t: "cerrar", id: w.id }); sonido.current?.efecto("cerrar"); anunciar(`${w.app.titulo}: ventana cerrada`); }
        };
        let cuadro = 0;
        const tamano = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(() => despachar({ t: "acomodar", area: areaUtil(innerWidth, innerHeight, esCelular()), celular: esCelular() })); };
        document.addEventListener("pointerdown", abajo, true); document.addEventListener("pointerup", arriba, true);
        document.addEventListener("keydown", teclas, true); document.addEventListener("visibilitychange", visibilidad);
        addEventListener("popstate", atras); addEventListener("resize", tamano);
        return () => {
            document.removeEventListener("pointerdown", abajo, true); document.removeEventListener("pointerup", arriba, true);
            document.removeEventListener("keydown", teclas, true); document.removeEventListener("visibilitychange", visibilidad);
            removeEventListener("popstate", atras); removeEventListener("resize", tamano); cancelAnimationFrame(cuadro);
        };
    }, [sonarTecla, anunciar]);

    useEffect(() => { despachar({ t: "acomodar", area: areaUtil(innerWidth, innerHeight, celular), celular }); }, [celular]);

    /* ---------- Lo que se ve ---------- */
    const cambiarSonido = useCallback((p: Partial<PreferenciasSonido>) => {
        const s = sonido.current;
        if (!s) return;
        s.cambiar(p);
        setPrefs({ ...s.prefs });
    }, []);
    const ajustes: Ajustes = {
        fondo, alFondo: ponerFondo, tema, alTema: alternarTema, prefs, cambiarSonido, muestra: () => sonido.current?.muestra(), alOrdenar: () => setOrdenar((n) => n + 1),
    };
    const vista = (v: Vista) => v === "proyectos" ? <VistaProyectos proyectos={proyectos} alAbrir={abrir} />
        : v === "herramientas" ? <VistaHerramientas herramientas={herramientas} resolver={resolver} alAbrir={abrir} />
            : v === "configuracion" ? <VistaConfiguracion a={ajustes} /> : <VistaAtajos />;

    const tocarTarea = (id: string) => {
        const e = vivo.current.estado, w = e.wins.find((x) => x.id === id && !x.cerrando);
        if (!w) abrir(id);
        else if (w.min) { despachar({ t: "abrir", app: w.app, r: w.r, zona: w.zona, naciendo: false, foco: true }); sonido.current?.efecto("abrir"); }
        else if (activaDe(e)?.id === id) minimizar(id);
        else despachar({ t: "enfocar", id });
    };
    const asomar = (id: string, si: boolean) => document.querySelector(`.es-ventana[data-app="${CSS.escape(id)}"]`)?.toggleAttribute("data-asoma", si);
    const tareas = [...ANCLADAS, ...estado.wins.filter((w) => !w.cerrando && !ANCLADAS.includes(w.id)).map((w) => w.id)];

    const alPresionarFondo = (e: PE<HTMLElement>) => { if (e.target === e.currentTarget && e.button === 0) motor.current?.sacudir(6); };
    // Clic derecho en el fondo: el menú se abre al soltar el botón (si se abriera al presionar, el mismo botón al soltarse
    // lo cerraría: así cierra el navegador los paneles cuando se toca fuera). Con el teclado (tecla de menú o Mayús F10)
    // no hay puntero: se abre junto a lo que tiene el foco.
    const derecho = useRef(0);
    const sinMenu = (t: EventTarget | null) => !!(t as Element | null)?.closest?.(".es-ventana, .es-tareas, [popover], .es-bloqueo");
    const alMenu = (e: ME<HTMLDivElement>) => {
        if (sinMenu(e.target)) return;
        e.preventDefault();
        if (performance.now() - derecho.current < 1500) return;
        const r = (document.activeElement as HTMLElement | null)?.getBoundingClientRect?.();
        menu.current?.abrirEn(r && r.width ? r.left + 12 : innerWidth / 2, r && r.height ? r.bottom - 8 : innerHeight / 2);
    };
    const alPresionarRaiz = (e: PE<HTMLDivElement>) => { if (e.button === 2) derecho.current = performance.now(); };
    const alSoltarRaiz = (e: PE<HTMLDivElement>) => { if (e.button === 2 && !sinMenu(e.target)) menu.current?.abrirEn(e.clientX, e.clientY); };

    const hora = ahora ? HORA.format(ahora) : "--:--";
    return (
        <div ref={raiz} className="es" data-arranque={arranque === "listo" ? undefined : arranque} data-celular={celular || undefined} data-sonido={sonidoListo ? "listo" : undefined}
            onContextMenu={alMenu} onPointerDownCapture={alPresionarRaiz} onPointerUp={alSoltarRaiz}>
            <canvas ref={lienzo} className="es-lienzo" aria-hidden="true" />
            <div ref={frente} className="es-frente" aria-hidden="true" />
            <div ref={anclaCentro} className="es-ancla es-ancla-centro" aria-hidden="true" />
            <div ref={anclaFirma} className="es-ancla es-ancla-firma" aria-hidden="true" />
            <div ref={anclaVentana} className="es-ancla" aria-hidden="true" />

            <main className="es-mesa" aria-label="Escritorio" onPointerDown={alPresionarFondo}>
                <h1 className="es-sr">nicoholas.dev en modo escritorio</h1>
                <Iconos ids={EN_ESCRITORIO} resolver={resolver} celular={celular} alAbrir={abrir} ordenar={ordenar} />
                <div ref={guia} className="es-guia" aria-hidden="true" />
                <div className="es-ventanas">
                    {estado.wins.map((w) => (
                        <Ventana key={w.id} v={w} activa={activa?.id === w.id} celular={celular} acciones={acciones}>
                            {w.app.vista ? vista(w.app.vista) : null}
                        </Ventana>
                    ))}
                </div>
            </main>

            <nav className="es-tareas" aria-label="Barra de tareas">
                <button type="button" className="es-tarea es-boton-inicio" popoverTarget="es-inicio" aria-label="Inicio" aria-expanded="false">n<i>.</i></button>
                <span className="es-sep" aria-hidden="true" />
                <div className="es-tareas-apps">
                    {tareas.map((id) => {
                        const a = resolver(id);
                        if (!a) return null;
                        const abierta = estado.wins.some((w) => w.id === id && !w.cerrando);
                        return (
                            <button key={id} type="button" className="es-tarea" data-tarea={id} aria-label={a.titulo} title={a.titulo} aria-pressed={activa?.id === id}
                                data-abierta={abierta || undefined} style={{ "--c": a.color } as CSSProperties}
                                onClick={() => tocarTarea(id)} onPointerEnter={() => asomar(id, true)} onPointerLeave={() => asomar(id, false)}>
                                <Glifo d={a.glifo} />
                            </button>
                        );
                    })}
                </div>
                <span className="es-sep" aria-hidden="true" />
                <div className="es-bandeja">
                    <button type="button" className="es-tarea es-tarea-chica" popoverTarget="es-sonido" aria-label="Sonido" aria-expanded="false">
                        <Glifo d={prefs?.activo && prefs.volumen > 0 ? UI.sonido : UI.mudo} />
                    </button>
                    <button type="button" className="es-tarea es-tarea-chica" aria-label="Cambiar entre tema claro y oscuro" onClick={alternarTema}>
                        <Glifo d={tema === "claro" ? UI.luna : UI.sol} />
                    </button>
                    <button type="button" className="es-reloj" popoverTarget="es-calendario" aria-label={`Son las ${hora} en Santiago. Abrir el calendario`} aria-expanded="false" onClick={() => void pedirTiempo()}>
                        <b>{hora}</b><span>{ahora ? CORTA.format(ahora).replace(/\./g, "") : ""}</span>
                    </button>
                </div>
            </nav>

            <Inicio ref={inicio} herramientas={herramientas} recientes={recientes} resolver={resolver} alAbrir={abrir} alBloquear={bloquear} />
            <PanelSonido prefs={prefs} cambiar={cambiarSonido} muestra={() => sonido.current?.muestra()} />
            <Calendario ahora={ahora} tiempo={tiempo} />
            <MenuEscritorio ref={menu} fondo={fondo} tema={tema} alFondo={ponerFondo} alTema={alternarTema} alAbrir={abrir} alOrdenar={() => setOrdenar((n) => n + 1)} alEncender={encender} />

            {bloqueado && (
                <div className="es-bloqueo" role="dialog" aria-modal="true" aria-label="Escritorio bloqueado" tabIndex={-1}>
                    <p className="es-bloqueo-hora">{hora}</p>
                    <p className="es-bloqueo-fecha">{ahora ? new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long" }).format(ahora) : ""}</p>
                    <p className="es-bloqueo-pista">Haz clic o presiona una tecla para volver</p>
                </div>
            )}
            <p className="es-sr" aria-live="polite">{anuncio}</p>
        </div>
    );
}
