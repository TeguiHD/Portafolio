import { EDICIONES, categoriaPorId, notaIndice, type Edicion } from "@/lib/indice/datos";
import { DIMENSIONES } from "@/lib/indice/textos-dimensiones";
import { CONTROLES, puntajeRevision } from "@/lib/indice/revision";

/** Los datos abiertos de la edición: /indice-web-chilena/datos/AAAA-MM.csv y .json (licencia CC BY 4.0). */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
    return EDICIONES.flatMap((e) => [{ archivo: `${e.edicion}.csv` }, { archivo: `${e.edicion}.json` }]);
}

/** Una celda CSV: entre comillas si lleva coma, comillas o salto; y sin fórmulas (una celda que empieza con = + - @ se abre como fórmula en Excel). */
function celda(v: unknown): string {
    if (v === null || v === undefined) return "";
    let t = String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function csv(edicion: Edicion): string {
    const conDim = edicion.sitios.some((s) => s.estado === "medido" && s.dim);
    const dims = conDim ? ["nota_general", ...DIMENSIONES.map((d) => `dim_${d.id}`), "ia_memoria_acierta", "ia_busqueda_acierta"] : [];
    const cab = ["slug", "nombre", "categoria", "region", "comuna", "tipo", "url", "estado", "fecha", "nota_indice", "rendimiento", "accesibilidad", "buenas_practicas", "seo",
        "lcp_ms", "tbt_ms", "cls", "peso_bytes", "pedidos", "controles_cumplidos", ...CONTROLES.map((c) => `control_${c.id}`), "fallas_accesibilidad", ...dims];
    const filas = edicion.sitios.map((s) => {
        const base = [s.slug, s.nombre, categoriaPorId(s.categoria)?.singular, s.region, s.comuna, s.tipo, s.url, s.estado, s.fecha?.slice(0, 10)];
        if (s.estado !== "medido") return [...base, ...Array(cab.length - base.length).fill("")];
        const rev = s.revision;
        return [...base, notaIndice(s.notas), s.notas.rendimiento, s.notas.accesibilidad, s.notas.practicas, s.notas.seo, s.lcp, s.tbt, s.cls, s.peso, s.pedidos,
            rev ? puntajeRevision(rev) : "", ...CONTROLES.map((c) => (rev ? (rev[c.id] ? 1 : 0) : "")), s.a11y.map(([id]) => id).join(" "),
            ...(conDim ? [s.general ?? "", ...DIMENSIONES.map((d) => (d.id === "velocidad" ? s.dim?.velocidad : s.dim?.[d.id]?.nota) ?? ""),
                s.ia?.memoria ? (s.ia.memoria.ok ? 1 : 0) : "", s.ia?.busqueda ? (s.ia.busqueda.ok ? 1 : 0) : ""] : [])];
    });
    // BOM: Excel en español abre bien las tildes.
    return "﻿" + [cab, ...filas].map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";
}

export async function GET(_: Request, { params }: { params: Promise<{ archivo: string }> }) {
    const { archivo } = await params;
    const cabeceras = { "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" };
    for (const e of EDICIONES) {
        if (archivo === `${e.edicion}.csv`) {
            return new Response(csv(e), { headers: { ...cabeceras, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="indice-web-chilena-${e.edicion}.csv"` } });
        }
        if (archivo === `${e.edicion}.json`) {
            const cuerpo = { ...e, licencia: "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)", fuente: "https://nicoholas.dev/indice-web-chilena" };
            return new Response(JSON.stringify(cuerpo), { headers: { ...cabeceras, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="indice-web-chilena-${e.edicion}.json"` } });
        }
    }
    return new Response("No existe", { status: 404 });
}
