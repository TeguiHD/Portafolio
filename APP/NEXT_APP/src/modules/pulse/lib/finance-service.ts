import type { PulseFinanceItem } from "@/modules/pulse/types";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const MINDICADOR_API = "https://mindicador.cl/api";

async function fetchJson<T>(url: string, revalidate: number) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "nicoholas-digital-pulse",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildTrend(changePercent: number): PulseFinanceItem["trend"] {
  if (changePercent > 0.1) return "up";
  if (changePercent < -0.1) return "down";
  return "flat";
}

function toSparkline(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === "number").slice(-12);
}

export async function getPulseFinance() {
  const [coins, indicators] = await Promise.all([
    fetchJson<Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      sparkline_in_7d?: { price?: number[] };
      last_updated: string;
    }>>(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&per_page=2&page=1&sparkline=true&price_change_percentage=24h`,
      600
    ),
    fetchJson<{
      uf?: { valor: number; serie?: Array<{ valor: number; fecha: string }> };
      utm?: { valor: number; serie?: Array<{ valor: number; fecha: string }> };
      dolar?: { valor: number; serie?: Array<{ valor: number; fecha: string }> };
    }>(MINDICADOR_API, 1800),
  ]);

  const cryptoItems = coins.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    source: "CoinGecko",
    price: coin.current_price,
    currency: "USD",
    changePercent: coin.price_change_percentage_24h ?? 0,
    trend: buildTrend(coin.price_change_percentage_24h ?? 0),
    sparkline: toSparkline(coin.sparkline_in_7d?.price ?? []),
    lastUpdated: coin.last_updated,
  })) satisfies PulseFinanceItem[];

  const indicatorItems = [
    {
      id: "uf",
      symbol: "UF",
      name: "Unidad de Fomento",
      source: "mindicador.cl",
      price: indicators.uf?.valor ?? 0,
      currency: "CLP",
      changePercent: indicators.uf?.serie?.[1]
        ? ((indicators.uf.valor - indicators.uf.serie[1].valor) / indicators.uf.serie[1].valor) * 100
        : 0,
      trend: buildTrend(
        indicators.uf?.serie?.[1]
          ? ((indicators.uf.valor - indicators.uf.serie[1].valor) / indicators.uf.serie[1].valor) * 100
          : 0
      ),
      sparkline: toSparkline(indicators.uf?.serie?.slice(0, 10).reverse().map((entry) => entry.valor) ?? []),
      lastUpdated: indicators.uf?.serie?.[0]?.fecha ?? new Date().toISOString(),
    },
    {
      id: "utm",
      symbol: "UTM",
      name: "Unidad Tributaria Mensual",
      source: "mindicador.cl",
      price: indicators.utm?.valor ?? 0,
      currency: "CLP",
      changePercent: indicators.utm?.serie?.[1]
        ? ((indicators.utm.valor - indicators.utm.serie[1].valor) / indicators.utm.serie[1].valor) * 100
        : 0,
      trend: buildTrend(
        indicators.utm?.serie?.[1]
          ? ((indicators.utm.valor - indicators.utm.serie[1].valor) / indicators.utm.serie[1].valor) * 100
          : 0
      ),
      sparkline: toSparkline(indicators.utm?.serie?.slice(0, 10).reverse().map((entry) => entry.valor) ?? []),
      lastUpdated: indicators.utm?.serie?.[0]?.fecha ?? new Date().toISOString(),
    },
    {
      id: "usdclp",
      symbol: "USD/CLP",
      name: "Dólar observado",
      source: "mindicador.cl",
      price: indicators.dolar?.valor ?? 0,
      currency: "CLP",
      changePercent: indicators.dolar?.serie?.[1]
        ? ((indicators.dolar.valor - indicators.dolar.serie[1].valor) / indicators.dolar.serie[1].valor) * 100
        : 0,
      trend: buildTrend(
        indicators.dolar?.serie?.[1]
          ? ((indicators.dolar.valor - indicators.dolar.serie[1].valor) / indicators.dolar.serie[1].valor) * 100
          : 0
      ),
      sparkline: toSparkline(indicators.dolar?.serie?.slice(0, 10).reverse().map((entry) => entry.valor) ?? []),
      lastUpdated: indicators.dolar?.serie?.[0]?.fecha ?? new Date().toISOString(),
    },
  ] satisfies PulseFinanceItem[];

  return [...cryptoItems, ...indicatorItems];
}
