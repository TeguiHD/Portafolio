import type { CSSProperties } from "react";

/**
 * Las cuatro notas de Lighthouse como anillos. Cada uno es un <progress> nativo (el lector de pantalla lee la nota) y el
 * número del centro solo se ve. El color sigue el criterio de Lighthouse: de 90 a 100 bueno, de 50 a 89 a mejorar, menos
 * de 50 malo; la nota va siempre escrita, así que el color nunca es lo único que la dice.
 */
export const CATEGORIAS = [
    { id: "rendimiento", nombre: "Rendimiento" },
    { id: "accesibilidad", nombre: "Accesibilidad" },
    { id: "practicas", nombre: "Buenas prácticas" },
    { id: "seo", nombre: "SEO" },
] as const;
export type Notas = Record<(typeof CATEGORIAS)[number]["id"], number | null>;

export const nivel = (v: number) => (v >= 90 ? "bueno" : v >= 50 ? "medio" : "bajo");

export function Anillos({ notas, contexto, chico = false }: { notas: Notas; contexto: string; chico?: boolean }) {
    return (
        <ul className={`an-fila${chico ? " an-chico" : ""}`}>
            {CATEGORIAS.map((c) => {
                const v = notas[c.id];
                return (
                    <li key={c.id}>
                        <span className="an-anillo">
                            {v === null
                                ? <span className="an-sin">Sin dato</span>
                                : <progress className="an-progreso" value={v} max={100} data-nivel={nivel(v)} aria-label={`${c.nombre} ${contexto}`} aria-valuetext={`${v} de 100`} style={{ "--valor": v } as CSSProperties} />}
                            {v !== null && <span className="an-numero" aria-hidden="true">{v}</span>}
                        </span>
                        <span className="an-nombre" aria-hidden="true">{c.nombre}</span>
                    </li>
                );
            })}
        </ul>
    );
}
