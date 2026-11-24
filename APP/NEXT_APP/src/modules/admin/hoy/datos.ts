import "server-only";
import { prisma } from "@/lib/prisma";
import { cuotaAtrasada } from "@/modules/admin/cobros";
import { textoContacto } from "@/modules/admin/texto-contacto";

export interface Pendiente { titulo: string; detalle: string; href: string; tono: "acento" | "aviso" | "suave"; accion: string }
export interface Cifra { valor: number; etiqueta: string; cambio?: number }
export interface Dia { fecha: string; visitas: number }

const DIA = 86_400_000;
const fechaCorta = (d: Date) => new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", timeZone: "America/Santiago" }).format(d);
const hace = (d: Date) => {
    const dias = Math.floor((Date.now() - d.getTime()) / DIA);
    return dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
};
/** Las visitas que cuentan son las del sitio público: el panel, el portal y el acceso no. */
export const PUBLICAS = `path NOT LIKE '/admin%' AND path NOT LIKE '/cotizacion%' AND path NOT LIKE '/acceso%' AND path NOT LIKE '/cambiar-clave%' AND path NOT LIKE '/api%'`;

/** Lo que espera una acción: propuestas sin firmar, mensajes sin leer y cuotas por cobrar (cada cosa solo con su permiso). */
export async function pendientes(userId: string, permisos: Set<string>): Promise<{ lista: Pendiente[]; cuenta: { propuestas: number; mensajes: number; cobros: number } }> {
    const lista: Pendiente[] = [];
    // Cobros que importan hoy: atrasados o que vencen en los próximos 30 días (no los que vencen en meses).
    // Con el permiso de Pagos, como el resumen de Comercial: quien no ve Pagos tampoco ve sus cuotas aquí.
    const veCobros = permisos.has("crm.payments.view");
    const cobrosWhere = { status: { in: ["PENDING", "OVERDUE"] as ("PENDING" | "OVERDUE")[] }, dueDate: { not: null, lte: new Date(Date.now() + 30 * DIA) }, quotation: { userId, isDeleted: false } };
    const [propuestas, totalPropuestas, mensajes, ultimo, cuotas, totalCobros] = await Promise.all([
        permisos.has("quotations.view")
            ? prisma.quotation.findMany({
                where: { userId, status: "PENDING", isDeleted: false },
                orderBy: { createdAt: "asc" }, take: 6,
                select: { folio: true, projectName: true, clientName: true, clientId: true, createdAt: true, codeExpiresAt: true, client: { select: { name: true } } },
            }) : [],
        permisos.has("quotations.view") ? prisma.quotation.count({ where: { userId, status: "PENDING", isDeleted: false } }) : 0,
        permisos.has("contact.manage") ? prisma.contactMessage.count({ where: { status: "UNREAD", isSpam: false } }) : 0,
        permisos.has("contact.manage")
            ? prisma.contactMessage.findFirst({ where: { status: "UNREAD", isSpam: false }, orderBy: { createdAt: "desc" }, select: { name: true, createdAt: true } }) : null,
        veCobros
            ? prisma.quotationPayment.findMany({
                where: cobrosWhere,
                orderBy: { dueDate: "asc" }, take: 4,
                select: { amount: true, dueDate: true, status: true, installmentNumber: true, totalInstallments: true, quotation: { select: { folio: true, clientName: true, clientId: true } } },
            }) : [],
        veCobros ? prisma.quotationPayment.count({ where: cobrosWhere }) : 0,
    ]);

    for (const p of propuestas) {
        const vence = p.codeExpiresAt && p.codeExpiresAt.getTime() > Date.now() && p.codeExpiresAt.getTime() - Date.now() < 7 * DIA ? ` El código vence el ${fechaCorta(p.codeExpiresAt)}.` : "";
        lista.push({
            titulo: `Propuesta ${p.folio} para ${p.client?.name || p.clientName}`,
            detalle: `${p.projectName}. Enviada ${hace(p.createdAt)}, sin firmar.${vence}`,
            href: p.clientId ? `/admin/cotizaciones/${p.clientId}` : "/admin/cotizaciones",
            tono: "acento", accion: "Abrir",
        });
    }
    if (mensajes > 0) {
        lista.push({
            titulo: mensajes === 1 ? "Un mensaje sin leer" : `${mensajes} mensajes sin leer`,
            detalle: ultimo ? `El último${ultimo.name ? `, de ${textoContacto(ultimo.name)},` : ""} llegó ${hace(ultimo.createdAt)}.` : "Desde el formulario del sitio.",
            href: "/admin/contact", tono: "aviso", accion: "Leer",
        });
    }
    const pesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
    for (const c of cuotas) {
        // Misma regla que Pagos y Comercial: atrasada desde el día siguiente al vencimiento (en Chile), no desde la hora.
        const atrasada = cuotaAtrasada(c.status, c.dueDate);
        const cuota = c.installmentNumber && c.totalInstallments ? `Cuota ${c.installmentNumber} de ${c.totalInstallments}` : "Pago";
        lista.push({
            titulo: `${cuota} de ${c.quotation.clientName}`,
            detalle: `${pesos.format(c.amount)} de la propuesta ${c.quotation.folio}. ${atrasada ? "Venció el" : "Vence el"} ${fechaCorta(c.dueDate!)}.`,
            // En la propuesta está «Registrar pago» con sus cuotas; sin acceso a Propuestas, a Pagos.
            href: c.quotation.clientId && permisos.has("quotations.view") ? `/admin/cotizaciones/${c.quotation.clientId}` : "/admin/gestion-comercial/pagos",
            tono: atrasada ? "aviso" : "suave", accion: "Ver",
        });
    }
    return { lista, cuenta: { propuestas: totalPropuestas, mensajes, cobros: totalCobros } };
}

/** Cifras de los últimos 30 días y visitas por día. Con el permiso analytics.view, la misma regla que Visitas. */
export async function cifras(userId: string, permisos: Set<string>): Promise<{ cifras: Cifra[]; dias: Dia[] } | null> {
    if (!permisos.has("analytics.view")) return null;
    const ahora = new Date();
    // Una sola ventana para todo «Hoy» (cifras y curva): hoy y los 29 días anteriores, en días de Chile. Antes las cifras
    // contaban 30×24 h hacia atrás y la curva días calendario: pasada la medianoche no sumaban lo mismo.
    const [{ desde }] = await prisma.$queryRawUnsafe<{ desde: Date }[]>(
        `SELECT ((((now() AT TIME ZONE 'America/Santiago')::date - 29)::timestamp AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC') AS desde`);
    const antes = new Date(desde.getTime() - 30 * DIA);
    const [periodo, previo, porDia, mensajes, propuestas] = await Promise.all([
        prisma.$queryRawUnsafe<{ visitas: number; visitantes: number }[]>(`SELECT count(*)::int AS visitas, count(DISTINCT ip)::int AS visitantes FROM "PageView" WHERE "createdAt" >= $1 AND ${PUBLICAS}`, desde),
        prisma.$queryRawUnsafe<{ visitas: number }[]>(`SELECT count(*)::int AS visitas FROM "PageView" WHERE "createdAt" >= $1 AND "createdAt" < $2 AND ${PUBLICAS}`, antes, desde),
        prisma.$queryRawUnsafe<{ fecha: string; visitas: number }[]>(
            `SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::date, 'YYYY-MM-DD') AS fecha, count(*)::int AS visitas
             FROM "PageView" WHERE "createdAt" >= $1 AND ${PUBLICAS} GROUP BY 1 ORDER BY 1`, desde),
        permisos.has("contact.manage") ? prisma.contactMessage.count({ where: { createdAt: { gte: desde }, isSpam: false } }) : null,
        permisos.has("quotations.view") ? prisma.quotation.count({ where: { userId, createdAt: { gte: desde }, isDeleted: false, NOT: { status: "DRAFT" } } }) : null,
    ]);
    const v = periodo[0] ?? { visitas: 0, visitantes: 0 }, p = previo[0]?.visitas ?? 0;
    const lista: Cifra[] = [
        { valor: v.visitas, etiqueta: "visitas", cambio: p > 0 ? Math.round(((v.visitas - p) / p) * 100) : undefined },
        { valor: v.visitantes, etiqueta: "visitantes" },
    ];
    if (mensajes !== null) lista.push({ valor: mensajes, etiqueta: "mensajes recibidos" });
    if (propuestas !== null) lista.push({ valor: propuestas, etiqueta: "propuestas enviadas" });

    // Los 30 días completos, con ceros donde no hubo visitas.
    const mapa = new Map(porDia.map((d) => [d.fecha, d.visitas]));
    const dias: Dia[] = Array.from({ length: 30 }, (_, i) => {
        const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(ahora.getTime() - (29 - i) * DIA));
        return { fecha: f, visitas: mapa.get(f) ?? 0 };
    });
    return { cifras: lista, dias };
}
