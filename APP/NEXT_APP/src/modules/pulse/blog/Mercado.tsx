"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChartCandlestick, X } from "lucide-react";
import type { CriptoDetalle, CriptoResumen, CriptoVivo, Operacion } from "@/app/api/pulse/cripto/route";

/**
 * El mercado, para mirarlo de cerca.
 *
 * El panel del blog enseña dos valores; aquí caben las veinticuatro primeras por
 * capitalización, y al elegir una se abre su ficha: el histórico dibujado —con el dedo o
 * el ratón encima se lee el precio de cada punto—, sus máximos y mínimos, y las últimas
 * operaciones, que es donde se ve quién compra y quién vende ahora mismo.
 *
 * Todos los datos vienen de `/api/pulse/cripto`, nunca del navegador a un tercero.
 *
 * El diálogo se pinta con un portal en `document.body`. No es manía: el panel del que
 * cuelga vive dentro de un `aside` pegajoso, y `position: sticky` crea contexto de
 * apilado, así que el modal quedaba encerrado ahí dentro y ni la barra de navegación ni
 * la cápsula del tiempo se quedaban debajo, por mucho z-index que se le pusiera.
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

/**
 * El logo de la moneda, con red debajo. Si el CDN de CoinGecko no responde —pasa, y
 * limita por ráfagas—, en vez de quedar el icono roto del navegador se ve la inicial
 * del símbolo sobre un círculo.
 */
function Logo({ src, simbolo, tam = 24 }: { src: string; simbolo: string; tam?: number }) {
  const [roto, setRoto] = useState(false);
  if (!src || roto) {
    return (
      <span className="mrc-logo mrc-logo-letra" style={{ width: tam, height: tam, fontSize: tam * 0.45 }} aria-hidden="true">
        {simbolo.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      className="mrc-logo"
      src={src}
      alt=""
      width={tam}
      height={tam}
      loading="lazy"
      onError={() => setRoto(true)}
    />
  );
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

/**
 * El histórico, dibujado en lienzo, con ejes y lectura bajo el dedo.
 *
 * Se repinta cuando cambia lo que se ve —la serie, el rango, el punto señalado o el
 * precio en vivo—, y nada más. El precio en vivo llega cada ocho segundos, así que eso
 * son ocho segundos entre repintados, no uno por fotograma.
 */
function Grafico({
  puntos,
  rango,
  sube,
  precioVivo,
}: {
  puntos: Array<{ t: number; v: number }>;
  rango: string;
  sube: boolean;
  precioVivo: number | null;
}) {
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
      // El precio en vivo, marcado sobre la serie: dice de un vistazo si está por encima
      // o por debajo de donde ha estado el rango entero.
      if (precioVivo !== null && precioVivo >= min && precioVivo <= max) {
        const yv = y(precioVivo);
        g.strokeStyle = "#ffffff38";
        g.setLineDash([2, 4]);
        g.beginPath();
        g.moveTo(pad, yv);
        g.lineTo(W - pad, yv);
        g.stroke();
        g.setLineDash([]);
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
  }, [puntos, sube, mirando, precioVivo]);

  const situar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - caja.left - 10) / Math.max(1, caja.width - 20);
    setMirando(Math.max(0, Math.min(puntos.length - 1, Math.round(rel * (puntos.length - 1)))));
  };

  const punto = mirando !== null ? puntos[mirando] : null;
  const vs = puntos.map((x) => x.v);
  const alto = vs.length ? Math.max(...vs) : null;
  const bajo = vs.length ? Math.min(...vs) : null;
  // La etiqueta sigue al punto señalado y se aparta del borde para no salirse.
  const izquierda = mirando !== null && puntos.length > 1 ? (mirando / (puntos.length - 1)) * 100 : 0;

  return (
    <div className="mrc-grafico">
      <div className="mrc-eje-y" aria-hidden="true">
        <span>{alto !== null ? dinero(alto) : ""}</span>
        <span>{bajo !== null ? dinero(bajo) : ""}</span>
      </div>
      <div className="mrc-lienzo">
        <canvas
          ref={lienzo}
          onPointerMove={situar}
          onPointerDown={situar}
          onPointerLeave={() => setMirando(null)}
          role="img"
          aria-label={`Histórico de ${rango}`}
        />
        {punto ? (
          <div
            className="mrc-globo"
            style={{ left: `${izquierda}%`, transform: `translateX(${izquierda > 72 ? "-100%" : izquierda < 28 ? "0" : "-50%"})` }}
          >
            <strong>{dinero(punto.v)}</strong>
            <span>{fechaPunto(punto.t, rango)}</span>
          </div>
        ) : null}
      </div>
      <div className="mrc-eje-x" aria-hidden="true">
        <span>{puntos.length ? fechaPunto(puntos[0].t, rango) : ""}</span>
        <span className="mrc-pista">pasa el dedo o el ratón por encima</span>
        <span>{puntos.length ? fechaPunto(puntos[puntos.length - 1].t, rango) : ""}</span>
      </div>
    </div>
  );
}

/**
 * El pulso del activo mientras la ficha está abierta.
 *
 * Pide solo lo que cambia a `/api/pulse/cripto?vivo=1` cada ocho segundos, y con tres
 * frenos que importan: nada cuando la pestaña no se ve, nada cuando la ficha se cierra,
 * y una sola llamada a la fuente por ventana de caché del servidor aunque haya muchas
 * fichas abiertas. Ocho segundos es lo que tarda en notarse el cambio sin convertir la
 * página en una ametralladora de peticiones.
 */
const CADA = 8000;

function useVivo(id: string, activo: boolean) {
  const [vivo, setVivo] = useState<CriptoVivo | null>(null);
  const [direccion, setDireccion] = useState<"sube" | "baja" | null>(null);
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) return;
    let enPie = true;
    let reloj: number | null = null;
    let control: AbortController | null = null;

    const pedir = async () => {
      if (document.hidden) return;
      control?.abort();
      control = new AbortController();
      try {
        const r = await fetch(`/api/pulse/cripto?id=${encodeURIComponent(id)}&vivo=1`, { signal: control.signal });
        if (!r.ok) return;
        const d = (await r.json()) as CriptoVivo;
        if (!enPie) return;
        if (d.precio !== null && anterior.current !== null && d.precio !== anterior.current) {
          setDireccion(d.precio > anterior.current ? "sube" : "baja");
        }
        if (d.precio !== null) anterior.current = d.precio;
        setVivo(d);
      } catch {
        /* una ronda perdida no rompe nada: la siguiente lo arregla */
      }
    };

    const arrancar = () => {
      if (reloj !== null) return;
      void pedir();
      reloj = window.setInterval(pedir, CADA);
    };
    const parar = () => {
      if (reloj !== null) window.clearInterval(reloj);
      reloj = null;
      control?.abort();
      control = null;
    };
    const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar());

    arrancar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      enPie = false;
      parar();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [id, activo]);

  // El destello del precio dura lo justo para verse y no se queda pegado.
  useEffect(() => {
    if (!direccion) return;
    const reloj = window.setTimeout(() => setDireccion(null), 900);
    return () => window.clearTimeout(reloj);
  }, [direccion, vivo]);

  return { vivo, direccion };
}

/** «hace 3 s», que es lo que dice si el dato está fresco. */
function Antiguedad({ momento }: { momento: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(reloj);
  }, []);
  const s = Math.max(0, Math.round((ahora - momento) / 1000));
  return <span className="mrc-antiguedad">{s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`}</span>;
}

function Ficha({ id, alVolver }: { id: string; alVolver: () => void }) {
  const [rango, setRango] = useState<"1" | "7" | "30" | "365">("7");
  const [datos, setDatos] = useState<CriptoDetalle | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "fallo">("cargando");
  const { vivo, direccion } = useVivo(id, estado === "listo");

  useEffect(() => {
    let enPie = true;
    setEstado((e) => (e === "listo" ? e : "cargando"));
    fetch(`/api/pulse/cripto?id=${encodeURIComponent(id)}&rango=${rango}`, { signal: AbortSignal.timeout(12_000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CriptoDetalle) => {
        if (!enPie) return;
        setDatos(d);
        setEstado("listo");
      })
      .catch(() => enPie && setEstado((e) => (e === "listo" ? e : "fallo")));
    return () => {
      enPie = false;
    };
  }, [id, rango]);

  const r = datos?.resumen;
  // Lo de Binance manda cuando está; lo de CoinGecko es el respaldo.
  const precio = vivo?.precio ?? r?.precio ?? null;
  const cambio = vivo?.cambio24h ?? r?.cambio24h ?? null;
  const maximo = vivo?.maximo24h ?? r?.maximo24h ?? null;
  const minimo = vivo?.minimo24h ?? r?.minimo24h ?? null;
  const volumen = vivo?.volumen ?? r?.volumen ?? null;
  const sube = (cambio ?? 0) >= 0;
  const operaciones = vivo?.operaciones?.length ? vivo.operaciones : (datos?.operaciones ?? []);
  const enVivo = Boolean(vivo && vivo.precio !== null);

  // La presión llega calculada del servidor sobre la muestra completa; la cuenta local
  // es solo el respaldo, y con doce operaciones no diría gran cosa.
  const presion = vivo?.presion ?? datos?.presion ?? 50;

  // Dónde está el precio dentro del recorrido del día: 0 en el mínimo, 100 en el máximo.
  const posicionDia =
    precio !== null && maximo !== null && minimo !== null && maximo > minimo
      ? Math.min(100, Math.max(0, ((precio - minimo) / (maximo - minimo)) * 100))
      : null;

  return (
    <div className="mrc-ficha">
      <div className="mrc-ficha-cab">
        <button type="button" className="mrc-volver" onClick={alVolver}>
          <ArrowLeft aria-hidden="true" width={15} height={15} />
          Todas
        </button>
        {r ? (
          <div className="mrc-ficha-titulo">
            <Logo src={r.imagen} simbolo={r.simbolo} tam={34} />
            <div className="mrc-ficha-nombre">
              <strong>{r.nombre}</strong>
              <span>{r.simbolo} · USD</span>
            </div>
            <div className="mrc-ficha-precio">
              <strong data-destello={direccion ?? undefined}>{precio !== null ? dinero(precio) : "—"}</strong>
              <span className={sube ? "sube" : "baja"}>
                {cambio !== null ? `${cambio >= 0 ? "+" : ""}${cambio.toFixed(2)}% · 24 h` : "sin dato de 24 h"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {posicionDia !== null && minimo !== null && maximo !== null ? (
        <div className="mrc-dia">
          <div className="mrc-dia-cab">
            <span>Recorrido del día</span>
            {enVivo && vivo ? (
              <span className="mrc-envivo">
                <i aria-hidden="true" />
                en vivo · <Antiguedad momento={vivo.momento} />
              </span>
            ) : null}
          </div>
          <div className="mrc-dia-barra">
            <span className="mrc-dia-relleno" style={{ width: `${posicionDia}%` }} />
            <span className="mrc-dia-marca" style={{ left: `${posicionDia}%` }} aria-hidden="true" />
          </div>
          <div className="mrc-dia-pie">
            <span>{dinero(minimo)}</span>
            <span>{dinero(maximo)}</span>
          </div>
        </div>
      ) : null}

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
          <Grafico puntos={datos.puntos} rango={datos.rango} sube={sube} precioVivo={precio} />

          <dl className="mrc-datos">
            <div>
              <dt>Máximo 24 h</dt>
              <dd>{maximo !== null ? dinero(maximo) : "—"}</dd>
            </div>
            <div>
              <dt>Mínimo 24 h</dt>
              <dd>{minimo !== null ? dinero(minimo) : "—"}</dd>
            </div>
            <div>
              <dt>Volumen 24 h</dt>
              <dd>{volumen !== null ? `${compacto(volumen)} USD` : "—"}</dd>
            </div>
            <div>
              <dt>Capitalización</dt>
              <dd>{r ? `${compacto(r.capitalizacion)} USD` : "—"}</dd>
            </div>
          </dl>

          <div className="mrc-libro">
            <div className="mrc-libro-cab">
              <h4>Últimas operaciones</h4>
              {operaciones.length > 0 ? (
                <span className="mrc-envivo">
                  <i aria-hidden="true" />
                  Binance
                </span>
              ) : null}
            </div>
            {operaciones.length === 0 ? (
              <p className="mrc-vacio">Este par no cotiza contra USDT en la fuente de operaciones.</p>
            ) : (
              <>
                <div
                  className="mrc-presion"
                  role="img"
                  aria-label={`${presion.toFixed(0)}% del volumen reciente son compras`}
                >
                  <span className="compra" style={{ width: `${presion}%` }} />
                  <span className="venta" style={{ width: `${100 - presion}%` }} />
                </div>
                <p className="mrc-presion-pie">
                  <span className="compra">{presion.toFixed(0)}% compras</span>
                  <span className="venta">{(100 - presion).toFixed(0)}% ventas</span>
                </p>
                <ul className="mrc-operaciones">
                  {operaciones.slice(0, 12).map((o: Operacion, i: number) => (
                    <li key={`${o.hora}-${o.precio}-${i}`} data-tipo={o.compra ? "compra" : "venta"}>
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

  /** Aviso para que la cápsula del tiempo se aparte: dos paneles abiertos a la vez sobran. */
  const cerrarOtros = () => window.dispatchEvent(new CustomEvent("pulso:cerrar-paneles", { detail: "mercado" }));

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
      <button ref={disparador} type="button" className="mrc-abrir" onClick={() => { cerrarOtros(); setAbierto(true); }} aria-haspopup="dialog">
        <ChartCandlestick aria-hidden="true" width={14} height={14} />
        Ver el mercado
      </button>

      {abierto && typeof document !== "undefined"
        ? createPortal(
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
                      <Logo src={m.imagen} simbolo={m.simbolo} />
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
        </div>,
        document.body,
          )
        : null}
    </>
  );
}
