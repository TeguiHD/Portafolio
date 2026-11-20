import { BLOQUE } from "@/modules/admin/armazon/EsqueletoSeccion";

/**
 * Esqueleto con la forma del resumen de Finanzas: título y botones, franja de cifras, últimos movimientos y la
 * columna del mes. Lo usan finance/loading.tsx (mientras llega la página) y FinanceDashboardClean (mientras llegan
 * los datos), así la carga se ve como un solo paso y no como dos esqueletos distintos.
 */
export function EsqueletoFinanzas() {
    return (
        <div role="status" className="max-w-[1180px] animate-pulse pb-8 motion-reduce:animate-none">
            <span className="sr-only">Cargando finanzas…</span>
            <div aria-hidden="true">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className={`${BLOQUE} h-9 w-44`} />
                        <div className={`${BLOQUE} mt-3 h-4 w-52`} />
                    </div>
                    <div className="flex gap-2">
                        <div className={`${BLOQUE} h-10 w-36`} />
                        <div className={`${BLOQUE} h-10 w-40`} />
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 border-y border-[var(--linea)] md:flex">
                    {[0, 1].map((i) => (
                        <div key={i} className="flex-1 border-[var(--linea)] py-4 pl-4 first:pl-0.5 [&:not(:first-child)]:border-l">
                            <div className={`${BLOQUE} h-7 w-40 max-w-full`} />
                            <div className={`${BLOQUE} mt-2 h-3.5 w-28`} />
                        </div>
                    ))}
                </div>

                <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)] lg:gap-14">
                    <div>
                        <div className={`${BLOQUE} mb-3 h-4 w-36`} />
                        <ul className="m-0 list-none border-t border-[var(--linea)] p-0">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <li key={i} className="flex items-center gap-4 border-b border-[var(--linea)] px-1 py-3.5">
                                    <div className={`${BLOQUE} size-10 shrink-0 rounded-full`} />
                                    <div className="min-w-0 flex-1">
                                        <div className={`${BLOQUE} h-4 ${i % 2 ? "w-2/5" : "w-3/5"}`} />
                                        <div className={`${BLOQUE} mt-2 h-3 w-16`} />
                                    </div>
                                    <div className={`${BLOQUE} h-4 w-20 shrink-0`} />
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className={`${BLOQUE} mb-3 h-4 w-28`} />
                        <div className={`${BLOQUE} h-1.5 w-full rounded-full`} />
                        <div className={`${BLOQUE} mt-3 h-4 w-48`} />
                    </div>
                </div>
            </div>
        </div>
    );
}
