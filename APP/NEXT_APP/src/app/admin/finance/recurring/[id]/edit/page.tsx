"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecurringForm } from "@/modules/finance/components";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas } from "@/modules/finance/components/Piezas";
import { ENLACE, SUAVE, TARJETA } from "@/modules/finance/components/estilos";

/** Lo que devuelve GET /api/finance/recurring/[id] (el tipo lo deriva la API de la categoría). */
interface RecurringPayment {
    id: string;
    name: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: string;
    dayOfMonth: number | null;
    startDate: string;
    endDate: string | null;
    nextDueDate: string | null;
    isActive: boolean;
    reminderDays: number;
    categoryId: string | null;
    accountId: string | null;
}

export default function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [payment, setPayment] = useState<RecurringPayment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPayment() {
            try {
                const res = await fetch(`/api/finance/recurring/${id}`);
                if (!res.ok) throw new Error("No se pudo cargar el pago");
                const data = await res.json();
                setPayment(data.data);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }
        fetchPayment();
    }, [id]);

    const handleSuccess = () => {
        router.push("/admin/finance/recurring");
    };

    // La ruta /recurring/[id]/edit no tiene nombre propio: «Editar» hace que las migas muestren «Volver a Recurrentes».
    const volver = <FinanceBreadcrumbs extraItems={[{ label: "Editar", href: `/admin/finance/recurring/${id}/edit` }]} />;

    if (loading) {
        return (
            <div className="max-w-2xl pb-8">
                {volver}
                <CargandoFinanzas texto="Cargando pago recurrente…" />
            </div>
        );
    }

    if (error || !payment) {
        return (
            <div className="max-w-2xl pb-8">
                {volver}
                <div role="alert" className="py-16 text-center">
                    <p className="font-medium text-[var(--txt)]">Error al cargar</p>
                    <p className={`${SUAVE} mt-1`}>{error || "Pago no encontrado"}</p>
                    <Link href="/admin/finance/recurring" className={`mt-4 inline-block text-sm ${ENLACE}`}>
                        Volver a pagos recurrentes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl pb-8">
            {volver}

            <CabeceraFinanzas titulo="Editar pago recurrente" bajada={payment.name} />

            <div className={`${TARJETA} mt-6 p-5 sm:p-6`}>
                <RecurringForm
                    initialData={{
                        id: payment.id,
                        name: payment.name,
                        amount: payment.amount,
                        type: payment.type,
                        frequency: payment.frequency,
                        dayOfMonth: payment.dayOfMonth,
                        startDate: payment.startDate.split("T")[0],
                        endDate: payment.endDate?.split("T")[0] || "",
                        isActive: payment.isActive,
                        reminderDays: payment.reminderDays,
                        categoryId: payment.categoryId || "",
                        accountId: payment.accountId || "",
                    }}
                    onSuccess={handleSuccess}
                    onCancel={() => router.push("/admin/finance/recurring")}
                />
            </div>
        </div>
    );
}
