import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TOOL_REGISTRY, mergePublicToolCatalog } from "@/lib/tool-registry";

// El catálogo cambia solo cuando se edita desde el panel: se guarda 60 s en memoria en vez de consultar la base en cada
// página de /herramientas (la CSP con nonce obliga a renderizar en cada petición, así que no hay caché de página).
const VIGENCIA = 60_000;
let guardado: { hasta: number; valor: Promise<ReturnType<typeof mergePublicToolCatalog>> } | null = null;

/** Solo hay página para las herramientas del registro: otro slug en la base sería un enlace a un 404. */
const CON_PAGINA = new Set(DEFAULT_TOOL_REGISTRY.map((t) => t.slug));

async function leerCatalogo() {
    try {
        const filas = await prisma.tool.findMany({
            orderBy: { sortOrder: "asc" },
            select: { id: true, slug: true, name: true, description: true, icon: true, category: true, sortOrder: true, isPublic: true, isActive: true },
        });
        // Una herramienta que el panel marcó privada o inactiva no se lista: el registro por defecto la traía igual y el
        // enlace terminaba en «Acceso restringido» o «En mantenimiento».
        const ocultas = new Set(filas.filter((t) => !t.isPublic || !t.isActive).map((t) => t.slug));
        const publicas = filas.filter((t) => t.isPublic && t.isActive);
        return mergePublicToolCatalog(publicas).filter((t) => CON_PAGINA.has(t.slug) && !ocultas.has(t.slug));
    } catch {
        // Sin base: el registro por defecto, sin guardarlo (se reintenta en la próxima visita).
        guardado = null;
        return mergePublicToolCatalog();
    }
}

// Compartido por el catálogo y la navegación; una consulta por minuto como mucho.
export const getPublicTools = cache(async () => {
    const ahora = Date.now();
    if (!guardado || guardado.hasta <= ahora) guardado = { hasta: ahora + VIGENCIA, valor: leerCatalogo() };
    return guardado.valor;
});
