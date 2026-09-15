import type { PulseFinanceItem } from "@/modules/pulse/types";
import { crearCache, pedirJson } from "@/modules/pulse/lib/red";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const MINDICADOR_API = "https://mindicador.cl/api";

interface Moneda {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price?: number[] };
  last_updated: string;
}

interface Serie {
  valor: number;
  serie?: Array<{ valor: number; fecha: string }>;
}

type Indicadores = { uf?: Serie; utm?: Serie; dolar?: Serie };

function tendencia(cambio: number): PulseFinanceItem["trend"] {
  if (cambio > 0.1) return "up";
  if (cambio < -0.1) return "down";
  return "flat";
}

function chispa(valores: Array<number | null | undefined>) {
  return valores.filter((v): v is number => typeof v === "number").slice(-12);
}

/** Variación respecto al dato anterior de la serie; 0 si no hay con qué comparar. */
function variacion(serie: Serie | undefined) {
  const previo = serie?.serie?.[1]?.valor;
  if (!serie || !previo) return 0;
  return ((serie.valor - previo) / previo) * 100;
}

function indicador(id: string, symbol: string, name: string, serie: Serie | undefined): PulseFinanceItem | null {
  if (!serie || typeof serie.valor !== "number") return null;
  const cambio = variacion(serie);
  return {
    id,
    symbol,
    name,
    source: "mindicador.cl",
    price: serie.valor,
    currency: "CLP",
    changePercent: cambio,
    trend: tendencia(cambio),
    sparkline: chispa(serie.serie?.slice(0, 10).reverse().map((e) => e.valor) ?? []),
    lastUpdated: serie.serie?.[0]?.fecha ?? new Date().toISOString(),
  };
}

async function cargarMonedas(): Promise<PulseFinanceItem[]> {
  const monedas = await pedirJson<Moneda[]>(
    `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&per_page=2&page=1&sparkline=true&price_change_percentage=24h`,
    { revalidate: 600, plazo: 5000 }
  );
  return monedas.map((m) => ({
    id: m.id,
    symbol: m.symbol.toUpperCase(),
    name: m.name,
    source: "CoinGecko",
    price: m.current_price,
    currency: "USD",
    changePercent: m.price_change_percentage_24h ?? 0,
    trend: tendencia(m.price_change_percentage_24h ?? 0),
    sparkline: chispa(m.sparkline_in_7d?.price ?? []),
    lastUpdated: m.last_updated,
  }));
}

async function cargarIndicadores(): Promise<PulseFinanceItem[]> {
  const datos = await pedirJson<Indicadores>(MINDICADOR_API, { revalidate: 1800, plazo: 5000 });
  return [
    indicador("uf", "UF", "Unidad de Fomento", datos.uf),
    indicador("utm", "UTM", "Unidad Tributaria Mensual", datos.utm),
    indicador("usdclp", "USD/CLP", "Dólar observado", datos.dolar),
  ].filter((i): i is PulseFinanceItem => i !== null);
}

const cache = crearCache<PulseFinanceItem[]>("finance", 5 * 60_000, 24 * 60 * 60_000);

/**
 * Mercado: cripto (CoinGecko) e indicadores chilenos (mindicador.cl).
 *
 * Las dos fuentes son públicas y sin clave, así que una puede responder 429 en
 * cualquier momento. Se piden por separado y se devuelve lo que haya llegado: antes,
 * un fallo de cualquiera de las dos dejaba la sección entera en error.
 */
export async function getPulseFinance(): Promise<PulseFinanceItem[]> {
  const [monedas, indicadores] = await Promise.allSettled([cargarMonedas(), cargarIndicadores()]);
  const items = [
    ...(monedas.status === "fulfilled" ? monedas.value : []),
    ...(indicadores.status === "fulfilled" ? indicadores.value : []),
  ];
  if (items.length === 0) {
    const motivo = [monedas, indicadores]
      .map((r) => (r.status === "rejected" ? String(r.reason?.message ?? r.reason) : null))
      .filter(Boolean)
      .join("; ");
    throw new Error(motivo || "sin datos de mercado");
  }
  return items;
}

/** Igual que el anterior, pero con memoria: si las fuentes fallan, sirve lo último bueno. */
export function getPulseFinanceCached(forzar = false) {
  return cache.leer(getPulseFinance, forzar);
}
