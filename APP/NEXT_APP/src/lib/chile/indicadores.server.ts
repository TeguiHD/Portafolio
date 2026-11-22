import "server-only";
import { crearCache, pedirJson } from "@/modules/pulse/lib/red";
import type { Indicador, Indicadores } from "./indicadores";

/**
 * UF, UTM, dólar observado y euro desde mindicador.cl (público y sin clave; toma los datos del Banco Central y del SII).
 * Caché de 30 minutos y, si la fuente falla, lo último bueno hasta 3 días: la UF cambia una vez al día y la UTM una vez
 * al mes. Si nunca respondió, null: las herramientas dejan escribir el valor a mano.
 */
type Crudo = Partial<Record<"uf" | "utm" | "dolar" | "euro", { valor?: number; fecha?: string }>>;

/** mindicador entrega la fecha a las 00:00 de Chile expresada en UTC (03:00 o 04:00 Z): se lleva al día chileno. */
function diaCL(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

function leer(crudo: Crudo[keyof Crudo]): Indicador | null {
    if (!crudo || typeof crudo.valor !== "number" || !(crudo.valor > 0) || !crudo.fecha) return null;
    return { valor: crudo.valor, fecha: diaCL(crudo.fecha) };
}

async function cargar(): Promise<Indicadores> {
    const datos = await pedirJson<Crudo>("https://mindicador.cl/api", { plazo: 4000 });
    const uf = leer(datos.uf), utm = leer(datos.utm), dolar = leer(datos.dolar), euro = leer(datos.euro);
    if (!uf || !utm || !dolar) throw new Error("mindicador.cl respondió sin UF, UTM o dólar");
    return { uf, utm, dolar, ...(euro ? { euro } : {}), fuente: "mindicador.cl (Banco Central de Chile y SII)" };
}

/**
 * La UF del último día del mes en curso (con ella se pasan a pesos los topes imponibles; el Banco Central la publica el
 * día 9). Esa consulta tarda varios segundos: se pide por detrás, sin hacer esperar a la página, y se guarda para el mes.
 * Mientras no llega (o si aún no se publica), la calculadora usa la UF del día y lo dice.
 */
let finDeMes: { mes: string; valor: Indicador | null } | null = null;
let pidiendoFin: Promise<void> | null = null;
function pedirFinDeMes(): void {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
    const mes = hoy.slice(0, 7);
    if ((finDeMes?.mes === mes && finDeMes.valor) || pidiendoFin) return;
    const [a, m] = mes.split("-").map(Number) as [number, number];
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
    pidiendoFin = pedirJson<{ serie?: { valor?: number; fecha?: string }[] }>(`https://mindicador.cl/api/uf/${String(ultimo).padStart(2, "0")}-${String(m).padStart(2, "0")}-${a}`, { plazo: 15000 })
        .then((r) => { finDeMes = { mes, valor: leer(r.serie?.[0]) }; })
        .catch(() => { /* se vuelve a intentar en la próxima visita */ })
        .finally(() => { pidiendoFin = null; });
}

function conFinDeMes(ind: Indicadores): Indicadores {
    const mes = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }).slice(0, 7);
    return finDeMes?.mes === mes && finDeMes.valor ? { ...ind, ufFinDeMes: finDeMes.valor } : ind;
}

const cache = crearCache<Indicadores>("indicadores-cl", 30 * 60_000, 3 * 24 * 60 * 60_000);

export async function leerIndicadores(): Promise<Indicadores | null> {
    pedirFinDeMes();
    try {
        return conFinDeMes((await cache.leer(cargar)).valor);
    } catch {
        return null;
    }
}
