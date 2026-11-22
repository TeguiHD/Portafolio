/**
 * Sueldo líquido de un trabajador dependiente en Chile (un mes, sin gratificación ni horas extra).
 *
 * - Imponible: el bruto hasta el tope imponible (en UF).
 * - AFP: imponible × (10 % + comisión de la AFP). El SIS y los aportes de la reforma de pensiones los paga el empleador.
 * - Salud: 7 % del imponible (Fonasa), o el plan de la Isapre en UF si es mayor.
 * - Seguro de cesantía: la parte del trabajador, sobre el bruto hasta su propio tope (0 % en plazo fijo).
 * - Impuesto único de segunda categoría: por tramos en UTM sobre el bruto menos AFP, lo pagado en salud (con un máximo
 *   del 7 % del tope imponible, 6,3 UF) y la cesantía (LIR, art. 42 N° 1).
 * - Los topes se pasan a pesos con la UF del último día del mes de la remuneración (Superintendencia de Pensiones);
 *   si aún no se conoce, con la del día.
 * - Lo no imponible (colación, movilización) se suma al final.
 * Todo al peso, como en la liquidación.
 */
export interface Tramo {
    /** Límite superior del tramo en UTM (Infinity en el último). */
    hastaUtm: number;
    factor: number;
    rebajaUtm: number;
}

export interface ParametrosSueldo {
    /** UF del día: convierte el plan de Isapre. */
    uf: number;
    /** UF para los topes (la del último día del mes); si falta, la del día. */
    ufTopes?: number;
    utm: number;
    topeImponibleUf: number;
    topeCesantiaUf: number;
    /** Cotización obligatoria de pensión (10 %). */
    cotizacionAfp: number;
    cesantiaTrabajador: { indefinido: number; plazo: number };
    tramos: Tramo[];
}

export interface DatosSueldo {
    bruto: number;
    comisionAfp: number;
    salud: { tipo: "fonasa" } | { tipo: "isapre"; planUf: number };
    contrato: "indefinido" | "plazo";
    noImponible: number;
}

export interface Liquidacion {
    bruto: number;
    imponible: number;
    afp: number;
    salud: number;
    cesantia: number;
    baseTributable: number;
    impuesto: number;
    noImponible: number;
    liquido: number;
    /** Tasa del tramo del impuesto (0 si está exento). */
    factorTramo: number;
}

const alPeso = (n: number) => Math.round(Number(n.toPrecision(15)));

export function impuestoUnico(base: number, p: ParametrosSueldo): { impuesto: number; factor: number } {
    const enUtm = base / p.utm;
    const tramo = p.tramos.find((t) => enUtm <= t.hastaUtm) ?? p.tramos[p.tramos.length - 1]!;
    return { impuesto: Math.max(0, alPeso(base * tramo.factor - tramo.rebajaUtm * p.utm)), factor: tramo.factor };
}

export function calcularSueldo(d: DatosSueldo, p: ParametrosSueldo): Liquidacion {
    const bruto = alPeso(Math.max(0, d.bruto));
    const ufTopes = p.ufTopes ?? p.uf, topeImponible = alPeso(p.topeImponibleUf * ufTopes);
    const imponible = Math.min(bruto, topeImponible);
    const afp = alPeso(imponible * (p.cotizacionAfp + d.comisionAfp));
    const saludLegal = alPeso(imponible * 0.07);
    const salud = d.salud.tipo === "isapre" ? Math.max(saludLegal, alPeso(d.salud.planUf * p.uf)) : saludLegal;
    const cesantia = alPeso(Math.min(bruto, alPeso(p.topeCesantiaUf * ufTopes)) * p.cesantiaTrabajador[d.contrato]);
    const saludRebajable = Math.min(salud, alPeso(0.07 * topeImponible));
    const baseTributable = Math.max(0, bruto - afp - saludRebajable - cesantia);
    const { impuesto, factor } = impuestoUnico(baseTributable, p);
    const noImponible = alPeso(Math.max(0, d.noImponible));
    return { bruto, imponible, afp, salud, cesantia, baseTributable, impuesto, noImponible, liquido: bruto - afp - salud - cesantia - impuesto + noImponible, factorTramo: factor };
}

/** El bruto que da `liquido` (búsqueda binaria: el líquido crece con el bruto). */
export function brutoParaLiquido(liquido: number, d: Omit<DatosSueldo, "bruto">, p: ParametrosSueldo): number {
    let bajo = 0, alto = Math.max(1000, liquido * 3);
    while (calcularSueldo({ ...d, bruto: alto }, p).liquido < liquido) alto *= 2;
    while (alto - bajo > 1) {
        const medio = Math.floor((bajo + alto) / 2);
        if (calcularSueldo({ ...d, bruto: medio }, p).liquido < liquido) bajo = medio; else alto = medio;
    }
    return alto;
}
