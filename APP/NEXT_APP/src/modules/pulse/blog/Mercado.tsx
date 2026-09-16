"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ChartCandlestick, X } from "lucide-react";
import type { CriptoDetalle, CriptoResumen } from "@/app/api/pulse/cripto/route";

/**
 * El mercado, para mirarlo de cerca.
 *
 * El panel del blog enseña dos valores; aquí caben las veinticuatro primeras por
 * capitalización, y al elegir una se abre su ficha: el histórico dibujado —con el dedo o
 * el ratón encima se lee el precio de cada punto—, sus máximos y mínimos, y las últimas
 * operaciones, que es donde se ve quién compra y quién vende ahora mismo.
 *
 * Todos los datos vienen de `/api/pulse/cripto`, nunca del navegador a un tercero.
 */

const RANGOS: Array<{ id: "1" | "7" | "30" | "365"; nombre: string }> = [
  { id: "1", nombre: "24 h" },
  { id: "7", nombre: "7 d" },
  { id: "30", nombre: "30 d" },
  { id: "365", nombre: "1 año" },
];

function dinero(n: number, moneda = "USD") {
  const decimales = n >= 1000 ? 0 : n >= 1 ? 2 : 6;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}

function cantidad(n: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: n < 1 ? 5 : 3 }).format(n);
}

function compacto(n: number) {
  return new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function hora(ms: number) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(ms));
}

function fechaPunto(ms: number, rango: string) {
  return new Intl.DateTimeFormat("es-CL",
    rango === "1"
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : rango === "365"
        ? { month: "short", year: "numeric" }
        : { day: "2-digit", month: "short" },
  ).format(new Date(ms));
}

/** Línea de 7 días para la lista: el dibujo mínimo que dice si sube o baja. */
function Chispa({ valores, sube }: { valores: number[]; sube: boolean }) {
  if (valores.length < 2) return <span className="mrc-chispa" />;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const d = valores
    .map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - ((v - min) / rango) * 26}`)
    .join(" ");
  return (
    <svg className="mrc-chispa" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={d} fill="none" stroke={sube ? "var(--p-teal)" : "#f87171"} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** El histórico, dibujado en lienzo y con lectura bajo el dedo. */
function Grafico({ puntos, rango, sube }: { puntos: Array<{ t: number; v: number }>; rango: string; sube: boolean }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [mirando, setMirando] = useState<number | null>(null);

  useEffect(() => {
    const c = lienzo.current;
    if (!c || puntos.length < 2) return;
    const dibujar = () => {
      const caja = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(caja.width * dpr);
      c.height = Math.round(caja.height * dpr);
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = caja.width;
      const H = caja.height;
      const pad = 10;
      const vs = puntos.map((p) => p.v);
      const min = Math.min(...vs);
      const max = Math.max(...vs);
      const amplitud = max - min || 1;
      const x = (i: number) => pad + (i / (puntos.length - 1)) * (W - pad * 2);
      const y = (v: number) => H - pad - ((v - min) / amplitud) * (H - pad * 2);
      const color = sube ? "#2dd4bf" : "#f87171";

      g.clearRect(0, 0, W, H);
      // Tres guías horizontales: sitúan el precio sin llenar el dibujo de números.
      g.strokeStyle = "#ffffff12";
      g.lineWidth = 1;
      for (let i = 0; i <= 2; i++) {
        const yy = pad + ((H - pad * 2) / 2) * i;
        g.beginPath();
        g.moveTo(pad, yy);
        g.lineTo(W - pad, yy);
        g.stroke();
      }
      // Relleno bajo la línea.
      const degradado = g.createLinearGradient(0, pad, 0, H);
      degradado.addColorStop(0, `${color}44`);
      degradado.addColorStop(1, `${color}00`);
      g.beginPath();
      g.moveTo(x(0), H - pad);
      puntos.forEach((p, i) => g.lineTo(x(i), y(p.v)));
      g.lineTo(x(puntos.length - 1), H - pad);
      g.closePath();
      g.fillStyle = degradado;
      g.fill();
      // La línea.
      g.beginPath();
      puntos.forEach((p, i) => (i === 0 ? g.moveTo(x(i), y(p.v)) : g.lineTo(x(i), y(p.v))));
      g.strokeStyle = color;
      g.lineWidth = 1.8;
      g.lineJoin = "round";
      g.stroke();
      // Lo que se está mirando.
      if (mirando !== null && puntos[mirando]) {
        const px = x(mirando);
        const py = y(puntos[mirando].v);
        g.strokeStyle = "#ffffff40";
        g.setLineDash([3, 3]);
        g.beginPath();
        g.moveTo(px, pad);
        g.lineTo(px, H - pad);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = color;
        g.beginPath();
        g.arc(px, py, 4, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#0b0f14";
        g.lineWidth = 2;
        g.stroke();
      }
    };
    dibujar();
    const observador = new ResizeObserver(dibujar);
    observador.observe(c);
    return () => observador.disconnect();
  }, [puntos, sube, mirando]);

  const situar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - caja.left - 10) / Math.max(1, caja.width - 20);
    setMirando(Math.max(0, Math.min(puntos.length - 1, Math.round(rel * (puntos.length - 1)))));
  };

  const punto = mirando !== null ? puntos[mirando] : null;

  return (
    <div className="mrc-grafico">
      <canvas
        ref={lienzo}
        onPointerMove={situar}
        onPointerDown={situar}
        onPointerLeave={() => setMirando(null)}
        role="img"
        aria-label={`Histórico de ${rango}`}
      />
      <p className="mrc-lectura" aria-live="polite">
        {punto ? (
          <>
            <strong>{dinero(punto.v)}</strong>
            <span>{fechaPunto(punto.t, rango)}</span>
          </>
        ) : (
          <span className="mrc-pista">Pasa el dedo o el ratón por encima para leer cada punto</span>
        )}
      </p>
    </div>
  );
}

function Ficha({ id, alVolver }: { id: string; alVolver: () => void }) {
  const [rango, setRango] = useState<"1" | "7" | "30" | "365">("7");
  const [datos, setDatos] = useState<CriptoDetalle | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "fallo">("cargando");

  useEffect(() => {
    let vivo = true;
    setEstado((e) => (e === "listo" ? e : "cargando"));
    fetch(`/api/pulse/cripto?id=${encodeURIComponent(id)}&rango=${rango}`, { signal: AbortSignal.timeout(12_000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CriptoDetalle) => {
        if (!vivo) return;
        setDatos(d);
        setEstado("listo");
      })
      .catch(() => vivo && setEstado((e) => (e === "listo" ? e : "fallo")));
    return () => {
      vivo = false;
    };
  }, [id, rango]);

  const r = datos?.resumen;
  const sube = (r?.cambio24h ?? 0) >= 0;
  const compras = datos?.operaciones.filter((o) => o.compra) ?? [];
  const ventas = datos?.operaciones.filter((o) => !o.compra) ?? [];
  const volCompra = compras.reduce((a, o) => a + o.precio * o.cantidad, 0);
  const volVenta = ventas.reduce((a, o) => a + o.precio * o.cantidad, 0);
  const presion = volCompra + volVenta > 0 ? (volCompra / (volCompra + volVenta)) * 100 : 50;

  return (
    <div className="mrc-ficha">
      <div className="mrc-ficha-cab">
        <button type="button" className="mrc-volver" onClick={alVolver}>
          <ArrowLeft aria-hidden="true" width={15} height={15} />
          Todas
        </button>
        {r ? (
          <div className="mrc-ficha-titulo">
            {r.imagen ? <img src={r.imagen} alt="" width={26} height={26} loading="lazy" /> : null}
            <div>
              <strong>{r.nombre}</strong>
              <span>{r.simbolo}</span>
            </div>
            <div className="mrc-ficha-precio">
              <strong>{dinero(r.precio)}</strong>
              <span className={sube ? "sube" : "baja"}>
                {r.cambio24h >= 0 ? "+" : ""}
                {r.cambio24h.toFixed(2)}% · 24 h
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mrc-rangos" role="group" aria-label="Rango del histórico">
        {RANGOS.map((x) => (
          <button key={x.id} type="button" className="mrc-rango" aria-pressed={rango === x.id} onClick={() => setRango(x.id)}>
            {x.nombre}
          </button>
        ))}
      </div>

      {estado === "fallo" && !datos ? (
        <p className="pulso-fallo">La fuente de mercado no responde ahora mismo. Vuelve en unos minutos.</p>
      ) : !datos ? (
        <div className="mrc-esqueleto" aria-hidden="true" />
      ) : (
        <>
          <Grafico puntos={datos.puntos} rango={datos.rango} sube={sube} />

          {r ? (
            <dl className="mrc-datos">
              <div>
                <dt>Máximo 24 h</dt>
                <dd>{dinero(r.maximo24h)}</dd>
              </div>
              <div>
                <dt>Mínimo 24 h</dt>
                <dd>{dinero(r.minimo24h)}</dd>
              </div>
              <div>
                <dt>Volumen 24 h</dt>
                <dd>{compacto(r.volumen)} USD</dd>
              </div>
              <div>
                <dt>Capitalización</dt>
                <dd>{compacto(r.capitalizacion)} USD</dd>
              </div>
            </dl>
          ) : null}

          <div className="mrc-libro">
            <div className="mrc-libro-cab">
              <h4>Últimas operaciones</h4>
              {!datos.sinOperaciones ? <span className="pulso-vivo">Binance</span> : null}
            </div>
            {datos.sinOperaciones ? (
              <p className="mrc-vacio">Este par no cotiza contra USDT en la fuente de operaciones.</p>
            ) : (
              <>
                <div className="mrc-presion" title={`${presion.toFixed(0)}% del volumen reciente son compras`}>
                  <span className="compra" style={{ width: `${presion}%` }} />
                  <span className="venta" style={{ width: `${100 - presion}%` }} />
                </div>
                <p className="mrc-presion-pie">
                  <span className="compra">{presion.toFixed(0)}% compras</span>
                  <span className="venta">{(100 - presion).toFixed(0)}% ventas</span>
                </p>
                <ul className="mrc-operaciones">
                  {datos.operaciones.slice(0, 14).map((o, i) => (
                    <li key={`${o.hora}-${i}`} data-tipo={o.compra ? "compra" : "venta"}>
                      <span className="tipo">{o.compra ? "Compra" : "Venta"}</span>
                      <span className="precio">{dinero(o.precio)}</span>
                      <span className="cantidad">{cantidad(o.cantidad)}</span>
                      <span className="hora">{hora(o.hora)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Mercado() {
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const [monedas, setMonedas] = useState<CriptoResumen[]>([]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "fallo">("cargando");
  const panel = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const idPanel = useId();

  const cerrar = useCallback(() => {
    setAbierto(false);
    setElegida(null);
    disparador.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto || monedas.length > 0) return;
    let vivo = true;
    fetch("/api/pulse/cripto", { signal: AbortSignal.timeout(12_000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { monedas: CriptoResumen[] }) => {
        if (!vivo) return;
        setMonedas(d.monedas ?? []);
        setEstado("listo");
      })
      .catch(() => vivo && setEstado("fallo"));
    return () => {
      vivo = false;
    };
  }, [abierto, monedas.length]);

  useEffect(() => {
    if (!abierto) return;
    panel.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", tecla);
    // Con el modal abierto, lo que se desplaza es su contenido y no la página de detrás.
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [abierto, cerrar]);

  return (
    <>
      <button ref={disparador} type="button" className="mrc-abrir" onClick={() => setAbierto(true)} aria-haspopup="dialog">
        <ChartCandlestick aria-hidden="true" width={14} height={14} />
        Ver el mercado
      </button>

      {abierto ? (
        <div className="mrc-fondo" onClick={(e) => e.target === e.currentTarget && cerrar()}>
          <div
            ref={panel}
            id={idPanel}
            className="mrc-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Mercado de criptomonedas"
            tabIndex={-1}
          >
            <div className="mrc-panel-cab">
              <h3>{elegida ? "Ficha del activo" : "Mercado cripto"}</h3>
              <button type="button" className="pulso-cerrar" onClick={cerrar} aria-label="Cerrar">
                <X aria-hidden="true" width={16} height={16} />
              </button>
            </div>

            {elegida ? (
              <Ficha id={elegida} alVolver={() => setElegida(null)} />
            ) : estado === "fallo" ? (
              <p className="pulso-fallo">La fuente de mercado no responde ahora mismo. Vuelve en unos minutos.</p>
            ) : monedas.length === 0 ? (
              <div className="mrc-esqueleto" aria-hidden="true" />
            ) : (
              <ul className="mrc-lista">
                {monedas.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setElegida(m.id)}>
                      {m.imagen ? <img src={m.imagen} alt="" width={24} height={24} loading="lazy" /> : null}
                      <span className="mrc-nombre">
                        <strong>{m.simbolo}</strong>
                        <small>{m.nombre}</small>
                      </span>
                      <Chispa valores={m.chispa} sube={m.cambio24h >= 0} />
                      <span className="mrc-precio">
                        <strong>{dinero(m.precio)}</strong>
                        <small className={m.cambio24h >= 0 ? "sube" : "baja"}>
                          {m.cambio24h >= 0 ? "+" : ""}
                          {m.cambio24h.toFixed(2)}%
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mrc-pie">
              Datos de CoinGecko y Binance, con unos segundos de retraso. Información de mercado, no asesoría financiera.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
