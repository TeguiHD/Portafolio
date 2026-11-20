"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { confirmar } from "@/modules/admin/confirmar/confirmar";
import DialogoFormulario from "@/app/admin/gestion-comercial/dialogo-formulario";
import {
    BOTON,
    BOTON_SEC,
    CAMPO,
    CIFRA,
    ENLACE,
    ERROR,
    ETIQUETA,
    FICHA,
    GIRA,
    ICONO,
    ICONO_PELIGRO,
    LISTA,
    MARCA,
    RIEL,
    SUAVE,
    VACIO,
} from "./estilos";
import { numeroCL } from "@/lib/tools/numeros";

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

interface GoalListProps {
    goals: Goal[];
    onDelete?: (id: string) => Promise<void>;
    onContribute?: (id: string, amount: number) => Promise<void>;
}

/** «3 días», «1 día». */
function dias(n: number) {
    return `${n} día${n === 1 ? "" : "s"}`;
}

export function GoalList({ goals, onDelete, onContribute }: GoalListProps) {
    const uid = useId();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [contributingId, setContributingId] = useState<string | null>(null);
    const [contributeAmount, setContributeAmount] = useState("");
    const [showContributeModal, setShowContributeModal] = useState<string | null>(null);
    const [fallo, setFallo] = useState<string | null>(null);
    const [falloAbono, setFalloAbono] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!onDelete) return;
        if (!(await confirmar({ titulo: "¿Eliminar esta meta?", detalle: "Se pierde su avance registrado. No se puede deshacer.", accion: "Eliminar", peligro: true }))) return;

        setFallo(null);
        setDeletingId(id);
        try {
            await onDelete(id);
        } catch {
            setFallo("No se pudo eliminar la meta. Intenta de nuevo.");
        } finally {
            setDeletingId(null);
        }
    };

    /** Al terminar bien cierra el diálogo con `cerrar`, que devuelve el foco al botón «Abonar». */
    const handleContribute = async (id: string, cerrar: () => void) => {
        if (!onContribute || !contributeAmount) return;
        // Monto a la chilena: «50.000» son cincuenta mil (con type=number se leía 50).
        const abono = numeroCL(contributeAmount);
        if (abono === null || !(abono > 0)) {
            setFalloAbono("Escribe un monto mayor que cero.");
            return;
        }

        setFalloAbono(null);
        setContributingId(id);
        try {
            await onContribute(id, abono);
            setContributeAmount("");
            cerrar();
        } catch {
            setFalloAbono("No se pudo registrar el abono. Intenta de nuevo.");
        } finally {
            setContributingId(null);
        }
    };

    if (goals.length === 0) {
        return (
            <div className={VACIO}>
                <p className="font-medium text-[var(--txt)]">Sin metas de ahorro</p>
                <p className="mt-1 text-sm">Crea tu primera meta para empezar a ahorrar</p>
                <Link href="/admin/finance/goals/new" className={`mt-3 inline-block text-sm ${ENLACE}`}>
                    Crear meta
                </Link>
            </div>
        );
    }

    const metaAbono = goals.find((g) => g.id === showContributeModal);

    return (
        <>
            {fallo ? <p role="alert" className={`${ERROR} mb-3`}>{fallo}</p> : null}

            <ul className={`${LISTA} m-0 list-none p-0`}>
                {goals.map((goal) => {
                    const lleno = Math.min(100, Math.max(0, goal.percentage));

                    return (
                        <li
                            key={goal.id}
                            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-[var(--linea)] px-1 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4"
                        >
                            <span
                                aria-hidden="true"
                                className={FICHA}
                                style={{ backgroundColor: `color-mix(in srgb, ${goal.color} 16%, transparent)` }}
                            >
                                {goal.icon}
                            </span>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                    <p className="min-w-0 truncate font-medium text-[var(--txt)]">{goal.name}</p>
                                    <p className={`shrink-0 text-sm text-[var(--mut)] ${CIFRA}`}>
                                        <span className="font-semibold text-[var(--txt)]">{formatCurrency(goal.currentAmount)}</span>
                                        {" "}de {formatCurrency(goal.targetAmount)}
                                    </p>
                                </div>

                                {(goal.completed || goal.deadline) && (
                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                        {goal.completed && (
                                            <span className={`${MARCA} bg-emerald-500/10 text-emerald-400`}>
                                                <Check aria-hidden="true" className="size-3.5" />
                                                Completada
                                            </span>
                                        )}
                                        {goal.deadline && goal.daysLeft !== null && !goal.completed && (
                                            <span className={goal.isOverdue ? "font-medium text-red-400" : "text-[var(--mut)]"}>
                                                {goal.isOverdue
                                                    ? `Vencida hace ${dias(Math.abs(goal.daysLeft))}`
                                                    : goal.daysLeft === 0
                                                        ? "Vence hoy"
                                                        : `${dias(goal.daysLeft)} restante${goal.daysLeft === 1 ? "" : "s"}`}
                                            </span>
                                        )}
                                    </p>
                                )}

                                <div className="mt-2.5 flex items-center gap-3">
                                    <div
                                        className={`${RIEL} min-w-0 flex-1`}
                                        role="progressbar"
                                        aria-label={`Avance de ${goal.name}`}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(lleno)}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${lleno}%`, backgroundColor: goal.color }}
                                        />
                                    </div>
                                    <span className={`shrink-0 text-sm font-semibold text-[var(--txt)] ${CIFRA}`}>
                                        {goal.percentage.toFixed(0)} %
                                    </span>
                                </div>

                                {!goal.completed && goal.requiredMonthly && (
                                    <p className={`${SUAVE} mt-1.5`}>
                                        Ahorra <span className={`font-medium text-[var(--txt)] ${CIFRA}`}>{formatCurrency(goal.requiredMonthly)}/mes</span>{" "}
                                        para alcanzar tu meta
                                    </p>
                                )}
                            </div>

                            <div className="col-start-2 flex flex-wrap items-center gap-1 sm:col-start-3 sm:row-start-1 sm:self-start">
                                {!goal.completed && (
                                    <button
                                        type="button"
                                        onClick={() => setShowContributeModal(goal.id)}
                                        aria-label={`Abonar a ${goal.name}`}
                                        className={`${BOTON_SEC} mr-1`}
                                    >
                                        <Plus aria-hidden="true" className="size-4" />
                                        Abonar
                                    </button>
                                )}
                                <Link
                                    href={`/admin/finance/goals/${goal.id}/edit`}
                                    aria-label={`Editar ${goal.name}`}
                                    className={ICONO}
                                >
                                    <Pencil aria-hidden="true" className="size-[18px]" />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(goal.id)}
                                    disabled={deletingId === goal.id}
                                    aria-label={`Eliminar ${goal.name}`}
                                    className={ICONO_PELIGRO}
                                >
                                    {deletingId === goal.id ? (
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

            {showContributeModal && (
                <DialogoFormulario
                    titulo="Abonar a la meta"
                    descripcion={
                        metaAbono
                            ? `Faltan ${formatCurrency(metaAbono.remaining)} para completar «${metaAbono.name}».`
                            : undefined
                    }
                    ancho="max-w-md"
                    alCerrar={() => {
                        setShowContributeModal(null);
                        setFalloAbono(null);
                    }}
                >
                    {(cerrar) => (
                        <form
                            noValidate
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleContribute(showContributeModal, cerrar);
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label htmlFor={`${uid}-abono`} className={ETIQUETA}>Monto a abonar</label>
                                <div className="relative">
                                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--mut)]">$</span>
                                    <input
                                        id={`${uid}-abono`}
                                        type="text"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        value={contributeAmount}
                                        onChange={(e) => setContributeAmount(e.target.value)}
                                        className={`${CAMPO} pl-7 ${CIFRA}`}
                                        placeholder="50.000"
                                    />
                                </div>
                            </div>

                            {falloAbono ? <p role="alert" className={ERROR}>{falloAbono}</p> : null}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button type="button" onClick={cerrar} className={BOTON_SEC}>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!contributeAmount || contributingId === showContributeModal}
                                    className={BOTON}
                                >
                                    {contributingId === showContributeModal ? (
                                        <>
                                            <span aria-hidden="true" className={GIRA} />
                                            Guardando...
                                        </>
                                    ) : (
                                        "Abonar"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogoFormulario>
            )}
        </>
    );
}
