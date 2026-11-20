import type { ReactNode } from "react";
import { Materia } from "@/modules/materia/Materia";
import { Barra, type EnlaceBarra } from "./Barra";
import { Pie } from "./Pie";
import "./esqueleto.css";

/**
 * Lo que comparten las páginas públicas: la materia de fondo, la barra y el pie.
 *
 * - `portada`: activa los estilos de sección, títulos y planos de profundidad de la portada.
 * - `soloOscuro`: para páginas cuyo interior todavía no se rediseña. Se quedan en oscuro y sin botón de tema,
 *   porque su contenido viejo no tiene versión clara.
 */
export function Esqueleto({ children, portada = false, soloOscuro = false, enlaces, inicio, contacto }: {
    children: ReactNode; portada?: boolean; soloOscuro?: boolean; enlaces?: EnlaceBarra[]; inicio?: string; contacto?: string;
}) {
    const clases = ["viva", soloOscuro && "solo-oscuro", portada && "viva-portada"].filter(Boolean).join(" ");
    return (
        <Materia>
            <div className={clases}>
                <Barra enlaces={enlaces} inicio={inicio} contacto={contacto} conTema={!soloOscuro} />
                <div id="contenido" tabIndex={-1}>{children}</div>
                <Pie />
                <div className="avisos" popover="manual" role="status" aria-live="polite" />
            </div>
        </Materia>
    );
}
