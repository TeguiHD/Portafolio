import { Fragment, type ReactNode } from "react";

export type EstadoPaso = "pendiente" | "activo" | "listo" | "error";
export interface Paso { id: string; etiqueta: string; icono: ReactNode }

const LECTURA: Record<EstadoPaso, string> = { pendiente: "", activo: ": en curso", listo: ": listo", error: ": con error" };

/** Tira de pasos bajo el escenario. `progreso` (0..1) solo aplica al paso activo; sin él, el anillo punteado gira. */
export function MesaPasos({ etiqueta, pasos, estados, progreso }: { etiqueta: string; pasos: Paso[]; estados: EstadoPaso[]; progreso?: number }) {
    return (
        <ol className="mesa-pasos" aria-label={etiqueta}>
            {pasos.map((paso, index) => {
                const estado = estados[index] ?? "pendiente";
                const avance = estado === "listo" ? 1 : estado === "activo" && progreso !== undefined ? Math.max(0, Math.min(1, progreso)) : 0;
                return (
                    <Fragment key={paso.id}>
                        {index > 0 && <li className="mesa-track" aria-hidden="true" data-lleno={estados[index - 1] === "listo" ? "true" : "false"}><b /></li>}
                        <li className="mesa-nodo" data-estado={estado} aria-current={estado === "activo" ? "step" : undefined}>
                            <svg className="mesa-nodo-ring" viewBox="0 0 46 46" aria-hidden="true"><circle className="fondo" cx="23" cy="23" r="22" /><circle className="avance" cx="23" cy="23" r="22" style={{ strokeDashoffset: 138 - 138 * avance }} /></svg>
                            <span className="mesa-nodo-spin" aria-hidden="true" />
                            <span className="mesa-nodo-ico">{paso.icono}</span>
                            <svg className="mesa-nodo-chk" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg>
                            <small>{paso.etiqueta}<span className="sr-only">{LECTURA[estado]}</span></small>
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}
