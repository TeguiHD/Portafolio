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
