import { prisma } from "@/lib/prisma";
import type { BudgetPeriod } from "@/generated/prisma/client";
import { hoyChile } from "@/modules/finance/fechas";

/**
 * Inicio y fin del período en curso de un presupuesto. Los movimientos guardan su día como medianoche UTC
 * («2026-11-20» → 2026-11-20T00:00Z), así que los límites son días en UTC; el día de HOY se toma en Chile
 * (antes se tomaba la hora del servidor: desde las 21:00 del último día del mes ya contaba el mes siguiente).
 */
export function fechasDelPeriodo(period: BudgetPeriod, ahora = new Date()): { start: Date; end: Date } {
    const [anio = 1970, mes = 1, dia = 1] = hoyChile(ahora).split("-").map(Number);
    const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d));
    // Fin = un milisegundo antes del inicio del período siguiente.
    const hasta = (siguiente: Date) => new Date(siguiente.getTime() - 1);
    switch (period) {
        case "WEEKLY": {
            const domingo = dia - utc(anio, mes - 1, dia).getUTCDay();
            return { start: utc(anio, mes - 1, domingo), end: hasta(utc(anio, mes - 1, domingo + 7)) };
        }
        case "QUARTERLY": {
            const trimestre = Math.floor((mes - 1) / 3);
            return { start: utc(anio, trimestre * 3, 1), end: hasta(utc(anio, trimestre * 3 + 3, 1)) };
        }
        case "YEARLY":
            return { start: utc(anio, 0, 1), end: hasta(utc(anio + 1, 0, 1)) };
        case "MONTHLY":
        default:
            return { start: utc(anio, mes - 1, 1), end: hasta(utc(anio, mes, 1)) };
    }
}

/** Gasto real del período en curso (la columna currentSpent no se mantiene: se calcula siempre). */
export async function gastoDelPeriodo(
    userId: string,
    presupuesto: { period: BudgetPeriod; categoryId: string | null },
): Promise<{ gastado: number; start: Date; end: Date }> {
    const { start, end } = fechasDelPeriodo(presupuesto.period);
    const suma = await prisma.transaction.aggregate({
        where: {
            userId,
            type: "EXPENSE",
            isDeleted: false,
            transactionDate: { gte: start, lte: end },
            ...(presupuesto.categoryId ? { categoryId: presupuesto.categoryId } : {}),
        },
        _sum: { amount: true },
    });
    return { gastado: suma._sum.amount ?? 0, start, end };
}
