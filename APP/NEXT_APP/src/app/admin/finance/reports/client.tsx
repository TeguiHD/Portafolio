"use client";

import { useState, useEffect, useCallback } from "react";
import { SummaryCards } from "@/modules/finance/components/SummaryCards";
import { CategoryBreakdown, CategoryData } from "@/modules/finance/components/CategoryBreakdown";
import { DailyChart, DailyData } from "@/modules/finance/components/DailyChart";
import { InsightsCard, Insight } from "@/modules/finance/components/InsightsCard";
import { TrendsChart, TrendData } from "@/modules/finance/components/TrendsChart";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { CabeceraFinanzas, CargandoFinanzas } from "@/modules/finance/components/Piezas";
import { BOTON_SEC, CIFRA, CAMPO, ERROR, ICONO, LISTA, OPCION, OPCION_NO, OPCION_SI, SECCION, VACIO } from "@/modules/finance/components/estilos";
import { fechaDia } from "@/modules/finance/fechas";

type Tab = "monthly" | "trends";

interface MerchantItem {
    name: string;
    amount: number;
    count: number;
}

interface ExpenseItem {
    id: string;
    amount: number;
    date: string;
    merchant?: string;
    description?: string;
    category?: {
        name: string;
        icon: string;
    };
}

interface ReportData {
    period: { year: number; month: number };
    summary: {
        income: number;
        expenses: number;
        balance: number;
        incomeChange: number;
        expenseChange: number;
        transactionCount: number;
    };
    categoryBreakdown: CategoryData[];
    dailyData: DailyData[];
    topMerchants: MerchantItem[];
    largestExpenses: ExpenseItem[];
    insights: Insight[];
}

interface TrendsData {
    trendData: TrendData[];
    summary: {
        avgIncome: number;
        avgExpenses: number;
        avgBalance: number;
        avgSavingsRate: number;
    };
    highlights: {
        bestMonth: { label: string; balance: number } | null;
        worstMonth: { label: string; balance: number } | null;
    };
}

export default function ReportsPageClient() {
    const [activeTab, setActiveTab] = useState<Tab>("monthly");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Monthly report state
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    // Trends state
    const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
    const [trendsMonths, setTrendsMonths] = useState(12);

    const fetchMonthlyReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/finance/reports?year=${year}&month=${month}`);
            if (!res.ok) throw new Error("Error al cargar reporte");
            const { data } = await res.json();
            setReportData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    const fetchTrends = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/finance/reports/trends?months=${trendsMonths}`);
            if (!res.ok) throw new Error("Error al cargar tendencias");
            const { data } = await res.json();
            setTrendsData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setLoading(false);
        }
    }, [trendsMonths]);

    useEffect(() => {
        if (activeTab === "monthly") {
            fetchMonthlyReport();
        } else {
            fetchTrends();
        }
    }, [activeTab, fetchMonthlyReport, fetchTrends]);

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const navigateMonth = (delta: number) => {
        let newMonth = month + delta;
        let newYear = year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        setMonth(newMonth);
        setYear(newYear);
    };

    const esMesActual = year === new Date().getFullYear() && month === new Date().getMonth() + 1;
    const vistas: { id: Tab; nombre: string }[] = [
        { id: "monthly", nombre: "Mensual" },
        { id: "trends", nombre: "Tendencias" },
    ];

    return (
        <div className="max-w-[1180px] space-y-8 pb-8">
            <CabeceraFinanzas titulo="Reportes y análisis" bajada="Tus ingresos y gastos en detalle, mes a mes.">
                <div role="group" aria-label="Vista" className="flex gap-1">
                    {vistas.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            aria-pressed={activeTab === v.id}
                            onClick={() => setActiveTab(v.id)}
                            className={`${OPCION} ${activeTab === v.id ? OPCION_SI : OPCION_NO}`}
                        >
                            {v.nombre}
                        </button>
                    ))}
                </div>
            </CabeceraFinanzas>

            {/* Periodo */}
            {activeTab === "monthly" ? (
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigateMonth(-1)} aria-label="Mes anterior" className={ICONO}>
                        <ChevronLeft aria-hidden="true" className="size-[18px]" />
                    </button>
                    <h2 aria-live="polite" className="m-0 min-w-[10ch] text-center text-lg font-semibold text-[var(--txt)]">
                        {monthNames[month - 1]} {year}
                    </h2>
                    <button type="button" onClick={() => navigateMonth(1)} disabled={esMesActual} aria-label="Mes siguiente" className={`${ICONO} disabled:cursor-not-allowed`}>
                        <ChevronRight aria-hidden="true" className="size-[18px]" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <label htmlFor="fin-reportes-meses" className="text-sm font-medium text-[var(--txt)]">Periodo</label>
                    <select
                        id="fin-reportes-meses"
                        value={trendsMonths}
                        onChange={(e) => setTrendsMonths(parseInt(e.target.value))}
                        className={CAMPO.replace("w-full", "w-auto")}
                    >
                        <option value={6}>Últimos 6 meses</option>
                        <option value={12}>Últimos 12 meses</option>
                        <option value={24}>Últimos 24 meses</option>
                    </select>
                </div>
            )}

            {/* Loading */}
            {loading && <CargandoFinanzas texto="Generando reporte…" />}

            {/* Error */}
            {error && !loading && (
                <div role="alert" className={`${ERROR} flex flex-wrap items-center justify-between gap-3`}>
                    <span>{error}</span>
                    <button type="button" onClick={() => void (activeTab === "monthly" ? fetchMonthlyReport() : fetchTrends())} className={BOTON_SEC}>
                        Reintentar
                    </button>
                </div>
            )}

            {/* Monthly Report Content */}
            {!loading && !error && activeTab === "monthly" && reportData && (
                <div className="space-y-12">
                    <SummaryCards
                        income={reportData.summary.income}
                        expenses={reportData.summary.expenses}
                        balance={reportData.summary.balance}
                        incomeChange={reportData.summary.incomeChange}
                        expenseChange={reportData.summary.expenseChange}
                        transactionCount={reportData.summary.transactionCount}
                    />

                    <div className="grid items-start gap-12 lg:grid-cols-2">
                        <section aria-labelledby="fin-categorias">
                            <h2 id="fin-categorias" className={`${SECCION} mb-3`}>Gastos por categoría</h2>
                            <CategoryBreakdown
                                categories={reportData.categoryBreakdown}
                                totalExpenses={reportData.summary.expenses}
                            />
                        </section>

                        <InsightsCard insights={reportData.insights} />
                    </div>

                    <DailyChart data={reportData.dailyData} month={month} year={year} />

                    <div className="grid items-start gap-12 lg:grid-cols-2">
                        <section aria-labelledby="fin-comercios">
                            <h2 id="fin-comercios" className={`${SECCION} mb-3`}>Comercios con más gasto</h2>
                            {reportData.topMerchants.length > 0 ? (
                                <ol className={`${LISTA} m-0 list-none p-0`}>
                                    {reportData.topMerchants.slice(0, 5).map((m, i: number) => (
                                        <li key={i} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3">
                                            <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-[var(--fondo-2)] text-xs font-semibold text-[var(--mut)] ${CIFRA}`}>
                                                {i + 1}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-[var(--txt)]">{m.name}</span>
                                            <span className={`shrink-0 text-right ${CIFRA}`}>
                                                <span className="font-semibold text-[var(--txt)]">{formatCurrency(m.amount)}</span>
                                                <span className="ml-2 text-xs text-[var(--mut)]">{m.count} {m.count === 1 ? "vez" : "veces"}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className={VACIO}>Sin datos de comercios.</p>
                            )}
                        </section>

                        <section aria-labelledby="fin-mayores">
                            <h2 id="fin-mayores" className={`${SECCION} mb-3`}>Mayores gastos</h2>
                            {reportData.largestExpenses.length > 0 ? (
                                <ul className={`${LISTA} m-0 list-none p-0`}>
                                    {reportData.largestExpenses.map((t) => (
                                        <li key={t.id} className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3">
                                            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--fondo-2)] text-base">
                                                {t.category?.icon || <i className="block size-2 rounded-full bg-[var(--mut)]" />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="m-0 truncate text-sm text-[var(--txt)]">
                                                    {t.merchant || t.description || t.category?.name || "Gasto"}
                                                </p>
                                                <p className="m-0 text-xs text-[var(--mut)]">
                                                    {fechaDia(t.date, { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 font-semibold text-[var(--baja)] ${CIFRA}`}>{formatCurrency(t.amount)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={VACIO}>Sin gastos registrados.</p>
                            )}
                        </section>
                    </div>
                </div>
            )}

            {/* Trends Content */}
            {!loading && !error && activeTab === "trends" && trendsData && (
                <div className="space-y-10">
                    {(trendsData.highlights.bestMonth || trendsData.highlights.worstMonth) && (
                        <ul className={`${LISTA} m-0 grid list-none p-0 sm:grid-cols-2 sm:gap-x-12`}>
                            {trendsData.highlights.bestMonth && (
                                <li className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5">
                                    <TrendingUp aria-hidden="true" className="size-[18px] shrink-0 text-emerald-400" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm text-[var(--mut)]">Mejor mes</span>
                                        <span className="block font-semibold text-[var(--txt)]">{trendsData.highlights.bestMonth.label}</span>
                                    </span>
                                    <span className={`shrink-0 text-right text-sm ${CIFRA}`}>
                                        <span className="block text-[var(--mut)]">Balance</span>
                                        <span className="block font-semibold text-[var(--txt)]">{formatCurrency(trendsData.highlights.bestMonth.balance)}</span>
                                    </span>
                                </li>
                            )}
                            {trendsData.highlights.worstMonth && (
                                <li className="flex items-center gap-3 border-b border-[var(--linea)] px-1 py-3.5">
                                    <TrendingDown aria-hidden="true" className="size-[18px] shrink-0 text-red-400" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm text-[var(--mut)]">Mes más difícil</span>
                                        <span className="block font-semibold text-[var(--txt)]">{trendsData.highlights.worstMonth.label}</span>
                                    </span>
                                    <span className={`shrink-0 text-right text-sm ${CIFRA}`}>
                                        <span className="block text-[var(--mut)]">Balance</span>
                                        <span className={`block font-semibold ${trendsData.highlights.worstMonth.balance < 0 ? "text-[var(--baja)]" : "text-[var(--txt)]"}`}>
                                            {formatCurrency(trendsData.highlights.worstMonth.balance)}
                                        </span>
                                    </span>
                                </li>
                            )}
                        </ul>
                    )}

                    <section aria-labelledby="fin-evolucion">
                        <h2 id="fin-evolucion" className={`${SECCION} mb-3`}>Evolución de ingresos y gastos</h2>
                        <TrendsChart data={trendsData.trendData} summary={trendsData.summary} />
                    </section>
                </div>
            )}
        </div>
    );
}
