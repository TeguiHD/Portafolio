import type { ParametrosSueldo } from "./sueldo";

/**
 * Parámetros tributarios y previsionales de Chile, vigentes en noviembre de 2026. Verificados con fuentes primarias el
 * 22-11-2026 (detalle y enlaces: ~/Documentos/Paginas/investigaciones/parametros-remuneraciones-cl-2026-11.md).
 * Revisar cada año: los topes cambian en febrero, la retención de honorarios en enero y las comisiones de AFP cuando
 * cada AFP las cambia.
 */

/**
 * Retención de las boletas de honorarios por año. Ley 21.133, artículo quinto transitorio (alza gradual hasta el 17 %
 * del art. 74 N° 2 de la LIR); 15,25 % en 2026 confirmado por el SII (noticia del 26-12-2025).
 */
export const RETENCION_HONORARIOS: Record<number, number> = { 2025: 0.145, 2026: 0.1525, 2027: 0.16, 2028: 0.17 };
export const FUENTE_RETENCION = "SII y Ley 21.133 (15,25 % en 2026, 16 % en 2027 y 17 % desde 2028)";

/** Comisión de cada AFP sobre la remuneración imponible (Superintendencia de Pensiones, documento válido en noviembre de 2026). */
export const AFPS: { nombre: string; comision: number }[] = [
    { nombre: "Capital", comision: 0.0144 },
    { nombre: "Cuprum", comision: 0.0144 },
    { nombre: "Habitat", comision: 0.0127 },
    { nombre: "Modelo", comision: 0.0058 },
    { nombre: "PlanVital", comision: 0.0116 },
    { nombre: "Provida", comision: 0.0145 },
    { nombre: "Uno", comision: 0.0046 },
];

/**
 * Sin la UF ni la UTM: las pone la calculadora con los valores del día.
 * - Cotización obligatoria de pensión: 10 % (DL 3.500, art. 17). El SIS y el aporte de la reforma (Ley 21.735) los
 *   paga el empleador: no tocan el líquido.
 * - Topes desde el 01-02-2026: 90 UF para AFP y salud, 135,2 UF para el seguro de cesantía (Res. SP N° 237 y 236/2026).
 * - Seguro de cesantía del trabajador: 0,6 % con contrato indefinido; 0 % a plazo fijo o por obra (Ley 19.728, art. 5).
 * - Impuesto único: tabla en UTM del art. 43 N° 1 de la LIR.
 */
export const PARAMETROS_SUELDO: Omit<ParametrosSueldo, "uf" | "utm" | "ufTopes"> = {
    topeImponibleUf: 90,
    topeCesantiaUf: 135.2,
    cotizacionAfp: 0.1,
    cesantiaTrabajador: { indefinido: 0.006, plazo: 0 },
    tramos: [
        { hastaUtm: 13.5, factor: 0, rebajaUtm: 0 },
        { hastaUtm: 30, factor: 0.04, rebajaUtm: 0.54 },
        { hastaUtm: 50, factor: 0.08, rebajaUtm: 1.74 },
        { hastaUtm: 70, factor: 0.135, rebajaUtm: 4.49 },
        { hastaUtm: 90, factor: 0.23, rebajaUtm: 11.14 },
        { hastaUtm: 120, factor: 0.304, rebajaUtm: 17.8 },
        { hastaUtm: 310, factor: 0.35, rebajaUtm: 23.32 },
        { hastaUtm: Infinity, factor: 0.4, rebajaUtm: 38.82 },
    ],
};

export const FUENTES_SUELDO = {
    vigencia: "noviembre de 2026",
    texto: "comisiones de AFP y topes de 90 UF y 135,2 UF de la Superintendencia de Pensiones; tabla del impuesto único del SII (LIR, art. 43); seguro de cesantía de la Ley 19.728",
};

/** Si la fuente del día no responde: valores publicados por el SII, con su fecha (se dice en la página). */
export const REFERENCIA_INDICADORES = {
    uf: { valor: 41384.81, fecha: "2026-11-22" },
    utm: { valor: 72440, fecha: "2026-11-01" },
};
