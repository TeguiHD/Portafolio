"use client";

import { useRef, type CSSProperties, type MouseEvent as ME, type PointerEvent as PE } from "react";
import { Bell, Search, Volume1, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { IconoTiempo } from "@/modules/pulse/blog/IconoTiempo";
import type { App } from "./apps";
import { IconoDe } from "./iconos/Icono";

export interface Tarea { id: string; app: App; abierta: boolean; activa: boolean }
export interface ClimaBarra { temperatura: number; texto: string; codigo: number; dia: boolean }

const HORA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const FECHA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" });
const LARGA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", year: "numeric" });

/**
 * La barra de tareas de Windows 11: de borde a borde, abajo. Al centro (o a la izquierda, según Configuración) el inicio,
 * buscar y las apps ancladas y abiertas; a la izquierda el clima, que abre los widgets; a la derecha la red, el volumen,
 * la hora y la fecha, y la franja de «mostrar escritorio».
 */
export function Barra({ tareas, alinear, ahora, clima, enLinea, sonido, avisos, inerte = false, alTocar, alAsomar, alMenu, alBuscar, alEscritorio }: {
    tareas: Tarea[];
    alinear: "centro" | "izq";
    ahora: Date | null;
    clima: ClimaBarra | null;
    enLinea: boolean;
    sonido: { activo: boolean; volumen: number };
    avisos: number;
    /** Bajo la pantalla de bloqueo, la barra no recibe el foco ni los clics. */
    inerte?: boolean;
    alTocar(id: string): void;
    alAsomar(id: string, si: boolean): void;
    alMenu(id: string, x: number, y: number): void;
    alBuscar(): void;
    alEscritorio(): void;
}) {
    const mudo = !sonido.activo || sonido.volumen === 0;
    const Volumen = mudo ? VolumeX : sonido.volumen < 0.5 ? Volume1 : Volume2;
    // Clic derecho: el menú se abre al SOLTAR el botón. En Linux y macOS «contextmenu» llega al presionar, y abrirlo ahí
    // hacía que el mismo botón, al soltarse, lo cerrara (cierre automático de los paneles). Con el teclado (tecla Menú o
    // Mayús F10) no hay botón que soltar: se abre junto al botón.
    const derecho = useRef(0);
    const menuTarea = (id: string) => (e: ME<HTMLButtonElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (performance.now() - derecho.current < 1500) return;
        const r = e.currentTarget.getBoundingClientRect();
        alMenu(id, r.left + r.width / 2, r.top);
    };
    const soltarTarea = (id: string) => (e: PE<HTMLButtonElement>) => {
        if (e.button !== 2) return;
        e.stopPropagation();
        alMenu(id, e.clientX, e.clientY);
    };
    return (
        <nav className="es-barra" aria-label="Barra de tareas" data-alinear={alinear} inert={inerte}>
            <button type="button" className="es-b es-widgets-b" popoverTarget="es-widgets" aria-expanded="false"
                aria-label={clima ? `Widgets. En Santiago hay ${clima.temperatura} grados, ${clima.texto.toLowerCase()}` : "Widgets"}>
                {clima ? <IconoTiempo codigo={clima.codigo} dia={clima.dia} size={24} /> : <span className="es-widgets-vacio" aria-hidden="true" />}
                {clima && <span className="es-widgets-txt"><b>{clima.temperatura}°C</b><span>{clima.texto}</span></span>}
            </button>

            <div className="es-barra-apps">
                <button type="button" className="es-b es-tarea es-inicio-b" popoverTarget="es-inicio" aria-expanded="false" aria-label="Inicio" title="Inicio" data-tarea="inicio">
                    <span className="es-marca" aria-hidden="true">n<i>.</i></span>
                </button>
                <button type="button" className="es-b es-tarea" aria-label="Buscar" title="Buscar" onClick={alBuscar}>
                    <Search size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
                {tareas.map(({ id, app, abierta, activa }) => (
                    <button key={id} type="button" className="es-b es-tarea" data-tarea={id} aria-label={app.titulo} title={app.titulo}
                        aria-pressed={activa} data-abierta={abierta || undefined}
                        onClick={() => alTocar(id)} onContextMenu={menuTarea(id)} onPointerUp={soltarTarea(id)}
                        onPointerDown={(e) => { if (e.button === 2) derecho.current = performance.now(); }}
                        onPointerEnter={() => alAsomar(id, true)} onPointerLeave={() => alAsomar(id, false)}>
                        <IconoDe icono={app.icono} tam={24} />
                    </button>
                ))}
            </div>

            <div className="es-bandeja">
                <button type="button" className="es-b es-rapida-b" popoverTarget="es-rapida" aria-expanded="false"
                    aria-label={`Configuración rápida. ${enLinea ? "Conectado a internet" : "Sin conexión"}. Sonido ${mudo ? "apagado" : `al ${Math.round(sonido.volumen * 100)} %`}`}>
                    {enLinea ? <Wifi size={16} strokeWidth={1.75} aria-hidden="true" /> : <WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />}
                    <Volumen size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <button type="button" className="es-b es-reloj" popoverTarget="es-calendario" aria-expanded="false"
                    aria-label={ahora ? `${LARGA.format(ahora)}, ${HORA.format(ahora)} en Santiago. ${avisos ? `${avisos} notificaciones nuevas. ` : ""}Abrir el calendario y las notificaciones` : "Calendario"}>
                    <span className="es-reloj-txt"><span>{ahora ? HORA.format(ahora) : "--:--"}</span><span>{ahora ? FECHA.format(ahora).replace(/\//g, "-") : ""}</span></span>
                    {avisos > 0 && <span className="es-campana" style={{ "--n": `"${avisos}"` } as CSSProperties}><Bell size={14} strokeWidth={1.75} aria-hidden="true" /></span>}
                </button>
                <button type="button" className="es-mostrar" aria-label="Mostrar el escritorio" title="Mostrar el escritorio" onClick={alEscritorio} />
            </div>
        </nav>
    );
}
