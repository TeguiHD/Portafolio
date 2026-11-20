"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from "@/generated/prisma/client";
import { cuotaAtrasada } from "@/modules/admin/cobros";

const METODOS = ["TRANSFER", "CASH", "CREDIT_CARD", "DEBIT_CARD", "CHECK", "PAYPAL", "CRYPTO", "OTHER"] as const;
const ESTADOS = ["PAID", "PENDING", "OVERDUE", "CANCELLED"] as const;

const numeroCuota = z.number({ error: "Cuota no válida" }).int("Cuota no válida").min(1, "La cuota parte en 1").max(120, "Máximo 120 cuotas");

const esquemaPago = z.object({
    quotationId: z.string({ error: "Elige la propuesta" }).trim().min(1, "Elige la propuesta").max(40, "Propuesta no válida"),
    /** Cuota pendiente que se salda o se corrige; sin ella, se crea un registro nuevo. */
    cuotaId: z.string({ error: "Cuota no válida" }).trim().max(40, "Cuota no válida").optional(),
    amount: z.number({ error: "Monto no válido" }).finite("Monto no válido").positive("El monto debe ser mayor que cero").max(1e12, "Monto demasiado alto"),
    fecha: z.string({ error: "Fecha no válida" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
        .refine((f) => !Number.isNaN(Date.parse(`${f}T12:00:00Z`)), "Fecha no válida"),
    method: z.enum(METODOS, { error: "Método de pago no válido" }),
    status: z.enum(ESTADOS, { error: "Estado no válido" }),
    installmentNumber: numeroCuota.optional(),
    totalInstallments: numeroCuota.optional(),
    reference: z.string({ error: "Referencia no válida" }).trim().max(100, "La referencia admite 100 caracteres").optional(),
    notes: z.string({ error: "Notas no válidas" }).trim().max(500, "Las notas admiten 500 caracteres").optional(),
})
    .refine((d) => (d.installmentNumber === undefined) === (d.totalInstallments === undefined), {
        message: "Indica el número de cuota y el total de cuotas, o deja ambos vacíos", path: ["installmentNumber"],
    })
    .refine((d) => !d.installmentNumber || !d.totalInstallments || d.installmentNumber <= d.totalInstallments, {
        message: "La cuota no puede ser mayor que el total de cuotas", path: ["installmentNumber"],
    })
    .refine((d) => d.status !== "CANCELLED" || Boolean(d.cuotaId), {
        message: "Solo se anula una cuota que ya existe", path: ["status"],
    });

export type EntradaPago = z.input<typeof esquemaPago>;
type Resultado = { success: true; completa: boolean; anuladas: number } | { success: false; error: string };

const pesos = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

/** Se lanza dentro de la transacción para deshacerla con un mensaje para la persona. */
class Rechazo extends Error {}

/**
 * Registra un pago (o una cuota por cobrar) de una propuesta aprobada, o salda/corrige una cuota pendiente.
 * Solo lo pagado suma a `totalPaid`; si con eso se cubre el total, la propuesta pasa a Completada (con su historial).
 */
export async function registrarPagoAction(entrada: EntradaPago): Promise<Resultado> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };
    const puede = await hasPermission(session.user.id, session.user.role as Role, "crm.payments.manage");
    if (!puede) return { success: false, error: "No tienes permiso para registrar pagos" };

    const r = esquemaPago.safeParse(entrada);
    if (!r.success) return { success: false, error: r.error.issues[0]?.message ?? "Revisa los datos del pago" };
    const d = r.data;
    const userId = session.user.id;
    // Mediodía UTC: la fecha elegida se lee igual en Chile y en UTC (medianoche UTC caía el día anterior en Chile).
    const fecha = new Date(`${d.fecha}T12:00:00Z`);
    const pagado = d.status === "PAID";
    const porCobrar = d.status === "PENDING" || d.status === "OVERDUE";

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const q = await tx.quotation.findFirst({
                where: { id: d.quotationId, userId, isDeleted: false },
                select: { id: true, clientId: true, status: true },
            });
            if (!q) throw new Rechazo("Propuesta no encontrada");
            if (q.status !== "APPROVED" && q.status !== "COMPLETED") throw new Rechazo("Solo se registran pagos de propuestas aprobadas");

            const datos = {
                amount: d.amount,
                method: d.method,
                status: d.status,
                paidAt: fecha,
                reference: d.reference || null,
                notes: d.notes || null,
                installmentNumber: d.installmentNumber ?? null,
                totalInstallments: d.totalInstallments ?? null,
                isPartial: (d.totalInstallments ?? 1) > 1,
            };

            if (d.cuotaId) {
                // Solo cuotas por cobrar: una ya pagada no se reescribe aquí (descuadraría lo cobrado).
                const cuota = await tx.quotationPayment.findFirst({
                    where: { id: d.cuotaId, quotationId: q.id, status: { in: ["PENDING", "OVERDUE"] } },
                    select: { id: true, dueDate: true },
                });
                if (!cuota) throw new Rechazo("Esa cuota ya no está pendiente");
                await tx.quotationPayment.update({
                    where: { id: cuota.id },
                    data: { ...datos, dueDate: porCobrar ? fecha : cuota.dueDate },
                });
            } else {
                await tx.quotationPayment.create({
                    data: { ...datos, dueDate: porCobrar ? fecha : null, quotationId: q.id, registeredBy: userId },
                });
            }

            if (!pagado) return { completa: false, anuladas: 0, clientId: q.clientId };

            // Incremento atómico: dos pagos a la vez no pueden pasar ambos el tope del saldo.
            const act = await tx.quotation.update({
                where: { id: q.id },
                data: { totalPaid: { increment: d.amount } },
                select: { total: true, totalPaid: true, status: true },
            });
            if (act.totalPaid > act.total * 1.001) {
                throw new Rechazo(`El monto supera el saldo pendiente (${pesos(Math.max(0, act.total - (act.totalPaid - d.amount)))})`);
            }
            const completa = act.total - act.totalPaid <= 0.01;
            let anuladas = 0;
            if (completa) {
                // Pagada completa: las cuotas que quedaban por cobrar ya no se cobrarán. Si siguieran pendientes,
                // «Hoy» y Comercial mostrarían para siempre un cobro que no existe.
                anuladas = (await tx.quotationPayment.updateMany({
                    where: { quotationId: q.id, status: { in: ["PENDING", "OVERDUE"] } },
                    data: { status: "CANCELLED" },
                })).count;
            }
            if (completa && act.status !== "COMPLETED") {
                await tx.quotation.update({ where: { id: q.id }, data: { status: "COMPLETED" } });
                await tx.quotationStatusHistory.create({
                    data: {
                        quotationId: q.id, fromStatus: act.status, toStatus: "COMPLETED", changedBy: userId,
                        reason: "Pago completo registrado", metadata: { totalPaid: act.totalPaid, cuotasAnuladas: anuladas },
                    },
                });
            }
            return { completa, anuladas, clientId: q.clientId };
        });

        revalidatePath("/admin/gestion-comercial/pagos");
        revalidatePath("/admin/gestion-comercial");
        revalidatePath("/admin");
        if (resultado.clientId) {
            revalidatePath(`/admin/cotizaciones/${resultado.clientId}`);
            revalidatePath(`/admin/clientes/${resultado.clientId}`);
        }
        return { success: true, completa: resultado.completa, anuladas: resultado.anuladas };
    } catch (error) {
        if (error instanceof Rechazo) return { success: false, error: error.message };
        console.error("[CRM] Error al registrar pago:", error);
        return { success: false, error: "No se pudo registrar el pago" };
    }
}

export interface CobrosDePropuesta {
    total: number;
    pagado: number;
    /** Pagos recibidos (estado PAID), del más reciente al más antiguo. */
    pagos: { id: string; monto: number; metodo: string; fecha: string; referencia: string | null; numero: number | null; de: number | null }[];
    /** Cuotas por cobrar, de la que vence antes a la que vence después; «OVERDUE» si ya pasó su día. */
    cuotas: { id: string; monto: number; numero: number | null; de: number | null; vence: string | null; estado: "PENDING" | "OVERDUE" }[];
}

/**
 * Lo cobrado y lo por cobrar de una propuesta, para «Registrar pago» en la ficha de la propuesta.
 * Mismas reglas que Pagos: permiso de ver pagos y propuesta propia.
 */
export async function cobrosDePropuestaAction(quotationId: string): Promise<{ success: true; datos: CobrosDePropuesta } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado" };
    const puede = await hasPermission(session.user.id, session.user.role as Role, "crm.payments.view");
    if (!puede) return { success: false, error: "No tienes permiso para ver pagos" };
    if (typeof quotationId !== "string" || !quotationId || quotationId.length > 40) return { success: false, error: "Propuesta no válida" };

    const q = await prisma.quotation.findFirst({
        where: { id: quotationId, userId: session.user.id, isDeleted: false },
        select: {
            total: true, totalPaid: true,
            payments: {
                where: { status: { in: ["PAID", "PENDING", "OVERDUE"] } },
                select: { id: true, amount: true, method: true, status: true, paidAt: true, dueDate: true, reference: true, installmentNumber: true, totalInstallments: true },
                orderBy: { paidAt: "desc" },
            },
        },
    });
    if (!q) return { success: false, error: "Propuesta no encontrada" };

    const ahora = new Date();
    return {
        success: true,
        datos: {
            total: q.total,
            pagado: q.totalPaid,
            pagos: q.payments.filter((p) => p.status === "PAID").map((p) => ({
                id: p.id, monto: p.amount, metodo: p.method, fecha: p.paidAt.toISOString(), referencia: p.reference,
                numero: p.installmentNumber, de: p.totalInstallments,
            })),
            cuotas: q.payments
                .filter((p) => p.status !== "PAID")
                .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))
                .map((p) => ({
                    id: p.id, monto: p.amount, numero: p.installmentNumber, de: p.totalInstallments,
                    vence: p.dueDate?.toISOString() ?? null,
                    estado: cuotaAtrasada(p.status, p.dueDate, ahora) ? "OVERDUE" as const : "PENDING" as const,
                })),
        },
    };
}
