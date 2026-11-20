"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoalForm, type GoalData } from "@/modules/finance/components/GoalForm";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas } from "@/modules/finance/components/Piezas";
import { ERROR, TARJETA } from "@/modules/finance/components/estilos";

export default function NewGoalPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (data: GoalData) => {
        setError(null);
        const res = await fetch("/api/finance/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al crear meta");
            return;
        }

        router.push("/admin/finance/goals");
    };

    return (
        <div className="max-w-2xl pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas
                titulo="Nueva meta de ahorro"
                bajada="Define un objetivo financiero y empieza a ahorrar"
            />

            {error && (
                <p role="alert" className={`${ERROR} mt-6`}>
                    {error}
                </p>
            )}

            <div className={`${TARJETA} mt-6 p-4 sm:p-6`}>
                <GoalForm onSubmit={handleSubmit} onCancel={() => router.push("/admin/finance/goals")} />
            </div>
        </div>
    );
}
