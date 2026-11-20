"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas, CargandoFinanzas } from "@/modules/finance/components/Piezas";
import { BOTON_SEC, CIFRA, ENLACE, ERROR, FICHA, FOCO, LISTA, SECCION, SOBRE, SUAVE, VACIO } from "@/modules/finance/components/estilos";
import { Bell, AlertTriangle, Target, CalendarClock, ClipboardList, RefreshCw, Check, ChevronRight, CreditCard } from "lucide-react";
import { diaGuardado, diasEntre, fechaDia, hoyChile } from "@/modules/finance/fechas";

interface Reminder {
    id: string;
    type: "daily_log" | "budget_check" | "bill_due" | "goal_update" | "weekly_review";
    title: string;
    message: string;
    scheduledFor: string;
    isActive: boolean;
    frequency: "daily" | "weekly" | "monthly" | "once";
}

interface RecurringPayment {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    nextDueDate: string | null;
    isActive: boolean;
    category?: {
        name: string;
        icon: string;
    } | null;
}

/** Ícono de cada tipo de alerta; el título de la alerta ya dice de qué se trata, el color solo acompaña. */
const REMINDER_ICONS: Record<Reminder["type"], { icon: typeof Bell; color: string }> = {
    daily_log: { icon: ClipboardList, color: "text-[var(--mut)]" },
    budget_check: { icon: AlertTriangle, color: "text-amber-400" },
    bill_due: { icon: CalendarClock, color: "text-red-400" },
    goal_update: { icon: Target, color: "text-emerald-400" },
    weekly_review: { icon: RefreshCw, color: "text-[var(--mut)]" },
};

/** Días hasta el vencimiento (negativo si ya venció), con el mismo cálculo que usa la API. */
function diasHasta(fecha: string) {
    return diasEntre(hoyChile(), diaGuardado(fecha));
}

/** Estado del vencimiento en texto (el color solo acompaña). */
function estadoVencimiento(dias: number): { texto: string; color: string } {
    const n = Math.abs(dias);
    if (dias < 0) return { texto: `Vencido hace ${n} día${n === 1 ? "" : "s"}`, color: "text-red-400" };
    if (dias === 0) return { texto: "Vence hoy", color: "text-red-400" };
    if (dias === 1) return { texto: "Vence mañana", color: "text-red-400" };
    if (dias <= 3) return { texto: `Vence en ${dias} días`, color: "text-amber-400" };
    return { texto: `Vence en ${dias} días`, color: "text-[var(--mut)]" };
}

const REMINDER_ACTIONS: Record<Reminder["type"], { label: string; href: "/admin/finance/transactions/new" | "/admin/finance/budgets" | "/admin/finance/recurring" | "/admin/finance/goals" | "/admin/finance/reports" }> = {
    daily_log: { label: "Registrar gasto", href: "/admin/finance/transactions/new" },
    budget_check: { label: "Ver presupuestos", href: "/admin/finance/budgets" },
    bill_due: { label: "Ver pagos", href: "/admin/finance/recurring" },
    goal_update: { label: "Ver metas", href: "/admin/finance/goals" },
    weekly_review: { label: "Ver reportes", href: "/admin/finance/reports" },
};

/**
 * Descartados: el esquema no tiene dónde guardarlos, así que es una preferencia de este navegador (localStorage).
 * Cada id lleva la fecha del vencimiento o del período, así que descartar no oculta el siguiente aviso.
 * Se guarda {id: cuándo} y se olvida a los 90 días para que no crezca sin límite.
 */
const CLAVE_DESCARTADOS = "finanzas:recordatorios-descartados";
const VIGENCIA_MS = 90 * 24 * 60 * 60 * 1000;

function leerDescartados(): Record<string, number> {
    if (typeof window === "undefined") return {};
    try {
        const crudo = window.localStorage.getItem(CLAVE_DESCARTADOS);
        if (!crudo) return {};
        const datos: unknown = JSON.parse(crudo);
        if (!datos || typeof datos !== "object" || Array.isArray(datos)) return {};
        const limite = Date.now() - VIGENCIA_MS;
        const vigentes: Record<string, number> = {};
        for (const [id, cuando] of Object.entries(datos)) {
            if (typeof cuando === "number" && cuando > limite) vigentes[id] = cuando;
        }
        return vigentes;
    } catch {
        return {};
    }
}

function guardarDescartados(descartados: Record<string, number>) {
    try {
        window.localStorage.setItem(CLAVE_DESCARTADOS, JSON.stringify(descartados));
    } catch {
        // Sin almacenamiento (modo privado, cuota llena): el descarte vale solo para esta visita.
    }
}

export default function RemindersPageClient() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // La lista se pinta solo después de cargar en el navegador, así que leer aquí no desajusta la hidratación.
    const [descartados, setDescartados] = useState<Record<string, number>>(leerDescartados);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [remindersRes, recurringRes] = await Promise.all([
                fetch("/api/finance/reminders"),
                fetch("/api/finance/recurring"),
            ]);

            if (remindersRes.ok) {
                const { data } = await remindersRes.json();
                setReminders(data || []);
            } else {
                // Sin esto, un error se veía como «¡Todo en orden!».
                setError("No se pudieron cargar las alertas.");
            }

            if (recurringRes.ok) {
                const { data } = await recurringRes.json();
                setRecurringPayments(data || []);
            }
        } catch {
            setError("No se pudieron cargar los recordatorios.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDismiss = (id: string) => {
        const siguiente = { ...descartados, [id]: Date.now() };
        setDescartados(siguiente);
        guardarDescartados(siguiente);
    };

    const mostrarDescartados = () => {
        const siguiente = { ...descartados };
        for (const r of reminders) delete siguiente[r.id];
        setDescartados(siguiente);
        guardarDescartados(siguiente);
    };

    const activeReminders = reminders.filter((r) => !Object.hasOwn(descartados, r.id));
    const ocultas = reminders.length - activeReminders.length;

    // Pagos vencidos y los de los próximos 7 días (antes los vencidos no aparecían en ninguna parte de esta pantalla)
    const upcomingPayments = recurringPayments.filter((p) => {
        if (!p.nextDueDate || !p.isActive) return false;
        return diasHasta(p.nextDueDate) <= 7;
    });

    if (loading) {
        return (
            <div className="max-w-[1180px] pb-8">
                <FinanceBreadcrumbs />
                <CargandoFinanzas texto="Cargando recordatorios…" />
            </div>
        );
    }

    return (
        <div className="max-w-[1180px] pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas titulo="Recordatorios" bajada="Alertas y recordatorios de tus finanzas" />

            {error && (
                <div role="alert" className={`${ERROR} mt-6 flex flex-wrap items-center justify-between gap-3`}>
                    <span>{error}</span>
                    <button type="button" onClick={() => void fetchData()} className={BOTON_SEC}>
                        Reintentar
                    </button>
                </div>
            )}

            <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
                {/* Alertas activas */}
                <section aria-labelledby="rec-alertas">
                    <h2 id="rec-alertas" className={`${SECCION} mb-2`}>Alertas activas</h2>
                    {ocultas > 0 && (
                        <p className={`${SUAVE} mb-2 flex flex-wrap items-center gap-x-2`}>
                            <span>
                                {ocultas === 1 ? "1 alerta descartada" : `${ocultas} alertas descartadas`} en este navegador.
                            </span>
                            <button
                                type="button"
                                onClick={mostrarDescartados}
                                className={`inline-flex min-h-11 items-center rounded-lg px-1 text-sm text-[var(--acento)] underline-offset-4 hover:underline sm:min-h-10 ${FOCO}`}
                            >
                                Volver a mostrarlas
                            </button>
                        </p>
                    )}

                    {activeReminders.length > 0 ? (
                        <ul className={`${LISTA} m-0 list-none p-0`}>
                            {activeReminders.map((reminder) => {
                                const { icon: Icon, color } = REMINDER_ICONS[reminder.type];
                                const action = REMINDER_ACTIONS[reminder.type];

                                return (
                                    <li key={reminder.id} className="flex items-start gap-3 border-b border-[var(--linea)] px-1 py-3.5 sm:gap-4">
                                        <span aria-hidden="true" className={FICHA}>
                                            <Icon className={`size-[18px] ${color}`} />
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-medium text-[var(--txt)]">{reminder.title}</h3>
                                            <p className={`${SUAVE} mt-0.5`}>{reminder.message}</p>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <Link href={action.href} className={BOTON_SEC}>
                                                    {action.label}
                                                    <ChevronRight aria-hidden="true" className="size-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDismiss(reminder.id)}
                                                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] motion-reduce:transition-none sm:min-h-10 ${SOBRE} ${FOCO}`}
                                                >
                                                    <Check aria-hidden="true" className="size-4" />
                                                    Descartar
                                                    <span className="sr-only"> «{reminder.title}»</span>
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className={VACIO}>
                            <Check aria-hidden="true" className="mx-auto mb-3 size-[18px] text-emerald-400" />
                            <p className="font-medium text-[var(--txt)]">¡Todo en orden!</p>
                            <p className="mt-1 text-sm">No tienes alertas pendientes por el momento</p>
                        </div>
                    )}
                </section>

                {/* Pagos vencidos y próximos */}
                <section aria-labelledby="rec-pagos">
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                        <h2 id="rec-pagos" className={SECCION}>Pagos vencidos y próximos (7 días)</h2>
                        <Link href="/admin/finance/recurring" className={`shrink-0 text-sm ${ENLACE}`}>
                            Ver pagos recurrentes
                        </Link>
                    </div>

                    {upcomingPayments.length > 0 ? (
                        <ul className={`${LISTA} m-0 list-none p-0`}>
                            {upcomingPayments.map((payment) => {
                                const dueDate = new Date(payment.nextDueDate!);
                                const estado = estadoVencimiento(diasHasta(payment.nextDueDate!));

                                return (
                                    <li key={payment.id} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5 sm:gap-4">
                                        <span aria-hidden="true" className={FICHA}>
                                            {payment.category?.icon || <CreditCard className="size-[18px]" />}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-[var(--txt)]">{payment.name}</p>
                                            <p className={`${SUAVE} truncate`}>
                                                {payment.category?.name || "Sin categoría"}
                                                <span aria-hidden="true"> · </span>
                                                <span className={CIFRA}>{formatCurrency(payment.amount)}</span>
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className={`text-sm font-medium ${estado.color}`}>{estado.texto}</p>
                                            <p className={`text-xs text-[var(--mut)] ${CIFRA}`}>
                                                {fechaDia(dueDate)}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className={VACIO}>
                            <p>No hay pagos vencidos ni próximos en los siguientes 7 días</p>
                            <Link href="/admin/finance/recurring" className={`mt-2 inline-block text-sm ${ENLACE}`}>
                                Configurar pagos recurrentes
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
