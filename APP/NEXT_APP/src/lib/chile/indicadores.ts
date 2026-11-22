/**
 * Indicadores del día (UF, UTM, dólar observado, euro). Los trae el servidor (indicadores.server.ts) y llegan a las
 * herramientas por contexto: así los valores van en el HTML que leen los buscadores y las IA, no solo tras el JavaScript.
 */
export interface Indicador {
    valor: number;
    /** Día al que corresponde, AAAA-MM-DD en Chile. */
    fecha: string;
}

export interface Indicadores {
    uf: Indicador;
    utm: Indicador;
    dolar: Indicador;
    euro?: Indicador;
    /** UF del último día de este mes (con ella se pasan a pesos los topes imponibles), si ya se publicó. */
    ufFinDeMes?: Indicador;
    fuente: string;
}

/** «2026-11-22» → «22-11-2026». */
export function fechaCL(fecha: string): string {
    const [a, m, d] = fecha.split("-");
    return a && m && d ? `${d}-${m}-${a}` : fecha;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** «2026-11-01» → «noviembre de 2026» (la UTM es mensual). */
export function mesCL(fecha: string): string {
    const [a, m] = fecha.split("-");
    const i = Number(m) - 1;
    return MESES[i] ? `${MESES[i]} de ${a}` : fecha;
}

/** Pesos chilenos: sin decimales salvo que se pidan (la UF y el dólar llevan 2). */
export function pesos(n: number, decimales = 0): string {
    return `$${n.toLocaleString("es-CL", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}
