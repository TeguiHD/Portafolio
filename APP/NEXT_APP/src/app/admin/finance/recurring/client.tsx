"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { RecurringList } from "@/modules/finance/components";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas, CifrasFinanzas } from "@/modules/finance/components/Piezas";
import { BOTON, ERROR, OPCION, OPCION_NO, OPCION_SI } from "@/modules/finance/components/estilos";

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
    category?: { id: string; name: string; icon: string | null; color: string | null } | null;
    account?: { id: string; name: string; icon: string | null } | null;
}

/** Resumen tal como lo entrega GET /api/finance/recurring. */
interface Meta {
    total: number;
    active: number;
    totalMonthlyExpenses: number;
    upcomingCount: number;
    overdueCount: number;
}

const FILTROS_ESTADO = [
    { valor: "all", texto: "Todos" },
    { valor: "active", texto: "Activos" },
    { valor: "inactive", texto: "Pausados" },
] as const;

const FILTROS_TIPO = [
    { valor: "all", texto: "Todos" },
    { valor: "EXPENSE", texto: "Gastos" },
    { valor: "INCOME", texto: "Ingresos" },
] as const;

export default function RecurringPaymentsPageClient() {
    const [payments, setPayments] = useState<RecurringPayment[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
    const [aviso, setAviso] = useState<string | null>(null);

    const fetchPayments = useCallback(async () => {
        try {
            // Con los pausados: si no, el filtro «Pausados» queda siempre vacío y un pago pausado no se puede reactivar.
            const res = await fetch("/api/finance/recurring?includeInactive=true");
            const data = await res.json();
            setPayments(data.data || []);
            setMeta(data.meta || null);
        } catch (error) {
            console.error("Error fetching recurring payments:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    /** Recarga si salió bien; si no, muestra el motivo que da la API. */
    const revisar = async (res: Response, accion: string) => {
        if (res.ok) {
            setAviso(null);
            await fetchPayments();
            return;
        }
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setAviso(`No se pudo ${accion}${body?.error ? `: ${body.error}` : "."}`);
        // 409: ya estaba registrado (doble toque u otra pestaña): la lista se trae de nuevo para mostrar lo vigente.
        if (res.status === 409) await fetchPayments();
    };

    const handleMarkPaid = async (id: string) => {
        const res = await fetch(`/api/finance/recurring/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_paid" }),
        });
        await revisar(res, "marcar el pago como pagado");
    };

    const handleSkip = async (id: string) => {
        const res = await fetch(`/api/finance/recurring/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "skip" }),
        });
        await revisar(res, "saltar el período");
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        const res = await fetch(`/api/finance/recurring/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        });
        await revisar(res, isActive ? "activar el pago" : "pausar el pago");
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/finance/recurring/${id}`, { method: "DELETE" });
        await revisar(res, "eliminar el pago");
    };

    const filteredPayments = payments.filter((p) => {
        if (filter === "active" && !p.isActive) return false;
        if (filter === "inactive" && p.isActive) return false;
        if (typeFilter !== "all" && p.type !== typeFilter) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="max-w-[1180px] pb-8">
                <FinanceBreadcrumbs />
                <CargandoFinanzas texto="Cargando pagos recurrentes…" />
            </div>
        );
    }

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Pagos recurrentes" bajada="Gestiona tus gastos e ingresos fijos">
                <Link href="/admin/finance/recurring/new" className={BOTON}>
                    <Plus aria-hidden="true" className="size-4" />
                    Nuevo pago recurrente
                </Link>
            </CabeceraFinanzas>

            {meta && (
                <div className="mt-8">
                    <CifrasFinanzas
                        etiqueta="Resumen de pagos recurrentes"
                        cifras={[
                            {
                                nombre: "Activos",
                                valor: meta.active ?? 0,
                                nota: meta.total > (meta.active ?? 0) ? `de ${meta.total}` : undefined,
                            },
                            {
                                nombre: "Equivalente mensual",
                                valor: formatCurrency(meta.totalMonthlyExpenses ?? 0),
                            },
                            { nombre: "Vencen en 30 días", valor: meta.upcomingCount ?? 0 },
                            {
                                nombre: "Vencidos",
                                valor: meta.overdueCount ?? 0,
                                tono: (meta.overdueCount ?? 0) > 0 ? "baja" : undefined,
                            },
                        ]}
                    />
                </div>
            )}

            {/* Filtros */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
                    {FILTROS_ESTADO.map((f) => (
                        <button
                            key={f.valor}
                            type="button"
                            onClick={() => setFilter(f.valor)}
                            aria-pressed={filter === f.valor}
                            className={`${OPCION} ${filter === f.valor ? OPCION_SI : OPCION_NO}`}
                        >
                            {f.texto}
                        </button>
                    ))}
                </div>
                <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
                    {FILTROS_TIPO.map((t) => (
                        <button
                            key={t.valor}
                            type="button"
                            onClick={() => setTypeFilter(t.valor)}
                            aria-pressed={typeFilter === t.valor}
                            className={`${OPCION} ${typeFilter === t.valor ? OPCION_SI : OPCION_NO}`}
                        >
                            {t.texto}
                        </button>
                    ))}
                </div>
            </div>

            {aviso && <p role="alert" className={`${ERROR} mt-4`}>{aviso}</p>}

            {/* Lista */}
            <section aria-labelledby="rec-lista" className="mt-6">
                <h2 id="rec-lista" className="sr-only">Listado de pagos</h2>
                <RecurringList
                    payments={filteredPayments}
                    onMarkPaid={handleMarkPaid}
                    onSkip={handleSkip}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                />
            </section>
        </div>
    );
}
