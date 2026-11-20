"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BudgetForm, type BudgetData } from "@/modules/finance/components/BudgetForm";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas } from "@/modules/finance/components/Piezas";
import { ERROR, TARJETA } from "@/modules/finance/components/estilos";

export default function NewBudgetPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: BudgetData) => {
        setError(null);
        const res = await fetch("/api/finance/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al crear presupuesto");
            return;
        }

        router.push("/admin/finance/budgets");
    };

    return (
        <div className="max-w-2xl pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas
                titulo="Nuevo presupuesto"
                bajada="Define un límite de gasto para controlar tus finanzas"
            />

            {error && (
                <p role="alert" className={`${ERROR} mt-6`}>
                    {error}
                </p>
            )}

            <div className={`${TARJETA} mt-6 p-4 sm:p-6`}>
                <BudgetForm onSubmit={handleSubmit} onCancel={() => router.push("/admin/finance/budgets")} />
            </div>
        </div>
    );
}
