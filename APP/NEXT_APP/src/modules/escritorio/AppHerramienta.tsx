"use client";

import { useEffect, type ReactNode } from "react";
import { useRecentTools } from "@/hooks/useRecentTools";
import { contarVisita } from "@/lib/visita-herramienta";

/**
 * El marco de una herramienta abierta como app del escritorio. Lleva las mismas clases que el armazón de /herramientas
 * (tools.css y tema-claro.css cuelgan de .tools-workspace) y hace lo mismo que él con la visita: la cuenta una vez por
 * herramienta y sesión (contarVisita, la misma llave del sitio: abrirla en ambos lados no cuenta doble) y la deja en
 * recientes. Abierta fuera de una ventana, manda a la herramienta en el sitio: esta ruta no es para visitarla suelta.
 */
export function AppHerramienta({ slug, ancho, children }: { slug: string; ancho?: "estrecha" | "ancha"; children: ReactNode }) {
    useRecentTools(slug);
    useEffect(() => {
        // Suelta, va a la herramienta en el sitio con lo que traía la dirección (el tipo de QR, la magnitud de Unidades).
        if (window.self === window.top) { location.replace(`/herramientas/${slug}${location.search}${location.hash}`); return; }
        contarVisita(slug);
    }, [slug]);
    return <div className="tools-workspace app-herramienta" data-ancho={ancho}>{children}</div>;
}
