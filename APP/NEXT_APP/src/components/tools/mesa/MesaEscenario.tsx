import type { CSSProperties, ReactNode, Ref } from "react";
import clsx from "clsx";

interface MesaEscenarioProps {
    ref?: Ref<HTMLDivElement>;
    fondo?: string;
    pista?: ReactNode;
    cambios?: number;
    pulso?: string | null;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}

/** Contenedor del resultado: fondo de salida, pista de lo que hace el puntero y contador de cambios. */
export function MesaEscenario({ ref, fondo = "transparent", pista, cambios = 0, pulso, className, style, children }: MesaEscenarioProps) {
    return (
        <div ref={ref} className={clsx("mesa-escenario", className)} data-fondo={fondo} data-pulso={pulso ?? undefined} style={style}>
            {children}
            {pista && <span className="mesa-pista" role="status" aria-live="polite">{pista}</span>}
            {cambios > 0 && <span className="mesa-cambios" aria-live="polite">{cambios} {cambios === 1 ? "cambio" : "cambios"}</span>}
        </div>
    );
}
