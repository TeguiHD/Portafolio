"use client";

import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Lock, LogOut, Pin, PinOff, Power, RotateCcw, Search } from "lucide-react";
import { SUGERIDAS, type App } from "./apps";
import { IconoDe } from "./iconos/Icono";
import { navegarMenu } from "./menu";
import type { Args } from "./tipos";

export interface ControlInicio { abrir(buscar?: boolean): void }
export interface Reciente { id: string; cuando: number }

/** Lo que el buscador también encuentra dentro de Configuración, como en Windows. */
const AJUSTES: { titulo: string; seccion: string; claves: string }[] = [
    { titulo: "Cambiar el fondo de pantalla", seccion: "personalizacion", claves: "fondo pantalla imagen wallpaper personalizar" },
    { titulo: "Modo claro u oscuro", seccion: "personalizacion", claves: "tema claro oscuro colores modo" },
    { titulo: "Alinear la barra de tareas", seccion: "personalizacion", claves: "barra tareas alinear izquierda centro" },
    { titulo: "Sonido del clic y volumen", seccion: "sonido", claves: "sonido clic volumen audio mouse teclado silencio" },
    { titulo: "Animaciones y atajos de teclado", seccion: "accesibilidad", claves: "animaciones movimiento accesibilidad atajos teclado" },
    { titulo: "Acerca de este escritorio", seccion: "acerca", claves: "acerca version sistema equipo navegador" },
];

const normal = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const DIAS = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function hace(t: number): string {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return "Recién abierta";
    if (s < 3600) return `Hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `Hace ${Math.round(s / 3600)} h`;
    return DIAS.format(-Math.round(s / 86400), "day").replace(/^./, (c) => c.toUpperCase());
}
const CLASE: Record<App["tipo"], string> = { vista: "Aplicación", herramienta: "Herramienta", pagina: "Página del sitio" };

/** Flechas dentro de una grilla o lista de botones: se mueve el foco al vecino (en la grilla, arriba y abajo saltan una fila). */
function navegarGrilla(columnas: number) {
    return (e: KeyboardEvent<HTMLElement>) => {
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-item]")];
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (i < 0) return;
        const paso = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columnas, ArrowUp: -columnas } as Record<string, number>;
        const d = e.key === "Home" ? -i : e.key === "End" ? items.length - 1 - i : paso[e.key];
        if (d === undefined) return;
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        e.preventDefault();
        items[j].focus();
    };
}

/**
 * El menú de inicio de Windows 11: buscador arriba, «Anclado» en grilla, «Todas las apps» en orden alfabético y
 * «Recomendado» con lo último que se abrió. Abajo, la persona («Visitante») y el apagado: bloquear, reiniciar o volver al
 * sitio. Al escribir, la mejor coincidencia se muestra a la derecha con sus acciones.
 */
export function Inicio({ ref, todas, resolver, anclados, recientes, ancladasBarra, alinear, alAbrir, alAnclar, alBloquear, alReiniciar, alApagar }: {
    ref?: Ref<ControlInicio>;
    todas: App[];
    resolver(id: string): App | null;
    anclados: string[];
    recientes: Reciente[];
    ancladasBarra: string[];
    alinear: "centro" | "izq";
    alAbrir(id: string, args?: Args): void;
    alAnclar(id: string, si: boolean): void;
    alBloquear(): void;
    alReiniciar(): void;
    alApagar(): void;
}) {
    const panel = useRef<HTMLDivElement>(null), buscador = useRef<HTMLInputElement>(null), apagado = useRef<HTMLDivElement>(null);
    const idApagado = useId(), idLista = useId();
    const [vista, setVista] = useState<"inicio" | "todas">("inicio");
    const [consulta, setConsulta] = useState("");

    useImperativeHandle(ref, () => ({
        abrir(buscar = false) {
            const p = panel.current;
            if (!p) return;
            try { if (!p.matches(":popover-open")) p.showPopover(); } catch { /* sin popover */ }
            if (buscar) buscador.current?.focus();
        },
    }), []);

    // Al abrirse: arriba de la barra (al centro o a la izquierda), con lo de siempre y el buscador listo para escribir.
    useEffect(() => {
        const p = panel.current;
        if (!p) return;
        const antes = (e: Event) => {
            const abre = (e as ToggleEvent).newState === "open";
            document.querySelector('[data-tarea="inicio"]')?.setAttribute("aria-expanded", String(abre));
            if (!abre) return;
            setVista("inicio"); setConsulta("");
            const ancho = Math.min(660, innerWidth - 16);
            Object.assign(p.style, { width: `${ancho}px`, left: alinear === "izq" ? "12px" : `${Math.round((innerWidth - ancho) / 2)}px` });
        };
        const despues = (e: Event) => { if ((e as ToggleEvent).newState === "open") buscador.current?.focus(); };
        p.addEventListener("beforetoggle", antes); p.addEventListener("toggle", despues);
        return () => { p.removeEventListener("beforetoggle", antes); p.removeEventListener("toggle", despues); };
    }, [alinear]);

    const abrir = (id: string, args?: Args) => { try { panel.current?.hidePopover(); } catch { /* ya cerrado */ } alAbrir(id, args); };

    const resultados = useMemo(() => {
        const q = normal(consulta.trim());
        if (!q) return null;
        const puntaje = (texto: string) => { const t = normal(texto); return t.startsWith(q) ? 3 : t.split(/[\s/-]+/).some((p) => p.startsWith(q)) ? 2 : t.includes(q) ? 1 : 0; };
        const apps = todas.map((a) => ({ a, p: puntaje(a.titulo) * 2 + Math.min(1, puntaje(`${a.descripcion ?? ""} ${a.familia ?? ""}`)) }))
            .filter((x) => x.p > 0).sort((x, y) => y.p - x.p || x.a.titulo.localeCompare(y.a.titulo, "es")).map((x) => x.a);
        const ajustes = AJUSTES.filter((s) => puntaje(s.titulo) || normal(s.claves).split(" ").some((c) => c.startsWith(q)));
        return { apps, ajustes };
    }, [consulta, todas]);
    const mejor = resultados?.apps[0] ?? null;

    const alfabetico = useMemo(() => {
        const grupos = new Map<string, App[]>();
        for (const a of [...todas].sort((x, y) => x.titulo.localeCompare(y.titulo, "es"))) {
            const l = normal(a.titulo).charAt(0).toUpperCase();
            const letra = /[A-Z]/.test(l) ? l : "#";
            grupos.set(letra, [...(grupos.get(letra) ?? []), a]);
        }
        return [...grupos];
    }, [todas]);

    const recomendados = (recientes.length ? recientes.map((r) => ({ app: resolver(r.id), sub: hace(r.cuando) })) : SUGERIDAS.map((id) => ({ app: resolver(id), sub: "" })))
        .filter((x): x is { app: App; sub: string } => !!x.app).map((x) => ({ ...x, sub: x.sub || x.app.descripcion || CLASE[x.app.tipo] })).slice(0, 6);

    const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && mejor) { e.preventDefault(); abrir(mejor.id); }
        else if (e.key === "ArrowDown") { e.preventDefault(); panel.current?.querySelector<HTMLElement>(".es-inicio-cuerpo [data-item]")?.focus(); }
    };

    const fila = (a: App, sub?: string) => (
        <button key={a.id} type="button" className="es-fila" data-item="" onClick={() => abrir(a.id)}>
            <IconoDe icono={a.icono} tam={32} />
            <span className="es-fila-txt"><b>{a.titulo}</b>{sub ? <small>{sub}</small> : null}</span>
        </button>
    );

    return (
        <div ref={panel} id="es-inicio" popover="auto" className="es-flota es-inicio" role="dialog" aria-label="Inicio">
            <label className="es-buscar">
                <Search size={16} strokeWidth={1.75} aria-hidden="true" />
                <input ref={buscador} type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} onKeyDown={alTeclear}
                    placeholder="Busca apps, herramientas, páginas y ajustes" aria-label="Buscar en el escritorio" aria-controls={idLista} autoComplete="off" spellCheck={false} />
            </label>

            <div className="es-inicio-cuerpo" id={idLista}>
                {resultados ? (
                    resultados.apps.length || resultados.ajustes.length ? (
                        <div className="es-resultados">
                            <div className="es-resultados-lista" onKeyDown={navegarGrilla(1)}>
                                {mejor && <><h3>Mejor coincidencia</h3>{fila(mejor, CLASE[mejor.tipo])}</>}
                                {(["herramienta", "vista", "pagina"] as const).map((t) => {
                                    const lista = resultados.apps.slice(1).filter((a) => a.tipo === t);
                                    return lista.length ? <section key={t}><h3>{t === "herramienta" ? "Herramientas" : t === "vista" ? "Apps" : "Páginas"}</h3>{lista.slice(0, 8).map((a) => fila(a))}</section> : null;
                                })}
                                {resultados.ajustes.length > 0 && (
                                    <section><h3>Configuración</h3>
                                        {resultados.ajustes.map((s) => (
                                            <button key={s.titulo} type="button" className="es-fila" data-item="" onClick={() => abrir("configuracion", { seccion: s.seccion })}>
                                                <IconoDe icono="configuracion" tam={32} /><span className="es-fila-txt"><b>{s.titulo}</b><small>Configuración</small></span>
                                            </button>
                                        ))}
                                    </section>
                                )}
                            </div>
                            {mejor && (
                                <aside className="es-mejor" aria-label={`${mejor.titulo}, mejor coincidencia`}>
                                    <IconoDe icono={mejor.icono} tam={64} />
                                    <b>{mejor.titulo}</b>
                                    <small>{CLASE[mejor.tipo]}</small>
                                    {mejor.descripcion && <p>{mejor.descripcion}</p>}
                                    <div className="es-mejor-acciones">
                                        <button type="button" className="es-primario" onClick={() => abrir(mejor.id)}>Abrir</button>
                                        {mejor.enlace && <button type="button" onClick={() => { panel.current?.hidePopover(); window.open(mejor.enlace, "_blank", "noopener"); }}><ExternalLink size={15} aria-hidden="true" />Abrir en el sitio</button>}
                                        <button type="button" onClick={() => alAnclar(mejor.id, !ancladasBarra.includes(mejor.id))}>
                                            {ancladasBarra.includes(mejor.id) ? <><PinOff size={15} aria-hidden="true" />Desanclar de la barra de tareas</> : <><Pin size={15} aria-hidden="true" />Anclar a la barra de tareas</>}
                                        </button>
                                    </div>
                                </aside>
                            )}
                        </div>
                    ) : <p className="es-nada">No encontré «{consulta.trim()}». Prueba con otra palabra, como «imagen», «sueldo» o «proyectos».</p>
                ) : vista === "todas" ? (
                    <>
                        <div className="es-inicio-tit"><h3>Todas las apps</h3><button type="button" className="es-boton-chico" onClick={() => setVista("inicio")}><ChevronLeft size={14} aria-hidden="true" />Atrás</button></div>
                        <div className="es-todas" onKeyDown={navegarGrilla(1)}>
                            {alfabetico.map(([letra, apps]) => (
                                <section key={letra} aria-label={letra}><h4 aria-hidden="true">{letra}</h4>{apps.map((a) => fila(a))}</section>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="es-inicio-tit"><h3>Anclado</h3><button type="button" className="es-boton-chico" onClick={() => setVista("todas")}>Todas las apps<ChevronRight size={14} aria-hidden="true" /></button></div>
                        <div className="es-anclado" onKeyDown={navegarGrilla(6)}>
                            {anclados.map((id) => resolver(id)).filter((a): a is App => !!a).map((a) => (
                                <button key={a.id} type="button" className="es-anclada" data-item="" onClick={() => abrir(a.id)} title={a.descripcion}>
                                    <IconoDe icono={a.icono} tam={32} /><span>{a.titulo}</span>
                                </button>
                            ))}
                        </div>
                        <div className="es-inicio-tit"><h3>Recomendado</h3></div>
                        <div className="es-recomendado" onKeyDown={navegarGrilla(2)}>
                            {recomendados.map(({ app, sub }) => fila(app, sub))}
                        </div>
                    </>
                )}
            </div>

            <footer className="es-inicio-pie">
                <span className="es-persona"><span className="es-avatar" aria-hidden="true">V</span>Visitante</span>
                <button type="button" className="es-b es-apagar" popoverTarget={idApagado} aria-label="Apagado: bloquear, reiniciar o volver al sitio" title="Apagado">
                    <Power size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <div ref={apagado} id={idApagado} popover="auto" role="menu" aria-label="Apagado" className="es-flota es-menu es-menu-apagado" onKeyDown={navegarMenu}>
                    <button type="button" role="menuitem" onClick={() => { panel.current?.hidePopover(); alBloquear(); }}><Lock size={14} aria-hidden="true" />Bloquear</button>
                    <button type="button" role="menuitem" onClick={() => { panel.current?.hidePopover(); alReiniciar(); }}><RotateCcw size={14} aria-hidden="true" />Reiniciar</button>
                    <button type="button" role="menuitem" onClick={alApagar}><LogOut size={14} aria-hidden="true" />Apagar y volver al sitio</button>
                </div>
            </footer>
        </div>
    );
}
