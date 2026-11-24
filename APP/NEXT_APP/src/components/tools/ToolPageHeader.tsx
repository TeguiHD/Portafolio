import type { CSSProperties } from "react";
import { TOOL_ICONS } from "./ToolIcons";
import { DEFAULT_TOOL_REGISTRY } from "@/lib/tool-registry";
import { COLOR_CATEGORIA } from "@/modules/landing/viva/siglas";

const CATALOGO = new Map(DEFAULT_TOOL_REGISTRY.map((t) => [t.slug, t]));
/** Lo que corre entero en el navegador (30 de 33, verificado en el código el 24-11-2026; el registro de uso no manda contenido).
 *  Las demás traen su `donde` en el registro: regex (IA), dns (servidor) y qr (vista 3D). */
const NAVEGADOR = "Funciona en tu navegador: lo que escribes o subes no sale de tu equipo.";

/**
 * La misma cabecera en todas: el ícono de su familia, el nombre y la línea del catálogo, y dónde se procesa.
 * Centrada, como en las herramientas sueltas de la competencia: el título queda en el mismo lugar con cualquier ancho.
 */
export function ToolPageHeader({ slug }: { slug: string }) {
    const t = CATALOGO.get(slug);
    const Icon = TOOL_ICONS[slug];
    const color = COLOR_CATEGORIA[t?.publicCategory ?? ""] ?? "#5eead4";
    return (
        <header className="tool-page-heading th" style={{ "--c": color } as CSSProperties}>
            <div className="th-titulo">
                {Icon && <span className="th-icono"><Icon aria-hidden="true" /></span>}
                <h1>{t?.name ?? slug}</h1>
            </div>
            {t ? <p>{t.description}</p> : null}
            <p className="th-donde">{t?.donde ?? NAVEGADOR}</p>
        </header>
    );
}
