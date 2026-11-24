"use client";

import { formatCurrency } from "@/lib/currency";
import { anclaGlobo, montoEje, topeEje } from "./escala";
import { CIFRA, ENLACE, SECCION, SERIES } from "./estilos";

export interface DailyData {
    date: string;
    day: number;
    income: number;
    expense: number;
    balance: number;
}

interface DailyChartProps {
    data: DailyData[];
    month: number;
    year: number;
}

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Columnas de ingresos y gastos por día, con la línea del gasto promedio y la tabla con los mismos datos. */
export function DailyChart({ data, month, year }: DailyChartProps) {
    const n = data.length;
    const totalExpenses = data.reduce((sum, d) => sum + d.expense, 0);
    const avgDaily = n > 0 ? totalExpenses / n : 0;
    const tope = topeEje(Math.max(...data.map((d) => Math.max(d.expense, d.income)), avgDaily, 1));
    const alto = (v: number) => `${Math.min((v / tope) * 100, 100)}%`;

    const ahora = new Date();
    const diaHoy = ahora.getMonth() + 1 === month && ahora.getFullYear() === year ? ahora.getDate() : null;
    const fijas = [...new Set([1, Math.ceil(n / 4), Math.ceil(n / 2), Math.ceil((n * 3) / 4), n])].filter((d) => d >= 1);
    // «Hoy» reemplaza a las marcas vecinas para que no se monten
    const marcas = diaHoy && diaHoy <= n ? [...fijas.filter((d) => Math.abs(d - diaHoy) > 2), diaHoy] : fijas;
    const conMovimientos = data.filter((d) => d.income > 0 || d.expense > 0);
    const mes = `${MESES[month - 1]} ${year}`;

    return (
        <figure className={`m-0 ${SERIES}`}>
            <figcaption className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 className={SECCION}>Movimientos por día en {mes}</h2>
                <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-[var(--mut)]">
                    <li className="flex items-center gap-2">
                        <i aria-hidden="true" className="size-2.5 rounded-sm bg-[var(--serie-gasto)]" />
                        Gastos
                    </li>
                    <li className="flex items-center gap-2">
                        <i aria-hidden="true" className="size-2.5 rounded-sm bg-[var(--serie-ingreso)]" />
                        Ingresos
                    </li>
                    <li className="flex items-center gap-2">
                        <i aria-hidden="true" className="h-0 w-4 border-t border-dashed border-[var(--txt)]" />
                        <span className={CIFRA}>Gasto promedio por día: {formatCurrency(avgDaily)}</span>
                    </li>
                </ul>
            </figcaption>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                {/* Eje Y: tres marcas redondas */}
                <div aria-hidden="true" className={`relative h-48 w-12 text-right text-xs text-[var(--mut)] ${CIFRA}`}>
                    <span className="absolute top-0 right-0 -translate-y-1/2">{montoEje(tope)}</span>
                    <span className="absolute top-1/2 right-0 -translate-y-1/2">{montoEje(tope / 2)}</span>
                    <span className="absolute right-0 bottom-0 translate-y-1/2">$0</span>
                </div>

                <div
                    role="img"
                    aria-label={`Ingresos y gastos de cada día de ${mes}. Los mismos datos están en la tabla «Ver los datos por día».`}
                    className="relative h-48 border-b border-[var(--linea-2)]"
                >
                    <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-[var(--linea)]" />
                    <div aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-[var(--linea)]" />

                    <div className="absolute inset-0 flex items-end">
                        {data.map((day, i) => (
                            <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-px px-px">
                                <div className="w-1/2 max-w-3 rounded-t-[3px] bg-[var(--serie-ingreso)]" style={{ height: alto(day.income), minHeight: day.income > 0 ? 2 : 0 }} />
                                <div className="w-1/2 max-w-3 rounded-t-[3px] bg-[var(--serie-gasto)]" style={{ height: alto(day.expense), minHeight: day.expense > 0 ? 2 : 0 }} />
                                {/* Globo al pasar el puntero (los datos completos también están en la tabla) */}
                                <div className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg border border-[var(--linea-2)] bg-[var(--sup)] px-3 py-2 text-xs text-[var(--txt)] shadow-lg group-hover:block ${anclaGlobo(i, n)} ${CIFRA}`}>
                                    <p className="m-0 font-semibold">Día {day.day}{day.day === diaHoy ? " (hoy)" : ""}</p>
                                    {day.income === 0 && day.expense === 0 ? (
                                        <p className="m-0 text-[var(--mut)]">Sin movimientos</p>
                                    ) : (
                                        <>
                                            <p className="m-0">Ingresos: {formatCurrency(day.income)}</p>
                                            <p className="m-0">Gastos: {formatCurrency(day.expense)}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {avgDaily > 0 && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--txt)] opacity-60"
                            style={{ bottom: alto(avgDaily) }}
                        />
                    )}
                </div>

                {/* Eje X: algunos días y hoy */}
                <div />
                <div aria-hidden="true" className={`relative mt-1.5 h-4 text-xs text-[var(--mut)] ${CIFRA}`}>
                    {n > 0 && marcas.map((d) => (
                        <span
                            key={d}
                            className={`absolute -translate-x-1/2 ${d === diaHoy ? "font-semibold text-[var(--txt)]" : ""}`}
                            style={{ left: `${((d - 0.5) / n) * 100}%` }}
                        >
                            {d === diaHoy ? "Hoy" : d}
                        </span>
                    ))}
                </div>
            </div>

            <details className="mt-5">
                <summary className={`cursor-pointer text-sm ${ENLACE}`}>Ver los datos por día</summary>
                {conMovimientos.length > 0 ? (
                    <div className="mt-3 max-h-80 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                            <caption className="sr-only">Ingresos y gastos por día de {mes} (solo días con movimientos)</caption>
                            <thead>
                                <tr className="border-b border-[var(--linea)]">
                                    <th scope="col" className="py-2 pr-4 text-left text-sm font-medium text-[var(--mut)]">Día</th>
                                    <th scope="col" className="py-2 pr-4 text-right text-sm font-medium text-[var(--mut)]">Ingresos</th>
                                    <th scope="col" className="py-2 text-right text-sm font-medium text-[var(--mut)]">Gastos</th>
                                </tr>
                            </thead>
                            <tbody className={CIFRA}>
                                {conMovimientos.map((d) => (
                                    <tr key={d.date} className="border-b border-[var(--linea)]">
                                        <th scope="row" className="py-2 pr-4 text-left font-normal text-[var(--txt)]">{d.day}</th>
                                        <td className="py-2 pr-4 text-right text-[var(--txt)]">{d.income > 0 ? formatCurrency(d.income) : "—"}</td>
                                        <td className="py-2 text-right text-[var(--txt)]">{d.expense > 0 ? formatCurrency(d.expense) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-[var(--mut)]">No hay movimientos este mes.</p>
                )}
            </details>
        </figure>
    );
}
