import type { CSSProperties } from "react";
import { TOOL_ICONS } from "./ToolIcons";
import { DEFAULT_TOOL_REGISTRY } from "@/lib/tool-registry";
import { COLOR_CATEGORIA } from "@/modules/landing/viva/siglas";

const CATALOGO = new Map(DEFAULT_TOOL_REGISTRY.map((t) => [t.slug, t]));
/** Lo que corre en el navegador (27 de 29, verificado en el código; el registro de uso no manda contenido). */
const NAVEGADOR = "Funciona en tu navegador: lo que escribes o subes no sale de tu equipo.";

/**
 * La misma cabecera en las 29: el ícono de su familia, el nombre y la línea del catálogo, y dónde se procesa.
 * Antes cada página traía su título y su subtítulo, y no coincidían con el catálogo ni entre sí.
 */
export function ToolPageHeader({ slug }: { slug: string }) {
    const t = CATALOGO.get(slug);
    const Icon = TOOL_ICONS[slug];
    const color = COLOR_CATEGORIA[t?.publicCategory ?? ""] ?? "#5eead4";
    return (
        <header className="tool-page-heading th" style={{ "--c": color } as CSSProperties}>
            {Icon && <span className="th-icono"><Icon aria-hidden="true" /></span>}
            <div className="min-w-0">
                <h1>{t?.name ?? slug}</h1>
                {t ? <p>{t.description}</p> : null}
                <p className="th-donde">{t?.donde ?? NAVEGADOR}</p>
            </div>
        </header>
    );
}
