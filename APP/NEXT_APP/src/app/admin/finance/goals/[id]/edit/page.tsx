"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { GoalForm, type GoalData } from "@/modules/finance/components/GoalForm";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas } from "@/modules/finance/components/Piezas";
import { ERROR, TARJETA } from "@/modules/finance/components/estilos";

interface PageProps {
    params: Promise<{ id: string }>;
}

interface Goal extends GoalData {
    id: string;
}

export default function EditGoalPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [goal, setGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGoal = async () => {
            try {
                const res = await fetch(`/api/finance/goals/${id}`);
                if (!res.ok) throw new Error("Meta no encontrada");
                const { data } = await res.json();
                setGoal(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        };
        fetchGoal();
    }, [id]);

    const handleSubmit = async (data: GoalData) => {
        setError(null);
        const res = await fetch(`/api/finance/goals/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const { error } = await res.json();
            setError(error || "Error al actualizar meta");
            return;
        }

        router.push("/admin/finance/goals");
    };

    // El id no tiene nombre en las migas: este tramo hace que el enlace diga «Volver a Metas».
    const volver = <FinanceBreadcrumbs extraItems={[{ label: "Editar", href: `/admin/finance/goals/${id}/edit` }]} />;

    if (loading) {
        return (
            <div className="max-w-2xl">
                {volver}
                <CargandoFinanzas texto="Cargando meta..." />
            </div>
        );
    }

    if (error && !goal) {
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

            <CabeceraFinanzas
                titulo="Editar meta"
                bajada={
                    goal ? (
                        <span className="flex min-w-0 items-center gap-2">
                            <span aria-hidden="true">{goal.icon}</span>
                            <span className="truncate">{goal.name}</span>
                        </span>
                    ) : undefined
                }
            />

            {error && (
                <p role="alert" className={`${ERROR} mt-6`}>
                    {error}
                </p>
            )}

            <div className={`${TARJETA} mt-6 p-4 sm:p-6`}>
                <GoalForm goal={goal || undefined} onSubmit={handleSubmit} onCancel={() => router.push("/admin/finance/goals")} />
            </div>
        </div>
    );
}
