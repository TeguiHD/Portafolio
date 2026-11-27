import type { PulseContextData, PulseFinanceItem, PulseNewsItem } from "@/modules/pulse/types";

/**
 * Lo que leen Noticias y los widgets: las mismas APIs públicas del blog (con su caché en el servidor). Cada lectura
 * corta a los 10 s y devuelve null si algo falla: la app muestra un texto tranquilo y un botón para reintentar.
 */
async function leer<T>(url: string): Promise<T | null> {
    try {
        const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
        return r.ok ? ((await r.json()) as T) : null;
    } catch {
        return null;
    }
}
export const leerNoticias = async () => (await leer<{ items?: PulseNewsItem[] }>("/api/pulse/news"))?.items ?? null;
export const leerMercado = async () => (await leer<{ items?: PulseFinanceItem[] }>("/api/pulse/finance"))?.items ?? null;
/** La API del clima envuelve los datos en `data`. Se exige lo que la barra usa, para no pintar a medias. */
export async function leerClima(): Promise<PulseContextData | null> {
    const d = (await leer<{ data?: PulseContextData }>("/api/pulse/context?city=Santiago"))?.data;
    return d && Number.isFinite(d.temperature) && Number.isFinite(d.weatherCode) && typeof d.weatherLabel === "string" ? d : null;
}

export const TEMAS: { id: PulseNewsItem["category"] | "todo"; nombre: string }[] = [
    { id: "todo", nombre: "Todo" }, { id: "security", nombre: "Seguridad" }, { id: "ai", nombre: "IA" },
    { id: "dev", nombre: "Desarrollo" }, { id: "startup", nombre: "Producto" }, { id: "market", nombre: "Mercado" },
];

export function precio(i: PulseFinanceItem): string {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: i.currency, maximumFractionDigits: i.currency === "CLP" ? 2 : 0 }).format(i.price);
}
