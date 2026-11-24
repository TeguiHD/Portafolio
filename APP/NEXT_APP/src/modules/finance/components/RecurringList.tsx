"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pause, Pencil, Play, Plus, Repeat, SkipForward, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { BAJA, BOTON, CIFRA, FICHA, GIRA, ICONO, ICONO_PELIGRO, LISTA, MARCA, MARCA_NEUTRA, SUBE, VACIO } from "./estilos";
import { fechaDia } from "../fechas";

interface RecurringPayment {
    id: string;
    name: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: string;
    nextDueDate: string | null;
    daysUntilDue: number | null;
    status: "upcoming" | "due_soon" | "overdue" | "inactive";
    isActive: boolean;
    category?: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    } | null;
    account?: {
        id: string;
        name: string;
        icon: string | null;
    } | null;
}

interface RecurringListProps {
    payments: RecurringPayment[];
    onMarkPaid?: (id: string) => Promise<void>;
    onSkip?: (id: string) => Promise<void>;
    onToggleActive?: (id: string, isActive: boolean) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

const FREQUENCY_LABELS: Record<string, string> = {
    DAILY: "Diario",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    YEARLY: "Anual",
};

/** Estado del vencimiento: siempre con texto; el color solo acompaña. */
const STATUS_CONFIG: Record<RecurringPayment["status"], { clase: string; label: string }> = {
    upcoming: { clase: MARCA_NEUTRA, label: "Próximo" },
    due_soon: { clase: `${MARCA} bg-amber-500/10 text-amber-400`, label: "Vence pronto" },
    overdue: { clase: `${MARCA} bg-red-500/10 text-red-400`, label: "Vencido" },
    inactive: { clase: MARCA_NEUTRA, label: "Pausado" },
};

function plural(n: number) {
    return `${n} día${n === 1 ? "" : "s"}`;
}

export function RecurringList({ payments, onMarkPaid, onSkip, onToggleActive, onDelete }: RecurringListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<string | null>(null);

    const handleAction = async (id: string, action: "mark_paid" | "skip" | "toggle" | "delete", isActive?: boolean) => {
        // Se confirma antes de marcar la fila como «procesando», para que no quede en espera mientras se decide.
        if (action === "delete" && !(await confirmar({ titulo: "¿Eliminar este pago recurrente?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;
        setProcessingId(id);
        setActionType(action);
        try {
            if (action === "mark_paid" && onMarkPaid) await onMarkPaid(id);
            else if (action === "skip" && onSkip) await onSkip(id);
            else if (action === "toggle" && onToggleActive) await onToggleActive(id, !isActive);
            else if (action === "delete" && onDelete) await onDelete(id);
        } finally {
            setProcessingId(null);
            setActionType(null);
        }
    };

    if (payments.length === 0) {
        return (
            <div className={VACIO}>
                <Repeat aria-hidden="true" className="mx-auto mb-3 size-[18px] text-[var(--mut)]" />
                <p className="font-medium text-[var(--txt)]">Sin pagos recurrentes</p>
                <p className="mt-1 text-sm">Configura tus gastos e ingresos fijos para mejor control</p>
                <Link href="/admin/finance/recurring/new" className={`${BOTON} mt-5`}>
                    <Plus aria-hidden="true" className="size-4" />
                    Crear pago recurrente
                </Link>
            </div>
        );
    }

    return (
        <ul className={`${LISTA} m-0 list-none p-0`}>
            {payments.map((payment) => {
                const config = STATUS_CONFIG[payment.status];
                const isProcessing = processingId === payment.id;
                const dias = payment.daysUntilDue;
                const venceHoy = payment.status === "due_soon" && dias === 0;
                const frecuencia = FREQUENCY_LABELS[payment.frequency.toUpperCase()] ?? payment.frequency;
                const esIngreso = payment.type === "INCOME";

                return (
                    <li
                        key={payment.id}
                        className="flex flex-col gap-3 border-b border-[var(--linea)] px-1 py-3.5 sm:flex-row sm:items-center sm:gap-4"
                    >
                        {/* Ícono e información */}
                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                            <span aria-hidden="true" className={FICHA}>
                                {payment.category?.icon || <Repeat className="size-[18px]" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <h3 className={`min-w-0 truncate font-medium ${payment.isActive ? "text-[var(--txt)]" : "text-[var(--mut)]"}`}>
                                        {payment.name}
                                    </h3>
                                    <span className={config.clase}>{venceHoy ? "Vence hoy" : config.label}</span>
                                </div>
                                <p className="mt-0.5 flex flex-wrap gap-x-1 text-sm text-[var(--mut)]">
                                    <span>{frecuencia}{payment.category || payment.account ? "," : ""}</span>
                                    {payment.category && (
                                        <>
                                            <span className="min-w-0 truncate">{payment.category.name}{payment.account ? "," : ""}</span>
                                        </>
                                    )}
                                    {payment.account && (
                                        <>
                                            <span className="min-w-0 truncate">{payment.account.icon} {payment.account.name}</span>
                                        </>
                                    )}
                                </p>
                                {payment.nextDueDate && payment.isActive && dias !== null && (
                                    <p className={`mt-0.5 text-sm text-[var(--mut)] ${CIFRA}`}>
                                        {dias < 0 ? "Venció el " : "Vence el "}
                                        {fechaDia(payment.nextDueDate, { day: "numeric", month: "short", year: "numeric" })}
                                        {dias < 0 ? ` (hace ${plural(-dias)})` : dias > 0 ? ` (en ${plural(dias)})` : ""}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Monto y acciones (siempre visibles) */}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:flex-col sm:flex-nowrap sm:items-end sm:gap-1">
                            <p className={`text-lg font-semibold ${CIFRA} ${esIngreso ? SUBE : BAJA}`}>
                                {esIngreso ? "+" : "−"}
                                {formatCurrency(payment.amount)}
                                <span className="sr-only">{esIngreso ? " (ingreso)" : " (gasto)"}</span>
                            </p>

                            <div className="flex items-center sm:-mr-2">
                                {payment.isActive && payment.status !== "inactive" && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleAction(payment.id, "mark_paid")}
                                            disabled={isProcessing}
                                            className={ICONO}
                                            aria-label={`Marcar «${payment.name}» como pagado`}
                                            title="Marcar como pagado"
                                        >
                                            {isProcessing && actionType === "mark_paid" ? (
                                                <span aria-hidden="true" className={GIRA} />
                                            ) : (
                                                <Check aria-hidden="true" className="size-[18px]" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAction(payment.id, "skip")}
                                            disabled={isProcessing}
                                            className={ICONO}
                                            aria-label={`Saltar este período de «${payment.name}»`}
                                            title="Saltar este período"
                                        >
                                            <SkipForward aria-hidden="true" className="size-[18px]" />
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleAction(payment.id, "toggle", payment.isActive)}
                                    disabled={isProcessing}
                                    className={ICONO}
                                    aria-label={payment.isActive ? `Pausar «${payment.name}»` : `Activar «${payment.name}»`}
                                    title={payment.isActive ? "Pausar" : "Activar"}
                                >
                                    {payment.isActive ? (
                                        <Pause aria-hidden="true" className="size-[18px]" />
                                    ) : (
                                        <Play aria-hidden="true" className="size-[18px]" />
                                    )}
                                </button>
                                <Link
                                    href={`/admin/finance/recurring/${payment.id}/edit`}
                                    className={ICONO}
                                    aria-label={`Editar «${payment.name}»`}
                                    title="Editar"
                                >
                                    <Pencil aria-hidden="true" className="size-[18px]" />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => handleAction(payment.id, "delete")}
                                    disabled={isProcessing}
                                    className={ICONO_PELIGRO}
                                    aria-label={`Eliminar «${payment.name}»`}
                                    title="Eliminar"
                                >
                                    <Trash2 aria-hidden="true" className="size-[18px]" />
                                </button>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
