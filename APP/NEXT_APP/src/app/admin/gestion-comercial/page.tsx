import Link from "next/link";
import { ArrowRight, FilePlus, Filter, Users, Wallet, type LucideIcon } from "lucide-react";
import { requirePagePermission } from "@/lib/page-security";
import { getUserEffectivePermissions } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { DealStage } from "@/generated/prisma/client";
import { Cifras, type Cifra } from "./cifras";
import { bajada, pesos, subtitulo, titulo, vacio } from "./estilos";
import { diaChile, filtroAtrasadas, inicioDelMesChile } from "@/modules/admin/cobros";

export const dynamic = "force-dynamic";

const ZONA = "America/Santiago";
const DIA = 86_400_000;
const ABIERTAS: DealStage[] = ["PROSPECT", "CONTACTED", "PROPOSAL", "NEGOTIATION"];
const numero = new Intl.NumberFormat("es-CL");
const fechaLarga = (d: Date) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", timeZone: ZONA }).format(d);

/** Días de calendario (en Chile) entre hoy y la fecha: 0 si es hoy, negativo si ya pasó. */
const diasHasta = (fecha: Date, ahora: Date) => Math.round((Date.parse(diaChile(fecha)) - Date.parse(diaChile(ahora))) / DIA);
const enDias = (dias: number) => dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
const plural = (n: number, uno: string, varios: string) => `${numero.format(n)} ${n === 1 ? uno : varios}`;

interface Atajo { nombre: string; href: string; icono: LucideIcon; permiso: string }
const ATAJOS: Atajo[] = [
    { nombre: "Nueva oportunidad", href: "/admin/gestion-comercial/pipeline?nueva=1", icono: Filter, permiso: "crm.pipeline.manage" },
    { nombre: "Registrar pago", href: "/admin/gestion-comercial/pagos?registrar=1", icono: Wallet, permiso: "crm.payments.manage" },
    { nombre: "Crear propuesta", href: "/admin/cotizaciones", icono: FilePlus, permiso: "quotations.create" },
    { nombre: "Ver clientes", href: "/admin/clientes", icono: Users, permiso: "quotations.view" },
];

/**
 * Resumen de Comercial. Reúne lo que mostraba «Servicios» y no está en otra página: lo cobrado en el mes, lo que falta
 * cobrar y los contratos activos cerca de vencer. Cada bloque se lee solo con el permiso de su propia sección.
 */
export default async function GestionComercialDashboard() {
    const session = await requirePagePermission("crm.dashboard");
    const userId = session.user.id;
    const permisos = await getUserEffectivePermissions(userId, session.user.role);
    const ve = {
        oportunidades: permisos.has("crm.pipeline.view"),
        contratos: permisos.has("crm.contracts.view"),
        pagos: permisos.has("crm.payments.view"),
        clientes: permisos.has("quotations.view"),
    };

    const ahora = new Date();
    const desde = inicioDelMesChile(ahora);
    const mes = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: ZONA }).format(ahora);
    const deUsuario = { quotation: { userId, isDeleted: false } };
    const porCobrar = { ...deUsuario, status: { in: ["PENDING", "OVERDUE"] as ("PENDING" | "OVERDUE")[] } };

    // Todo en paralelo y agregado en la base (groupBy, aggregate, count): nada de traer filas para contarlas.
    const lectura = Promise.all([
        ve.oportunidades ? prisma.deal.groupBy({ by: ["stage"], where: { userId, isDeleted: false }, _count: { _all: true } }) : null,
        ve.contratos ? prisma.contract.groupBy({ by: ["status"], where: { userId, isDeleted: false }, _count: { _all: true } }) : null,
        // Activos con término dentro del año: cada uno avisa con sus propios días (renewalAlertDays), se filtra abajo.
        ve.contratos ? prisma.contract.findMany({
            where: { userId, isDeleted: false, status: "ACTIVE", endDate: { not: null, lte: new Date(ahora.getTime() + 365 * DIA) } },
            select: { id: true, contractNumber: true, title: true, endDate: true, autoRenew: true, renewalAlertDays: true, client: { select: { name: true } } },
            orderBy: { endDate: "asc" },
            take: 50,
        }) : null,
        ve.pagos ? prisma.quotationPayment.aggregate({ where: { ...deUsuario, status: "PAID", paidAt: { gte: desde } }, _sum: { amount: true }, _count: true }) : null,
        ve.pagos ? prisma.quotationPayment.aggregate({ where: porCobrar, _sum: { amount: true }, _count: true }) : null,
        // Atrasado: marcado así o pendiente con el día de vencimiento ya pasado en Chile (la misma regla que «Hoy» y Pagos).
        ve.pagos ? prisma.quotationPayment.count({ where: { ...deUsuario, ...filtroAtrasadas(ahora) } }) : null,
        ve.clientes ? prisma.quotationClient.count({ where: { userId } }) : null,
    ]);
    // Si la base falla, la página se muestra igual, sin cifras y con un aviso.
    const datos = await lectura.catch((error: unknown) => {
        console.error("[Comercial] Error al leer el resumen:", error);
        return null;
    });

    const cifras: Cifra[] = [];
    let porVencer: { id: string; titulo: string; detalle: string; pronto: boolean }[] = [];
    let totalPorVencer = 0;
    let atrasados = 0;

    if (datos) {
        const [etapas, estados, terminos, cobrado, pendiente, atrasadosN, clientes] = datos;
        if (cobrado) {
            cifras.push({ etiqueta: `cobrado en ${mes}`, valor: pesos(cobrado._sum.amount ?? 0), nota: plural(cobrado._count, "pago", "pagos") });
        }
        if (pendiente) {
            atrasados = atrasadosN ?? 0;
            cifras.push({
                etiqueta: "por cobrar",
                valor: pesos(pendiente._sum.amount ?? 0),
                nota: atrasados > 0 ? `${plural(atrasados, "cuota atrasada", "cuotas atrasadas")}` : plural(pendiente._count, "cuota", "cuotas"),
                aviso: atrasados > 0,
            });
        }
        if (etapas) {
            const total = etapas.reduce((s, e) => s + e._count._all, 0);
            const abiertas = etapas.filter((e) => ABIERTAS.includes(e.stage)).reduce((s, e) => s + e._count._all, 0);
            cifras.push({ etiqueta: "oportunidades abiertas", valor: numero.format(abiertas), nota: `de ${numero.format(total)}` });
        }
        if (estados) {
            const total = estados.reduce((s, e) => s + e._count._all, 0);
            const activos = estados.find((e) => e.status === "ACTIVE")?._count._all ?? 0;
            cifras.push({ etiqueta: "contratos activos", valor: numero.format(activos), nota: `de ${numero.format(total)}` });
        }
        if (clientes !== null) cifras.push({ etiqueta: "clientes", valor: numero.format(clientes) });

        if (terminos) {
            // Entra cuando faltan tantos días como su aviso de renovación, o menos (también si venció y sigue activo).
            const vencen = terminos
                .map((c) => ({ ...c, dias: diasHasta(c.endDate!, ahora) }))
                .filter((c) => c.dias <= c.renewalAlertDays);
            totalPorVencer = vencen.length;
            porVencer = vencen.slice(0, 8).map((c) => {
                const cuando = c.dias < 0 ? `Venció el ${fechaLarga(c.endDate!)} y sigue activo` : `Vence el ${fechaLarga(c.endDate!)}, ${enDias(c.dias)}`;
                return {
                    id: c.id,
                    titulo: `${c.contractNumber} · ${c.client.name}`,
                    detalle: `${c.title}. ${cuando}.${c.autoRenew ? " Con renovación automática." : ""}`,
                    pronto: c.dias <= 7,
                };
            });
        }
    }

    const partes = [
        ve.contratos && totalPorVencer ? plural(totalPorVencer, "contrato por vencer", "contratos por vencer") : "",
        ve.pagos && atrasados ? plural(atrasados, "cuota atrasada", "cuotas atrasadas") : "",
    ].filter(Boolean);
    const resumen = !datos
        ? "No se pudieron leer las cifras. Prueba recargar en un momento."
        : partes.length
            ? `${partes.join(" y ")}.`.replace(/^./, (l) => l.toUpperCase())
            : ve.contratos || ve.pagos ? "Nada por vencer ni atrasado." : "Oportunidades, contratos y cobros.";
    const atajos = ATAJOS.filter((a) => permisos.has(a.permiso));

    return (
        <div className="max-w-[1180px]">
            <header>
                <h1 className={titulo}>Comercial</h1>
                <p className={bajada} role={datos ? undefined : "alert"}>{resumen}</p>
            </header>

            {cifras.length > 0 && <div className="mt-9"><Cifras nombre="Resumen comercial" items={cifras} /></div>}

            <div className="mt-11 grid items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)] lg:gap-14">
                {ve.contratos && datos && (
                    <section aria-labelledby="comercial-vencer">
                        <h2 id="comercial-vencer" className={subtitulo}>
                            Contratos por vencer <small className="font-mono text-[12.5px] font-medium">{totalPorVencer}</small>
                        </h2>
                        {porVencer.length ? (
                            <ul className="border-t border-[var(--linea)]">
                                {porVencer.map((c) => (
                                    <li key={c.id}>
                                        <Link
                                            href="/admin/gestion-comercial/contratos"
                                            className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-[var(--linea)] px-1 py-4 text-[var(--txt)] no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]"
                                        >
                                            <i aria-hidden="true" className={`size-2 rounded-full ${c.pronto ? "bg-amber-400" : "bg-[var(--acento)]"}`} />
                                            <b className="text-base font-semibold">{c.titulo}</b>
                                            <em aria-hidden="true" className="row-span-2 text-sm font-semibold not-italic whitespace-nowrap">Ver →</em>
                                            <span className="col-start-2 text-sm text-[var(--mut)]">{c.detalle}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={vacio}>
                                Ningún contrato activo está por vencer. Un contrato aparece aquí cuando a su término le quedan los días de su aviso de renovación o menos (30, si no lo cambiaste).
                            </p>
                        )}
                        {totalPorVencer > porVencer.length && (
                            <Link href="/admin/gestion-comercial/contratos" className="mt-4 inline-block border-b border-[var(--linea-2)] pb-0.5 text-[14.5px] font-semibold text-[var(--txt)] no-underline hover:border-[var(--acento)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acento)]">
                                Ver los {totalPorVencer} en Contratos
                            </Link>
                        )}
                    </section>
                )}

                {atajos.length > 0 && (
                    <section aria-labelledby="comercial-atajos">
                        <h2 id="comercial-atajos" className={subtitulo}>Atajos</h2>
                        <ul className="border-t border-[var(--linea)]">
                            {atajos.map(({ nombre, href, icono: Icono }) => (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className="flex min-h-12 items-center gap-3 border-b border-[var(--linea)] px-1 py-3 text-[15px] font-medium text-[var(--txt)] no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]"
                                    >
                                        <Icono size={17} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />
                                        <span className="flex-1">{nombre}</span>
                                        <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[var(--mut)]" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
