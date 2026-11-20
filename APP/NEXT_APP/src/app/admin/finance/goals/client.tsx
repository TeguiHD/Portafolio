"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { GoalList } from "@/modules/finance/components/GoalList";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas, CifrasFinanzas } from "@/modules/finance/components/Piezas";
import { BOTON, BOTON_SEC, CASILLA, ERROR } from "@/modules/finance/components/estilos";
import { formatCurrency } from "@/lib/currency";

interface Goal {
    id: string;
    name: string;
    icon: string;
    color: string;
    targetAmount: number;
    currentAmount: number;
    percentage: number;
    remaining: number;
    daysLeft: number | null;
    requiredDaily: number | null;
    requiredMonthly: number | null;
    isOverdue: boolean;
    completed: boolean;
    deadline: string | null;
}

interface GoalMeta {
    total: number;
    active: number;
    completed: number;
    totalTarget: number;
    totalSaved: number;
    overallProgress: number;
}

export default function GoalsPageClient() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [meta, setMeta] = useState<GoalMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);
    // No hay <Toaster> montado en el panel: los hitos se avisan en la página.
    const [aviso, setAviso] = useState("");

    const fetchGoals = useCallback(async () => {
        try {
            const res = await fetch(`/api/finance/goals?includeCompleted=${showCompleted}`);
            if (!res.ok) throw new Error("Error al cargar metas");
            const { data, meta } = await res.json();
            setGoals(data || []);
            setMeta(meta || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [showCompleted]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/finance/goals/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar");
        setGoals((prev) => prev.filter((g) => g.id !== id));
    };

    const handleContribute = async (id: string, amount: number) => {
        const res = await fetch(`/api/finance/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
        });
        if (!res.ok) throw new Error("Error al contribuir");
        const { data: _data, meta: contributeMeta } = await res.json();

        // Aviso si se alcanzó un hito
        setAviso("");
        if (contributeMeta?.achievedMilestones?.length > 0) {
            const milestone = contributeMeta.achievedMilestones[contributeMeta.achievedMilestones.length - 1];
            if (milestone === 100) {
                setAviso("¡Has completado tu meta!");
            } else {
                setAviso(`¡Has alcanzado el ${milestone}% de tu meta!`);
            }
        }

        // Refresh to get updated data
        fetchGoals();
    };

    // Solo la primera carga ocupa la pantalla; al cambiar el filtro se recarga la lista sin perder el foco.
    if (loading && !meta) {
        return (
            <div className="max-w-[1180px]">
                <FinanceBreadcrumbs />
                <CargandoFinanzas texto="Cargando metas de ahorro..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1180px]">
                <FinanceBreadcrumbs />
                <div role="alert" className="py-16 text-center">
                    <p className={`${ERROR} inline-block`}>{error}</p>
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setLoading(true);
                                fetchGoals();
                            }}
                            className={`${BOTON_SEC} mt-3`}
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Metas de ahorro" bajada="Visualiza y alcanza tus objetivos financieros">
                <Link href="/admin/finance/goals/new" className={BOTON}>
                    <Plus aria-hidden="true" className="size-4" />
                    Nueva meta
                </Link>
            </CabeceraFinanzas>

            {/* Resumen. Sin «Mostrar metas completadas» la API no cuenta las completadas: esa cifra solo sale con el filtro. */}
            {meta && (meta.active > 0 || meta.completed > 0) && (
                <div className="mt-8">
                    <CifrasFinanzas
                        etiqueta="Resumen de metas"
                        cifras={[
                            { nombre: "Metas activas", valor: meta.active },
                            ...(showCompleted ? [{ nombre: "Completadas", valor: meta.completed }] : []),
                            {
                                nombre: "Total ahorrado",
                                valor: formatCurrency(meta.totalSaved),
                                nota: meta.totalTarget > 0 ? `de ${formatCurrency(meta.totalTarget)}` : undefined,
                            },
                            { nombre: "Progreso global", valor: `${meta.overallProgress} %` },
                        ]}
                    />
                </div>
            )}

            <p
                role="status"
                className={aviso ? "mt-6 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400" : "sr-only"}
            >
                {aviso}
            </p>

            {/* Filtro: siempre visible, si no las metas completadas no se podrían ver nunca */}
            <div className="mt-6 mb-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--mut)] sm:min-h-10">
                    <input
                        type="checkbox"
                        checked={showCompleted}
                        onChange={(e) => {
                            setShowCompleted(e.target.checked);
                            setLoading(true);
                        }}
                        className={CASILLA}
                    />
                    Mostrar metas completadas
                </label>
            </div>

            {loading ? (
                <CargandoFinanzas texto="Cargando metas de ahorro..." />
            ) : (
                <GoalList goals={goals} onDelete={handleDelete} onContribute={handleContribute} />
            )}
        </div>
    );
}
