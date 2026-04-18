import { verifyAdmin } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/permission-check";
import type { Role } from '@/generated/prisma/client';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", minimumFractionDigits: 0,
    }).format(amount);
}

export default async function PagosPage() {
    const session = await verifyAdmin();

    const canView = await hasPermission(
        session.user.id,
        session.user.role as Role,
        "crm.payments.view"
    );
    if (!canView) redirect("/admin/gestion-comercial");

    // Fetch payments from quotations that belong to this user
    const payments = await prisma.quotationPayment.findMany({
        where: {
            quotation: { userId: session.user.id },
        },
        include: {
            quotation: {
                select: {
                    id: true,
                    projectName: true,
                    total: true,
                    client: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const recentPayments = payments.slice(0, 20);

    const METHOD_LABELS: Record<string, string> = {
        TRANSFER: "Transferencia",
        CASH: "Efectivo",
        CHECK: "Cheque",
        CREDIT_CARD: "Tarjeta",
        DEBIT_CARD: "Débito",
        OTHER: "Otro",
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Pagos</h1>
                <p className="text-neutral-400 mt-1">
                    Control de pagos recibidos por cotizaciones
                </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                    <p className="text-xs text-neutral-500 mb-1">Total Recibido</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalReceived)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">N° de Pagos</p>
                    <p className="text-lg font-bold text-white">{payments.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">Pago Promedio</p>
                    <p className="text-lg font-bold text-white">
                        {payments.length > 0 ? formatCurrency(totalReceived / payments.length) : "$0"}
                    </p>
                </div>
            </div>

            {/* Payments list */}
            {recentPayments.length === 0 ? (
                <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-4xl mb-3">💰</div>
                    <p className="text-neutral-300 font-medium">No hay pagos registrados</p>
                    <p className="text-sm text-neutral-500 mt-2">
                        Los pagos se registran desde el detalle de cada cotización
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {recentPayments.map(payment => (
                        <div key={payment.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                    {payment.quotation.projectName || "Sin nombre"}
                                </p>
                                <p className="text-[10px] text-neutral-500">
                                    {payment.quotation.client?.name || "—"} ·{" "}
                                    {METHOD_LABELS[payment.method] || payment.method} ·{" "}
                                    {new Date(payment.paidAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                                    {payment.reference && <span className="text-neutral-600"> · Ref: {payment.reference}</span>}
                                    {payment.isPartial && <span className="text-amber-400 ml-1">· Parcial ({payment.installmentNumber}/{payment.totalInstallments})</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">
                                    +{formatCurrency(payment.amount)}
                                </span>
                                {payment.receiptUrl && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        📎 Comprobante
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
