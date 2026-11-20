/** Utilidades de los ejes de los gráficos de Finanzas (DailyChart y TrendsChart). */

const PASOS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Tope redondo del eje Y para que las marcas sean cifras limpias (1.234.567 → 1.500.000). */
export function topeEje(max: number): number {
    if (!(max > 0)) return 1;
    const base = 10 ** Math.floor(Math.log10(max));
    const paso = PASOS.find((p) => p * base >= max) ?? 10;
    return paso * base;
}

const corto = new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 2 });

/** Monto corto para un eje: «$1,5 M», «$15 mil». */
export function montoEje(valor: number): string {
    return `$${corto.format(valor)}`;
}

/**
 * Dónde anclar un globo de ayuda sobre la columna `i` de `n`, para que en los bordes no se salga del gráfico
 * (y en celular no empuje la página hacia el lado).
 */
export function anclaGlobo(i: number, n: number): string {
    if (i < n / 4) return "left-0";
    if (i >= (n * 3) / 4) return "right-0";
    return "left-1/2 -translate-x-1/2";
}
