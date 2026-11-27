"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type MouseEvent as ME, type PointerEvent as PE } from "react";
import { ExternalLink, FolderOpen, LayoutGrid, LogOut, Paintbrush, Pin, PinOff, RefreshCw, X } from "lucide-react";
import type { Motor } from "@/modules/materia/motor";
import type { PulseContextData } from "@/modules/pulse/types";
import { enmarcableEnEscritorio } from "@/lib/escritorio/enmarcable";
import { useAtajo } from "@/hooks/useAtajo";
import { Configuracion } from "./aplicaciones/Configuracion";
import { Correo } from "./aplicaciones/Correo";
import { leerClima } from "./aplicaciones/datos";
import { Explorador } from "./aplicaciones/Explorador";
import { Fotos } from "./aplicaciones/Fotos";
import { Noticias } from "./aplicaciones/Noticias";
import { arbol, type Apertura } from "./aplicaciones/vfs";
import { Widgets } from "./aplicaciones/Widgets";
import { ACCESOS, ANCLADAS_BARRA, ANCLADAS_INICIO, APPS, EN_ESCRITORIO, appHerramienta, appServicio, idDeRuta, type App } from "./apps";
import { Barra, type Tarea } from "./Barra";
import { Bloqueo } from "./Bloqueo";
import { Calendario, ConfiguracionRapida, type Aviso } from "./Flotantes";
import { Fondo } from "./Fondo";
import { fondoPorDefecto, type FondoId } from "./fondos";
import { areaUtil, contener, NOMBRE_ZONA, posicionInicial, rectZona, ZONAS, type Rect, type Zona } from "./geometria";
import { IconoDe } from "./iconos/Icono";
import { Iconos } from "./Iconos";
import { LimiteApp } from "./LimiteApp";
import { Inicio, type ControlInicio, type Reciente } from "./Inicio";
import { MenuContextual, type PedidoMenu } from "./MenuContextual";
import { Notificaciones } from "./Notificaciones";
import { guardarPrefs, leerPrefs, PREFS_BASE, type PrefsEscritorio } from "./preferencias";
import { SonidoEscritorio, leerPreferencias, type PreferenciasSonido } from "./sonido";
import type { AccionesVentana, Args, HerramientaEscritorio, ProyectoEscritorio, ServicioEscritorio, VentanaAbierta } from "./tipos";
import { Ventana } from "./Ventana";
import { activaDe, reducir } from "./ventanas";
import "./escritorio.css";
import "./aplicaciones/aplicaciones.css";

declare global {
    interface Window {
        /** Lo llama cada página del sitio que se abre dentro de una ventana (TemaInicial), apenas empieza a cargar. */
        __escritorio?: { enlazar(w: Window): void };
    }
}

/* ---------- Celular ---------- */
const CONSULTA_CELULAR = "(max-width: 760px), (pointer: coarse) and (max-width: 1100px)";
const suscribirCelular = (f: () => void) => { const m = matchMedia(CONSULTA_CELULAR); m.addEventListener("change", f); return () => m.removeEventListener("change", f); };
const esCelular = () => matchMedia(CONSULTA_CELULAR).matches;
const CAMPO = "input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable='true']";
/** Quien manda los avisos del propio escritorio (bienvenida, conexión). */
const SISTEMA: App = { id: "sistema", titulo: "Escritorio", icono: "widgets", tipo: "vista", tam: [0, 0] };

/**
 * El modo escritorio de nicoholas.dev, al estilo de Windows 11 con la marca «n.». Las ventanas muestran apps propias
 * (Explorador, Fotos, Correo, Noticias, Configuración), las herramientas como apps y las páginas del sitio; suenan los
 * clics al presionar y al soltar, se arrastran, se acoplan, se minimizan y recuerdan la sesión de la pestaña.
 */
export function Escritorio({ herramientas, proyectos, servicios }: { herramientas: HerramientaEscritorio[]; proyectos: ProyectoEscritorio[]; servicios: ServicioEscritorio[] }) {
    const [estado, despachar] = useReducer(reducir, { wins: [], z: 10 });
    const celular = useSyncExternalStore(suscribirCelular, esCelular, () => false);
    const [fase, setFase] = useState<"espera" | "encendido" | "bloqueo" | "listo">("espera");
    const [tema, setTema] = useState<"oscuro" | "claro">("oscuro");
    const [prefs, setPrefs] = useState<PrefsEscritorio>(PREFS_BASE);
    const [sonidoPrefs, setSonidoPrefs] = useState<PreferenciasSonido | null>(null);
    const [sonidoListo, setSonidoListo] = useState(false);
    const [recientes, setRecientes] = useState<Reciente[]>([]);
    const [ahora, setAhora] = useState<Date | null>(null);
    const [clima, setClima] = useState<PulseContextData | null>(null);
    const [enLinea, setEnLinea] = useState(true);
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    /** El número del último aviso visto: la campana cuenta los que llegaron después (descartar uno no esconde los nuevos). */
    const [vistoHasta, setVistoHasta] = useState(0);
    const [emergentes, setEmergentes] = useState<number[]>([]);
    const [menu, setMenu] = useState<PedidoMenu | null>(null);
    const [acerca, setAcerca] = useState<App | null>(null);
    const [anuncio, setAnuncio] = useState("");
    const [ordenar, setOrdenar] = useState(0);

    const raiz = useRef<HTMLDivElement>(null), guia = useRef<HTMLDivElement>(null), dialogoAcerca = useRef<HTMLDialogElement>(null);
    const lienzo = useRef<HTMLCanvasElement>(null), frente = useRef<HTMLDivElement>(null);
    const inicio = useRef<ControlInicio>(null);
    const motor = useRef<Motor | null>(null), sonido = useRef<SonidoEscritorio | null>(null);
    const enlazados = useRef(new WeakSet<Document>()), ocultas = useRef<string[]>([]), numAviso = useRef(0), cargado = useRef(false);
    /** En el celular, las ventanas que abrieron un paso del historial (la última arriba). */
    const pila = useRef<string[]>([]);
    /** Lo último de cada cosa, para los oyentes que viven fuera de React (iframes, teclado global). */
    const vivo = useRef({ estado, celular, prefs, fase });
    const activa = activaDe(estado);
    useLayoutEffect(() => { Object.assign(vivo.current, { estado, celular, prefs, fase }); });

    /* ---------- Las apps ---------- */
    const dinamicas = useMemo(() => new Map<string, App>([
        ...herramientas.map((t) => [`herramientas/${t.slug}`, appHerramienta(t)] as const),
        ...servicios.map((s) => [`servicios/${s.slug}`, appServicio(s)] as const),
    ]), [herramientas, servicios]);
    const resolver = useCallback((id: string): App | null => APPS[id] ?? dinamicas.get(id) ?? null, [dinamicas]);
    const todas = useMemo(() => [...Object.values(APPS), ...dinamicas.values()], [dinamicas]);
    const raizArchivos = useMemo(() => arbol({ herramientas, proyectos, servicios }), [herramientas, proyectos, servicios]);
    const area = useCallback(() => areaUtil(innerWidth, innerHeight, vivo.current.celular), []);
    const anunciar = useCallback((t: string) => { setAnuncio(""); requestAnimationFrame(() => setAnuncio(t)); }, []);
    const pedirClima = useCallback(() => { void leerClima().then((c) => { if (c) setClima(c); }); }, []);

    /* ---------- Notificaciones ---------- */
    const notificar = useCallback((app: App, titulo: string, texto: string, abrir?: Aviso["abrir"]) => {
        const a: Aviso = { id: ++numAviso.current, app, titulo, texto, cuando: Date.now(), abrir };
        setAvisos((l) => [a, ...l].slice(0, 20));
        // Con el panel de la hora abierto, el aviso aparece ahí mismo: ya está visto.
        if (document.getElementById("es-calendario")?.matches(":popover-open")) setVistoHasta(a.id);
        if (vivo.current.prefs.noMolestar) return;
        setEmergentes((l) => [...l, a.id]);
        sonido.current?.aviso("notificacion");
        setTimeout(() => setEmergentes((l) => l.filter((x) => x !== a.id)), 6000);
    }, []);

    /* ---------- El foco, como en Windows ---------- */
    /** Lo último que tuvo el foco dentro de cada ventana (fuera de su barra de título y de sus menús, que se cierran), para
     * devolvérselo al volver a ella. */
    const ultimoFoco = useRef(new Map<string, HTMLElement>());
    useEffect(() => {
        const guardar = (e: FocusEvent) => {
            const t = e.target as HTMLElement | null, w = t?.closest?.<HTMLElement>(".es-ventana");
            if (w?.dataset.app && t !== w && !t?.closest(".es-cab, [popover]")) ultimoFoco.current.set(w.dataset.app, t as HTMLElement);
        };
        document.addEventListener("focusin", guardar);
        return () => document.removeEventListener("focusin", guardar);
    }, []);
    /**
     * Lleva el foco a una ventana (a lo último que lo tuvo en ella) o, con null, a los íconos del escritorio. Se pide
     * siempre junto con un cambio de las ventanas y se cumple apenas React lo aplica (useLayoutEffect, más abajo): antes,
     * la ventana minimizada aún está oculta. En el celular va a la ventana misma: un campo con el foco abre el teclado.
     */
    const focoPendiente = useRef<{ id: string | null } | null>(null);
    const darFoco = useCallback((id: string | null) => { focoPendiente.current = { id }; }, []);
    useLayoutEffect(() => {
        const p = focoPendiente.current;
        if (!p) return;
        focoPendiente.current = null;
        const w = p.id ? document.querySelector<HTMLElement>(`.es-ventana[data-app="${CSS.escape(p.id)}"]`) : null;
        if (w && !w.hidden) {
            const u = p.id ? ultimoFoco.current.get(p.id) : undefined;
            const sirve = !celular && u?.isConnected && w.contains(u) && u.checkVisibility?.() !== false;
            (sirve ? u : w).focus({ preventScroll: true });
            return;
        }
        document.querySelector<HTMLElement>('.es-iconos [role="option"][tabindex="0"]')?.focus({ preventScroll: true });
    });
    /** Si el foco estaba en esa ventana (o se perdió en la página), al cerrarla o minimizarla pasa a la que queda al frente. */
    const traspasarFoco = useCallback((sale: string) => {
        const a = document.activeElement, w = document.querySelector(`.es-ventana[data-app="${CSS.escape(sale)}"]`);
        if (a && a !== document.body && !w?.contains(a)) return;
        const e = vivo.current.estado;
        darFoco(activaDe({ ...e, wins: e.wins.filter((x) => x.id !== sale) })?.id ?? null);
    }, [darFoco]);

    /* ---------- Abrir, enfocar, cerrar ---------- */
    /** `lanzar: false` solo la trae al frente (la barra de tareas); si no, es abrirla de nuevo y la app va a lo pedido. */
    const abrir = useCallback((id: string, args: Args = {}, op: { historial?: boolean; foco?: boolean; lanzar?: boolean } = {}) => {
        const app = resolver(id);
        if (!app) return;
        const e = vivo.current.estado, cel = vivo.current.celular, a = areaUtil(innerWidth, innerHeight, cel);
        const ya = e.wins.find((w) => w.id === id && !w.cerrando);
        if (ya) {
            const alFrente = activaDe(e)?.id !== id;
            despachar({ t: "abrir", app, args, r: ya.r, zona: ya.zona, foco: op.foco ?? true, lanzar: op.lanzar ?? true });
            if (op.foco !== false) darFoco(id);
            // En el celular, traer una app al frente es un paso del historial: Atrás cierra la que se ve.
            if (cel && alFrente && op.historial !== false) { pila.current.push(id); history.pushState({ escritorio: id }, "", `/escritorio?abrir=${id}`); }
            return;
        }
        const r = cel ? { ...a } : posicionInicial(e.wins.filter((w) => !w.cerrando).length, app.tam[0], app.tam[1], a);
        despachar({ t: "abrir", app, args, r, zona: cel ? "max" : null, foco: op.foco ?? true });
        anunciar(`${app.titulo}: ventana abierta`);
        setRecientes((rs) => [{ id, cuando: Date.now() }, ...rs.filter((x) => x.id !== id)].slice(0, 8));
        if (cel && op.historial !== false) { pila.current.push(app.id); history.pushState({ escritorio: app.id }, "", `/escritorio?abrir=${app.id}`); }
    }, [resolver, anunciar, darFoco]);

    const abrirApertura = useCallback((a: Apertura) => {
        if ("app" in a) { abrir(a.app, a.args); return; }
        if (a.externo.startsWith("/")) {
            const u = new URL(a.externo, location.origin), id = idDeRuta(u.pathname, u.hash);
            if (id) { abrir(id); return; }
        }
        window.open(a.externo, "_blank", "noopener");
    }, [abrir]);

    const enfocar = useCallback((id: string) => { if (activaDe(vivo.current.estado)?.id !== id) despachar({ t: "enfocar", id }); }, []);
    const cerrar = useCallback((id: string) => {
        const w = vivo.current.estado.wins.find((x) => x.id === id);
        if (!w || w.cerrando) return;
        // En el celular cada ventana es un paso del historial: cerrar la de más arriba es volver atrás (popstate la cierra).
        if (vivo.current.celular && pila.current.at(-1) === id) { history.back(); return; }
        traspasarFoco(id);
        despachar({ t: "cerrar", id });
        anunciar(`${w.app.titulo}: ventana cerrada`);
    }, [anunciar, traspasarFoco]);
    const minimizar = useCallback((id: string) => {
        const w = vivo.current.estado.wins.find((x) => x.id === id);
        if (!w || w.min) return;
        traspasarFoco(id);
        despachar({ t: "minimizar", id });
        anunciar(`${w.app.titulo}: minimizada`);
    }, [anunciar, traspasarFoco]);

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
        doc.addEventListener("pointerdown", (e) => {
            if (e.pointerType !== "touch") sonido.current?.presionar();
            enfocar(id);
            try { document.querySelectorAll<HTMLElement>(":popover-open").forEach((p) => p.hidePopover()); } catch { /* sin paneles */ }
        }, true);
        doc.addEventListener("pointerup", (e) => { if (e.pointerType !== "touch") sonido.current?.soltar(); }, true);
        doc.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); inicio.current?.abrir(true); return; }
            sonarTecla(e);
        }, true);
        // Un enlace a otra parte del sitio abre su propia ventana; uno a la misma página sigue dentro de la ventana.
        doc.addEventListener("click", (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
            let url: URL;
            try { url = new URL(a.href, doc.baseURI); } catch { return; }
            // Otro sitio no se deja enmarcar (la ventana quedaría en blanco): se abre en una pestaña nueva.
            if (url.origin !== location.origin) { if (/^https?:$/.test(url.protocol)) { e.preventDefault(); e.stopPropagation(); window.open(url.href, "_blank", "noopener"); } return; }
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
            if (w) anunciar(`${w.app.titulo}: en ${NOMBRE_ZONA[zona]}`);
        },
        alternarMax: (id) => despachar({ t: "alternarMax", id, area: area() }),
        minimizar,
        cerrar,
        cerrada: (id) => despachar({ t: "quitar", id }),
        cargar: (id, marco) => { try { if (marco.contentDocument) enlazar(id, marco.contentDocument); } catch { /* sin acceso */ } },
        sacudida: (id) => {
            if (!vivo.current.estado.wins.some((w) => w.id !== id && !w.min && !w.cerrando)) return;
            despachar({ t: "minimizarOtras", id });
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
        acerca: (id) => { const a = resolver(id); if (a) setAcerca(a); },
    }), [area, enfocar, minimizar, cerrar, enlazar, anunciar, resolver]);

    useEffect(() => {
        const d = dialogoAcerca.current;
        if (!d) return;
        if (acerca && !d.open) d.showModal();
        if (!acerca && d.open) d.close();
    }, [acerca]);

    /* ---------- Preferencias, tema y fondo ---------- */
    const cambiarPrefs = useCallback((p: Partial<PrefsEscritorio>) => {
        const nuevas = { ...vivo.current.prefs, ...p };
        vivo.current.prefs = nuevas;
        guardarPrefs(nuevas);
        setPrefs(nuevas);
    }, []);
    const ponerTema = useCallback((nuevo: "oscuro" | "claro") => {
        document.documentElement.dataset.tema = nuevo;
        try { localStorage.setItem("tema", nuevo); } catch { /* vale para esta visita */ }
        setTema(nuevo);
        document.querySelectorAll<HTMLIFrameElement>(".es-ventana iframe").forEach((f) => {
            try { if (f.contentDocument) f.contentDocument.documentElement.dataset.tema = nuevo; } catch { /* sin acceso */ }
        });
    }, []);
    const fondo: FondoId = prefs.fondo ?? fondoPorDefecto(tema);
    const cambiarSonido = useCallback((p: Partial<PreferenciasSonido>) => {
        const s = sonido.current;
        if (!s) return;
        s.cambiar(p);
        setSonidoPrefs({ ...s.prefs });
    }, []);

    // La materia viva: el motor de partículas solo existe si se eligió ese fondo. Descansa mientras no se ve (bajo el
    // bloqueo o con una ventana maximizada), también si llega cuando ya no se veía, y cambiar de fase no lo rehace.
    const encendido = fase !== "espera";
    const enPausa = activa?.zona === "max" || fase !== "listo";
    const pausaVigente = useRef(enPausa);
    useEffect(() => {
        pausaVigente.current = enPausa;
        motor.current?.pausar(enPausa);
    }, [enPausa]);
    useEffect(() => {
        if (fondo !== "materia-viva" || !encendido) return;
        let vigente = true;
        void import("@/modules/materia/motor").then(({ crearMotor }) => {
            if (!vigente || !lienzo.current || !frente.current) return;
            const m = crearMotor(lienzo.current, { frente: frente.current, quieto: matchMedia("(prefers-reduced-motion: reduce)").matches });
            m.pausar(pausaVigente.current);
            m.forma("olas");
            motor.current = m;
        });
        return () => { vigente = false; motor.current?.destruir(); motor.current = null; };
    }, [fondo, encendido]);

    /* ---------- Encendido, bloqueo, reinicio ---------- */
    const alListo = useCallback(() => {
        if (vivo.current.fase === "encendido") {
            try { localStorage.setItem("escritorio:visto", "1"); } catch { /* vale para esta visita */ }
            setFase("bloqueo");
            return;
        }
        try { sessionStorage.setItem("escritorio:dentro", "1"); } catch { /* vale para esta visita */ }
        setFase("listo");
    }, []);
    const faseAntes = useRef(fase);
    const atajo = useAtajo("K");
    useEffect(() => {
        // Al entrar desde la pantalla de bloqueo suena el inicio de sesión; la primera vez, además, la bienvenida.
        if (faseAntes.current === "bloqueo" && fase === "listo") {
            sonido.current?.aviso("inicio");
            let primera = false;
            try { primera = !localStorage.getItem("escritorio:bienvenida"); localStorage.setItem("escritorio:bienvenida", "1"); } catch { /* sin almacenamiento */ }
            const texto = vivo.current.celular
                ? "Toca un ícono para abrirlo, o busca cualquier cosa con la lupa de la barra."
                : `Doble clic en un ícono para abrirlo, o busca cualquier cosa con ${atajo}.`;
            if (primera) setTimeout(() => notificar(SISTEMA, "Este es mi escritorio", texto), 900);
        }
        faseAntes.current = fase;
    }, [fase, notificar, atajo]);
    const bloquear = useCallback(() => setFase("bloqueo"), []);
    const reiniciar = useCallback(() => {
        despachar({ t: "vaciar" });
        try { sessionStorage.removeItem("escritorio:sesion"); sessionStorage.removeItem("escritorio:dentro"); } catch { /* sin almacenamiento */ }
        setFase("encendido");
    }, []);
    const apagar = useCallback(() => { location.href = "/"; }, []);

    /* ---------- Al entrar ---------- */
    useEffect(() => {
        setTema(document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro");
        const p = leerPrefs();
        setPrefs(p); vivo.current.prefs = p;
        try {
            const r = JSON.parse(localStorage.getItem("escritorio:recientes2") ?? "[]") as unknown;
            if (Array.isArray(r)) setRecientes(r.filter((x): x is Reciente => !!x && typeof x.id === "string" && Number.isFinite(x.cuando)).slice(0, 8));
        } catch { /* nada reciente */ }
        cargado.current = true;

        const s = new SonidoEscritorio(leerPreferencias(matchMedia("(pointer: coarse)").matches));
        sonido.current = s;
        setSonidoPrefs({ ...s.prefs });
        s.listo.then(() => setSonidoListo(true)).catch(() => undefined);

        setAhora(new Date());
        const reloj = setInterval(() => setAhora(new Date()), 15000);
        setEnLinea(navigator.onLine);
        pedirClima();

        // La sesión de esta pestaña: las ventanas que estaban abiertas vuelven donde estaban.
        try {
            const guardadas = JSON.parse(sessionStorage.getItem("escritorio:sesion") ?? "[]") as Partial<VentanaAbierta>[];
            const cel = esCelular(), a = areaUtil(innerWidth, innerHeight, cel);
            const num = (r: unknown): r is Rect => !!r && typeof r === "object" && ["x", "y", "w", "h"].every((k) => Number.isFinite((r as Record<string, number>)[k]));
            const wins: VentanaAbierta[] = Array.isArray(guardadas) ? guardadas.flatMap((g) => {
                const app = typeof g.id === "string" ? resolver(g.id) : null;
                if (!app || !num(g.r)) return [];
                const zona = cel ? "max" : ZONAS.includes(g.zona as Zona) ? (g.zona as Zona) : null;
                const guardados = g.args && typeof g.args === "object" ? Object.fromEntries(Object.entries(g.args).filter(([, v]) => typeof v === "string" || typeof v === "number")) : {};
                const args = { ...(app.args ?? {}), ...guardados };
                return [{ id: app.id, app, args, pedido: args, vez: 0, r: zona ? rectZona(zona, a) : contener(g.r, a), previo: num(g.previo) ? g.previo : null, zona, min: g.min === true, z: Number(g.z) || 11, cerrando: false, foco: false }];
            }) : [];
            if (wins.length) despachar({ t: "restaurar", wins });
        } catch { /* sesión rota: escritorio vacío */ }

        const pedida = new URLSearchParams(location.search).get("abrir");
        let visto = false, dentro = false;
        try { visto = localStorage.getItem("escritorio:visto") === "1"; dentro = sessionStorage.getItem("escritorio:dentro") === "1"; } catch { /* sin almacenamiento */ }
        // Un enlace directo a una app entra sin encendido ni bloqueo: quien lo compartió quería mostrar eso.
        setFase(pedida || (visto && dentro) ? "listo" : visto ? "bloqueo" : "encendido");
        if (pedida) abrir(pedida === "conversemos" ? "correo" : pedida, {}, { historial: false });

        return () => { clearInterval(reloj); s.cerrar(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!cargado.current) return;
        try { localStorage.setItem("escritorio:recientes2", JSON.stringify(recientes)); } catch { /* vale para esta visita */ }
    }, [recientes]);
    useEffect(() => {
        if (fase === "espera") return;
        try {
            sessionStorage.setItem("escritorio:sesion", JSON.stringify(estado.wins.filter((w) => !w.cerrando).map(({ id, args, r, previo, zona, min, z }) => ({ id, args, r, previo, zona, min, z }))));
        } catch { /* sin almacenamiento */ }
    }, [estado.wins, fase]);
    // La dirección dice qué ventana está al frente (se puede copiar y compartir). En el celular la lleva el historial.
    const idActiva = activa?.id ?? null;
    useEffect(() => {
        if (fase === "espera" || celular) return;
        history.replaceState(history.state, "", idActiva ? `/escritorio?abrir=${idActiva}` : "/escritorio");
    }, [idActiva, celular, fase]);

    useEffect(() => {
        const abajo = (e: PointerEvent) => { if (e.pointerType !== "touch") sonido.current?.presionar(); };
        const arriba = (e: PointerEvent) => { if (e.pointerType !== "touch") sonido.current?.soltar(); };
        const teclas = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
                e.preventDefault();
                if (vivo.current.fase !== "listo") return;
                const p = document.getElementById("es-inicio");
                if (p?.matches(":popover-open")) p.hidePopover(); else inicio.current?.abrir(true);
                return;
            }
            sonarTecla(e);
        };
        const visibilidad = () => sonido.current?.suspender(document.hidden);
        // En el celular, Atrás cierra la ventana que abrió ese paso del historial. Fuera del celular, o al salir de
        // /escritorio con Atrás, no toca nada (las ventanas se quedan guardadas en la sesión).
        const atras = () => {
            if (!vivo.current.celular || location.pathname !== "/escritorio") return;
            const id = pila.current.pop();
            const w = id ? vivo.current.estado.wins.find((x) => x.id === id && !x.cerrando) : undefined;
            if (w) { traspasarFoco(w.id); despachar({ t: "cerrar", id: w.id }); anunciar(`${w.app.titulo}: ventana cerrada`); }
        };
        const red = () => {
            setEnLinea(navigator.onLine);
            if (navigator.onLine) { notificar(SISTEMA, "Conexión de vuelta", "Ya hay internet de nuevo."); pedirClima(); }
            else notificar(SISTEMA, "Sin conexión", "Las apps abiertas siguen funcionando; lo que necesita internet espera a que vuelva.");
        };
        let cuadro = 0;
        const tamano = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(() => despachar({ t: "acomodar", area: areaUtil(innerWidth, innerHeight, esCelular()), celular: esCelular() })); };
        document.addEventListener("pointerdown", abajo, true); document.addEventListener("pointerup", arriba, true);
        document.addEventListener("keydown", teclas, true); document.addEventListener("visibilitychange", visibilidad);
        addEventListener("popstate", atras); addEventListener("resize", tamano); addEventListener("online", red); addEventListener("offline", red);
        return () => {
            document.removeEventListener("pointerdown", abajo, true); document.removeEventListener("pointerup", arriba, true);
            document.removeEventListener("keydown", teclas, true); document.removeEventListener("visibilitychange", visibilidad);
            removeEventListener("popstate", atras); removeEventListener("resize", tamano); removeEventListener("online", red); removeEventListener("offline", red);
            cancelAnimationFrame(cuadro);
        };
    }, [sonarTecla, anunciar, notificar, pedirClima, traspasarFoco]);
    useEffect(() => { despachar({ t: "acomodar", area: areaUtil(innerWidth, innerHeight, celular), celular }); }, [celular]);

    /* ---------- Barra de tareas y menús ---------- */
    const ancladas = (prefs.anclados ?? ANCLADAS_BARRA).filter((id) => resolver(id));
    const tareas: Tarea[] = [...ancladas, ...estado.wins.filter((w) => !w.cerrando && !ancladas.includes(w.id)).map((w) => w.id)]
        .map((id) => ({ id, app: resolver(id) as App, abierta: estado.wins.some((w) => w.id === id && !w.cerrando), activa: activa?.id === id }));
    const anclar = useCallback((id: string, si: boolean) => {
        const actuales = vivo.current.prefs.anclados ?? ANCLADAS_BARRA;
        cambiarPrefs({ anclados: si ? [...actuales.filter((x) => x !== id), id] : actuales.filter((x) => x !== id) });
    }, [cambiarPrefs]);
    const tocarTarea = (id: string) => {
        const e = vivo.current.estado, w = e.wins.find((x) => x.id === id && !x.cerrando);
        // Como en Windows: la barra trae la ventana al frente tal como estaba (no la vuelve a abrir) o la minimiza.
        if (!w || w.min || activaDe(e)?.id !== id) abrir(id, {}, { lanzar: false });
        else minimizar(id);
    };
    const asomar = (id: string, si: boolean) => document.querySelector(`.es-ventana[data-app="${CSS.escape(id)}"]`)?.toggleAttribute("data-asoma", si);
    const mostrarEscritorio = () => {
        const visibles = vivo.current.estado.wins.filter((w) => !w.min && !w.cerrando).map((w) => w.id);
        if (visibles.length) {
            if (document.activeElement?.closest(".es-ventana")) darFoco(null);
            ocultas.current = visibles; despachar({ t: "minimizarTodas" }); anunciar("Escritorio a la vista");
        }
        else if (ocultas.current.length) { despachar({ t: "restaurarVarias", ids: ocultas.current }); ocultas.current = []; }
    };

    const cerrarMenu = useCallback(() => setMenu(null), []);
    const menuTarea = (id: string, x: number, y: number) => {
        const a = resolver(id);
        if (!a) return;
        const abierta = vivo.current.estado.wins.some((w) => w.id === id && !w.cerrando), anclada = (vivo.current.prefs.anclados ?? ANCLADAS_BARRA).includes(id);
        setMenu({ x, y: y - 8, titulo: `Opciones de ${a.titulo}`, opciones: [
            { texto: a.titulo, icono: <IconoDe icono={a.icono} tam={16} />, accion: () => abrir(id) },
            "separador",
            anclada ? { texto: "Desanclar de la barra de tareas", icono: <PinOff size={14} />, accion: () => anclar(id, false) } : { texto: "Anclar a la barra de tareas", icono: <Pin size={14} />, accion: () => anclar(id, true) },
            ...(abierta ? [{ texto: "Cerrar ventana", icono: <X size={14} />, accion: () => cerrar(id) }] : []),
        ] });
    };
    const menuIcono = (id: string | null, x: number, y: number) => {
        if (!id) return;
        const a = resolver(id);
        if (!a) return;
        const anclada = (vivo.current.prefs.anclados ?? ANCLADAS_BARRA).includes(id);
        setMenu({ x, y, titulo: `Opciones de ${a.titulo}`, opciones: [
            { texto: "Abrir", icono: <FolderOpen size={14} />, accion: () => abrir(id) },
            ...(a.enlace ? [{ texto: "Abrir en una pestaña", icono: <ExternalLink size={14} />, accion: () => window.open(a.enlace, "_blank", "noopener") }] : []),
            "separador",
            anclada ? { texto: "Desanclar de la barra de tareas", icono: <PinOff size={14} />, accion: () => anclar(id, false) } : { texto: "Anclar a la barra de tareas", icono: <Pin size={14} />, accion: () => anclar(id, true) },
        ] });
    };
    const menuFondo = (x: number, y: number) => setMenu({ x, y, titulo: "Menú del escritorio", opciones: [
        { texto: "Íconos grandes", grupo: "ver", marcada: vivo.current.prefs.iconos === "grandes", accion: () => cambiarPrefs({ iconos: "grandes" }) },
        { texto: "Íconos medianos", grupo: "ver", marcada: vivo.current.prefs.iconos === "medianos", accion: () => cambiarPrefs({ iconos: "medianos" }) },
        { texto: "Íconos pequeños", grupo: "ver", marcada: vivo.current.prefs.iconos === "pequenos", accion: () => cambiarPrefs({ iconos: "pequenos" }) },
        "separador",
        { texto: "Ordenar los íconos", icono: <LayoutGrid size={14} />, accion: () => setOrdenar((n) => n + 1) },
        { texto: "Actualizar", icono: <RefreshCw size={14} />, accion: () => anunciar("Escritorio actualizado") },
        "separador",
        { texto: "Personalizar", icono: <Paintbrush size={14} />, accion: () => abrir("configuracion", { seccion: "personalizacion" }) },
        { texto: "Abrir el Explorador", icono: <FolderOpen size={14} />, accion: () => abrir("explorador") },
        "separador",
        { texto: "Volver al sitio", icono: <LogOut size={14} />, accion: apagar },
    ] });

    // Clic derecho en el fondo: el menú se abre al soltar el botón (si se abriera al presionar, el mismo botón al soltarse
    // lo cerraría: así cierra el navegador los paneles cuando se toca fuera). Con el teclado se abre junto al foco.
    const derecho = useRef(0);
    const esFondo = (t: EventTarget | null) => { const el = t as Element | null; return !!el && (el.classList?.contains("es-mesa") || el.classList?.contains("es-iconos")); };
    const alMenuNativo = (e: ME<HTMLDivElement>) => {
        // Dentro de una app manda el menú del navegador (copiar un enlace, abrir una imagen); fuera, el del escritorio.
        if ((e.target as Element).closest(".es-cuerpo, iframe, input, textarea, [contenteditable=true]")) return;
        e.preventDefault();
        if (performance.now() - derecho.current < 1500 || !esFondo(e.target)) return;
        menuFondo(innerWidth / 2, innerHeight / 2);
    };
    const alPresionarRaiz = (e: PE<HTMLDivElement>) => { if (e.button === 2) derecho.current = performance.now(); };
    const alSoltarRaiz = (e: PE<HTMLDivElement>) => { if (e.button === 2 && esFondo(e.target)) menuFondo(e.clientX, e.clientY); };

    /* ---------- Lo que se ve ---------- */
    const vista = (w: VentanaAbierta) => {
        switch (w.app.vista) {
            case "explorador": return <Explorador raiz={raizArchivos} inicial={String(w.pedido.carpeta ?? "")} vez={w.vez} alAbrir={abrirApertura} />;
            case "fotos": return <Fotos proyectos={proyectos} proyecto={String(w.args.proyecto ?? "")} indice={Number(w.args.indice ?? 0)}
                alCambiar={(p, i) => despachar({ t: "args", id: w.id, args: { proyecto: p, indice: i } })} alVisitar={(href) => window.open(href, "_blank", "noopener")} />;
            case "correo": return <Correo alEnviado={(correo) => notificar(APPS.correo, "Mensaje enviado", `Te respondo a ${correo} lo antes posible.`)} />;
            case "noticias": return <Noticias alAbrirBlog={() => abrir("blog")} />;
            case "configuracion": return <Configuracion seccion={typeof w.pedido.seccion === "string" ? w.pedido.seccion : undefined} vez={w.vez} prefs={prefs} alPrefs={cambiarPrefs}
                tema={tema} alTema={ponerTema} sonido={sonidoPrefs} cambiarSonido={cambiarSonido} muestra={() => sonido.current?.muestra()} alOrdenar={() => setOrdenar((n) => n + 1)} alAbrir={(id) => abrir(id)} />;
            default: return null;
        }
    };
    const climaBarra = clima ? { temperatura: Math.round(clima.temperature), texto: clima.weatherLabel, codigo: clima.weatherCode, dia: clima.isDay } : null;
    const visiblesAvisos = avisos.filter((a) => emergentes.includes(a.id));
    const nuevos = avisos.filter((a) => a.id > vistoHasta).length;
    const verAvisos = useCallback(() => setVistoHasta(numAviso.current), []);

    return (
        <div ref={raiz} className="es" data-celular={celular || undefined} data-sonido={sonidoListo ? "listo" : undefined}
            data-animaciones={prefs.animaciones ? undefined : "no"} data-fase={fase}
            onContextMenu={alMenuNativo} onPointerDownCapture={alPresionarRaiz} onPointerUp={alSoltarRaiz}>
            {fase !== "espera" && <Fondo id={fondo} solido={prefs.solido} lienzo={lienzo} frente={frente} prioridad />}

            <main className="es-mesa" aria-label="Escritorio" inert={fase !== "listo"}>
                <h1 className="es-sr">nicoholas.dev en modo escritorio</h1>
                <Iconos ids={EN_ESCRITORIO} resolver={resolver} accesos={ACCESOS} tam={prefs.iconos} celular={celular} ordenar={ordenar} alAbrir={(id) => abrir(id)} alMenu={menuIcono} />
                <div ref={guia} className="es-guia" aria-hidden="true" />
                <div className="es-ventanas">
                    {estado.wins.map((w) => (
                        <Ventana key={w.id} v={w} activa={activa?.id === w.id} celular={celular} acciones={acciones}>
                            {w.app.tipo === "vista" ? <LimiteApp nombre={w.app.titulo}>{vista(w)}</LimiteApp> : null}
                        </Ventana>
                    ))}
                </div>
            </main>

            <Barra tareas={tareas} alinear={celular ? "centro" : prefs.alinear} ahora={ahora} clima={climaBarra} enLinea={enLinea}
                sonido={{ activo: !!sonidoPrefs?.activo, volumen: sonidoPrefs?.volumen ?? 0 }} avisos={nuevos} inerte={fase !== "listo"}
                alTocar={tocarTarea} alAsomar={asomar} alMenu={menuTarea} alBuscar={() => inicio.current?.abrir(true)} alEscritorio={mostrarEscritorio} />

            <Inicio ref={inicio} todas={todas} resolver={resolver} anclados={ANCLADAS_INICIO} recientes={recientes} ancladasBarra={ancladas}
                alinear={celular ? "centro" : prefs.alinear} alAbrir={(id, args) => abrir(id, args)} alAnclar={anclar} alBloquear={bloquear} alReiniciar={reiniciar} alApagar={apagar} />
            <Widgets clima={clima} alPedirClima={pedirClima} alNoticias={() => abrir("noticias")} />
            <ConfiguracionRapida prefs={sonidoPrefs} cambiarSonido={cambiarSonido} muestra={() => sonido.current?.muestra()} tema={tema} alTema={() => ponerTema(tema === "claro" ? "oscuro" : "claro")}
                animaciones={prefs.animaciones} alAnimaciones={() => cambiarPrefs({ animaciones: !prefs.animaciones })} noMolestar={prefs.noMolestar} alNoMolestar={() => cambiarPrefs({ noMolestar: !prefs.noMolestar })}
                enLinea={enLinea} alConfiguracion={() => abrir("configuracion")} />
            <div onFocusCapture={verAvisos} onPointerEnter={verAvisos}>
                <Calendario ahora={ahora} avisos={avisos} alVer={verAvisos} alBorrar={() => setAvisos([])} alQuitar={(id) => setAvisos((l) => l.filter((a) => a.id !== id))}
                    alAbrirAviso={(a) => { if (a.abrir) abrir(a.abrir.id, a.abrir.args); else if (a.app.id !== "sistema") abrir(a.app.id); }} />
            </div>
            <MenuContextual pedido={menu} alCerrar={cerrarMenu} />
            <Notificaciones visibles={visiblesAvisos} alAbrir={(a) => { setEmergentes((l) => l.filter((x) => x !== a.id)); if (a.app.id !== "sistema") abrir(a.abrir?.id ?? a.app.id, a.abrir?.args); }}
                alCerrar={(id) => setEmergentes((l) => l.filter((x) => x !== id))} />

            <dialog ref={dialogoAcerca} className="es-acerca" aria-label={acerca ? `Acerca de ${acerca.titulo}` : "Acerca de"} onClose={() => setAcerca(null)} {...{ closedby: "any" }}>
                {acerca && (
                    <>
                        <IconoDe icono={acerca.icono} tam={64} />
                        <h3>{acerca.titulo}</h3>
                        {acerca.descripcion && <p>{acerca.descripcion}</p>}
                        <p className="es-acerca-donde"><b>Dónde se procesa</b>{acerca.donde ?? "Funciona en tu navegador: lo que escribes o subes no sale de tu equipo."}</p>
                        <p className="es-acerca-nota">Una herramienta gratis de nicoholas.dev. La página completa tiene la guía de uso y las preguntas frecuentes.</p>
                        <div className="es-acerca-acciones">
                            {acerca.enlace && <a className="es-boton-chico" href={acerca.enlace} target="_blank" rel="noopener"><ExternalLink size={14} aria-hidden="true" />Ver en el sitio</a>}
                            <button type="button" className="es-primario" onClick={() => setAcerca(null)}>Cerrar</button>
                        </div>
                    </>
                )}
            </dialog>

            {/* Hasta saber si toca encendido, bloqueo o escritorio (y qué fondo), una cubierta pareja: nada que salte. */}
            {fase === "espera" && <div className="es-cubierta" aria-hidden="true" />}
            {(fase === "encendido" || fase === "bloqueo") && (
                <Bloqueo fase={fase} ahora={ahora} alListo={alListo} fondo={<Fondo id={fondo === "materia-viva" ? "materia" : fondo} solido={prefs.solido} />} />
            )}
            <p className="es-sr" aria-live="polite">{anuncio}</p>
        </div>
    );
}
