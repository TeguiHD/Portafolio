import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/page-security";
import { hasPermission } from "@/lib/permission-check";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Eye, ChevronRight } from "lucide-react";
import CreateQuotationModal from "./create-modal";
import QuotationsList from "./quotations-list";
import type { Role } from '@/generated/prisma/client';
import { MARCA_PORTAL } from "@/lib/quotation-signature";
import { decryptData } from "@/lib/security.server";
import PortalPanel, { type IngresoPortal } from "./portal-panel";
import { ENLACE, FOCO, H1, INICIALES } from "@/modules/quotations/estilos";

const NOMBRE_PAIS = new Intl.DisplayNames(["es"], { type: "region" });

/**
 * Huella actual (sha256 del htmlContent) de las cotizaciones firmadas, calculada en Postgres:
 * así no viaja el HTML de cada una. Coincide con huellaDocumento() (sha256 del texto en UTF-8).
 */
async function huellasFirmadas(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const filas = await prisma.$queryRaw<{ id: string; huella: string }[]>`
        SELECT id, encode(sha256(convert_to(COALESCE("htmlContent", ''), 'UTF8')), 'hex') AS huella
        FROM "Quotation" WHERE id = ANY(${ids})`;
    return new Map(filas.map((f) => [f.id, f.huella]));
}

/** Últimos ingresos al portal, con la IP descifrada solo para mostrarla aquí. */
async function ingresosPortal(clientId: string): Promise<IngresoPortal[]> {
    const filas = await prisma.portalAcceso.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    return filas.map((f) => {
        let ip: string | null = null;
        try { ip = f.ipCifrada ? decryptData(f.ipCifrada) : null; } catch { ip = null; }
        let pais: string | null = null;
        try { pais = f.pais ? NOMBRE_PAIS.of(f.pais) || f.pais : null; } catch { pais = f.pais; }
        return {
            id: f.id,
            fecha: f.createdAt.toISOString(),
            exito: f.exito,
            motivo: f.motivo,
            ip,
            lugar: [f.ciudad, pais].filter(Boolean).join(", ") || null,
            sistema: f.sistema,
            navegador: f.navegador,
            dispositivo: f.dispositivo,
        };
    });
}

// Type for quotations to pass to client component
interface Quotation {
    id: string;
    folio: string;
    projectName: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    total: number;
    totalPaid: number;
    accessMode: string;
    isActive: boolean;
    isVisible: boolean;
    slug: string;
    codeExpiresAt: Date | null;
}

export const dynamic = "force-dynamic";

async function getClientWithQuotations(clientId: string, userId: string, isSuperAdmin: boolean) {
    return prisma.quotationClient.findFirst({
        where: isSuperAdmin
            ? { id: clientId }
            : {
                id: clientId,
                OR: [
                    { userId },
                    {
                        sharedWith: {
                            some: {
                                sharedWithUserId: userId
                            }
                        }
                    }
                ]
            },
        include: {
            quotations: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                // Solo lo que se muestra: nada de htmlContent (~90 KB cada una), accessCode ni notas.
                select: {
                    id: true, folio: true, projectName: true, createdAt: true, updatedAt: true,
                    status: true, total: true, totalPaid: true, accessMode: true, isVisible: true,
                    slug: true, codeExpiresAt: true,
                    approvals: {
                        // Solo firmas hechas desde el portal del cliente (firmarCotizacionAction).
                        where: { status: "SIGNED", type: "QUOTATION", fingerprint: MARCA_PORTAL },
                        orderBy: { signedAt: "desc" },
                        take: 1,
                        select: { signerName: true, signedAt: true, signedDocumentHash: true }
                    }
                }
            },
            user: { select: { name: true, email: true } },
            sharedWith: {
                where: { sharedWithUserId: userId },
                select: { permission: true }
            }
        }
    });
}

export default async function ClientQuotationsPage({
    params,
    searchParams
}: {
    params: Promise<{ clientId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const session = await requirePagePermission("quotations.view");

    const { clientId } = await params;
    const { action, project } = await searchParams; // Await searchParams

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const client = await getClientWithQuotations(clientId, session.user.id, isSuperAdmin);

    if (!client) {
        notFound();
    }

    // Check edit and delete permissions
    const [canEdit, canDelete, puedePagos, ingresos] = await Promise.all([
        hasPermission(session.user.id, session.user.role as Role, "quotations.edit"),
        hasPermission(session.user.id, session.user.role as Role, "quotations.delete"),
        hasPermission(session.user.id, session.user.role as Role, "crm.payments.manage"),
        ingresosPortal(client.id),
    ]);
    // «Registrar pago» sigue las reglas de Pagos: permiso de pagos y propuestas propias (no las de un cliente compartido
    // ni las que el superadmin mira de otro usuario, que Pagos tampoco muestra).
    const canCobrar = puedePagos && client.userId === session.user.id;
    const esDueno = isSuperAdmin || client.userId === session.user.id;
    const huellas = await huellasFirmadas(client.quotations.filter((q) => q.approvals.length > 0).map((q) => q.id));

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const isSpying = isSuperAdmin && client.userId !== session.user.id;
    const sharedPermission = client.sharedWith[0]?.permission;
    const canCreateForClient = isSuperAdmin
        || client.userId === session.user.id
        || sharedPermission === "EDIT"
        || sharedPermission === "FULL";

    return (
        <div className="space-y-8">
            {isSpying && (
                <div role="status" className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-amber-400">
                    <Eye size={16} aria-hidden="true" className="shrink-0" />
                    <p className="text-sm">
                        <span className="font-semibold">Vista de administrador:</span> este cliente es de{" "}
                        {client.user?.name || client.user?.email || "otro usuario"}.
                    </p>
                </div>
            )}

            <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div className="min-w-0">
                    <nav aria-label="Ruta" className="mb-3">
                        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--mut)]">
                            <li>
                                <Link href="/admin/cotizaciones" className={`inline-flex items-center gap-1 rounded-sm transition-colors duration-150 hover:text-[var(--txt)] ${FOCO}`}>
                                    <ArrowLeft size={14} aria-hidden="true" />
                                    Propuestas
                                </Link>
                            </li>
                            <li aria-hidden="true"><ChevronRight size={14} /></li>
                            <li aria-current="page" className="max-w-[200px] truncate font-medium text-[var(--txt)]">{client.name}</li>
                            {client.userId === session.user.id && (
                                <>
                                    <li aria-hidden="true"><ChevronRight size={14} /></li>
                                    <li>
                                        <Link href={`/admin/clientes/${client.id}`} className={ENLACE}>Ver ficha</Link>
                                    </li>
                                </>
                            )}
                        </ol>
                    </nav>
                    <h1 className={`${H1} flex items-center gap-3`}>
                        <span aria-hidden="true" className={`${INICIALES} size-10 text-sm`}>
                            {client.name.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 break-words">{client.name}</span>
                    </h1>
                </div>

                {/* Solo quien es dueño, superadmin o tiene el cliente compartido con edición puede crear */}
                {canCreateForClient && (
                    <CreateQuotationModal
                        clientId={client.id}
                        clientSlug={client.slug}
                        clientName={client.name}
                        autoOpen={action === "new"}
                        initialProjectName={typeof project === "string" ? project : undefined}
                    />
                )}
            </header>

            {esDueno && (
                <PortalPanel
                    clientId={client.id}
                    clientSlug={client.slug}
                    clientName={client.name}
                    activo={client.isActive}
                    canEdit={canEdit}
                    ingresos={ingresos}
                />
            )}

            {client.quotations.length === 0 ? (
                <div className="border-y border-[var(--linea)] py-12 text-center">
                    <FileText className="mx-auto mb-3 text-[var(--mut)]" size={28} aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-[var(--txt)]">Sin propuestas</h2>
                    <p className="mt-1 text-[var(--mut)]">Crea la primera propuesta para este cliente.</p>
                </div>
            ) : (
                <QuotationsList
                    quotations={client.quotations.map(({ approvals, ...q }) => {
                        const firmada = approvals[0];
                        return {
                            ...q,
                            firma: firmada?.signedAt ? {
                                nombre: firmada.signerName ?? "",
                                fecha: firmada.signedAt.toISOString(),
                                documentoCambio: firmada.signedDocumentHash !== huellas.get(q.id)
                            } : null
                        };
                    }) as unknown as Quotation[]}
                    clientId={client.id}
                    clientName={client.name}
                    clientSlug={client.slug}
                    baseUrl={baseUrl}
                    // Editar, ocultar, cambiar el acceso y eliminar exigen ser dueño del cliente o superadmin (así lo
                    // comprueban las acciones): a quien solo lo tiene compartido no se le muestran botones que fallarían.
                    canEdit={canEdit && esDueno}
                    canDelete={canDelete && esDueno}
                    canCobrar={canCobrar}
                />
            )}
        </div>
    );
}
