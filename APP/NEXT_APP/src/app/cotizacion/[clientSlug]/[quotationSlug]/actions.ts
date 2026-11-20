"use server";

import { QuotationAccessService } from "@/services/quotation-access";
import { generateAccessToken, verifyAccessToken } from "@/lib/secure-token";
import { cookies, headers } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { hashIdentifier } from "@/lib/security.server";
import { cleanRut, formatRut, validateRut } from "@/lib/rut";
import { limpiarPngFirma, huellaDocumento, fechaFirma, MARCA_PORTAL } from "@/lib/quotation-signature";
import { createNotification } from "@/lib/notificationService";
import { sesionPortal } from "@/lib/portal-cliente";
import { sanitizeQuotationHtml } from "@/lib/quotation-sanitizer";
import { formularioFirma, resumenRespuestas, validarRespuestas } from "@/lib/formulario-firma";

/** Las palabras con que empiezan los códigos que genera `generateSecureAccessCode` (lib/secure-token). */
const PALABRAS_CODIGO = new Set(["alpha", "bravo", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet", "kilo",
    "lima", "mike", "nova", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "victor"]);

/**
 * El código tal como se generó («Alpha-K7PQ-2XMN-R4TW»). El argon2 compara exacto, y lo que escribe una persona casi nunca
 * llega así: el teclado del celular lo pone en mayúsculas («ALPHA-…», el campo pide mayúsculas a propósito), y al copiarlo
 * de un correo o de WhatsApp trae espacios o un salto de línea. Cada una de esas variantes gastaba uno de los cinco intentos.
 * Solo se toca lo que tiene la forma exacta de un código generado; cualquier otra cosa (la clave del cliente, que también
 * abre la propuesta) pasa tal cual, sin los espacios de los extremos.
 */
function codigoCanonico(entrada: string): string {
    const limpio = (typeof entrada === "string" ? entrada : "").trim();
    const m = /^([a-z]+)[\s-]*([A-HJ-NP-Z2-9]{4})[\s-]*([A-HJ-NP-Z2-9]{4})[\s-]*([A-HJ-NP-Z2-9]{4})$/i.exec(limpio);
    if (!m || !PALABRAS_CODIGO.has(m[1].toLowerCase())) return limpio;
    const palabra = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    return [palabra, m[2], m[3], m[4]].map((p, i) => (i === 0 ? p : p.toUpperCase())).join("-");
}

export async function verifyQuotationAccessAction(
    clientSlug: string,
    quotationSlug: string,
    code: string
) {
    const headersList = await headers();
    // cf-connecting-ip la pone Cloudflare; el primer valor de x-forwarded-for lo puede inventar el cliente.
    const ip = headersList.get("cf-connecting-ip")?.trim() || headersList.get("x-real-ip")?.trim() || "unknown";
    const userAgent = headersList.get("user-agent") || undefined;

    const result = await QuotationAccessService.validateCode(
        clientSlug,
        quotationSlug,
        codigoCanonico(code),
        ip,
        userAgent
    );

    if (result.allowed && result.quotationId) {
        // Generate cryptographically signed token instead of plain "authorized"
        const token = generateAccessToken(
            result.quotationId,
            clientSlug,
            quotationSlug,
            60 * 60 * 24 // 24 hours
        );

        // Set secure session cookie with path-specific scope
        const cookieStore = await cookies();
        cookieStore.set(`qt_access_${clientSlug}_${quotationSlug}`, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict", // Stricter than "lax" for CSRF protection
            path: `/cotizacion/${clientSlug}/${quotationSlug}`,
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return { success: true };
    }

    // Return error with context
    const quedan = result.remainingAttempts;
    const messages: Record<string, string> = {
        "invalid": quedan === undefined ? "Código incorrecto."
            : quedan === 0 ? "Código incorrecto. No quedan intentos: prueba de nuevo en 15 minutos."
                : quedan === 1 ? "Código incorrecto. Te queda un intento."
                    : `Código incorrecto. Te quedan ${quedan} intentos.`,
        "expired": "Este código ha expirado. Contacta al proveedor para uno nuevo.",
        "rate_limited": "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
        "not_found": "Cotización no encontrada."
    };

    return {
        success: false,
        error: messages[result.reason] || "No se pudo abrir la propuesta."
    };
}

/**
 * Firmar exige haber entrado con el código: en una cotización pública cualquiera con el
 * enlace podría firmar a nombre del cliente. La cookie tiene que ser de esta cotización.
 */
async function puedeFirmar(
    quotation: { id: string; clientId: string | null; accessMode: string; codeExpiresAt: Date | null },
    clientSlug: string,
    quotationSlug: string
): Promise<boolean> {
    // Sesión del portal del cliente (usuario y contraseña) sobre un documento suyo.
    const sesion = await sesionPortal();
    // Viendo como el cliente desde el panel: solo lectura, nunca firma.
    if (sesion?.vista) return false;
    if (sesion && sesion.slug === clientSlug && quotation.clientId === sesion.id) return true;
    if (quotation.accessMode !== "code") return false;
    if (QuotationAccessService.isExpired(quotation.codeExpiresAt)) return false;
    const cookieStore = await cookies();
    const token = cookieStore.get(`qt_access_${clientSlug}_${quotationSlug}`)?.value;
    if (!token) return false;
    const verificacion = verifyAccessToken(token);
    return Boolean(
        verificacion.valid &&
        verificacion.payload?.quotationId === quotation.id &&
        verificacion.payload?.clientSlug === clientSlug &&
        verificacion.payload?.quotationSlug === quotationSlug
    );
}

export interface DatosFirmaCliente {
    nombre: string;
    rut: string;
    imagen: string;
    acepta: boolean;
    /** Huella del documento que el cliente tenía en pantalla al firmar. */
    huella: string;
    /** Lo que pide el documento (data-campo-cliente, data-opcion-cliente), por clave. */
    respuestas?: Record<string, string>;
}

/**
 * El cliente firma y acepta la cotización (firma electrónica simple, Ley 19.799).
 * Se guarda en ClientApproval con la huella del documento, la IP cifrada y el navegador;
 * la cotización pasa a APPROVED, queda en su historial y llega un aviso al panel.
 */
export async function firmarCotizacionAction(
    clientSlug: string,
    quotationSlug: string,
    datos: DatosFirmaCliente
): Promise<{ success: true; fecha: string } | { success: false; error: string }> {
    const quotation = await QuotationAccessService.getQuotationBySlugs(clientSlug, quotationSlug);
    if (!quotation || !quotation.clientId || !quotation.htmlContent?.trim()) {
        return { success: false, error: "Cotización no encontrada." };
    }
    if ((await sesionPortal())?.vista) {
        return { success: false, error: "Estás viendo como el cliente: en este modo no se puede firmar." };
    }
    if (!(await puedeFirmar(quotation, clientSlug, quotationSlug))) {
        return { success: false, error: "Tu acceso venció. Vuelve a ingresar el código para firmar." };
    }

    const headersList = await headers();
    const ip = headersList.get("cf-connecting-ip")?.trim()
        || headersList.get("x-real-ip")?.trim()
        || headersList.get("x-forwarded-for")?.split(",").pop()?.trim()
        || "unknown";
    const ipCifrada = hashIdentifier(ip);
    const limite = await checkRateLimit(`quotation_sign:${ipCifrada}`, 5, 15 * 60);
    if (!limite.allowed) {
        return { success: false, error: "Demasiados intentos. Prueba de nuevo en 15 minutos." };
    }

    const nombre = typeof datos?.nombre === "string" ? datos.nombre.replace(/\s+/g, " ").trim() : "";
    if (nombre.length < 3 || nombre.length > 120) {
        return { success: false, error: "Escribe tu nombre completo." };
    }
    const rut = typeof datos?.rut === "string" ? datos.rut : "";
    if (!validateRut(rut)) {
        return { success: false, error: "El RUT no es válido. Revisa el dígito verificador." };
    }
    if (datos?.acepta !== true) {
        return { success: false, error: "Para firmar tienes que marcar que lo aceptas." };
    }
    const imagen = limpiarPngFirma(typeof datos?.imagen === "string" ? datos.imagen : "");
    if (!imagen) {
        return { success: false, error: "No se pudo leer la firma. Vuelve a dibujarla o sube otra imagen." };
    }
    // Las respuestas se validan contra el documento que el cliente vio (misma huella), no contra
    // lo que diga el navegador. La transacción vuelve a comprobar la huella antes de guardar.
    if (typeof datos?.huella !== "string" || datos.huella !== huellaDocumento(quotation.htmlContent)) {
        return { success: false, error: "El documento se actualizó mientras lo leías. Recarga la página para ver la versión vigente." };
    }
    const formulario = formularioFirma(sanitizeQuotationHtml(quotation.htmlContent));
    const validacion = validarRespuestas(formulario, datos?.respuestas);
    if (!validacion.ok) return { success: false, error: validacion.error };
    const respuestas = validacion.respuestas;
    const resumen = resumenRespuestas(formulario, respuestas);

    const ahora = new Date();
    const rutFormateado = formatRut(cleanRut(rut));
    const userAgent = (headersList.get("user-agent") || "unknown").slice(0, 300);

    try {
        await prisma.$transaction(async (tx) => {
            // La fila de la cotización queda tomada hasta el final: dos firmas a la vez se ordenan.
            const filas = await tx.$queryRaw<{ status: string; htmlContent: string | null }[]>`
                SELECT status::text AS status, "htmlContent" FROM "Quotation" WHERE id = ${quotation.id} FOR UPDATE`;
            const actual = filas[0];
            if (!actual?.htmlContent) throw new Error("no_encontrada");

            // Se firma exactamente lo que el cliente vio: si la cotización cambió mientras la leía, no.
            const huella = huellaDocumento(actual.htmlContent);
            if (typeof datos?.huella !== "string" || datos.huella !== huella) throw new Error("cambio");

            const yaFirmada = await tx.clientApproval.findFirst({
                where: { quotationId: quotation.id, status: "SIGNED", signedDocumentHash: huella, fingerprint: MARCA_PORTAL },
                select: { id: true },
            });
            if (yaFirmada) throw new Error("ya_firmada");

            // Pendiente, o ya aprobada con una versión anterior firmada (firma de la versión nueva).
            if (actual.status !== "PENDING" && actual.status !== "APPROVED") throw new Error("no_disponible");

            await tx.clientApproval.create({
                data: {
                    clientId: quotation.clientId!,
                    quotationId: quotation.id,
                    userId: quotation.userId,
                    type: "QUOTATION",
                    status: "SIGNED",
                    documentHash: huella,
                    signedDocumentHash: huella,
                    signerName: nombre,
                    signerRut: rutFormateado,
                    signatureImage: imagen,
                    signatureMethod: "BOTH",
                    fingerprint: MARCA_PORTAL,
                    ipAddress: ipCifrada,
                    userAgent,
                    signedAt: ahora,
                    respuestas: Object.keys(respuestas).length > 0 ? respuestas : undefined,
                    // Token de acceso del flujo /aprobar: aquí no se usa, pero el campo es único y obligatorio.
                    accessToken: createHash("sha256").update(randomBytes(32)).digest("hex"),
                },
            });

            if (actual.status === "PENDING") {
                await tx.quotation.update({ where: { id: quotation.id }, data: { status: "APPROVED" } });
            }
            await tx.quotationStatusHistory.create({
                data: {
                    quotationId: quotation.id,
                    fromStatus: actual.status as "PENDING" | "APPROVED",
                    toStatus: "APPROVED",
                    changedBy: `cliente: ${nombre}`,
                    reason: actual.status === "PENDING"
                        ? "Firmada y aceptada por el cliente desde el portal"
                        : "El cliente firmó la versión nueva desde el portal",
                    metadata: { rut: rutFormateado, huella, ...(resumen ? { respuestas } : {}) },
                },
            });
        });
    } catch (error) {
        const errores: Record<string, string> = {
            ya_firmada: "Esta versión del documento ya fue firmada.",
            cambio: "El documento se actualizó mientras lo leías. Recarga la página para ver la versión vigente.",
            no_disponible: "Este documento no está disponible para firmar. Contacta a quien te lo envió.",
            no_encontrada: "Cotización no encontrada.",
        };
        if (error instanceof Error && errores[error.message]) {
            return { success: false, error: errores[error.message] };
        }
        console.error("[firmarCotizacion]", error);
        return { success: false, error: "No se pudo guardar la firma. Inténtalo de nuevo." };
    }

    await createNotification({
        type: "QUOTATION_STATUS_CHANGED",
        priority: "HIGH",
        title: "Firma recibida",
        message: `${nombre} firmó «${quotation.projectName}», folio ${quotation.folio}, el ${fechaFirma(ahora)}.${resumen ? ` ${resumen}.` : ""}`,
        metadata: { quotationId: quotation.id, folio: quotation.folio, clientSlug },
        targetUserId: quotation.userId,
        actorName: nombre,
    });

    // Sin revalidatePath: en una acción, cualquier revalidación vuelve a pintar la página actual y
    // la mete entera en la respuesta; la recarga del panel la cortaba a medias (error 500). Las
    // páginas del portal y del admin son dinámicas, así que la recarga ya trae la versión firmada.

    return { success: true, fecha: ahora.toISOString() };
}
