"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Clock3, CloudSun, LocateFixed, Sun, Wind, X } from "lucide-react";
import type { PulseContextData } from "@/modules/pulse/types";

const CIUDAD_POR_DEFECTO = "Santiago";

type Estado = "cargando" | "listo" | "fallo";

/**
 * Cápsula de tiempo y hora: una píldora que, al pulsarla, se abre en su mismo sitio
 * con el detalle del día y los tres siguientes.
 *
 * Es el elemento del blog que se conserva tal cual del diseño anterior; lo que cambia
 * es el teclado (se cierra con Escape y devuelve el foco), el aviso a los lectores de
 * pantalla y que la ubicación ya no se adivina a partir de la IP: o la da el navegador
 * con permiso, o se escribe la ciudad.
 */
export function Capsula() {
  const [datos, setDatos] = useState<PulseContextData | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [abierta, setAbierta] = useState(false);
  const [ciudad, setCiudad] = useState(CIUDAD_POR_DEFECTO);
  const [borrador, setBorrador] = useState(CIUDAD_POR_DEFECTO);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lon: number } | null>(null);
  const [ahora, setAhora] = useState<Date | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const pildora = useRef<HTMLButtonElement>(null);
  /** La píldora se oculta mientras el panel está abierto, así que el foco solo puede
   *  volver a ella después de que React la vuelva a pintar. */
  const devolverFoco = useRef(false);
  const idPanel = useId();

  const cargar = useCallback(async () => {
    setEstado((e) => (e === "listo" ? e : "cargando"));
    const parametros = coordenadas
      ? `lat=${coordenadas.lat.toFixed(4)}&lon=${coordenadas.lon.toFixed(4)}`
      : `city=${encodeURIComponent(ciudad)}`;
    try {
      const respuesta = await fetch(`/api/pulse/context?${parametros}`, { signal: AbortSignal.timeout(8000) });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      const cuerpo = (await respuesta.json()) as { data: PulseContextData };
      setDatos(cuerpo.data);
      setEstado("listo");
    } catch {
      setEstado((e) => (e === "listo" ? e : "fallo"));
    }
  }, [ciudad, coordenadas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!abierta && devolverFoco.current) {
      devolverFoco.current = false;
      pildora.current?.focus();
    }
  }, [abierta]);

  // El reloj de la ciudad, al minuto.
  useEffect(() => {
    setAhora(new Date());
    const id = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Cerrar con Escape o pulsando fuera, devolviendo el foco a la píldora.
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        devolverFoco.current = true;
        setAbierta(false);
      }
    };
    const fuera = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node) && !pildora.current?.contains(e.target as Node)) {
        setAbierta(false);
      }
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fuera);
    };
  }, [abierta]);

  const hora = ahora && datos
    ? new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: datos.timezone }).format(ahora)
    : "--:--";
  const grados = datos ? `${Math.round(datos.temperature)}°` : "--°";

  const pedirUbicacion = () => {
    if (!navigator.geolocation) return;
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoordenadas({ lat: p.coords.latitude, lon: p.coords.longitude });
        setUbicando(false);
      },
      () => setUbicando(false),
      { timeout: 8000, maximumAge: 600_000 }
    );
  };

  const buscarCiudad = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = borrador.trim();
    if (!limpio) return;
    setCoordenadas(null);
    setCiudad(limpio);
  };

  const soloHora = (valor?: string) =>
    valor ? new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(valor)) : "--:--";

  return (
    <div className="pulso-capsula">
      <button
        ref={pildora}
        type="button"
        className="pulso-capsula-pil"
        aria-expanded={abierta}
        aria-controls={idPanel}
        onClick={() => setAbierta((v) => !v)}
        style={abierta ? { visibility: "hidden" } : undefined}
      >
        <Sun aria-hidden="true" width={16} height={16} />
        <span className="grados">{grados}</span>
        <span className="raya" aria-hidden="true" />
        <span className="reloj">{hora}</span>
        <span className="sr-only">
          {datos ? `Tiempo en ${datos.city}: ${datos.weatherLabel}. Abrir detalle.` : "Abrir el detalle del tiempo"}
        </span>
      </button>

      {abierta ? (
        <div ref={panel} id={idPanel} className="pulso-panel-tiempo" role="dialog" aria-label="Tiempo y hora">
          <div className="pulso-tiempo-lugar">
            <div>
              <h2>{datos ? `${datos.city}${datos.country ? `, ${datos.country}` : ""}` : ciudad}</h2>
              <p className="estado" style={{ margin: "2px 0 0" }}>
                {estado === "fallo" ? "Sin datos ahora mismo" : datos?.weatherLabel ?? "Cargando…"}
              </p>
            </div>
            <button type="button" className="pulso-cerrar" onClick={() => { devolverFoco.current = true; setAbierta(false); }} aria-label="Cerrar">
              <X aria-hidden="true" width={16} height={16} />
            </button>
          </div>

          <p className="grados-grande" style={{ margin: "14px 0 0" }}>{grados}</p>

          <dl className="pulso-tiempo-rejilla">
            <div className="pulso-tiempo-celda">
              <dt><Wind aria-hidden="true" width={13} height={13} /> Viento</dt>
              <dd>{datos ? `${Math.round(datos.windSpeed)} km/h` : "--"}</dd>
            </div>
            <div className="pulso-tiempo-celda">
              <dt><CloudSun aria-hidden="true" width={13} height={13} /> Máx / mín</dt>
              <dd>{datos?.forecast?.[0] ? `${Math.round(datos.forecast[0].tempMax)}° / ${Math.round(datos.forecast[0].tempMin)}°` : "--"}</dd>
            </div>
            <div className="pulso-tiempo-celda">
              <dt><Sun aria-hidden="true" width={13} height={13} /> Amanece</dt>
              <dd>{soloHora(datos?.sunrise)}</dd>
            </div>
            <div className="pulso-tiempo-celda">
              <dt><Clock3 aria-hidden="true" width={13} height={13} /> Oscurece</dt>
              <dd>{soloHora(datos?.sunset)}</dd>
            </div>
          </dl>

          {datos?.forecast?.length ? (
            <div className="pulso-tiempo-dias">
              {datos.forecast.slice(0, 3).map((d) => (
                <div key={d.dayLabel} className="pulso-tiempo-dia">
                  <span className="dia">{d.dayLabel}</span>
                  <span className="cielo">{d.weatherLabel}</span>
                  <span>
                    <span className="max">{Math.round(d.tempMax)}°</span> <span className="min">{Math.round(d.tempMin)}°</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <form className="pulso-ciudad" onSubmit={buscarCiudad}>
            <input
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              aria-label="Ciudad"
              placeholder="Otra ciudad"
              maxLength={60}
            />
            <button type="submit" className="pulso-pag">Ver</button>
            <button type="button" className="pulso-pag" onClick={pedirUbicacion} aria-label="Usar mi ubicación" title="Usar mi ubicación">
              <LocateFixed aria-hidden="true" width={15} height={15} />
              {ubicando ? "…" : null}
            </button>
          </form>
          <p className="pulso-aviso" role="status">
            {estado === "fallo"
              ? "El servicio del tiempo no responde; vuelve a intentarlo en un momento."
              : "La ubicación solo se usa para el tiempo y no se guarda."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
