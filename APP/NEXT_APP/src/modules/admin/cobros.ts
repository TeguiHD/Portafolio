/**
 * Un solo criterio de fechas y de cuotas atrasadas para «Hoy», Pagos y el resumen de Comercial: días de calendario de
 * Chile (America/Santiago) y la misma regla de atraso en las tres pantallas. Antes cada una comparaba distinto (instante
 * exacto, día UTC o solo el estado guardado) y una cuota podía salir «Por cobrar» en Pagos y «Atrasada» en «Hoy».
 */

export const ZONA_CHILE = "America/Santiago";

/** «YYYY-MM-DD» del día de Chile en ese instante. */
export const diaChile = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_CHILE }).format(d);

/** Desfase de Chile respecto de UTC en ese instante, en minutos (−180 en verano, −240 en invierno). */
function desfaseMinutos(instante: Date): number {
    const nombre = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_CHILE, timeZoneName: "longOffset" })
        .formatToParts(instante).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const r = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nombre);
    return r ? (Number(r[2]) * 60 + Number(r[3] ?? 0)) * (r[1] === "-" ? -1 : 1) : 0;
}

/** Medianoche de Chile de esa fecha, como instante. Dos pasadas: el desfase se mide en la medianoche misma. */
function medianocheChile(anio: number, mes: number, dia: number): Date {
    const utc = Date.UTC(anio, mes - 1, dia);
    const aprox = utc - desfaseMinutos(new Date(utc)) * 60_000;
    return new Date(utc - desfaseMinutos(new Date(aprox)) * 60_000);
}

/** Inicio del día de hoy en Chile. */
export function inicioDelDiaChile(ahora: Date = new Date()): Date {
    const [anio = 1970, mes = 1, dia = 1] = diaChile(ahora).split("-").map(Number);
    return medianocheChile(anio, mes, dia);
}

/** Inicio del día 1 del mes en curso, en Chile. */
export function inicioDelMesChile(ahora: Date = new Date()): Date {
    const [anio = 1970, mes = 1] = diaChile(ahora).split("-").map(Number);
    return medianocheChile(anio, mes, 1);
}

/**
 * Una cuota por cobrar está atrasada si se marcó así o si su día de vencimiento (en Chile) ya pasó.
 * La que vence hoy todavía no está atrasada.
 */
export function cuotaAtrasada(estado: string, vence: Date | string | null | undefined, ahora: Date = new Date()): boolean {
    if (estado === "OVERDUE") return true;
    if (estado !== "PENDING" || !vence) return false;
    return new Date(vence).getTime() < inicioDelDiaChile(ahora).getTime();
}

/** La misma regla como filtro de Prisma, para contar en la base. */
export function filtroAtrasadas(ahora: Date = new Date()) {
    return { OR: [{ status: "OVERDUE" as const }, { status: "PENDING" as const, dueDate: { lt: inicioDelDiaChile(ahora) } }] };
}
