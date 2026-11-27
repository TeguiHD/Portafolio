"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Accessibility, Info, Palette, Play, Volume2 } from "lucide-react";
import { COLORES_SOLIDOS, FONDOS, fondoPorDefecto, miniFondo, type FondoId } from "../fondos";
import type { PrefsEscritorio } from "../preferencias";
import { TIPOS_CLIC, type PreferenciasSonido } from "../sonido";

type Seccion = "personalizacion" | "sonido" | "accesibilidad" | "acerca";
const SECCIONES: { id: Seccion; nombre: string; icono: ReactNode }[] = [
    { id: "personalizacion", nombre: "Personalización", icono: <Palette size={16} aria-hidden="true" /> },
    { id: "sonido", nombre: "Sonido", icono: <Volume2 size={16} aria-hidden="true" /> },
    { id: "accesibilidad", nombre: "Accesibilidad", icono: <Accessibility size={16} aria-hidden="true" /> },
    { id: "acerca", nombre: "Acerca de", icono: <Info size={16} aria-hidden="true" /> },
];
const ATAJOS: [string, string][] = [
    ["Ctrl K", "Abrir el inicio y buscar"],
    ["Flechas", "Recorrer los íconos del escritorio, el inicio y el Explorador"],
    ["Enter", "Abrir lo elegido"],
    ["Ctrl A", "Elegir todos los íconos del escritorio"],
    ["Mayús F10", "Menú contextual de lo elegido"],
    ["Flechas sobre el ícono de una ventana", "Mover la ventana (con Mayúsculas, cambiar su tamaño)"],
    ["Alt + flechas en el Explorador", "Atrás, adelante y subir un nivel"],
    ["Escape", "Cerrar el menú o panel abierto"],
];

function Fila({ titulo, detalle, children }: { titulo: string; detalle?: string; children: ReactNode }) {
    return <div className="cf-fila"><span className="cf-fila-txt"><b>{titulo}</b>{detalle && <small>{detalle}</small>}</span><span className="cf-fila-ctl">{children}</span></div>;
}
function Interruptor({ activo, alCambiar, etiqueta }: { activo: boolean; alCambiar(v: boolean): void; etiqueta: string }) {
    return (
        <label className="cf-interruptor">
            <span>{activo ? "Activado" : "Desactivado"}</span>
            <input type="checkbox" role="switch" checked={activo} aria-label={etiqueta} onChange={(e) => alCambiar(e.target.checked)} />
        </label>
    );
}

/** Lo que se sabe de este equipo, sin pedir permisos: lo muestra «Acerca de» como la ficha del sistema de Windows. */
function useEquipo() {
    const [e, setE] = useState<[string, string][]>([]);
    useEffect(() => {
        const n = navigator as Navigator & { deviceMemory?: number; userAgentData?: { brands?: { brand: string; version: string }[]; platform?: string } };
        const marca = n.userAgentData?.brands?.find((b) => !/not|chromium/i.test(b.brand));
        const firefox = /Firefox\/(\d+)/.exec(n.userAgent);
        const navegador = marca ? `${marca.brand} ${marca.version}` : firefox ? `Firefox ${firefox[1]}` : /Version\/\d+.*Safari/.test(n.userAgent) ? "Safari" : "Navegador web";
        setE([
            ["Navegador", navegador],
            ["Sistema", n.userAgentData?.platform || (/Windows/.test(n.userAgent) ? "Windows" : /Mac OS/.test(n.userAgent) ? "macOS" : /Android/.test(n.userAgent) ? "Android" : /Linux/.test(n.userAgent) ? "Linux" : "—")],
            ["Pantalla", `${screen.width} × ${screen.height} px, densidad ${devicePixelRatio.toLocaleString("es-CL")}`],
            ["Núcleos", String(n.hardwareConcurrency ?? "—")],
            ...(n.deviceMemory ? [["Memoria", `${n.deviceMemory} GB o más`] as [string, string]] : []),
            ["Zona horaria", Intl.DateTimeFormat().resolvedOptions().timeZone],
        ]);
    }, []);
    return e;
}

/**
 * Configuración, como la de Windows 11: a la izquierda las secciones y a la derecha sus ajustes. Personalización (fondo,
 * modo, barra de tareas e íconos), Sonido (tipo de clic, volumen y qué suena), Accesibilidad (animaciones y atajos) y
 * Acerca de. Todo se guarda en este navegador.
 */
export function Configuracion({ seccion, prefs, alPrefs, tema, alTema, sonido, cambiarSonido, muestra, alOrdenar, alAbrir }: {
    seccion?: string;
    prefs: PrefsEscritorio;
    alPrefs(p: Partial<PrefsEscritorio>): void;
    tema: "oscuro" | "claro";
    alTema(t: "oscuro" | "claro"): void;
    sonido: PreferenciasSonido | null;
    cambiarSonido(p: Partial<PreferenciasSonido>): void;
    muestra(): void;
    alOrdenar(): void;
    alAbrir(id: string): void;
}) {
    const [actual, setActual] = useState<Seccion>(SECCIONES.some((s) => s.id === seccion) ? (seccion as Seccion) : "personalizacion");
    useEffect(() => { if (SECCIONES.some((s) => s.id === seccion)) setActual(seccion as Seccion); }, [seccion]);
    const equipo = useEquipo();
    const fondo: FondoId = prefs.fondo ?? fondoPorDefecto(tema);
    const reducido = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const titulo = SECCIONES.find((s) => s.id === actual)?.nombre;

    return (
        <div className="cf">
            <nav className="cf-nav" aria-label="Secciones de Configuración">
                <div className="cf-perfil"><span className="es-avatar es-avatar-grande" aria-hidden="true">V</span><span><b>Visitante</b><small>Cuenta local de este navegador</small></span></div>
                {SECCIONES.map((s) => <button key={s.id} type="button" aria-current={actual === s.id ? "page" : undefined} onClick={() => setActual(s.id)}>{s.icono}{s.nombre}</button>)}
            </nav>
            <div className="cf-cuerpo">
                <h3 className="cf-titulo">{titulo}</h3>
                {actual === "personalizacion" && (
                    <>
                        <div className="cf-vista" aria-hidden="true">
                            {fondo === "solido" ? <span style={{ background: prefs.solido }} /> : <img src={miniFondo(fondo === "materia-viva" ? "materia" : fondo)} alt="" />}
                            <i />
                        </div>
                        <section className="cf-bloque" aria-labelledby="cf-fondo">
                            <h4 id="cf-fondo">Fondo</h4>
                            <div className="cf-fondos" role="radiogroup" aria-label="Fondo de pantalla">
                                {FONDOS.map((f) => (
                                    <button key={f.id} type="button" role="radio" aria-checked={fondo === f.id} title={f.detalle} onClick={() => alPrefs({ fondo: f.id })}>
                                        {f.tipo === "solido" ? <span className="cf-solido" style={{ background: prefs.solido }} /> : <img src={miniFondo(f.tipo === "vivo" ? "materia" : f.id)} alt="" loading="lazy" />}
                                        <span>{f.nombre}</span>
                                    </button>
                                ))}
                            </div>
                            {fondo === "solido" && (
                                <div className="cf-colores" role="radiogroup" aria-label="Color del fondo">
                                    {COLORES_SOLIDOS.map((c) => <button key={c} type="button" role="radio" aria-checked={prefs.solido === c} aria-label={c} style={{ background: c }} onClick={() => alPrefs({ solido: c })} />)}
                                </div>
                            )}
                            {prefs.fondo && <button type="button" className="es-boton-chico" onClick={() => alPrefs({ fondo: null })}>Que el fondo siga al tema</button>}
                        </section>
                        <section className="cf-bloque" aria-label="Colores y barra de tareas">
                            <Fila titulo="Modo" detalle="Claro u oscuro, en el escritorio y en las ventanas">
                                <select value={tema} onChange={(e) => alTema(e.target.value as "oscuro" | "claro")} aria-label="Modo"><option value="oscuro">Oscuro</option><option value="claro">Claro</option></select>
                            </Fila>
                            <Fila titulo="Alineación de la barra de tareas" detalle="Dónde van el inicio y las apps">
                                <select value={prefs.alinear} onChange={(e) => alPrefs({ alinear: e.target.value as "centro" | "izq" })} aria-label="Alineación de la barra de tareas"><option value="centro">Centro</option><option value="izq">Izquierda</option></select>
                            </Fila>
                            <Fila titulo="Íconos del escritorio" detalle="Su tamaño; «Ordenar» los vuelve a su lugar de fábrica">
                                <select value={prefs.iconos} onChange={(e) => alPrefs({ iconos: e.target.value as PrefsEscritorio["iconos"] })} aria-label="Tamaño de los íconos"><option value="grandes">Grandes</option><option value="medianos">Medianos</option><option value="pequenos">Pequeños</option></select>
                                <button type="button" className="es-boton-chico" onClick={alOrdenar}>Ordenar</button>
                            </Fila>
                        </section>
                    </>
                )}
                {actual === "sonido" && sonido && (
                    <>
                        <section className="cf-bloque" aria-label="Sonido">
                            <Fila titulo="Sonidos del escritorio" detalle="El clic del mouse, el teclado y los avisos"><Interruptor activo={sonido.activo} etiqueta="Sonidos del escritorio" alCambiar={(v) => cambiarSonido({ activo: v })} /></Fila>
                            <Fila titulo="Volumen">
                                <input type="range" min={0} max={100} value={Math.round(sonido.volumen * 100)} disabled={!sonido.activo} aria-label="Volumen"
                                    onChange={(e) => cambiarSonido({ volumen: Number(e.target.value) / 100 })} onPointerUp={muestra} onKeyUp={(e) => { if (e.key.startsWith("Arrow")) muestra(); }} />
                                <output>{Math.round(sonido.volumen * 100)}</output>
                            </Fila>
                        </section>
                        <section className="cf-bloque" aria-labelledby="cf-clic">
                            <h4 id="cf-clic">Clic del mouse</h4>
                            <div className="cf-clics" role="radiogroup" aria-label="Tipo de clic">
                                {TIPOS_CLIC.map((t) => (
                                    <div key={t.id} className="cf-clic">
                                        <button type="button" role="radio" aria-checked={sonido.tipo === t.id} disabled={!sonido.activo} onClick={() => { cambiarSonido({ tipo: t.id }); setTimeout(muestra, 60); }}>
                                            <b>{t.nombre}</b><small>{t.detalle}</small>
                                        </button>
                                        <button type="button" className="es-b" aria-label={`Probar el clic ${t.nombre}`} disabled={!sonido.activo} onClick={() => { cambiarSonido({ tipo: t.id }); setTimeout(muestra, 60); }}><Play size={14} aria-hidden="true" /></button>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="cf-bloque" aria-label="Qué suena">
                            <Fila titulo="Clic al presionar y al soltar"><Interruptor activo={sonido.clic} etiqueta="Clic al presionar y al soltar" alCambiar={(v) => cambiarSonido({ clic: v })} /></Fila>
                            <Fila titulo="Teclado al escribir"><Interruptor activo={sonido.teclas} etiqueta="Teclado al escribir" alCambiar={(v) => cambiarSonido({ teclas: v })} /></Fila>
                            <Fila titulo="Notificaciones e inicio de sesión"><Interruptor activo={sonido.avisos} etiqueta="Notificaciones e inicio de sesión" alCambiar={(v) => cambiarSonido({ avisos: v })} /></Fila>
                        </section>
                    </>
                )}
                {actual === "accesibilidad" && (
                    <>
                        <section className="cf-bloque" aria-label="Movimiento">
                            <Fila titulo="Animaciones" detalle={reducido ? "Tu equipo pide reducir el movimiento: las animaciones ya van al mínimo" : "Abrir, minimizar y cerrar ventanas con movimiento"}>
                                <Interruptor activo={prefs.animaciones} etiqueta="Animaciones" alCambiar={(v) => alPrefs({ animaciones: v })} />
                            </Fila>
                            <Fila titulo="No molestar" detalle="Las notificaciones llegan al panel de la hora sin aparecer"><Interruptor activo={prefs.noMolestar} etiqueta="No molestar" alCambiar={(v) => alPrefs({ noMolestar: v })} /></Fila>
                        </section>
                        <section className="cf-bloque" aria-labelledby="cf-atajos">
                            <h4 id="cf-atajos">Atajos de teclado</h4>
                            <dl className="cf-atajos">{ATAJOS.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
                        </section>
                    </>
                )}
                {actual === "acerca" && (
                    <>
                        <section className="cf-bloque cf-acerca" aria-label="Este escritorio">
                            <span className="es-marca es-marca-media" aria-hidden="true">n<i>.</i></span>
                            <span><b>nicoholas.dev en modo escritorio</b><small>Versión 2, noviembre de 2026</small></span>
                        </section>
                        <section className="cf-bloque" aria-labelledby="cf-hecho">
                            <h4 id="cf-hecho">Con qué está hecho</h4>
                            <dl className="cf-datos">
                                <div><dt>Interfaz</dt><dd>Next.js 16 y React 19, con CSS propio</dd></div>
                                <div><dt>Sonido</dt><dd>Sintetizado con Web Audio en tu navegador, sin archivos</dd></div>
                                <div><dt>Fondos</dt><dd>Dibujados con código: paisajes de Chile y abstractos</dd></div>
                                <div><dt>Ventanas</dt><dd>Las páginas reales del sitio y apps propias</dd></div>
                            </dl>
                            <button type="button" className="es-boton-chico" onClick={() => alAbrir("como-se-hizo")}>Ver cómo se hizo el sitio</button>
                        </section>
                        <section className="cf-bloque" aria-labelledby="cf-equipo">
                            <h4 id="cf-equipo">Este equipo</h4>
                            <dl className="cf-datos">{equipo.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
