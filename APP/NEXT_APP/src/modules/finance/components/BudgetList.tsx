"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartPie, Pause, Pencil, Play, Trash2, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import { CIFRA, ENLACE, ERROR, FICHA, GIRA, ICONO, ICONO_PELIGRO, LISTA, MARCA_NEUTRA, RIEL, VACIO } from "./estilos";

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

interface BudgetListProps {
    budgets: Budget[];
    onDelete?: (id: string) => Promise<void>;
    onToggleActive?: (id: string, isActive: boolean) => Promise<void>;
}

const PERIOD_LABELS: Record<string, string> = {
    WEEKLY: "Semanal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    YEARLY: "Anual",
};

/** Estado que calcula la API (75 %, 90 % y 100 % del límite): color de la barra y texto que lo acompaña. */
const ESTADO: Record<Budget["status"], { texto: string; barra: string; color: string }> = {
    ok: { texto: "En buen estado", barra: "bg-emerald-500", color: "text-emerald-400" },
    warning: { texto: "Con advertencia", barra: "bg-amber-500", color: "text-amber-400" },
    danger: { texto: "Cerca del límite", barra: "bg-red-500", color: "text-red-400" },
    exceeded: { texto: "Excedido", barra: "bg-red-500", color: "text-red-400" },
};

export function BudgetList({ budgets, onDelete, onToggleActive }: BudgetListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [fallo, setFallo] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!onDelete) return;
        if (!(await confirmar({ titulo: "¿Eliminar este presupuesto?", detalle: "No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;

        setFallo(null);
        setDeletingId(id);
        try {
            await onDelete(id);
        } catch {
            setFallo("No se pudo eliminar el presupuesto. Intenta de nuevo.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        if (!onToggleActive) return;
        setFallo(null);
        setTogglingId(id);
        try {
            await onToggleActive(id, isActive);
        } catch {
            setFallo(isActive ? "No se pudo activar el presupuesto." : "No se pudo pausar el presupuesto.");
        } finally {
            setTogglingId(null);
        }
    };

    if (budgets.length === 0) {
        return (
            <div className={VACIO}>
                <p className="font-medium text-[var(--txt)]">Sin presupuestos</p>
                <p className="mt-1 text-sm">Crea tu primer presupuesto para controlar tus gastos</p>
                <Link href="/admin/finance/budgets/new" className={`mt-3 inline-block text-sm ${ENLACE}`}>
                    Crear presupuesto
                </Link>
            </div>
        );
    }

    return (
        <div>
            {fallo ? <p role="alert" className={`${ERROR} mb-3`}>{fallo}</p> : null}

            <ul className={`${LISTA} m-0 list-none p-0`}>
                {budgets.map((budget) => {
                    const estado = ESTADO[budget.status];
                    const lleno = Math.min(100, Math.max(0, budget.percentage));
                    const porcentaje = `${budget.percentage.toFixed(1)} %`;
                    const color = budget.category?.color;

                    return (
                        <li
                            key={budget.id}
                            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-[var(--linea)] px-1 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4"
                        >
                            <span
                                aria-hidden="true"
                                className={FICHA}
                                style={color ? { backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` } : undefined}
                            >
                                {budget.category?.icon || <ChartPie className="size-[18px]" />}
                            </span>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                    <p className="min-w-0 truncate font-medium text-[var(--txt)]">{budget.name}</p>
                                    <p className={`shrink-0 text-sm text-[var(--mut)] ${CIFRA}`}>
                                        <span className="font-semibold text-[var(--txt)]">{formatCurrency(budget.currentSpent)}</span>
                                        {" "}de {formatCurrency(budget.amount)}
                                    </p>
                                </div>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--mut)]">
                                    <span className="min-w-0 truncate">
                                        {budget.category?.name || "Todos los gastos"} · {PERIOD_LABELS[budget.period] ?? budget.period}
                                    </span>
                                    {!budget.isActive && <span className={MARCA_NEUTRA}>Pausado</span>}
                                </p>

                                <div className="mt-2.5 flex items-center gap-3">
                                    <div
                                        className={`${RIEL} min-w-0 flex-1`}
                                        role="progressbar"
                                        aria-label={`Gastado de ${budget.name}`}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(lleno)}
                                        aria-valuetext={porcentaje}
                                    >
                                        <div
                                            className={`h-full rounded-full ${budget.isActive ? estado.barra : "bg-[var(--mut)]"}`}
                                            style={{ width: `${lleno}%` }}
                                        />
                                    </div>
                                    <span className={`shrink-0 text-sm font-semibold ${CIFRA} ${estado.color}`}>{porcentaje}</span>
                                </div>

                                <p className={`mt-1.5 flex items-center gap-1.5 text-sm ${estado.color}`}>
                                    {budget.status === "exceeded" ? (
                                        <>
                                            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                                            <span className={CIFRA}>
                                                Excedido por {formatCurrency(budget.currentSpent - budget.amount)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className={CIFRA}>
                                            {estado.texto} · Disponible: {formatCurrency(budget.remaining)}
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="col-start-2 -ml-2.5 flex items-center gap-1 sm:col-start-3 sm:row-start-1 sm:ml-0 sm:self-start">
                                <button
                                    type="button"
                                    onClick={() => handleToggle(budget.id, !budget.isActive)}
                                    disabled={togglingId === budget.id}
                                    aria-label={budget.isActive ? `Pausar ${budget.name}` : `Activar ${budget.name}`}
                                    className={ICONO}
                                >
                                    {togglingId === budget.id ? (
                                        <span aria-hidden="true" className={GIRA} />
                                    ) : budget.isActive ? (
                                        <Pause aria-hidden="true" className="size-[18px]" />
                                    ) : (
                                        <Play aria-hidden="true" className="size-[18px]" />
                                    )}
                                </button>
                                <Link
                                    href={`/admin/finance/budgets/${budget.id}/edit`}
                                    aria-label={`Editar ${budget.name}`}
                                    className={ICONO}
                                >
                                    <Pencil aria-hidden="true" className="size-[18px]" />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(budget.id)}
                                    disabled={deletingId === budget.id}
                                    aria-label={`Eliminar ${budget.name}`}
                                    className={ICONO_PELIGRO}
                                >
                                    {deletingId === budget.id ? (
                                        <span aria-hidden="true" className={GIRA} />
                                    ) : (
                                        <Trash2 aria-hidden="true" className="size-[18px]" />
                                    )}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
