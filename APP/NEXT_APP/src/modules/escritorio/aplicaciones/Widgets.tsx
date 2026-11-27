"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { IconoTiempo } from "@/modules/pulse/blog/IconoTiempo";
import type { PulseContextData, PulseFinanceItem, PulseNewsItem } from "@/modules/pulse/types";
import { leerMercado, leerNoticias, precio } from "./datos";

const SALUDO = (h: number) => (h < 6 ? "Buenas noches" : h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches");
const HORA = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * Los widgets de Windows 11, con datos reales: el clima de Santiago y su pronóstico, los indicadores (UF, dólar, UTM y
 * cripto) y los titulares del día. Se abren desde el clima de la barra de tareas y piden los datos al abrirse.
 */
export function Widgets({ clima, alNoticias }: { clima: PulseContextData | null; alNoticias(): void }) {
    const ref = useRef<HTMLDivElement>(null);
    const [mercado, setMercado] = useState<PulseFinanceItem[] | null | "error">(null);
    const [noticias, setNoticias] = useState<PulseNewsItem[] | null | "error">(null);
    const [ahora, setAhora] = useState<Date | null>(null);
    const cargar = useCallback(async () => {
        setAhora(new Date());
        const [m, n] = await Promise.all([leerMercado(), leerNoticias()]);
        setMercado(m ?? "error"); setNoticias(n ?? "error");
    }, []);
    useEffect(() => {
        const p = ref.current;
        if (!p) return;
        const abre = (e: Event) => {
            const si = (e as ToggleEvent).newState === "open";
            document.querySelectorAll('[popovertarget="es-widgets"]').forEach((b) => b.setAttribute("aria-expanded", String(si)));
            if (si) void cargar();
        };
        p.addEventListener("beforetoggle", abre);
        return () => p.removeEventListener("beforetoggle", abre);
    }, [cargar]);
    const hora = ahora ? Number(new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(ahora)) : 12;
    return (
        <div ref={ref} id="es-widgets" popover="auto" className="es-flota es-widgets" role="dialog" aria-label="Widgets">
            <header className="wi-cab"><b>{SALUDO(hora)}</b>{ahora && <span>{HORA.format(ahora)}</span>}</header>
            <section className="wi-tarjeta wi-clima" aria-label="Clima en Santiago">
                {clima ? (
                    <>
                        <div className="wi-clima-ahora">
                            <IconoTiempo codigo={clima.weatherCode} dia={clima.isDay} size={44} />
                            <b>{Math.round(clima.temperature)}°</b>
                            <span><strong>{clima.weatherLabel}</strong>Santiago</span>
                        </div>
                        <ul className="wi-pronostico">
                            {clima.forecast.slice(0, 4).map((d) => (
                                <li key={d.dayLabel}><small>{d.dayLabel}</small><IconoTiempo codigo={d.weatherCode} size={22} /><span>{Math.round(d.tempMax)}°<i>{Math.round(d.tempMin)}°</i></span></li>
                            ))}
                        </ul>
                    </>
                ) : <p className="wi-vacio">El clima no respondió. Vuelve a abrir los widgets en un rato.</p>}
            </section>
            <section className="wi-tarjeta" aria-label="Indicadores">
                <h3>Indicadores</h3>
                {mercado === "error" ? <p className="wi-vacio">El mercado no respondió ahora.</p> : !mercado ? <p className="wi-vacio" aria-busy="true">Cargando…</p> : (
                    <ul className="wi-mercado">
                        {mercado.slice(0, 5).map((i) => (
                            <li key={i.id}>
                                <span>{i.name}</span><b>{precio(i)}</b>
                                {i.trend !== "flat" && <small data-tendencia={i.trend}>{i.trend === "up" ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}{Math.abs(i.changePercent).toFixed(2).replace(".", ",")} %</small>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section className="wi-tarjeta" aria-label="Titulares">
                <h3>Titulares</h3>
                {noticias === "error" ? <p className="wi-vacio">Las fuentes no respondieron ahora.</p> : !noticias ? <p className="wi-vacio" aria-busy="true">Cargando…</p> : (
                    <ul className="wi-titulares">
                        {noticias.slice(0, 4).map((n) => <li key={n.id}><a href={n.url} target="_blank" rel="noopener noreferrer"><small>{n.source}</small>{n.title}</a></li>)}
                    </ul>
                )}
                <button type="button" className="es-boton-chico" onClick={() => { ref.current?.hidePopover(); alNoticias(); }}>Más en Noticias<ChevronRight size={14} aria-hidden="true" /></button>
            </section>
        </div>
    );
}
