import "server-only";
import { prisma } from "@/lib/prisma";
// Las mismas rutas públicas que «Hoy»: así ambas pantallas dan lo mismo en el mismo rango.
import { PUBLICAS } from "@/modules/admin/hoy/datos";

export interface DatosVisitas {
    days: number;
    pageViews: number;
    uniqueVisitors: number;
    uniquePages: number;
    pageViewsByDay: { date: string; label: string; views: number }[];
    ctaClicks: Record<string, number>;
    topReferrers: { source: string | null; visits: number }[];
    topPages: { path: string; visits: number }[];
    /** Propuestas enviadas en el rango (sin borradas ni borradores); null si no tiene `quotations.view`. */
    quotations: number | null;
}

const DIA = 86_400_000;

/** Rango pedido en la URL: de 1 a 90 días; 7 si no viene o no es un número. */
export function diasDelRango(valor: string | null | undefined): number {
    const n = Number.parseInt(valor ?? "", 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 90) : 7;
}

/**
 * Visitas de hoy y los `dias - 1` días anteriores, en días de Chile, contadas en la base (nunca fila a fila).
 * Con `dias = 30` es la misma ventana que «Hoy».
 */
export async function datosVisitas(dias: number, userId: string, verPropuestas: boolean): Promise<DatosVisitas> {
    const [{ desde, hoy }] = await prisma.$queryRawUnsafe<{ desde: Date; hoy: string }[]>(
        `SELECT ((((now() AT TIME ZONE 'America/Santiago')::date - $1::int)::timestamp AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC') AS desde,
                to_char((now() AT TIME ZONE 'America/Santiago')::date, 'YYYY-MM-DD') AS hoy`, dias - 1);

    // La ruta se agrupa sin la consulta (?…): /herramientas/qr y /herramientas/qr?x=1 son la misma página.
    const [totales, porDia, paginas, fuentes, clics, propuestas] = await Promise.all([
        prisma.$queryRawUnsafe<{ visitas: number; visitantes: number; paginas: number }[]>(
            `SELECT count(*)::int AS visitas, count(DISTINCT ip)::int AS visitantes, count(DISTINCT split_part(path, '?', 1))::int AS paginas
             FROM "PageView" WHERE "createdAt" >= $1 AND ${PUBLICAS}`, desde),
        prisma.$queryRawUnsafe<{ fecha: string; visitas: number }[]>(
            `SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::date, 'YYYY-MM-DD') AS fecha, count(*)::int AS visitas
             FROM "PageView" WHERE "createdAt" >= $1 AND ${PUBLICAS} GROUP BY 1`, desde),
        prisma.$queryRawUnsafe<{ ruta: string; visitas: number }[]>(
            `SELECT split_part(path, '?', 1) AS ruta, count(*)::int AS visitas
             FROM "PageView" WHERE "createdAt" >= $1 AND ${PUBLICAS} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`, desde),
        prisma.$queryRawUnsafe<{ referrer: string; visitas: number }[]>(
            `SELECT referrer, count(*)::int AS visitas
             FROM "PageView" WHERE "createdAt" >= $1 AND referrer IS NOT NULL AND ${PUBLICAS} GROUP BY 1 ORDER BY 2 DESC LIMIT 5`, desde),
        prisma.ctaClick.groupBy({ by: ["action"], where: { createdAt: { gte: desde } }, _count: { _all: true } }),
        verPropuestas
            ? prisma.quotation.count({ where: { userId, createdAt: { gte: desde }, isDeleted: false, NOT: { status: "DRAFT" } } })
            : Promise.resolve(null),
    ]);

    // Todos los días del rango, con ceros donde no hubo visitas. Se cuentan sobre fechas de calendario (UTC a medianoche)
    // para que el cambio de hora de Chile no repita ni salte un día.
    const mapa = new Map(porDia.map((d) => [d.fecha, d.visitas]));
    const [a, m, d] = hoy.split("-").map(Number);
    const base = Date.UTC(a, m - 1, d);
    const diaSemana = new Intl.DateTimeFormat("es-CL", { weekday: "short", timeZone: "UTC" });
    const pageViewsByDay = Array.from({ length: dias }, (_, i) => {
        const fecha = new Date(base - (dias - 1 - i) * DIA);
        const clave = fecha.toISOString().slice(0, 10);
        return { date: clave, label: diaSemana.format(fecha), views: mapa.get(clave) ?? 0 };
    });

    const t = totales[0] ?? { visitas: 0, visitantes: 0, paginas: 0 };
    return {
        days: dias,
        pageViews: t.visitas,
        uniqueVisitors: t.visitantes,
        uniquePages: t.paginas,
        pageViewsByDay,
        ctaClicks: Object.fromEntries(clics.map((c) => [c.action || "sin nombre", c._count._all])),
        topReferrers: fuentes.map((f) => ({ source: f.referrer, visits: f.visitas })),
        topPages: paginas.map((p) => ({ path: p.ruta || "/", visits: p.visitas })),
        quotations: propuestas,
    };
}
