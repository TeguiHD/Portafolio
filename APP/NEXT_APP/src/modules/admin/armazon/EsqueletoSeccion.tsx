/**
 * Esqueleto de carga de una sección del panel, para los `loading.tsx`.
 * Es de servidor y no trae JavaScript de cliente (el esqueleto viejo, DashboardPageSkeleton, arrastraba framer-motion):
 * bloques con los tokens del tema, sin tarjetas, y un pulso suave que se apaga con «menos movimiento».
 */

/** Clase de un bloque gris del esqueleto; sirve para armar esqueletos a medida con el mismo aspecto. */
export const BLOQUE = "rounded-md bg-[color-mix(in_srgb,var(--txt)_7%,transparent)]";

// Anchos fijos (Tailwind necesita las clases literales) para que las filas no se vean idénticas.
const ANCHOS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/4"];

interface Props {
    /** Lo que se está cargando, para el lector de pantalla: «Cargando {nombre}». */
    nombre: string;
    /** Cuántas cifras van en la franja de arriba (0 = sin franja). */
    cifras?: number;
    /** Muestra la fila de buscador y botón sobre la lista. */
    barra?: boolean;
    /** Filas de la lista. */
    filas?: number;
}

export function EsqueletoSeccion({ nombre, cifras = 0, barra = false, filas = 6 }: Props) {
    return (
        <div role="status" className="max-w-[1180px] animate-pulse motion-reduce:animate-none">
            <span className="sr-only">Cargando {nombre}…</span>
            <div aria-hidden="true">
                <div className={`${BLOQUE} h-9 w-48 sm:w-64`} />
                <div className={`${BLOQUE} mt-3 h-4 w-72 max-w-full`} />

                {cifras > 0 ? (
                    <div className="mt-8 grid grid-cols-2 gap-x-6 border-y border-[var(--linea)] sm:grid-cols-4">
                        {Array.from({ length: cifras }, (_, i) => (
                            <div key={i} className="py-4">
                                <div className={`${BLOQUE} h-7 w-20`} />
                                <div className={`${BLOQUE} mt-2 h-3 w-24 max-w-full`} />
                            </div>
                        ))}
                    </div>
                ) : null}

                {barra ? (
                    <div className="mt-8 flex gap-3">
                        <div className={`${BLOQUE} h-10 min-w-0 flex-1 sm:max-w-sm`} />
                        <div className={`${BLOQUE} h-10 w-28 shrink-0`} />
                    </div>
                ) : null}

                <ul className="mt-8 border-t border-[var(--linea)]">
                    {Array.from({ length: filas }, (_, i) => (
                        <li key={i} className="flex items-center gap-4 border-b border-[var(--linea)] px-1 py-4">
                            <div className={`${BLOQUE} h-9 w-9 shrink-0 rounded-full`} />
                            <div className="min-w-0 flex-1">
                                <div className={`${BLOQUE} h-4 ${ANCHOS[i % ANCHOS.length]}`} />
                                <div className={`${BLOQUE} mt-2 h-3 w-1/4`} />
                            </div>
                            <div className={`${BLOQUE} h-4 w-16 shrink-0`} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
