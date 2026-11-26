"use client";

import { useEffect, type ReactNode } from "react";
import { useRecentTools } from "@/hooks/useRecentTools";

/**
 * El marco de una herramienta abierta como app del escritorio. Lleva las mismas clases que el armazón de /herramientas
 * (tools.css y tema-claro.css cuelgan de .tools-workspace) y hace lo mismo que él con la visita: la cuenta una vez por
 * herramienta y sesión (con la misma llave, así abrirla en el sitio y en el escritorio no cuenta doble) y la deja en
 * recientes. Abierta fuera de una ventana, manda a la herramienta en el sitio: esta ruta no es para visitarla suelta.
 */
export function AppHerramienta({ slug, ancho, children }: { slug: string; ancho?: "estrecha" | "ancha"; children: ReactNode }) {
    useRecentTools(slug);
    useEffect(() => {
        if (window.self === window.top) { location.replace(`/herramientas/${slug}`); return; }
        // Un navegador automatizado (pruebas, robots con Chrome) no cuenta, igual que en el sitio.
        if (navigator.webdriver) return;
        const clave = `visita:${slug}`;
        try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* sin almacenamiento: se registra igual */ }
        fetch(`/api/tools/public/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }), keepalive: true }).catch(() => undefined);
    }, [slug]);
    return <div className="tools-workspace app-herramienta" data-ancho={ancho}>{children}</div>;
}
