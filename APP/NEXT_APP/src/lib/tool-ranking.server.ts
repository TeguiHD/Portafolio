import "server-only";
import { prisma } from "@/lib/prisma";
import { AGENTES_AUTOMATIZADOS, elegirDestacadas, UMBRAL_SESIONES, type Destacadas } from "@/lib/tool-destacadas";

// El orden por uso cambia lento: se recalcula cada 10 minutos como mucho, no en cada visita.
const VIGENCIA = 10 * 60_000;
let guardado: { hasta: number; conteos: { slug: string; sesiones: number }[] } | null = null;

/**
 * Uso real de los últimos 30 días: personas distintas (IP con hash; en IPv6, su /64) que abrieron cada herramienta.
 * Solo cuenta la acción «view», que la carcasa registra en las 29 por igual (las demás acciones solo existen en
 * algunas, y medirían distinto). Sin navegadores automatizados, robots ni clientes de línea de comandos.
 */
async function leerConteos(): Promise<{ slug: string; sesiones: number }[]> {
    const filas = await prisma.$queryRaw<{ slug: string; sesiones: bigint }[]>`
        SELECT t.slug, count(DISTINCT u.ip) AS sesiones
        FROM "ToolUsage" u JOIN "Tool" t ON t.id = u."toolId"
        WHERE u."createdAt" > now() - interval '30 days'
          AND u.action = 'view'
          AND u.ip IS NOT NULL
          AND coalesce(u."userAgent", '') <> ''
          AND u."userAgent" !~* ${AGENTES_AUTOMATIZADOS}
        GROUP BY t.slug
        HAVING count(DISTINCT u.ip) >= ${UMBRAL_SESIONES}
        ORDER BY sesiones DESC
        LIMIT 6`;
    return filas.map((f) => ({ slug: f.slug, sesiones: Number(f.sesiones) }));
}

/** Las 6 destacadas de /herramientas. Sin base (o si la consulta falla) va el orden de respaldo, sin guardarlo. */
export async function getDestacadas(publicas: string[]): Promise<Destacadas> {
    const ahora = Date.now();
    if (!guardado || guardado.hasta <= ahora) {
        try {
            guardado = { hasta: ahora + VIGENCIA, conteos: await leerConteos() };
        } catch {
            guardado = null;
            return elegirDestacadas([], publicas);
        }
    }
    return elegirDestacadas(guardado.conteos, publicas);
}
