import { SOURCE_LABELS } from "../types";

/** Portal de origen de la vacante: etiqueta neutra con el nombre (el color no aporta información). */
export function SourceBadge({ source }: { source: string }) {
    const label = SOURCE_LABELS[source] || source;

    return (
        <span className="inline-flex items-center rounded-md border border-[var(--linea)] px-2 py-0.5 text-xs font-medium text-[var(--mut)]">
            {label}
        </span>
    );
}
