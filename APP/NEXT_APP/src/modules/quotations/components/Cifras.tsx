import type { ReactNode } from "react";

export interface Cifra {
    nombre: string;
    valor: ReactNode;
    /** Aclaración corta bajo la cifra («sin cancelados», «de contratos»). */
    nota?: string;
}

/**
 * Franja de cifras como la de «Hoy»: sin tarjetas, separadas por líneas. En el código la etiqueta va primero
 * (dt antes que dd) y en pantalla la cifra se ve arriba.
 */
export default function Cifras({ cifras, columnas = "grid-cols-2 md:grid-cols-4" }: { cifras: Cifra[]; columnas?: string }) {
    return (
        <dl className={`grid ${columnas} gap-x-6 border-b border-[var(--linea)]`}>
            {cifras.map((c) => (
                <div key={c.nombre} className="flex min-w-0 flex-col border-t border-[var(--linea)] py-4">
                    <dt className="order-2 text-[13.5px] text-[var(--mut)]">{c.nombre}</dt>
                    <dd className="order-1 break-words text-xl font-bold tracking-[-0.03em] tabular-nums text-[var(--txt)] sm:text-2xl xl:text-[28px]">{c.valor}</dd>
                    {c.nota && <dd className="order-3 mt-0.5 text-xs text-[var(--mut)]">{c.nota}</dd>}
                </div>
            ))}
        </dl>
    );
}
