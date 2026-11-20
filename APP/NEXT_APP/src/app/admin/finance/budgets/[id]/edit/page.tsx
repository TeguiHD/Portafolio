"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { BudgetForm, type BudgetData } from "@/modules/finance/components/BudgetForm";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas } from "@/modules/finance/components/Piezas";
import { ERROR, TARJETA } from "@/modules/finance/components/estilos";

interface PageProps {
    params: Promise<{ id: string }>;
}

interface Budget extends BudgetData {
    id: string;
}

export default function EditBudgetPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [budget, setBudget] = useState<Budget | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBudget = async () => {
            try {
                const res = await fetch(`/api/finance/budgets/${id}`);
                if (!res.ok) throw new Error("Presupuesto no encontrado");
                const { data } = await res.json();
                setBudget(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };
        fetchBudget();
    }, [id]);

    const handleSubmit = async (data: BudgetData) => {
        setError(null);
        const res = await fetch(`/api/finance/budgets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al actualizar presupuesto");
            return;
        }

        router.push("/admin/finance/budgets");
    };

    // El id no tiene nombre en las migas: este tramo hace que el enlace diga «Volver a Presupuestos».
    const volver = <FinanceBreadcrumbs extraItems={[{ label: "Editar", href: `/admin/finance/budgets/${id}/edit` }]} />;

    if (loading) {
        return (
            <div className="max-w-2xl">
                {volver}
                <CargandoFinanzas texto="Cargando presupuesto..." />
            </div>
        );
    }

    if (error && !budget) {
        return (
            <div className="max-w-2xl">
                {volver}
                <p role="alert" className={ERROR}>
                    {error}
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl pb-8">
            {volver}

            <CabeceraFinanzas titulo="Editar presupuesto" bajada={budget?.name} />

            {error && (
                <p role="alert" className={`${ERROR} mt-6`}>
                    {error}
                </p>
            )}

            <div className={`${TARJETA} mt-6 p-4 sm:p-6`}>
                <BudgetForm
                    budget={budget || undefined}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/admin/finance/budgets")}
                />
            </div>
        </div>
    );
}
