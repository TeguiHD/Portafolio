"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, ChevronRight, Plus, ScanLine, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useFinance } from "../context/FinanceContext";
import { BatchReceiptScanner } from "./BatchReceiptScanner";
import { OfflineIndicator } from "@/components/pwa/PWAComponents";
import { EsqueletoFinanzas } from "./EsqueletoFinanzas";
import { CabeceraFinanzas, CifrasFinanzas } from "./Piezas";
import { BAJA, BOTON, BOTON_SEC, CIFRA, ENLACE, FICHA, FOCO, LISTA, RIEL, SECCION, SOBRE, SUAVE, SUBE, VACIO } from "./estilos";
import type { OCRData } from "./OCRResultDisplay";
import { fechaDia } from "../fechas";

// Types
interface DashboardData {
    balance: {
        available: number;
        change: number;
        changePercent: number;
    };
    monthProgress: {
        spent: number;
        budget: number;
        dayOfMonth: number;
        daysInMonth: number;
        status: "under" | "on-track" | "over";
    };
    recentTransactions: Transaction[];
    topCategories: CategorySpend[];
    pendingReminders: number;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    categoryIcon: string;
    date: string;
}

interface CategorySpend {
    id: string;
    name: string;
    amount: number;
    icon: string;
    color: string;
}

interface FinanceDashboardCleanProps {
    userId: string;
}

/** Ritmo del gasto frente al presupuesto prorrateado al día de hoy (lo calcula la API). */
const RITMO: Record<DashboardData["monthProgress"]["status"], { texto: string; barra: string; color: string }> = {
    under: { texto: "Bajo el ritmo del mes", barra: "bg-emerald-500", color: "text-emerald-400" },
    "on-track": { texto: "Al ritmo del mes", barra: "bg-amber-500", color: "text-amber-400" },
    over: { texto: "Sobre el ritmo del mes", barra: "bg-red-500", color: "text-red-400" },
};

export function FinanceDashboardClean({ userId: _userId }: FinanceDashboardCleanProps) {
    const { baseCurrency, refreshKey } = useFinance();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sinCuentas, setSinCuentas] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/finance/dashboard/v2?currency=${baseCurrency}`);
            if (res.ok) {
                const result = await res.json();
                setData(result.data);
                setSinCuentas(!!result.needsOnboarding);
            }
        } catch (error) {
            console.error("Error fetching dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, [baseCurrency]);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshKey]);

    // Handle batch scan complete
    const handleBatchScanComplete = (results: { data: OCRData; imageData: string }[]) => {
        setShowScanner(false);
        if (results.length === 0) return;

        if (results.length === 1) {
            const ocrData = results[0].data;
            const params = new URLSearchParams({
                amount: ocrData.financials?.total?.toString() || ocrData.amount?.value?.toString() || "",
                description: ocrData.merchant?.value?.name || "",
                merchant: ocrData.merchant?.value?.name || "",
                categoryId: ocrData.suggestedCategory?.categoryId || "",
                date: ocrData.emissionDate?.value || ocrData.date?.value || "",
                rut: ocrData.merchant?.value?.rut || "",
                documentNumber: ocrData.documentNumber?.value || "",
                documentType: ocrData.documentType || "",
                subtotal: ocrData.financials?.subtotal?.toString() || "",
                tax: ocrData.financials?.tax?.toString() || "",
                source: "ocr",
            });
            window.location.href = `/admin/finance/transactions/new?${params}`;
        } else {
            sessionStorage.setItem("batchOCRResults", JSON.stringify(results));
            window.location.href = "/admin/finance/transactions/batch";
        }
    };

    // Loading
    if (loading && !data) {
        return <EsqueletoFinanzas />;
    }

    // Sin cuentas ni movimientos: un estado vacío que lleva a crear la primera cuenta (antes, un asistente de 4 pasos).
    // Las categorías de siempre las crea el servidor al guardar la primera cuenta (src/lib/finanzas/categorias-base.ts).
    if (sinCuentas) {
        return (
            <div className="max-w-[1180px] pb-8">
                <CabeceraFinanzas titulo="Finanzas" bajada="Ingresos, gastos, presupuestos y metas, en tus propias cuentas." />
                <div className={`${VACIO} mt-8`}>
                    <p className="mx-auto max-w-[46ch] text-[15px]">
                        Aún no tienes cuentas. Crea la primera (la del banco, una tarjeta o el efectivo) y desde ahí registras lo que entra y lo que sale.
                    </p>
                    <Link href="/admin/finance/accounts?nueva=1" className={`${BOTON} mt-6`}>
                        <Plus aria-hidden="true" className="size-4" />
                        Crea tu primera cuenta
                    </Link>
                </div>
            </div>
        );
    }

    // Scanner
    if (showScanner) {
        return (
            <BatchReceiptScanner
                onComplete={handleBatchScanComplete}
                onCancel={() => setShowScanner(false)}
            />
        );
    }

    if (!data) {
        return (
            <div role="alert" className="max-w-[1180px] py-16 text-center">
                <p className="text-[var(--txt)]">No se pudo cargar el resumen de finanzas.</p>
                <button type="button" onClick={() => void fetchData()} className={`${BOTON_SEC} mt-3`}>
                    Reintentar
                </button>
            </div>
        );
    }

    const { monthProgress, balance } = data;
    const spentPercent = monthProgress.budget > 0
        ? Math.min((monthProgress.spent / monthProgress.budget) * 100, 100)
        : 0;
    const ritmo = RITMO[monthProgress.status];
    const top = data.topCategories[0];
    const pendientes = data.pendingReminders || 0;

    return (
        <div className="max-w-[1180px] pb-8">
            <OfflineIndicator />

            <CabeceraFinanzas
                titulo="Finanzas"
                bajada={new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" })}
            >
                <button type="button" onClick={() => setShowScanner(true)} className={BOTON_SEC}>
                    <ScanLine aria-hidden="true" className="size-4" />
                    Escanear boleta
                </button>
                <Link href="/admin/finance/transactions/new" className={BOTON}>
                    <Plus aria-hidden="true" className="size-4" />
                    Nueva transacción
                </Link>
            </CabeceraFinanzas>

            <div className="mt-8">
                <CifrasFinanzas
                    etiqueta="Resumen del mes"
                    cifras={[
                        {
                            nombre: "Balance disponible",
                            valor: formatCurrency(balance.available, baseCurrency),
                            tono: balance.available < 0 ? "baja" : undefined,
                            nota: balance.change !== 0 ? (
                                <span className={balance.change >= 0 ? SUBE : BAJA}>
                                    {balance.change >= 0 ? "+" : ""}{balance.changePercent.toFixed(1)} % vs. mes anterior
                                </span>
                            ) : undefined,
                        },
                        {
                            nombre: "Gastado este mes",
                            valor: formatCurrency(monthProgress.spent),
                            nota: monthProgress.budget > 0 ? `de ${formatCurrency(monthProgress.budget)}` : undefined,
                        },
                    ]}
                />
            </div>

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)] lg:gap-14">
                {/* Últimos movimientos */}
                <section aria-labelledby="fin-ultimos">
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                        <h2 id="fin-ultimos" className={SECCION}>Últimos movimientos</h2>
                        <Link href="/admin/finance/transactions" className={`text-sm ${ENLACE}`}>
                            Ver todo
                        </Link>
                    </div>

                    {data.recentTransactions.length > 0 ? (
                        <ul className={`${LISTA} m-0 list-none p-0`}>
                            {data.recentTransactions.slice(0, 5).map((tx) => (
                                <li key={tx.id} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5 sm:gap-4">
                                    <span aria-hidden="true" className={FICHA}>{tx.categoryIcon || (tx.type === "expense" ? <ArrowUpRight className="size-[18px]" /> : tx.type === "income" ? <ArrowDownLeft className="size-[18px]" /> : <ArrowLeftRight className="size-[18px]" />)}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-[var(--txt)]">{tx.description}</p>
                                        <p className="text-xs text-[var(--mut)]">
                                            {fechaDia(tx.date)}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 font-semibold ${CIFRA} ${tx.type === "expense" ? BAJA : SUBE}`}>
                                        {tx.type === "expense" ? "−" : "+"}{formatCurrency(tx.amount)}
                                        <span className="sr-only">{tx.type === "expense" ? " (gasto)" : " (ingreso)"}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className={VACIO}>
                            <p>Sin transacciones aún.</p>
                            <Link href="/admin/finance/transactions/new" className={`mt-2 inline-block text-sm ${ENLACE}`}>
                                Registrar la primera
                            </Link>
                        </div>
                    )}
                </section>

                <div className="grid gap-10">
                    {/* Ritmo del mes */}
                    <section aria-labelledby="fin-mes">
                        <h2 id="fin-mes" className={`${SECCION} mb-3`}>Gastos del mes</h2>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className={`font-medium ${ritmo.color}`}>{ritmo.texto}</span>
                            <span className={`${CIFRA} text-[var(--mut)]`}>
                                Día {monthProgress.dayOfMonth} de {monthProgress.daysInMonth}
                            </span>
                        </div>
                        <div
                            className={`${RIEL} mt-2.5`}
                            role="progressbar"
                            aria-label="Gastado del presupuesto del mes"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(spentPercent)}
                        >
                            <div className={`h-full rounded-full ${ritmo.barra}`} style={{ width: `${spentPercent}%` }} />
                        </div>
                        <p className={`${SUAVE} mt-2 ${CIFRA}`}>
                            {formatCurrency(monthProgress.spent)}
                            {monthProgress.budget > 0 ? ` de ${formatCurrency(monthProgress.budget)} (${Math.round(spentPercent)} %)` : " gastados"}
                        </p>
                    </section>

                    {/* Atajos con dato */}
                    <ul className={`${LISTA} m-0 list-none p-0`}>
                        <li>
                            <Link href="/admin/finance/categories" className={`flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5 transition-colors duration-150 ${SOBRE} ${FOCO}`}>
                                <Tag aria-hidden="true" className="size-[18px] shrink-0 text-[var(--mut)]" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm text-[var(--mut)]">Categoría con más gasto</span>
                                    <span className="block truncate font-medium text-[var(--txt)]">
                                        {top ? top.name : "Sin gastos"}
                                    </span>
                                </span>
                                {top ? <span className={`shrink-0 text-sm font-semibold text-[var(--txt)] ${CIFRA}`}>{formatCurrency(top.amount)}</span> : null}
                                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[var(--mut)]" />
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/finance/reminders" className={`flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5 transition-colors duration-150 ${SOBRE} ${FOCO}`}>
                                <Bell aria-hidden="true" className="size-[18px] shrink-0 text-[var(--mut)]" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm text-[var(--mut)]">Recordatorios</span>
                                    <span className="block font-medium text-[var(--txt)]">
                                        {pendientes} pendiente{pendientes !== 1 ? "s" : ""} este mes
                                    </span>
                                </span>
                                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[var(--mut)]" />
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
