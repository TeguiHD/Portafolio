"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, BellOff, ChevronDown, ChevronUp, Maximize, Moon, Settings, Sparkles, Sun, Volume2, VolumeX, X } from "lucide-react";
import { IconoDe } from "./iconos/Icono";
import type { App } from "./apps";
import type { PreferenciasSonido } from "./sonido";
import type { Args } from "./tipos";

/** Un aviso del escritorio (bienvenida, mensaje enviado, sin conexión…). */
export interface Aviso { id: number; app: App; titulo: string; texto: string; cuando: number; abrir?: { id: string; args?: Args } }

/** Pone un panel de la bandeja arriba de la barra de tareas, pegado a la derecha (o a la izquierda). */
function useColocacion(id: string, lado: "der" | "izq") {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const p = ref.current;
        if (!p) return;
        const antes = (e: Event) => {
            const abre = (e as ToggleEvent).newState === "open";
            document.querySelectorAll(`[popovertarget="${id}"]`).forEach((b) => b.setAttribute("aria-expanded", String(abre)));
            if (abre) Object.assign(p.style, lado === "der" ? { right: "12px", left: "auto" } : { left: "12px", right: "auto" });
        };
        p.addEventListener("beforetoggle", antes);
        return () => p.removeEventListener("beforetoggle", antes);
    }, [id, lado]);
    return ref;
}

function Interruptor({ activo, alCambiar, icono, children }: { activo: boolean; alCambiar(): void; icono: ReactNode; children: ReactNode }) {
    return (
        <button type="button" className="es-rapido" aria-pressed={activo} onClick={alCambiar}>
            <span className="es-rapido-ico">{icono}</span><span>{children}</span>
        </button>
    );
}

/**
 * La configuración rápida de Windows 11, que se abre desde la red y el volumen: el sonido, el tema, las animaciones,
 * no molestar y la pantalla completa, más el volumen. El engranaje lleva a Configuración.
 */
export function ConfiguracionRapida({ prefs, cambiarSonido, muestra, tema, alTema, animaciones, alAnimaciones, noMolestar, alNoMolestar, enLinea, alConfiguracion }: {
    prefs: PreferenciasSonido | null;
    cambiarSonido(p: Partial<PreferenciasSonido>): void;
    muestra(): void;
    tema: "oscuro" | "claro";
    alTema(): void;
    animaciones: boolean;
    alAnimaciones(): void;
    noMolestar: boolean;
    alNoMolestar(): void;
    enLinea: boolean;
    alConfiguracion(): void;
}) {
    const ref = useColocacion("es-rapida", "der");
    const [completa, setCompleta] = useState(false);
    useEffect(() => {
        const f = () => setCompleta(!!document.fullscreenElement);
        f();
        document.addEventListener("fullscreenchange", f);
        return () => document.removeEventListener("fullscreenchange", f);
    }, []);
    const pantalla = () => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined); };
    const activo = !!prefs?.activo, volumen = prefs?.volumen ?? 0.6;
    return (
        <div ref={ref} id="es-rapida" popover="auto" className="es-flota es-rapida" role="dialog" aria-label="Configuración rápida">
            <div className="es-rapidos">
                <Interruptor activo={activo} alCambiar={() => cambiarSonido({ activo: !activo })} icono={activo ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}>Sonido</Interruptor>
                <Interruptor activo={tema === "oscuro"} alCambiar={alTema} icono={tema === "oscuro" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}>Tema oscuro</Interruptor>
                <Interruptor activo={animaciones} alCambiar={alAnimaciones} icono={<Sparkles size={18} aria-hidden="true" />}>Animaciones</Interruptor>
                <Interruptor activo={noMolestar} alCambiar={alNoMolestar} icono={noMolestar ? <BellOff size={18} aria-hidden="true" /> : <Bell size={18} aria-hidden="true" />}>No molestar</Interruptor>
                <Interruptor activo={completa} alCambiar={pantalla} icono={<Maximize size={18} aria-hidden="true" />}>Pantalla completa</Interruptor>
            </div>
            <label className="es-volumen">
                <span className="es-sr">Volumen</span>
                {activo && volumen > 0 ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
                <input type="range" min={0} max={100} value={Math.round(volumen * 100)} disabled={!activo}
                    onChange={(e) => cambiarSonido({ volumen: Number(e.target.value) / 100 })} onPointerUp={muestra} onKeyUp={(e) => { if (e.key.startsWith("Arrow")) muestra(); }} />
                <output>{Math.round(volumen * 100)}</output>
            </label>
            <footer className="es-rapida-pie">
                <span>{enLinea ? "Conectado a internet" : "Sin conexión"}</span>
                <button type="button" className="es-b" aria-label="Abrir Configuración" title="Configuración" onClick={() => { ref.current?.hidePopover(); alConfiguracion(); }}><Settings size={16} aria-hidden="true" /></button>
            </footer>
        </div>
    );
}

const DIA_LARGO = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long" });
const MES = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
const HORA_AVISO = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const SEMANA = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
/** La fecha de hoy en Santiago (año, mes 0–11, día). */
function hoyEnSantiago(d: Date) {
    const [a, m, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d).split("-").map(Number);
    return { a, m: m - 1, dia };
}

/** El panel de la hora: las notificaciones arriba y el calendario del mes abajo, como en Windows 11. */
export function Calendario({ ahora, avisos, alBorrar, alQuitar, alAbrirAviso }: {
    ahora: Date | null;
    avisos: Aviso[];
    alBorrar(): void;
    alQuitar(id: number): void;
    alAbrirAviso(a: Aviso): void;
}) {
    const ref = useColocacion("es-calendario", "der");
    const hoy = ahora ? hoyEnSantiago(ahora) : null;
    const [mes, setMes] = useState<{ a: number; m: number } | null>(null);
    useEffect(() => {
        const p = ref.current;
        if (!p) return;
        const abre = (e: Event) => { if ((e as ToggleEvent).newState === "open") setMes(null); };
        p.addEventListener("beforetoggle", abre);
        return () => p.removeEventListener("beforetoggle", abre);
    }, [ref]);
    const visto = mes ?? (hoy ? { a: hoy.a, m: hoy.m } : null);
    const celdas: (number | null)[] = [];
    if (visto) {
        const primero = (new Date(Date.UTC(visto.a, visto.m, 1)).getUTCDay() + 6) % 7, dias = new Date(Date.UTC(visto.a, visto.m + 1, 0)).getUTCDate();
        for (let i = 0; i < primero; i++) celdas.push(null);
        for (let d = 1; d <= dias; d++) celdas.push(d);
    }
    const mover = (d: number) => visto && setMes({ a: visto.a + Math.floor((visto.m + d) / 12), m: ((visto.m + d) % 12 + 12) % 12 });
    return (
        <div ref={ref} id="es-calendario" popover="auto" className="es-flota es-calendario" role="dialog" aria-label="Notificaciones y calendario">
            <section className="es-avisos" aria-label="Notificaciones">
                <div className="es-flota-tit"><h3>Notificaciones</h3>{avisos.length > 0 && <button type="button" className="es-boton-chico" onClick={alBorrar}>Borrar todo</button>}</div>
                {avisos.length ? (
                    <ul>
                        {avisos.map((a) => (
                            <li key={a.id} className="es-aviso">
                                <button type="button" className="es-aviso-abrir" onClick={() => { ref.current?.hidePopover(); alAbrirAviso(a); }}>
                                    <span className="es-aviso-app"><IconoDe icono={a.app.icono} tam={16} />{a.app.titulo}<time>{HORA_AVISO.format(a.cuando)}</time></span>
                                    <b>{a.titulo}</b><span>{a.texto}</span>
                                </button>
                                <button type="button" className="es-aviso-quitar" aria-label={`Descartar «${a.titulo}»`} onClick={() => alQuitar(a.id)}><X size={14} aria-hidden="true" /></button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="es-flota-vacio">Sin notificaciones nuevas</p>}
            </section>
            <section className="es-mes" aria-label="Calendario">
                <div className="es-flota-tit">
                    <h3>{ahora ? DIA_LARGO.format(ahora).replace(/^./, (c) => c.toUpperCase()) : ""}</h3>
                </div>
                <div className="es-mes-cab">
                    <b>{visto ? MES.format(new Date(Date.UTC(visto.a, visto.m, 15))).replace(/^./, (c) => c.toUpperCase()) : ""}</b>
                    <span>
                        <button type="button" className="es-b" aria-label="Mes anterior" onClick={() => mover(-1)}><ChevronUp size={16} aria-hidden="true" /></button>
                        <button type="button" className="es-b" aria-label="Mes siguiente" onClick={() => mover(1)}><ChevronDown size={16} aria-hidden="true" /></button>
                    </span>
                </div>
                <table className="es-mes-tabla">
                    <thead><tr>{SEMANA.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
                    <tbody>
                        {Array.from({ length: Math.ceil(celdas.length / 7) }, (_, f) => (
                            <tr key={f}>{Array.from({ length: 7 }, (_, c) => {
                                const d = celdas[f * 7 + c];
                                const esHoy = !!d && !!hoy && !!visto && hoy.a === visto.a && hoy.m === visto.m && hoy.dia === d;
                                return <td key={c} aria-current={esHoy ? "date" : undefined}>{d ?? ""}</td>;
                            })}</tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
