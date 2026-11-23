/**
 * «¿Cómo llegaste?» del formulario de contacto: mide si las recomendaciones de las IA traen clientes (la única métrica
 * que paga, según el informe «GEO para marca personal en Chile»). Opcional; el servidor solo guarda estos valores.
 */
export const ORIGENES = [
    { valor: "ia", texto: "Me lo recomendó una IA (ChatGPT, Gemini, Claude…)" },
    { valor: "buscador", texto: "Google u otro buscador" },
    { valor: "linkedin", texto: "LinkedIn" },
    { valor: "persona", texto: "Me lo recomendó una persona" },
    { valor: "indice", texto: "El Índice de la Web Chilena" },
    { valor: "otro", texto: "Otro" },
] as const;

export type Origen = (typeof ORIGENES)[number]["valor"];

/** El valor si es una de las opciones; cualquier otra cosa, null (no se guarda texto libre). */
export function normalizarOrigen(valor: unknown): Origen | null {
    return ORIGENES.find((o) => o.valor === valor)?.valor ?? null;
}

/** El texto de la opción, para mostrarlo en el panel. */
export function textoOrigen(valor: string | null | undefined): string | null {
    return ORIGENES.find((o) => o.valor === valor)?.texto ?? null;
}
