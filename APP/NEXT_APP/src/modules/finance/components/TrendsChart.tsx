"use client";

import { formatCurrency } from "@/lib/currency";
import { CifrasFinanzas } from "./Piezas";
import { anclaGlobo, montoEje, topeEje } from "./escala";
import { CIFRA, ENLACE, SERIES } from "./estilos";

export interface TrendData {
    key: string;
    year: number;
    month: number;
    monthName: string;
    label: string;
    income: number;
    expenses: number;
    balance: number;
    count: number;
}

interface TrendsChartProps {
    data: TrendData[];
    summary: {
        avgIncome: number;
        avgExpenses: number;
        avgBalance: number;
        avgSavingsRate: number;
    };
}

/**
 * Ingresos y gastos mes a mes: dos líneas sobre un solo eje, puntos por mes, globo al pasar el puntero y la tabla
 * con los mismos datos. Las líneas van en un SVG estirado (con trazo que no se deforma) y los puntos en HTML,
 * así siguen redondos a cualquier ancho.
 */
export function TrendsChart({ data, summary }: TrendsChartProps) {
    const n = data.length;
    const tope = topeEje(Math.max(...data.map((d) => Math.max(d.income, d.expenses)), 1));
    const x = (i: number) => ((i + 0.5) / Math.max(n, 1)) * 100;
    const y = (v: number) => 100 - Math.min(Math.max(v / tope, 0), 1) * 100;
    const linea = (campo: "income" | "expenses") => data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[campo])}`).join(" ");
    // En celular se ven menos nombres de mes para que no se monten
    const pasoCelular = n > 12 ? 3 : n > 6 ? 2 : 1;
    const pasoAncho = n > 12 ? 2 : 1;

    return (
        <div className="space-y-6">
            <figure className={`m-0 ${SERIES}`}>
                <figcaption className="mb-5">
                    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-[var(--mut)]">
                        <li className="flex items-center gap-2">
                            <i aria-hidden="true" className="h-0.5 w-4 rounded-full bg-[var(--serie-ingreso)]" />
                            Ingresos
                        </li>
                        <li className="flex items-center gap-2">
                            <i aria-hidden="true" className="h-0.5 w-4 rounded-full bg-[var(--serie-gasto)]" />
                            Gastos
                        </li>
                    </ul>
                </figcaption>

                {n === 0 ? (
                    <p className="text-sm text-[var(--mut)]">Todavía no hay meses con movimientos.</p>
                ) : (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                        <div aria-hidden="true" className={`relative h-56 w-12 text-right text-xs text-[var(--mut)] ${CIFRA}`}>
                            <span className="absolute top-0 right-0 -translate-y-1/2">{montoEje(tope)}</span>
                            <span className="absolute top-1/2 right-0 -translate-y-1/2">{montoEje(tope / 2)}</span>
                            <span className="absolute right-0 bottom-0 translate-y-1/2">$0</span>
                        </div>

                        <div
                            role="img"
                            aria-label="Ingresos y gastos de cada mes. Los mismos datos están en la tabla «Ver los datos por mes»."
                            className="relative h-56 border-b border-[var(--linea-2)]"
                        >
                            <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-[var(--linea)]" />
                            <div aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-[var(--linea)]" />

                            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                                <path d={linea("income")} fill="none" stroke="var(--serie-ingreso)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                <path d={linea("expenses")} fill="none" stroke="var(--serie-gasto)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            </svg>

                            {data.map((d, i) => (
                                <div key={d.key} className="group absolute inset-y-0" style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }}>
                                    {/* Guía vertical del mes bajo el puntero */}
                                    <div aria-hidden="true" className="absolute inset-y-0 left-1/2 hidden border-l border-[var(--linea-2)] group-hover:block" />
                                    <i aria-hidden="true" className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--serie-ingreso)] shadow-[0_0_0_2px_var(--fondo)]" style={{ top: `${y(d.income)}%` }} />
                                    <i aria-hidden="true" className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--serie-gasto)] shadow-[0_0_0_2px_var(--fondo)]" style={{ top: `${y(d.expenses)}%` }} />
                                    <div className={`pointer-events-none absolute top-0 z-10 hidden whitespace-nowrap rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] px-3 py-2 text-xs text-[var(--txt)] shadow-lg group-hover:block ${anclaGlobo(i, n)} ${CIFRA}`}>
                                        <p className="m-0 font-semibold">{d.label}</p>
                                        <p className="m-0">Ingresos: {formatCurrency(d.income)}</p>
                                        <p className="m-0">Gastos: {formatCurrency(d.expenses)}</p>
                                        <p className="m-0 text-[var(--mut)]">Balance: {formatCurrency(d.balance)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div />
                        <div aria-hidden="true" className="relative mt-1.5 h-4 text-xs text-[var(--mut)]">
                            {data.map((d, i) => {
                                const ultimo = i === n - 1;
                                const enCelular = ultimo || i % pasoCelular === 0;
                                const enAncho = ultimo || i % pasoAncho === 0;
                                return (
                                    <span
                                        key={d.key}
                                        className={`absolute -translate-x-1/2 ${enCelular ? "" : "max-md:hidden"} ${enAncho ? "" : "md:hidden"}`}
                                        style={{ left: `${x(i)}%` }}
                                    >
                                        {d.monthName}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {n > 0 && (
                    <details className="mt-5">
                        <summary className={`cursor-pointer text-sm ${ENLACE}`}>Ver los datos por mes</summary>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <caption className="sr-only">Ingresos, gastos y balance de cada mes</caption>
                                <thead>
                                    <tr className="border-b border-[var(--linea)]">
                                        <th scope="col" className="py-2 pr-4 text-left text-sm font-medium text-[var(--mut)]">Mes</th>
                                        <th scope="col" className="py-2 pr-4 text-right text-sm font-medium text-[var(--mut)]">Ingresos</th>
                                        <th scope="col" className="py-2 pr-4 text-right text-sm font-medium text-[var(--mut)]">Gastos</th>
                                        <th scope="col" className="py-2 text-right text-sm font-medium text-[var(--mut)]">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className={CIFRA}>
                                    {data.map((d) => (
                                        <tr key={d.key} className="border-b border-[var(--linea)]">
                                            <th scope="row" className="py-2 pr-4 text-left font-normal whitespace-nowrap text-[var(--txt)]">{d.label}</th>
                                            <td className="py-2 pr-4 text-right whitespace-nowrap text-[var(--txt)]">{formatCurrency(d.income)}</td>
                                            <td className="py-2 pr-4 text-right whitespace-nowrap text-[var(--txt)]">{formatCurrency(d.expenses)}</td>
                                            <td className={`py-2 text-right whitespace-nowrap ${d.balance < 0 ? "text-[var(--baja)]" : "text-[var(--txt)]"}`}>{formatCurrency(d.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                )}
            </figure>

            <CifrasFinanzas
                etiqueta="Promedios mensuales"
                cifras={[
                    { nombre: "Ingreso promedio", valor: formatCurrency(summary.avgIncome) },
                    { nombre: "Gasto promedio", valor: formatCurrency(summary.avgExpenses) },
                    { nombre: "Balance promedio", valor: formatCurrency(summary.avgBalance), tono: summary.avgBalance < 0 ? "baja" : undefined },
                    { nombre: "Tasa de ahorro", valor: `${summary.avgSavingsRate} %`, tono: summary.avgSavingsRate < 0 ? "baja" : undefined },
                ]}
            />
        </div>
    );
}
