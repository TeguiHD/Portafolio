"use client";

import { formatCurrency } from "@/lib/currency";
import { CifrasFinanzas } from "./Piezas";
import { BAJA, SUBE } from "./estilos";

interface SummaryCardsProps {
    income: number;
    expenses: number;
    balance: number;
    incomeChange: number;
    expenseChange: number;
    transactionCount: number;
}

/** Variación frente al mes anterior; `bueno` dice si subir es una buena noticia (ingresos) o mala (gastos). */
function Variacion({ valor, bueno }: { valor: number; bueno: "subir" | "bajar" }) {
    if (valor === 0) return null;
    const mejora = bueno === "subir" ? valor > 0 : valor < 0;
    return (
        <span className={mejora ? SUBE : BAJA}>
            <span aria-hidden="true">{valor > 0 ? "↑" : "↓"} </span>
            <span className="sr-only">{valor > 0 ? "Subió " : "Bajó "}</span>
            {Math.abs(valor)} % vs. mes anterior
        </span>
    );
}

export function SummaryCards({
    income,
    expenses,
    balance,
    incomeChange,
    expenseChange,
    transactionCount,
}: SummaryCardsProps) {
    return (
        <CifrasFinanzas
            etiqueta="Resumen del mes"
            cifras={[
                { nombre: "Ingresos", valor: formatCurrency(income), nota: <Variacion valor={incomeChange} bueno="subir" /> },
                { nombre: "Gastos", valor: formatCurrency(expenses), nota: <Variacion valor={expenseChange} bueno="bajar" /> },
                {
                    nombre: balance >= 0 ? "Balance: ahorraste este mes" : "Balance: gastaste más de lo que ingresó",
                    valor: `${balance < 0 ? "−" : ""}${formatCurrency(Math.abs(balance))}`,
                    tono: balance < 0 ? "baja" : undefined,
                },
                { nombre: "Transacciones registradas", valor: transactionCount },
            ]}
        />
    );
}
