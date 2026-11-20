import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesionPortal } from "@/lib/portal-cliente";
import { MARCA_PORTAL } from "@/lib/quotation-signature";
import { salirPortalAction } from "../actions";
import { PaginaAcceso } from "@/modules/portal/PaginaAcceso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Mis documentos",
    robots: { index: false, follow: false },
};

function fecha(d: Date) {
    return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" }).format(d);
}

export default async function PanelClientePage({ params }: { params: Promise<{ clientSlug: string }> }) {
    const { clientSlug } = await params;
    const sesion = await sesionPortal();
    if (!sesion || sesion.slug !== clientSlug) {
        redirect(`/cotizacion?usuario=${encodeURIComponent(clientSlug)}`);
    }

    const cotizaciones = await prisma.quotation.findMany({
        where: { clientId: sesion.id, isDeleted: false, isVisible: true, NOT: { status: "DRAFT" } },
        orderBy: { createdAt: "desc" },
        select: {
            id: true, folio: true, projectName: true, slug: true, status: true, createdAt: true,
            approvals: {
                where: { status: "SIGNED", type: "QUOTATION", fingerprint: MARCA_PORTAL, userId: sesion.userId },
                orderBy: { signedAt: "desc" },
                take: 1,
                select: { signedAt: true, signedDocumentHash: true },
            },
        },
    });

    // Huella actual calculada en Postgres: el HTML de cada documento no hace falta para la lista.
    const firmadas = cotizaciones.filter((c) => c.approvals.length > 0).map((c) => c.id);
    const huellas = new Map(
        firmadas.length === 0 ? [] : (await prisma.$queryRaw<{ id: string; huella: string }[]>`
            SELECT id, encode(sha256(convert_to(COALESCE("htmlContent", ''), 'UTF8')), 'hex') AS huella
            FROM "Quotation" WHERE id = ANY(${firmadas})`).map((f) => [f.id, f.huella])
    );

    const documentos = cotizaciones.map((c) => {
        const firma = c.approvals[0];
        const vigente = Boolean(firma?.signedAt && firma.signedDocumentHash === huellas.get(c.id));
        const estado = vigente
            ? { texto: `Firmada el ${fecha(firma!.signedAt!)}`, tono: "firmada" as const }
            : firma?.signedAt
                ? { texto: "Cambió después de tu firma: revisa la versión nueva", tono: "cambio" as const }
                : c.status === "PENDING"
                    ? { texto: "Por firmar", tono: "pendiente" as const }
                    : { texto: "Disponible para leer", tono: "lectura" as const };
        return { id: c.id, folio: c.folio, nombre: c.projectName, slug: c.slug || c.folio, creada: fecha(c.createdAt), estado };
    });

    const porFirmar = documentos.filter((d) => d.estado.tono === "pendiente" || d.estado.tono === "cambio").length;

    const pendientes = (t: string) => t === "pendiente" || t === "cambio";

    return (
        <PaginaAcceso
            palabra={porFirmar > 0 ? String(porFirmar) : "hola"}
            sello="Portal de clientes"
            titulo={`Hola, ${sesion.name.trim()}.`}
            texto={<p>{documentos.length === 0
                ? "Todavía no tienes documentos."
                : porFirmar > 0
                    ? `Tienes ${porFirmar === 1 ? "un documento" : `${porFirmar} documentos`} por firmar.`
                    : "Aquí están tus documentos y las versiones que firmaste."}</p>}
            aviso={sesion.vista ? (
                <div className="pa-vista" role="status">
                    <span>Estás viendo como <strong>{sesion.name}</strong>. Solo lectura: no se firma y no cuenta como ingreso del cliente.</span>
                </div>
            ) : null}
            debajo={
                <div className="ancho po-lista">
                    <h2>Documentos <small>{documentos.length}</small></h2>
                    {documentos.length ? (
                        <ul>
                            {documentos.map((d) => (
                                <li key={d.id} className="po-fila">
                                    <Link href={`/cotizacion/${clientSlug}/${d.slug}`}>
                                        <span className="po-folio">{d.folio}</span>
                                        <span>
                                            <span className="po-nombre">{d.nombre}</span>
                                            <span className="po-fecha">{d.creada}</span>
                                            <span className="po-estado" data-tono={d.estado.tono}>{d.estado.texto}</span>
                                        </span>
                                        <span className="po-ir">
                                            {pendientes(d.estado.tono) ? "Revisar y firmar" : "Ver"}
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="po-vacio">Cuando te envíe una propuesta, aparecerá aquí.</p>}
                    <p className="po-nota">Tu sesión queda abierta 30 días en este dispositivo. Usa «Salir» si es un equipo compartido.</p>
                </div>
            }>
            <form action={salirPortalAction} className="po-salir">
                <button type="submit" className="boton linea chico">{sesion.vista ? "Salir de la vista" : "Salir"}</button>
            </form>
        </PaginaAcceso>
    );
}
