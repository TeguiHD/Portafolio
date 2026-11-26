"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { IconoTiempo } from "./IconoTiempo";
import { useMateria } from "@/modules/materia/Materia";
import { climaDe } from "./clima";
import type { PulseContextData } from "@/modules/pulse/types";
import "./capsula.css";

const CIUDAD_POR_DEFECTO = "Santiago";

type Estado = "cargando" | "listo" | "fallo";

// climaDe vive en ./clima: también lo usa el fondo «Clima de Santiago» del modo escritorio.
export { climaDe } from "./clima";

/** «2026-11-17T06:30» (hora local del lugar, como la entrega Open-Meteo) → minutos desde la medianoche. */
function minutosDe(iso?: string): number | null {
  const m = iso ? /T(\d{2}):(\d{2})/.exec(iso) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
const hhmm = (iso?: string) => (iso ? /T(\d{2}:\d{2})/.exec(iso)?.[1] ?? "--:--" : "--:--");

/** El día como un arco: el sol recorre de amanecer a oscurecer; de noche, la luna espera en un extremo. */
function Arco({ datos, ahora }: { datos: PulseContextData; ahora: Date | null }) {
  const sale = minutosDe(datos.sunrise), pone = minutosDe(datos.sunset);
  let minutos: number | null = null;
  if (ahora) {
    const partes = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: datos.timezone }).formatToParts(ahora);
    const h = Number(partes.find((p) => p.type === "hour")?.value), m = Number(partes.find((p) => p.type === "minute")?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) minutos = (h % 24) * 60 + m;
  }
  if (sale === null || pone === null || pone <= sale) return null;
  const dia = minutos !== null && minutos >= sale && minutos <= pone;
  const p = minutos === null ? 0 : Math.min(1, Math.max(0, (minutos - sale) / (pone - sale)));
  const x = 120 - 104 * Math.cos(Math.PI * p), y = 92 - 104 * Math.sin(Math.PI * p);
  return (
    <div className="cp-arco" data-dia={dia || undefined}>
      <svg viewBox="0 0 240 100" aria-hidden="true">
        <path className="cp-arco-via" d="M16 92A104 104 0 0 1 224 92" pathLength={1} />
        <path className="cp-arco-hecho" d="M16 92A104 104 0 0 1 224 92" pathLength={1} style={{ strokeDasharray: `${dia ? p : minutos !== null && minutos > pone ? 1 : 0} 1` }} />
        <line className="cp-arco-suelo" x1="4" y1="92" x2="236" y2="92" />
        <circle className="cp-astro-halo" cx={x} cy={y} r="15" />
        <circle className="cp-astro" cx={x} cy={y} r="6.5" />
      </svg>
      <p><span>Amanece <b>{hhmm(datos.sunrise)}</b></span><span>{dia ? "" : "De noche"}</span><span>Oscurece <b>{hhmm(datos.sunset)}</b></span></p>
    </div>
  );
}

/**
 * Cápsula del tiempo: la píldora con grados y hora que, al pulsarla, abre debajo el detalle del día y los dos
 * siguientes. Mientras está abierta, la materia de la página hace de ese clima.
 * La ubicación no se adivina por la IP: o la da el navegador con permiso, o se escribe la ciudad.
 */
export function Capsula() {
  const motor = useMateria();
  const [datos, setDatos] = useState<PulseContextData | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [abierta, setAbierta] = useState(false);
  const [ciudad, setCiudad] = useState(CIUDAD_POR_DEFECTO);
  const [borrador, setBorrador] = useState(CIUDAD_POR_DEFECTO);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lon: number } | null>(null);
  const [ahora, setAhora] = useState<Date | null>(null);
  const [ubicando, setUbicando] = useState(false);
  /** Lo que salió mal en el último pedido de quien visita (ciudad que no existe, ubicación negada), dicho en la nota. */
  const [aviso, setAviso] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pildora = useRef<HTMLButtonElement>(null);
  const idPanel = useId();

  const cargar = useCallback(async () => {
    setEstado((e) => (e === "listo" ? e : "cargando"));
    const parametros = coordenadas
      ? `lat=${coordenadas.lat.toFixed(4)}&lon=${coordenadas.lon.toFixed(4)}`
      : `city=${encodeURIComponent(ciudad)}`;
    try {
      const respuesta = await fetch(`/api/pulse/context?${parametros}`, { signal: AbortSignal.timeout(8000) });
      // Antes, una ciudad que no existe dejaba el panel igual que estaba, sin decir nada.
      if (respuesta.status === 404 && !coordenadas) {
        setAviso(`No encontré «${ciudad}». Prueba con otro nombre.`);
        setEstado((e) => (e === "listo" ? e : "fallo"));
        return;
      }
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      const cuerpo = (await respuesta.json()) as { data: PulseContextData };
      setDatos(cuerpo.data);
      setEstado("listo");
      setAviso(null);
    } catch {
      setEstado((e) => (e === "listo" ? e : "fallo"));
      setAviso("El servicio del tiempo no responde; vuelve a intentarlo en un momento.");
    }
  }, [ciudad, coordenadas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // La materia hace de clima solo mientras el panel está abierto.
  useEffect(() => {
    if (!motor) return;
    motor.clima(abierta && datos ? climaDe(datos.weatherCode, datos.isDay) : null);
  }, [motor, abierta, datos]);
  useEffect(() => () => motor?.clima(null), [motor]);

  // Si se abre otro panel (el del mercado), este se aparta: dos a la vez sobran.
  useEffect(() => {
    const apartarse = () => setAbierta(false);
    window.addEventListener("pulso:cerrar-paneles", apartarse);
    return () => window.removeEventListener("pulso:cerrar-paneles", apartarse);
  }, []);

  // El reloj de la ciudad, al minuto.
  useEffect(() => {
    setAhora(new Date());
    const id = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const cerrar = useCallback((devolver: boolean) => {
    setAbierta(false);
    if (devolver) pildora.current?.focus();
  }, []);

  // Cerrar con Escape (el foco vuelve a la píldora) o con un clic fuera. Clic y no pointerdown: en el celular, apoyar el
  // dedo para desplazar también es pointerdown, y cerraba el panel (y el clima) al empezar a bajar.
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(true); };
    const fuera = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node) && !pildora.current?.contains(e.target as Node)) cerrar(false);
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("click", fuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("click", fuera);
    };
  }, [abierta, cerrar]);

  const hora = ahora && datos
    ? new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: datos.timezone }).format(ahora)
    : "--:--";
  const grados = datos ? String(Math.round(datos.temperature)) : "--";
  const hoy = datos?.forecast?.[0];

  const pedirUbicacion = () => {
    if (!navigator.geolocation) {
      setAviso("Este navegador no entrega la ubicación: escribe la ciudad.");
      return;
    }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoordenadas({ lat: p.coords.latitude, lon: p.coords.longitude });
        setUbicando(false);
      },
      // Sin permiso (o sin señal) el botón no puede quedarse callado: se dice y se ofrece la otra vía.
      (error) => {
        setUbicando(false);
        setAviso(error.code === error.PERMISSION_DENIED
          ? "Sin permiso para usar tu ubicación: escribe la ciudad."
          : "No se pudo obtener tu ubicación: escribe la ciudad.");
      },
      { timeout: 8000, maximumAge: 600_000 }
    );
  };

  const buscarCiudad = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = borrador.trim();
    if (!limpio) return;
    setAviso(null);
    setCoordenadas(null);
    // La misma ciudad de antes no cambia `ciudad` y no volvería a pedir: se pide igual (p. ej. tras un fallo).
    if (limpio === ciudad && !coordenadas) void cargar();
    else setCiudad(limpio);
  };

  return (
    <div className="cp">
      <button
        ref={pildora}
        type="button"
        className="cp-pildora"
        aria-expanded={abierta}
        aria-controls={idPanel}
        onClick={() => setAbierta((v) => !v)}
      >
        <IconoTiempo codigo={datos?.weatherCode ?? 0} dia={datos?.isDay ?? true} size={18} />
        <span className="cp-pildora-grados">{grados}°</span>
        <span className="cp-pildora-hora">{hora}</span>
        <span className="sr-only">
          {datos ? `Tiempo en ${datos.city}: ${datos.weatherLabel}. Abrir detalle.` : "Abrir el detalle del tiempo"}
        </span>
      </button>

      {abierta ? (
        <div ref={panel} id={idPanel} className="cp-panel" role="dialog" aria-label="Tiempo y hora">
          <header className="cp-cab">
            <div>
              <h2>{datos ? `${datos.city}${datos.country ? `, ${datos.country}` : ""}` : ciudad}</h2>
              <p>{estado === "fallo" ? "Sin datos ahora mismo" : datos?.weatherLabel ?? "Cargando…"}</p>
            </div>
            <button type="button" className="cp-cerrar" onClick={() => cerrar(true)} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>

          <div className="cp-ahora">
            <p className="cp-grados">{grados}<span>°</span></p>
            {datos ? <IconoTiempo codigo={datos.weatherCode} dia={datos.isDay} size={92} className="it-grande" /> : null}
          </div>

          {datos ? <Arco datos={datos} ahora={ahora} /> : null}

          <p className="cp-linea">
            <span>Viento <b>{datos ? `${Math.round(datos.windSpeed)} km/h` : "--"}</b></span>
            <span>Máx <b>{hoy ? `${Math.round(hoy.tempMax)}°` : "--"}</b></span>
            <span>Mín <b>{hoy ? `${Math.round(hoy.tempMin)}°` : "--"}</b></span>
            {datos ? null : <span>Amanece <b>--:--</b></span>}
          </p>

          {datos?.forecast?.length ? (
            <ol className="cp-dias">
              {datos.forecast.slice(0, 3).map((d, i) => (
                <li key={d.dayLabel} style={{ "--k": i } as CSSProperties}>
                  <span className="cp-dia">{d.dayLabel}</span>
                  <IconoTiempo codigo={d.weatherCode} size={22} />
                  <span className="cp-cielo">{d.weatherLabel}</span>
                  <span className="cp-temp"><b>{Math.round(d.tempMax)}°</b> {Math.round(d.tempMin)}°</span>
                </li>
              ))}
            </ol>
          ) : null}

          <form className="cp-ciudad" onSubmit={buscarCiudad}>
            <input value={borrador} onChange={(e) => setBorrador(e.target.value)} aria-label="Ciudad" placeholder="Otra ciudad" maxLength={60} />
            <button type="submit">Ver</button>
            <button type="button" onClick={pedirUbicacion} aria-label="Usar mi ubicación" title="Usar mi ubicación" aria-busy={ubicando || undefined}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
            </button>
          </form>
          <p className="cp-nota" role="status">
            {aviso ?? (estado === "fallo"
              ? "El servicio del tiempo no responde; vuelve a intentarlo en un momento."
              : "La ubicación solo se usa para el tiempo y no se guarda.")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
