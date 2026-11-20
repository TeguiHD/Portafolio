import { QuotationAccessService } from "@/services/quotation-access";
import { sanitizeQuotationHtml } from "@/lib/quotation-sanitizer";
import { verifyAccessToken } from "@/lib/secure-token";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import QuotationLoginForm from "./login-form";
import { PaginaAcceso } from "@/modules/portal/PaginaAcceso";
import QuotationViewer, { type EstadoFirma } from "./viewer";
import { prisma } from "@/lib/prisma";
import { huellaDocumento, insertarFirma, limpiarPngFirma, MARCA_PORTAL } from "@/lib/quotation-signature";
import { sesionPortal } from "@/lib/portal-cliente";
import { formularioFirma, leerRespuestas } from "@/lib/formulario-firma";

type CotizacionPortal = {
    id: string;
    userId: string;
    htmlContent: string | null;
    accessMode: string;
    folio: string;
    projectName: string;
    clientName: string;
    client: { name: string; slug: string } | null;
};

/**
 * Lo que recibe el visor: el documento (con la firma dentro si la versión firmada sigue
 * vigente), el estado de la firma, la huella para firmar y solo los datos que se muestran.
 */
async function vistaCliente(quotation: CotizacionPortal, porPortal = false) {
    const html = quotation.htmlContent || "";
    const huella = huellaDocumento(html);
    // Solo firmas hechas desde este portal (las crea firmarCotizacionAction).
    const aprobacion = await prisma.clientApproval.findFirst({
        where: {
            quotationId: quotation.id,
            status: "SIGNED",
            type: "QUOTATION",
            fingerprint: MARCA_PORTAL,
            userId: quotation.userId,
        },
        orderBy: { signedAt: "desc" },
        select: { signerName: true, signerRut: true, signatureImage: true, signedAt: true, signedDocumentHash: true, respuestas: true },
    });
    const imagen = aprobacion?.signatureImage ? limpiarPngFirma(aprobacion.signatureImage) : null;

    let documento = sanitizeQuotationHtml(html);
    // Lo que el documento pide al firmar (razón social, opciones…); se lee antes de insertar la firma.
    const formulario = formularioFirma(documento);
    let firma: EstadoFirma | null = null;
    if (aprobacion?.signedAt && imagen) {
        const vigente = aprobacion.signedDocumentHash === huella;
        firma = {
            nombre: aprobacion.signerName || "",
            rut: aprobacion.signerRut || "",
            fecha: aprobacion.signedAt.toISOString(),
            documentoCambio: !vigente,
        };
        if (vigente) {
            // Se inserta después de sanitizar (y se vuelve a sanitizar), para que también quede en
            // cotizaciones antiguas guardadas como LaTeX, que el sanitizador transpila.
            documento = sanitizeQuotationHtml(await insertarFirma(documento, {
                nombre: firma.nombre,
                rut: firma.rut,
                imagen,
                fecha: aprobacion.signedAt,
                huella,
                respuestas: { formulario, valores: leerRespuestas(aprobacion.respuestas) },
            }));
        }
    }

    return {
        htmlContent: documento,
        firma,
        formulario,
        huella,
        puedeFirmar: porPortal || quotation.accessMode === "code",
        datos: {
            folio: quotation.folio,
            projectName: quotation.projectName,
            clientName: quotation.clientName,
            client: quotation.client ? { name: quotation.client.name, slug: quotation.client.slug } : null,
        },
    };
}

export default async function QuotationPage({
    params
}: {
    params: { clientSlug: string; quotationSlug: string }
}) {
    const { clientSlug, quotationSlug } = await params;

    // Find the quotation
    const quotation = await QuotationAccessService.getQuotationBySlugs(clientSlug, quotationSlug);

    if (!quotation) {
        notFound();
    }

    // Cliente con sesión del portal (usuario y contraseña): ve y firma sus documentos sin código.
    const sesion = await sesionPortal();
    if (sesion && sesion.slug === clientSlug && quotation.clientId === sesion.id) {
        const vista = await vistaCliente(quotation, !sesion.vista);
        return <QuotationViewer quotation={vista.datos} htmlContent={vista.htmlContent} firma={vista.firma} formulario={vista.formulario} huella={vista.huella} puedeFirmar={sesion.vista ? false : vista.puedeFirmar} clientSlug={clientSlug} quotationSlug={quotationSlug} volverA={`/cotizacion/${clientSlug}`} vistaAdmin={sesion.vista ? sesion.name : undefined} />;
    }

    // El admin en modo vista no entra por código: si la cotización no es de este cliente, nada.
    if (sesion?.vista) notFound();

    // Check if public access
    if (quotation.accessMode === "public") {
        // Direct access
        const vista = await vistaCliente(quotation);
        return <QuotationViewer quotation={vista.datos} htmlContent={vista.htmlContent} firma={vista.firma} formulario={vista.formulario} huella={vista.huella} puedeFirmar={vista.puedeFirmar} clientSlug={clientSlug} quotationSlug={quotationSlug} />;
    }

    // Check if code has expired
    if (QuotationAccessService.isExpired(quotation.codeExpiresAt)) {
        return (
            <PaginaAcceso palabra="vencido" sello={quotation.client?.name || quotation.clientName} titulo="El código venció."
                texto={<p>Pide uno nuevo a quien te envió la propuesta, o entra con tu usuario y contraseña.</p>}>
                <div className="pa-pie"><a href={`/cotizacion?usuario=${encodeURIComponent(clientSlug)}`}>Entrar con usuario y contraseña</a></div>
            </PaginaAcceso>
        );
    }

    // Check for session cookie and verify it cryptographically
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`qt_access_${clientSlug}_${quotationSlug}`);

    if (sessionCookie?.value) {
        // Verify the token signature and expiration
        const verification = verifyAccessToken(sessionCookie.value);

        if (verification.valid &&
            verification.payload?.quotationId === quotation.id &&
            verification.payload?.clientSlug === clientSlug &&
            verification.payload?.quotationSlug === quotationSlug) {
            // Token is valid, allow access
            const vista = await vistaCliente(quotation);
            return <QuotationViewer quotation={vista.datos} htmlContent={vista.htmlContent} firma={vista.firma} formulario={vista.formulario} huella={vista.huella} puedeFirmar={vista.puedeFirmar} clientSlug={clientSlug} quotationSlug={quotationSlug} />;
        }
        // Token is invalid or expired - continue to login form
    }

    // Show login form
    return (
        <QuotationLoginForm
            clientSlug={clientSlug}
            quotationSlug={quotationSlug}
            clientName={quotation.client?.name || quotation.clientName}
            projectName={quotation.projectName}
        />
    );
}
