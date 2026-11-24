import { requirePagePermission } from "@/lib/page-security";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import { Cifras } from "../cifras";
import { bajada, cajaTabla, cifra, pesos, subtitulo, td, th, thNum, titulo, vacio } from "../estilos";
import RegistrarPago, { type CuotaPendiente, type PropuestaCobrable } from "./registrar-pago";
import { cuotaAtrasada } from "@/modules/admin/cobros";

export const dynamic = "force-dynamic";

const fecha = (d: Date) => d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Santiago" });
const numero = new Intl.NumberFormat("es-CL");

const METHOD_LABELS: Record<string, string> = {
    TRANSFER: "Transferencia",
    CASH: "Efectivo",
    CHECK: "Cheque",
    CREDIT_CARD: "Tarjeta de crédito",
    DEBIT_CARD: "Tarjeta de débito",
    PAYPAL: "PayPal",
    CRYPTO: "Criptomonedas",
    OTHER: "Otro",
};

// Cada estado con su nombre escrito: el color solo acompaña.
const ESTADO: Record<string, { nombre: string; clase: string; monto: string }> = {
    PAID: { nombre: "Pagado", clase: "text-emerald-400", monto: "text-[var(--txt)]" },
    PENDING: { nombre: "Por cobrar", clase: "text-amber-400", monto: "text-[var(--mut)]" },
    OVERDUE: { nombre: "Atrasada", clase: "text-red-400", monto: "text-[var(--mut)]" },
    CANCELLED: { nombre: "Anulada", clase: "text-[var(--mut)]", monto: "text-[var(--mut)] line-through" },
};

export default async function PagosPage({ searchParams }: { searchParams: Promise<{ registrar?: string | string[] }> }) {
    const session = await requirePagePermission("crm.payments.view");
    const { registrar } = await searchParams;
    const userId = session.user.id;

    const filtro = { quotation: { userId, isDeleted: false } };
    // El total es de todos los pagos, no solo de los que se listan.
    const [payments, suma, puedeRegistrar] = await Promise.all([
        prisma.quotationPayment.findMany({
            where: filtro,
            select: {
                id: true, amount: true, method: true, status: true, paidAt: true, dueDate: true, reference: true,
                installmentNumber: true, totalInstallments: true, receiptUrl: true,
                quotation: { select: { projectName: true, folio: true, client: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
        }),
        prisma.quotationPayment.aggregate({ where: { ...filtro, status: "PAID" }, _sum: { amount: true }, _count: true }),
        hasPermission(userId, session.user.role, "crm.payments.manage"),
    ]);

    // Propuestas sobre las que se puede registrar: aprobadas o ya completas (para corregir cuotas), con sus cuotas por cobrar.
    const propuestas: PropuestaCobrable[] = puedeRegistrar
        ? (await prisma.quotation.findMany({
            where: { userId, isDeleted: false, status: { in: ["APPROVED", "COMPLETED"] } },
            select: {
                id: true, folio: true, projectName: true, clientName: true, total: true, totalPaid: true,
                client: { select: { name: true } },
                payments: {
                    where: { status: { in: ["PENDING", "OVERDUE"] } },
                    select: { id: true, amount: true, installmentNumber: true, totalInstallments: true, dueDate: true, status: true },
                    orderBy: { dueDate: "asc" },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: 100,
        })).map((q) => ({
            id: q.id,
            folio: q.folio,
            proyecto: q.projectName,
            cliente: q.client?.name || q.clientName,
            total: q.total,
            pagado: q.totalPaid,
            cuotas: q.payments.map((c) => ({
                id: c.id, monto: c.amount, numero: c.installmentNumber, de: c.totalInstallments,
                vence: c.dueDate?.toISOString() ?? null, estado: (cuotaAtrasada(c.status, c.dueDate) ? "OVERDUE" : "PENDING") as CuotaPendiente["estado"],
            })),
        }))
        : [];

    // «Recibido» es solo lo pagado: las cuotas por cobrar o atrasadas no son dinero recibido.
    const totalReceived = suma._sum.amount ?? 0;
    const pagosHechos = suma._count;

    return (
        <div className="max-w-[1180px] space-y-9">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={titulo}>Pagos</h1>
                    <p className={bajada}>Lo cobrado y lo que falta cobrar de tus propuestas</p>
                </div>
                {puedeRegistrar && <RegistrarPago propuestas={propuestas} abrirAlCargar={registrar === "1"} />}
            </header>

            <Cifras nombre="Resumen de pagos" items={[
                { etiqueta: "total recibido", valor: pesos(totalReceived) },
                { etiqueta: "pagos recibidos", valor: numero.format(pagosHechos) },
                { etiqueta: "pago promedio", valor: pesos(pagosHechos > 0 ? totalReceived / pagosHechos : 0) },
            ]} />

            <section aria-labelledby="pagos-ultimos">
                <h2 id="pagos-ultimos" className={subtitulo}>
                    Últimos pagos <small className="font-mono text-[12.5px] font-medium">{payments.length}</small>
                </h2>
                {payments.length === 0 ? (
                    <div className={vacio}>
                        <p className="text-[var(--txt)]">No hay pagos registrados</p>
                        <p className="mt-1 text-sm">
                            {puedeRegistrar ? "Usa «Registrar pago» o regístralo desde la propuesta." : "Los pagos se registran desde cada propuesta."}
                        </p>
                    </div>
                ) : (
                    // En celular la tabla deja cliente, método, fecha y estado dentro de la primera y la última columna.
                    <div className={cajaTabla} tabIndex={0} role="region" aria-labelledby="pagos-ultimos">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[var(--linea-2)]">
                                    <th scope="col" className={th}>Propuesta</th>
                                    <th scope="col" className={`${th} max-sm:hidden`}>Cliente</th>
                                    <th scope="col" className={`${th} max-md:hidden`}>Método</th>
                                    <th scope="col" className={`${th} max-sm:hidden`}>Fecha</th>
                                    <th scope="col" className={`${th} max-sm:hidden`}>Estado</th>
                                    <th scope="col" className={thNum}>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(payment => {
                                    // Por cobrar con el día de vencimiento ya pasado = atrasada, como en «Hoy» y en Comercial.
                                    const estado = cuotaAtrasada(payment.status, payment.dueDate) ? ESTADO.OVERDUE : ESTADO[payment.status] ?? ESTADO.PAID;
                                    const porCobrar = payment.status !== "PAID";
                                    const cuota = payment.installmentNumber && payment.totalInstallments ? `Cuota ${payment.installmentNumber} de ${payment.totalInstallments}` : null;
                                    const cliente = payment.quotation.client?.name || "—";
                                    const metodo = METHOD_LABELS[payment.method] || payment.method;
                                    const cuando = porCobrar && payment.dueDate
                                        ? `${payment.status === "CANCELLED" ? "vencía" : estado === ESTADO.OVERDUE ? "venció" : "vence"} ${fecha(payment.dueDate)}`
                                        : fecha(payment.paidAt);
                                    const extra = [cuota?.toLowerCase(), payment.reference ? `Ref.: ${payment.reference}` : null, payment.receiptUrl ? "con comprobante" : null].filter(Boolean).join(", ");
                                    return (
                                        <tr key={payment.id} className="border-b border-[var(--linea)]">
                                            <th scope="row" className={`${td} text-left font-normal`}>
                                                <span className="block font-medium text-[var(--txt)]">{payment.quotation.projectName || "Sin nombre"}</span>
                                                <span className="mt-0.5 block text-[13px] text-[var(--mut)]">
                                                    <span className="font-mono">{payment.quotation.folio}</span>
                                                    {extra && <>, {extra}</>}
                                                </span>
                                                <span className="mt-0.5 block text-[13px] text-[var(--mut)] sm:hidden">{cliente}, {metodo.toLowerCase()}, {cuando}</span>
                                            </th>
                                            <td className={`${td} text-[var(--txt)] max-sm:hidden`}>{cliente}</td>
                                            <td className={`${td} text-[var(--mut)] max-md:hidden`}>{metodo}</td>
                                            <td className={`${td} whitespace-nowrap text-[var(--mut)] max-sm:hidden`}>{cuando}</td>
                                            <td className={`${td} whitespace-nowrap font-medium max-sm:hidden ${estado.clase}`}>{estado.nombre}</td>
                                            <td className={`${td} ${cifra}`}>
                                                <span className={`font-semibold ${estado.monto}`}>{porCobrar ? "" : "+"}{pesos(payment.amount)}</span>
                                                <span className={`block text-[13px] font-medium sm:hidden ${estado.clase}`}>{estado.nombre}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
