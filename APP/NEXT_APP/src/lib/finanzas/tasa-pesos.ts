/**
 * Tasa de cambio cuando una de las dos monedas es el peso chileno. Frankfurter (tasas del Banco Central Europeo) no
 * publica CLP, así que el convertidor de Finanzas fallaba siempre con pesos (24-11-2026). Se usan el dólar observado y
 * el euro del día de mindicador.cl, la misma fuente de la herramienta UF/UTM; otra moneda pasa por el dólar con `usdA`
 * (cuántas unidades de esa moneda da un dólar). Devuelve null si ninguna de las dos es CLP: ese par sigue con Frankfurter.
 */
export async function tasaConPesos(from: string, to: string, ind: { dolar: number; euro?: number }, usdA?: (moneda: string) => Promise<number>): Promise<number | null> {
    if (from === to) return 1;
    if (from !== "CLP" && to !== "CLP") return null;
    const otra = from === "CLP" ? to : from;
    // Pesos por una unidad de la otra moneda.
    let pesos: number;
    if (otra === "USD") pesos = ind.dolar;
    else if (otra === "EUR" && ind.euro) pesos = ind.euro;
    else {
        if (!usdA) return null;
        const porDolar = await usdA(otra);
        if (!(porDolar > 0)) return null;
        pesos = ind.dolar / porDolar;
    }
    return from === "CLP" ? 1 / pesos : pesos;
}

/**
 * La tasa en palabras, con números a la chilena («1 USD = 950,26 CLP»). Si es menor que 1 se da vuelta: «1 CLP = 0.0011
 * USD» no decía nada; «1 USD = 950 CLP» sí.
 */
export function textoTasa(from: string, to: string, rate: number): string {
    const [de, a, valor] = rate < 1 ? [to, from, 1 / rate] : [from, to, rate];
    return `1 ${de} = ${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(valor)} ${a}`;
}

/** Días que sirve el dólar guardado cuando mindicador.cl no responde. Más viejo, mejor no convertir. */
export const RESPALDO_MAX_DIAS = 7;

const diaChile = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

/**
 * Si el dólar guardado (de `fecha`) todavía sirve y, si no es de hoy en Chile, el texto que lo dice («Tasa del
 * 20-11-2026»). La interfaz dice «Tasas del día»: un respaldo de otro día no puede pasar por el de hoy.
 */
export function fechaRespaldo(fecha: Date, ahora: Date = new Date()): { vigente: boolean; texto: string | null } {
    if (ahora.getTime() - fecha.getTime() > RESPALDO_MAX_DIAS * 86_400_000) return { vigente: false, texto: null };
    if (diaChile(fecha) === diaChile(ahora)) return { vigente: true, texto: null };
    const [a, m, d] = diaChile(fecha).split("-");
    return { vigente: true, texto: `Tasa del ${d}-${m}-${a}` };
}

/** Las 30 monedas que publica Frankfurter (tasas del Banco Central Europeo), consultadas en su API el 25-11-2026. */
const FRANKFURTER = ["AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR"];

/**
 * Si alguna fuente publica la tasa de esa moneda: las de Frankfurter y el peso chileno (mindicador.cl). ARS, COP y PEN
 * no los publica ninguna: el convertidor no los ofrece (decisión del dueño, 25-11-2026), aunque sigan para las cuentas.
 */
export function tieneTasa(moneda: string): boolean {
    return moneda === "CLP" || FRANKFURTER.includes(moneda);
}
