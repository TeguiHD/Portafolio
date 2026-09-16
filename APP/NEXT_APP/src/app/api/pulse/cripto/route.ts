import { NextResponse } from "next/server";
import { crearCache, pedirJson } from "@/modules/pulse/lib/red";

/**
 * Datos del mercado cripto para el panel del blog.
 *
 * Dos formas de preguntar:
 *  - sin parámetros: la lista de monedas con precio, variación y su serie de 7 días;
 *  - `?id=bitcoin&rango=7`: el detalle de una, con su histórico y las últimas operaciones.
 *
 * Todo pasa por aquí y no desde el navegador: así la CSP sigue permitiendo solo nuestro
 * propio origen, las claves de terceros (si algún día hacen falta) no viajan al cliente y
 * las respuestas se pueden cachear una sola vez para todas las visitas.
 */

const COINGECKO = "https://api.coingecko.com/api/v3";
const BINANCE = "https://api.binance.com/api/v3";

/** Rangos que aceptamos, con los días y el tamaño de vela que mejor los cuenta. */
const RANGOS = {
  "1": { dias: 1, etiqueta: "24 h" },
  "7": { dias: 7, etiqueta: "7 días" },
  "30": { dias: 30, etiqueta: "30 días" },
  "365": { dias: 365, etiqueta: "1 año" },
} as const;

type Rango = keyof typeof RANGOS;

interface MonedaCG {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price?: number[] };
}

export interface CriptoResumen {
  id: string;
  simbolo: string;
  nombre: string;
  imagen: string;
  precio: number;
  cambio24h: number;
  capitalizacion: number;
  volumen: number;
  maximo24h: number;
  minimo24h: number;
  chispa: number[];
}

export interface Operacion {
  precio: number;
  cantidad: number;
  compra: boolean;
  hora: number;
}

export interface CriptoDetalle {
  resumen: CriptoResumen | null;
  puntos: Array<{ t: number; v: number }>;
  rango: Rango;
  etiquetaRango: string;
  operaciones: Operacion[];
  /** Verdadero cuando las operaciones no se pudieron traer: el resto sigue sirviendo. */
  sinOperaciones: boolean;
}

const cacheLista = crearCache<CriptoResumen[]>("cripto-lista", 60_000, 10 * 60_000);
const cacheDetalle = new Map<string, ReturnType<typeof crearCache<CriptoDetalle>>>();

function detalleCache(clave: string) {
  let c = cacheDetalle.get(clave);
  if (!c) {
    c = crearCache<CriptoDetalle>(`cripto-${clave}`, 45_000, 10 * 60_000);
    cacheDetalle.set(clave, c);
    // Sin tope, una lista de monedas inventadas haría crecer el mapa sin fin.
    if (cacheDetalle.size > 60) cacheDetalle.delete(cacheDetalle.keys().next().value as string);
  }
  return c;
}

function aResumen(m: MonedaCG): CriptoResumen {
  return {
    id: m.id,
    simbolo: (m.symbol || "").toUpperCase(),
    nombre: m.name,
    imagen: m.image,
    precio: m.current_price,
    cambio24h: m.price_change_percentage_24h ?? 0,
    capitalizacion: m.market_cap ?? 0,
    volumen: m.total_volume ?? 0,
    maximo24h: m.high_24h ?? 0,
    minimo24h: m.low_24h ?? 0,
    chispa: (m.sparkline_in_7d?.price ?? []).filter((v) => Number.isFinite(v)),
  };
}

async function cargarLista(): Promise<CriptoResumen[]> {
  const monedas = await pedirJson<MonedaCG[]>(
    `${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=24&page=1&sparkline=true&price_change_percentage=24h`,
    { plazo: 7000, revalidate: 60 },
  );
  return monedas.map(aResumen);
}

/**
 * Las últimas operaciones del par contra USDT: es lo que dice quién compra y quién vende.
 *
 * Se piden 200 y no 40 porque una sola orden grande se parte en decenas de ejecuciones
 * dentro del mismo segundo: con la ventana corta, la presión salía 100% compras siempre.
 */
async function cargarOperaciones(simbolo: string): Promise<Operacion[]> {
  const par = `${simbolo.toUpperCase().replace(/[^A-Z0-9]/g, "")}USDT`;
  if (par.length > 14) return [];
  const crudas = await pedirJson<Array<{ price: string; qty: string; time: number; isBuyerMaker: boolean }>>(
    `${BINANCE}/trades?symbol=${par}&limit=200`,
    { plazo: 6000, revalidate: 30 },
  );
  return crudas
    .map((o) => ({
      precio: Number(o.price),
      cantidad: Number(o.qty),
      // `isBuyerMaker` verdadero = el comprador estaba en el libro y vino una venta a mercado.
      compra: !o.isBuyerMaker,
      hora: o.time,
    }))
    .filter((o) => Number.isFinite(o.precio) && Number.isFinite(o.cantidad))
    .reverse();
}

async function cargarDetalle(id: string, rango: Rango): Promise<CriptoDetalle> {
  const { dias, etiqueta } = RANGOS[rango];
  const [historico, lista] = await Promise.all([
    pedirJson<{ prices?: Array<[number, number]> }>(
      `${COINGECKO}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${dias}`,
      { plazo: 8000, revalidate: 60 },
    ),
    cacheLista.leer(cargarLista).then((r) => r.valor).catch(() => [] as CriptoResumen[]),
  ]);
  const resumen = lista.find((m) => m.id === id) ?? null;
  let operaciones: Operacion[] = [];
  let sinOperaciones = true;
  if (resumen) {
    try {
      operaciones = await cargarOperaciones(resumen.simbolo);
      sinOperaciones = operaciones.length === 0;
    } catch {
      sinOperaciones = true;
    }
  }
  return {
    resumen,
    puntos: (historico.prices ?? [])
      .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([t, v]) => ({ t, v })),
    rango,
    etiquetaRango: etiqueta,
    operaciones,
    sinOperaciones,
  };
}

export async function GET(peticion: Request) {
  const url = new URL(peticion.url);
  const id = url.searchParams.get("id");
  const rangoCrudo = url.searchParams.get("rango") ?? "7";

  try {
    if (!id) {
      const { valor, rancio } = await cacheLista.leer(cargarLista);
      return NextResponse.json({ monedas: valor, rancio }, { headers: { "Cache-Control": "public, max-age=30" } });
    }
    // El identificador viene del navegador: solo el alfabeto que usa CoinGecko.
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) {
      return NextResponse.json({ error: "identificador no válido" }, { status: 400 });
    }
    const rango: Rango = rangoCrudo in RANGOS ? (rangoCrudo as Rango) : "7";
    const { valor, rancio } = await detalleCache(`${id}-${rango}`).leer(() => cargarDetalle(id, rango));
    return NextResponse.json({ ...valor, rancio }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch {
    return NextResponse.json({ error: "las fuentes de mercado no responden" }, { status: 503 });
  }
}
