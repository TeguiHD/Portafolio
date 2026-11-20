/**
 * Franja de cifras de Comercial, como la de «Hoy»: número grande, etiqueta debajo y una nota opcional, separados por
 * líneas y sin tarjetas. Sirve en páginas de servidor y en componentes de cliente (no usa estado).
 */
export interface Cifra {
    etiqueta: string;
    valor: string;
    nota?: string;
    /** La nota pide atención (atrasos): va en ámbar y con texto, no solo color. */
    aviso?: boolean;
}

export function Cifras({ items, nombre }: { items: Cifra[]; /** Nombre accesible de la franja. */ nombre: string }) {
    if (!items.length) return null;
    return (
        <dl aria-label={nombre} className={`grid grid-cols-2 border-t border-[var(--linea)] lg:flex lg:border-b ${items.length > 2 ? "sm:grid-cols-3" : ""}`}>
            {items.map((c) => (
                <div key={c.etiqueta} className="flex min-w-0 flex-col border-b border-[var(--linea)] py-4 pr-4 lg:flex-1 lg:border-b-0 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0.5">
                    <dt className="order-2 mt-1 text-[13.5px] text-[var(--mut)]">{c.etiqueta}</dt>
                    <dd className="order-1 m-0 text-[clamp(22px,2.2vw,30px)] leading-tight font-bold tracking-[-0.03em] tabular-nums text-[var(--txt)] [overflow-wrap:anywhere]">{c.valor}</dd>
                    {c.nota ? <dd className={`order-3 m-0 mt-0.5 text-[13px] ${c.aviso ? "text-amber-400" : "text-[var(--mut)]"}`}>{c.nota}</dd> : null}
                </div>
            ))}
        </dl>
    );
}
