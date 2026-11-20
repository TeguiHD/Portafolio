/**
 * Fechas de Finanzas. Una transacción guarda solo el día: «2026-11-20» llega al servidor y queda como
 * 2026-11-20T00:00Z (medianoche UTC). Por eso:
 * - el día de hoy se toma en Chile (antes, desde las 21:00 el formulario proponía la fecha de mañana, en UTC), y
 * - un día guardado se muestra en UTC (en hora de Chile, la medianoche UTC cae el día anterior: todo salía un día antes).
 */

const ZONA = "America/Santiago";

/** «AAAA-MM-DD» de hoy en Chile: valor por defecto de los campos de fecha. */
export const hoyChile = (ahora: Date = new Date()): string =>
    new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);

/** «AAAA-MM-DD» de un día guardado (se lee en UTC). */
export const diaGuardado = (fecha: string | Date): string => new Date(fecha).toISOString().slice(0, 10);

/** Un día guardado, en texto chileno («20 nov», «20 nov 2025»…). */
export function fechaDia(fecha: string | Date, opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
    return new Date(fecha).toLocaleDateString("es-CL", { ...opciones, timeZone: "UTC" });
}

/** Días de calendario entre dos «AAAA-MM-DD» (b − a). */
export const diasEntre = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
