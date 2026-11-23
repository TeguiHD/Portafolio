import type { CSSProperties } from "react";

/**
 * Gráficos del índice, en HTML (sin librerías). Una sola serie por gráfico: sin leyenda, el título dice qué se mide.
 * Barras de 24 px como máximo, punta redondeada y base recta, rejilla de un pelo; el valor va al final de la barra en
 * color de texto. Cada gráfico es una tabla, así que el lector de pantalla tiene los datos tal cual.
 */

/** Porcentaje de sitios que cumple cada control (barras horizontales). */
export function BarrasCumplimiento({ filas, titulo }: { filas: { id: string; nombre: string; cumplen: number; total: number; pct: number }[]; titulo: string }) {
    return (
        <table className="ix-barras">
            <caption>{titulo}</caption>
            <thead><tr><th scope="col">Control</th><th scope="col">Sitios que lo cumplen</th></tr></thead>
            <tbody>
                {filas.map((f) => (
                    <tr key={f.id}>
                        <th scope="row">{f.nombre}</th>
                        <td>
                            <span className="ix-barra" style={{ "--p": f.pct } as CSSProperties} title={`${f.cumplen} de ${f.total} sitios`}>
                                <i aria-hidden="true" />
                                <span className="ix-barra-valor">{f.pct} %<small> ({f.cumplen} de {f.total})</small></span>
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Cuántos sitios caen en cada tramo de 10 puntos (columnas). */
export function Histograma({ tramos, titulo }: { tramos: number[]; titulo: string }) {
    const max = Math.max(1, ...tramos);
    return (
        <figure className="ix-histo">
            <figcaption>{titulo}</figcaption>
            <table>
                <thead><tr><th scope="col">Nota</th><th scope="col">Sitios</th></tr></thead>
                <tbody>
                    {tramos.map((n, i) => (
                        <tr key={i} style={{ "--h": n / max } as CSSProperties}>
                            <th scope="row">{i === 9 ? "90–100" : `${i * 10}–${i * 10 + 9}`}</th>
                            <td><span className="ix-col" title={`${n} sitio${n === 1 ? "" : "s"} con nota ${i === 9 ? "90–100" : `${i * 10}–${i * 10 + 9}`}`}><i aria-hidden="true" /><b>{n || ""}</b></span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}
