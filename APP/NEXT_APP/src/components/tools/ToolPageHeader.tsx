import type { CSSProperties, ReactNode } from "react";
import { TOOL_ICONS } from "./ToolIcons";
import { getDefaultPublicToolCatalog } from "@/lib/tool-registry";
import { COLOR_CATEGORIA } from "@/modules/landing/viva/siglas";

const FAMILIA = new Map(getDefaultPublicToolCatalog().map((t) => [t.slug, t.category]));

/** Cabecera común de las herramientas: el ícono con el color de su familia, el título grande y una línea. */
export function ToolPageHeader({ slug, title, description }: { slug: string; title: ReactNode; description?: ReactNode }) {
    const Icon = TOOL_ICONS[slug];
    const color = COLOR_CATEGORIA[FAMILIA.get(slug) ?? ""] ?? "#5eead4";
    return (
        <header className="tool-page-heading th" style={{ "--c": color } as CSSProperties}>
            {Icon && <span className="th-icono"><Icon aria-hidden="true" /></span>}
            <div className="min-w-0">
                <h1>{title}</h1>
                {description && <p>{description}</p>}
            </div>
        </header>
    );
}
