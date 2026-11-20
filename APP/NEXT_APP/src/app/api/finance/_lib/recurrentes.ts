import { z } from "zod";

/** Frecuencias que guarda la base (en minúsculas). El formulario las manda en mayúsculas: se aceptan ambas. */
export const FRECUENCIAS = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
export type Frecuencia = (typeof FRECUENCIAS)[number];

/** Fecha ISO entre los años 2000 y 2100: acota el cálculo de la próxima fecha. */
const fechaISO = z
    .string()
    .datetime({ message: "Fecha inválida" })
    .refine((s) => {
        const anio = new Date(s).getUTCFullYear();
        return anio >= 2000 && anio <= 2100;
    }, "La fecha debe estar entre los años 2000 y 2100");

/** Mismos campos y reglas para crear (POST) y editar (PUT). */
const campos = {
    name: z.string().trim().min(1, "El nombre es requerido").max(120),
    amount: z.number().finite().positive("El monto debe ser positivo"),
    categoryId: z.string().min(1).nullish(),
    accountId: z.string().min(1).nullish(),
    // Opcional: si no llega, el servidor usa la moneda de la cuenta (o la de la cuenta principal, o CLP).
    currencyId: z.string().min(1).nullish(),
    frequency: z.string().transform((s) => s.toLowerCase()).pipe(z.enum(FRECUENCIAS)),
    startDate: fechaISO,
    endDate: fechaISO.nullish(),
    dayOfMonth: z.number().int().min(1).max(31).nullish(),
    dayOfWeek: z.number().int().min(0).max(6).nullish(),
    reminderDays: z.number().int().min(0).max(30),
};

export const crearRecurrenteSchema = z.object({
    ...campos,
    reminderDays: campos.reminderDays.default(3),
});

export const editarRecurrenteSchema = z
    .object(campos)
    .partial()
    .extend({ isActive: z.boolean().optional() });

export function esFrecuencia(valor: string): valor is Frecuencia {
    return (FRECUENCIAS as readonly string[]).includes(valor);
}

function diasDelMes(anio: number, mes: number): number {
    return new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
}

/** Suma meses sin desbordar: el 31 de enero más un mes es el 28 (o 29) de febrero, no el 3 de marzo. */
function sumarMeses(fecha: Date, meses: number, dia: number): Date {
    const base = new Date(Date.UTC(
        fecha.getUTCFullYear(),
        fecha.getUTCMonth() + meses,
        1,
        fecha.getUTCHours(),
        fecha.getUTCMinutes(),
        fecha.getUTCSeconds(),
    ));
    base.setUTCDate(Math.min(dia, diasDelMes(base.getUTCFullYear(), base.getUTCMonth())));
    return base;
}

/** Día del mes que manda en los pagos mensuales, trimestrales y anuales: el elegido o el de la fecha de inicio. */
export function diaAncla(inicio: Date, diaDelMes: number | null | undefined): number {
    return diaDelMes ?? inicio.getUTCDate();
}

/** Fecha del vencimiento siguiente a `fecha`. */
export function siguienteFecha(fecha: Date, frecuencia: string, ancla: number): Date {
    const f = frecuencia.toLowerCase();
    const sig = new Date(fecha);
    switch (f) {
        case "daily":
            sig.setUTCDate(sig.getUTCDate() + 1);
            return sig;
        case "weekly":
            sig.setUTCDate(sig.getUTCDate() + 7);
            return sig;
        case "biweekly":
            sig.setUTCDate(sig.getUTCDate() + 14);
            return sig;
        case "quarterly":
            return sumarMeses(fecha, 3, ancla);
        case "yearly":
            return sumarMeses(fecha, 12, ancla);
        case "monthly":
        default:
            return sumarMeses(fecha, 1, ancla);
    }
}

/**
 * Primer vencimiento desde hoy (incluido). Una fecha de inicio de hoy cuenta como vencimiento de hoy;
 * en los mensuales con día fijo, el primero es ese día del mes de inicio (o del siguiente si ya pasó).
 */
export function primeraFecha(inicio: Date, frecuencia: Frecuencia, diaDelMes: number | null | undefined, ahora = new Date()): Date {
    const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
    const ancla = diaAncla(inicio, frecuencia === "monthly" ? diaDelMes : null);
    let fecha = new Date(inicio);
    if (frecuencia === "monthly" && diaDelMes) {
        fecha = sumarMeses(inicio, 0, diaDelMes);
        if (fecha < inicio) fecha = sumarMeses(inicio, 1, diaDelMes);
    }
    // Las fechas están acotadas a 2000-2100, así que el tope de vueltas nunca se alcanza con datos válidos.
    for (let vueltas = 0; fecha < hoy && vueltas < 50_000; vueltas++) {
        fecha = siguienteFecha(fecha, frecuencia, ancla);
    }
    return fecha;
}

/** Monto equivalente por mes, para el resumen. */
export function equivalenteMensual(monto: number, frecuencia: string): number {
    switch (frecuencia.toLowerCase()) {
        case "daily":
            return monto * 30;
        case "weekly":
            return monto * 4.33;
        case "biweekly":
            return monto * 2.17;
        case "quarterly":
            return monto / 3;
        case "yearly":
            return monto / 12;
        case "monthly":
        default:
            return monto;
    }
}

/** El tipo no es una columna: sale de la categoría (sin categoría, o una de gasto, es gasto). */
export function tipoDeRecurrente(categoria: { type: string } | null | undefined): "INCOME" | "EXPENSE" {
    return categoria?.type === "INCOME" ? "INCOME" : "EXPENSE";
}
