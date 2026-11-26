"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { EN_INICIO, FAMILIAS, PAGINAS, type App, type HerramientaEscritorio } from "./apps";
import { Glifo, UI } from "./Glifo";
import { colocarJuntoABarra, navegarMenu } from "./menu";
import { TIPOS_CLIC, type PreferenciasSonido } from "./sonido";
import { FONDOS, type Fondo } from "./tipos";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const NOMBRE_FAMILIA: Record<string, string> = {
    "imágenes": "Imágenes", "generación": "Generación", "conversión": "Conversión", "productividad": "Productividad", "seguridad": "Seguridad", "redes": "Redes", "chile": "Chile",
};

/** Cierra el panel antes de hacer lo pedido, y lo deja colocado junto a su botón cada vez que se abre. */
function usePanel(id: string, centrado: boolean, alAbrir?: () => void) {
    const ref = useRef<HTMLDivElement>(null);
    const abrir = useRef(alAbrir);
    useEffect(() => { abrir.current = alAbrir; });
    useEffect(() => {
        const p = ref.current;
        if (!p) return;
        const antes = (e: Event) => {
            if ((e as ToggleEvent).newState !== "open") return;
            colocarJuntoABarra(p, document.querySelector<HTMLElement>(`[popovertarget="${id}"]`), centrado);
        };
        const despues = (e: Event) => {
            const abierto = (e as ToggleEvent).newState === "open";
            document.querySelectorAll(`[popovertarget="${id}"]`).forEach((b) => b.setAttribute("aria-expanded", String(abierto)));
            if (abierto) abrir.current?.();
        };
        p.addEventListener("beforetoggle", antes); p.addEventListener("toggle", despues);
        return () => { p.removeEventListener("beforetoggle", antes); p.removeEventListener("toggle", despues); };
    }, [id, centrado]);
    return ref;
}
const cerrarPanel = (el: HTMLElement | null) => { try { el?.hidePopover(); } catch { /* ya cerrado */ } };

export interface ControlInicio { abrir(): void; alternar(): void }

/** El menú «n.»: busca entre las apps, las páginas y las herramientas; muestra lo reciente y la salida al sitio. */
export const Inicio = forwardRef<ControlInicio, {
    herramientas: HerramientaEscritorio[]; recientes: string[]; resolver: (id: string) => App | null;
    alAbrir: (id: string) => void; alBloquear: () => void;
}>(function Inicio({ herramientas, recientes, resolver, alAbrir, alBloquear }, control) {
    const [q, setQ] = useState(""), [sel, setSel] = useState(0);
    const buscador = useRef<HTMLInputElement>(null);
    const ref = usePanel("es-inicio", true, () => { setQ(""); setSel(0); buscador.current?.focus(); });
    useImperativeHandle(control, () => ({
        abrir: () => { try { ref.current?.showPopover(); } catch { /* ya abierto */ } },
        alternar: () => { try { ref.current?.togglePopover(); } catch { /* sin soporte */ } },
    }), [ref]);

    const resultados = useMemo(() => {
        const n = sinTildes(q.trim());
        if (!n) return [];
        const apps = [...EN_INICIO, ...PAGINAS].map(resolver).filter((a): a is App => !!a && sinTildes(a.titulo).includes(n));
        const tools = herramientas.filter((t) => sinTildes(`${t.nombre} ${t.familia} ${t.slug}`).includes(n)).map((t) => resolver(`herramientas/${t.slug}`)).filter((a): a is App => !!a);
        return [...apps, ...tools].slice(0, 24);
    }, [q, herramientas, resolver]);

    const elegir = (id: string) => { cerrarPanel(ref.current); alAbrir(id); };
    const teclas = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!resultados.length) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s + (e.key === "ArrowDown" ? 1 : -1) + resultados.length) % resultados.length); }
        else if (e.key === "Enter") { e.preventDefault(); elegir(resultados[Math.min(sel, resultados.length - 1)].id); }
    };
    const item = (a: App, i?: number) => (
        <button key={a.id} id={i === undefined ? undefined : `es-res-${i}`} type="button" className="es-inicio-item" role={i === undefined ? undefined : "option"}
            aria-selected={i === undefined ? undefined : i === sel} data-abrir={a.id} style={{ "--c": a.color } as CSSProperties} onClick={() => elegir(a.id)}>
            <Glifo d={a.glifo} /><span>{a.titulo}</span>
        </button>
    );
    const recientesApps = recientes.map(resolver).filter((a): a is App => !!a).slice(0, 4);

    return (
        <div ref={ref} id="es-inicio" popover="auto" className="es-panel es-inicio" aria-label="Inicio">
            <div className="es-buscar">
                <Glifo d={UI.lupa} />
                <input ref={buscador} type="search" className="es-campo" placeholder="Busca una herramienta o una página" aria-label="Buscar en el escritorio"
                    autoComplete="off" spellCheck={false} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={teclas}
                    aria-controls="es-resultados" aria-activedescendant={q && resultados.length ? `es-res-${Math.min(sel, resultados.length - 1)}` : undefined} />
            </div>
            <div className="es-inicio-cuerpo">
                {q.trim() ? (
                    resultados.length
                        ? <div id="es-resultados" role="listbox" aria-label="Resultados" className="es-inicio-lista">{resultados.map((a, i) => item(a, i))}</div>
                        : <p className="es-nada">No hay nada con «{q.trim()}». Prueba con otra palabra, como «imagen» o «clave».</p>
                ) : (
                    <>
                        <div className="es-inicio-apps">
                            {EN_INICIO.map(resolver).filter((a): a is App => !!a).map((a) => (
                                <button key={a.id} type="button" className="es-inicio-app" data-abrir={a.id} style={{ "--c": a.color } as CSSProperties} onClick={() => elegir(a.id)}>
                                    <Glifo d={a.glifo} /><span>{a.titulo}</span>
                                </button>
                            ))}
                        </div>
                        {recientesApps.length > 0 && (
                            <section aria-label="Recientes"><h3 className="es-inicio-sub">Recientes</h3><div className="es-inicio-lista">{recientesApps.map((a) => item(a))}</div></section>
                        )}
                        {FAMILIAS.map((f) => {
                            const de = herramientas.filter((t) => t.familia === f);
                            if (!de.length) return null;
                            return (
                                <section key={f} aria-label={NOMBRE_FAMILIA[f]}>
                                    <h3 className="es-inicio-sub">{NOMBRE_FAMILIA[f]}</h3>
                                    <div className="es-inicio-lista">{de.map((t) => resolver(`herramientas/${t.slug}`)).filter((a): a is App => !!a).map((a) => item(a))}</div>
                                </section>
                            );
                        })}
                    </>
                )}
            </div>
            <div className="es-inicio-pie">
                <button type="button" className="es-yo" onClick={() => elegir("sobre-mi")}>
                    <i aria-hidden="true">n<b>.</b></i><span><strong>Nicoholas Lopetegui</strong><small>Desarrollador full stack</small></span>
                </button>
                <button type="button" className="es-pie-boton" onClick={() => elegir("atajos")}><Glifo d={UI.teclado} />Atajos</button>
                <button type="button" className="es-pie-boton" onClick={() => { cerrarPanel(ref.current); alBloquear(); }}><Glifo d={UI.candado} />Bloquear</button>
                <a className="es-pie-boton" href="/"><Glifo d={UI.salir} />Volver al sitio</a>
            </div>
        </div>
    );
});

/** Sonido: encendido, volumen, el tipo de clic y qué suena. */
export function PanelSonido({ prefs, cambiar, muestra }: { prefs: PreferenciasSonido | null; cambiar: (p: Partial<PreferenciasSonido>) => void; muestra: () => void }) {
    const ref = usePanel("es-sonido", false);
    return (
        <div ref={ref} id="es-sonido" popover="auto" className="es-panel es-sonido" aria-label="Sonido">
            {prefs && <ControlesSonido prefs={prefs} cambiar={cambiar} muestra={muestra} />}
        </div>
    );
}

export function ControlesSonido({ prefs, cambiar, muestra }: { prefs: PreferenciasSonido; cambiar: (p: Partial<PreferenciasSonido>) => void; muestra: () => void }) {
    return (
        <div className="es-controles-sonido">
            <label className="es-fila es-fila-fuerte"><span>Sonido activado</span><input type="checkbox" role="switch" checked={prefs.activo} onChange={(e) => cambiar({ activo: e.target.checked })} /></label>
            <label className="es-fila">
                <Glifo d={prefs.activo && prefs.volumen > 0 ? UI.sonido : UI.mudo} />
                <input type="range" min={0} max={100} step={5} aria-label="Volumen" value={Math.round(prefs.volumen * 100)} disabled={!prefs.activo}
                    onChange={(e) => cambiar({ volumen: Number(e.target.value) / 100 })} onPointerUp={muestra} onKeyUp={(e) => { if (e.key.startsWith("Arrow")) muestra(); }} />
                <output>{Math.round(prefs.volumen * 100)}</output>
            </label>
            <div className="es-seg" role="group" aria-label="Tipo de clic">
                {TIPOS_CLIC.map((t) => (
                    <button key={t.id} type="button" aria-pressed={prefs.tipo === t.id} disabled={!prefs.activo} onClick={() => { cambiar({ tipo: t.id }); setTimeout(muestra, 120); }}>{t.nombre}</button>
                ))}
            </div>
            <div className="es-opciones">
                <label><input type="checkbox" checked={prefs.clic} disabled={!prefs.activo} onChange={(e) => cambiar({ clic: e.target.checked })} /> Clic al presionar y al soltar</label>
                <label><input type="checkbox" checked={prefs.teclas} disabled={!prefs.activo} onChange={(e) => cambiar({ teclas: e.target.checked })} /> Teclas al escribir</label>
                <label><input type="checkbox" checked={prefs.ventanas} disabled={!prefs.activo} onChange={(e) => cambiar({ ventanas: e.target.checked })} /> Ventanas que se abren y se cierran</label>
            </div>
        </div>
    );
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", ...o });
const HORA = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), LARGA = fmt({ weekday: "long", day: "numeric", month: "long" });
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** La hora y la fecha de Santiago, el mes y, si llega, el tiempo de ahora. */
export function Calendario({ ahora, tiempo }: { ahora: Date | null; tiempo: string | null }) {
    const ref = usePanel("es-calendario", false);
    const mes = useMemo(() => {
        if (!ahora) return null;
        const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ahora).map((x) => [x.type, x.value]));
        const y = Number(p.year), m = Number(p.month) - 1, hoy = Number(p.day);
        const desfase = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, dias = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const celdas: (number | null)[] = [...Array<null>(desfase).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
        const semanas: (number | null)[][] = [];
        for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
        const nombre = mayuscula(new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1))));
        return { hoy, semanas, nombre };
    }, [ahora]);
    return (
        <div ref={ref} id="es-calendario" popover="auto" className="es-panel es-cal" aria-label="Hora y calendario">
            <p className="es-cal-hora">{ahora ? HORA.format(ahora) : "--:--"}</p>
            <p className="es-cal-fecha">{ahora ? mayuscula(LARGA.format(ahora)) : ""}</p>
            <p className="es-cal-lugar">En Santiago de Chile{tiempo ? `: ${tiempo}` : ""}</p>
            {mes && (
                <table className="es-cal-mes">
                    <caption>{mes.nombre}</caption>
                    <thead><tr>{["lu", "ma", "mi", "ju", "vi", "sá", "do"].map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
                    <tbody>{mes.semanas.map((s, i) => (
                        <tr key={i}>{Array.from({ length: 7 }, (_, j) => s[j] ?? null).map((d, j) => <td key={j} aria-current={d === mes.hoy ? "date" : undefined}>{d ?? ""}</td>)}</tr>
                    ))}</tbody>
                </table>
            )}
        </div>
    );
}

export interface ControlMenu { abrirEn(x: number, y: number): void }

/** Clic derecho en el fondo: el fondo, el tema, la configuración y la salida. Todo esto también está en el inicio y en Configuración. */
export const MenuEscritorio = forwardRef<ControlMenu, {
    fondo: Fondo; tema: "oscuro" | "claro"; alFondo: (f: Fondo) => void; alTema: () => void; alAbrir: (id: string) => void; alOrdenar: () => void; alEncender: () => void;
}>(function MenuEscritorio({ fondo, tema, alFondo, alTema, alAbrir, alOrdenar, alEncender }, control) {
    const ref = useRef<HTMLDivElement>(null);
    useImperativeHandle(control, () => ({
        abrirEn(x: number, y: number) {
            const m = ref.current;
            if (!m) return;
            try { m.showPopover(); } catch { return; }
            const w = m.offsetWidth, h = m.offsetHeight;
            Object.assign(m.style, { left: `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`, top: `${Math.max(8, Math.min(y, innerHeight - h - 8))}px`, right: "", bottom: "", transform: "" });
            m.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
        },
    }), []);
    const hacer = (f: () => void) => () => { cerrarPanel(ref.current); f(); };
    return (
        <div ref={ref} id="es-menu" popover="auto" role="menu" aria-label="Menú del escritorio" className="es-panel es-menu" onKeyDown={navegarMenu}>
            <p className="es-menu-sub" aria-hidden="true">Fondo</p>
            <div role="group" aria-label="Fondo">
                {FONDOS.map((f) => (
                    <button key={f.id} type="button" role="menuitemradio" aria-checked={fondo === f.id} onClick={hacer(() => alFondo(f.id))}>{f.nombre}</button>
                ))}
            </div>
            <hr />
            <button type="button" role="menuitem" onClick={hacer(alTema)}>{tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}</button>
            <button type="button" role="menuitem" onClick={hacer(() => alAbrir("configuracion"))}>Configuración</button>
            <button type="button" role="menuitem" onClick={hacer(() => alAbrir("atajos"))}>Atajos de teclado</button>
            <button type="button" role="menuitem" onClick={hacer(alOrdenar)}>Ordenar los íconos</button>
            <button type="button" role="menuitem" onClick={hacer(alEncender)}>Ver el encendido</button>
            <hr />
            <a role="menuitem" href="/">Volver al sitio</a>
        </div>
    );
});
