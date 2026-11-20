"use client";

import { formatCurrency } from "@/lib/currency";
import { CIFRA, LISTA, RIEL, SUAVE, VACIO } from "./estilos";

export interface CategoryData {
    category: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
    };
    amount: number;
    count: number;
    prevAmount: number;
    delta: number;
    percentage: number;
}

interface CategoryBreakdownProps {
    categories: CategoryData[];
    totalExpenses: number;
}

/**
 * Gasto por categoría como lista de barras: nombre, monto y una barra con su parte del total.
 * Antes había además una dona con los mismos números; con ocho colores elegidos por el usuario no se podía leer
 * con daltonismo y repetía la lista, así que la barra de cada fila hace ese trabajo.
 */
export function CategoryBreakdown({ categories, totalExpenses }: CategoryBreakdownProps) {
    if (categories.length === 0) {
        return <p className={VACIO}>No hay gastos por categoría este mes.</p>;
    }

    return (
        <div>
            <p className={`${SUAVE} mb-3 ${CIFRA}`}>
                Total del mes: <span className="font-semibold text-[var(--txt)]">{formatCurrency(totalExpenses)}</span>
            </p>
            <ul className={`${LISTA} m-0 list-none p-0`}>
                {categories.map((cat) => {
                    const color = cat.category.color || "var(--mut)";
                    return (
                        <li key={cat.category.id} className="border-b border-[var(--linea)] px-1 py-3">
                            <div className="flex items-center gap-3">
                                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--fondo-2)] text-base">
                                    {(cat.category.id !== "uncategorized" && cat.category.icon) || <i className="block size-2.5 rounded-full" style={{ backgroundColor: color }} />}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium text-[var(--txt)]">{cat.category.name}</span>
                                <span className={`shrink-0 font-semibold text-[var(--txt)] ${CIFRA}`}>{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 pl-12">
                                <div className={`${RIEL} flex-1`} aria-hidden="true">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(cat.percentage, 0), 100)}%`, backgroundColor: color }} />
                                </div>
                                <span className={`w-12 shrink-0 text-right text-sm text-[var(--txt)] ${CIFRA}`}>{cat.percentage} %</span>
                            </div>
                            <p className={`mt-1 flex flex-wrap gap-x-3 pl-12 text-xs text-[var(--mut)] ${CIFRA}`}>
                                <span>{cat.count} transaccion{cat.count === 1 ? "" : "es"}</span>
                                {cat.prevAmount > 0 && cat.delta !== 0 && (
                                    <span className={cat.delta > 0 ? "text-red-400" : "text-emerald-400"}>
                                        <span aria-hidden="true">{cat.delta > 0 ? "↑" : "↓"} </span>
                                        {cat.delta > 0 ? "Subió" : "Bajó"} {Math.abs(cat.delta)} % vs. mes anterior
                                    </span>
                                )}
                                {cat.prevAmount > 0 && cat.delta === 0 && <span>Igual que el mes anterior</span>}
                            </p>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
