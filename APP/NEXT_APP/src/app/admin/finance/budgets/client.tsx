"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BudgetList } from "@/modules/finance/components/BudgetList";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas, CifrasFinanzas } from "@/modules/finance/components/Piezas";
import { BOTON, BOTON_SEC, ERROR, SECCION, SUAVE } from "@/modules/finance/components/estilos";

interface Budget {
    id: string;
    name: string;
    amount: number;
    period: string;
    currentSpent: number;
    percentage: number;
    remaining: number;
    status: "ok" | "warning" | "danger" | "exceeded";
    isActive: boolean;
    category?: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    } | null;
}

interface BudgetMeta {
    total: number;
    onTrack: number;
    warning: number;
    exceeded: number;
    totalBudgeted: number;
    totalSpent: number;
}

export default function BudgetsPageClient() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [meta, setMeta] = useState<BudgetMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBudgets = useCallback(async () => {
        try {
            // Con los pausados: sin esto desaparecían al recargar y no había forma de reactivarlos.
            const res = await fetch("/api/finance/budgets?includeInactive=true");
            if (!res.ok) throw new Error("Error al cargar presupuestos");
            const { data, meta } = await res.json();
            setBudgets(data || []);
            setMeta(meta || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/finance/budgets/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar");
        setBudgets((prev) => prev.filter((b) => b.id !== id));
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        const res = await fetch(`/api/finance/budgets/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        });
        if (!res.ok) throw new Error("Error al actualizar");
        const { data } = await res.json();
        setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: data.isActive } : b)));
    };

    if (loading) {
        return (
            <div className="max-w-[1180px]">
                <FinanceBreadcrumbs />
                <CargandoFinanzas texto="Cargando presupuestos..." />
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
                                fetchBudgets();
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

    // La API de la lista no manda `meta`: el resumen se cuenta con los presupuestos activos ya cargados.
    const activos = budgets.filter((b) => b.isActive);
    const pausados = budgets.filter((b) => !b.isActive);
    const resumen = meta ?? {
        total: activos.length,
        onTrack: activos.filter((b) => b.status === "ok").length,
        warning: activos.filter((b) => b.status === "warning" || b.status === "danger").length,
        exceeded: activos.filter((b) => b.status === "exceeded").length,
    };

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Presupuestos" bajada="Controla tus límites de gasto">
                <Link href="/admin/finance/budgets/new" className={BOTON}>
                    <Plus aria-hidden="true" className="size-4" />
                    Nuevo presupuesto
                </Link>
            </CabeceraFinanzas>

            {budgets.length > 0 && (
                <div className="mt-8">
                    <CifrasFinanzas
                        etiqueta="Resumen de presupuestos"
                        cifras={[
                            { nombre: "Presupuestos activos", valor: resumen.total },
                            { nombre: "En buen estado", valor: resumen.onTrack },
                            { nombre: "Con advertencia", valor: resumen.warning },
                            { nombre: "Excedidos", valor: resumen.exceeded, tono: resumen.exceeded > 0 ? "baja" : undefined },
                        ]}
                    />
                </div>
            )}

            <div className="mt-8">
                {activos.length > 0 || pausados.length === 0 ? (
                    <BudgetList budgets={activos} onDelete={handleDelete} onToggleActive={handleToggleActive} />
                ) : (
                    <p className={SUAVE}>No tienes presupuestos activos. Reactiva uno de los pausados o crea uno nuevo.</p>
                )}
            </div>

            {/* Pausados aparte: se reactivan con el botón de reproducir de cada fila. */}
            {pausados.length > 0 && (
                <section aria-labelledby="presupuestos-pausados" className="mt-10">
                    <h2 id="presupuestos-pausados" className={`${SECCION} mb-2`}>
                        Pausados ({pausados.length})
                    </h2>
                    <BudgetList budgets={pausados} onDelete={handleDelete} onToggleActive={handleToggleActive} />
                </section>
            )}
        </div>
    );
}
