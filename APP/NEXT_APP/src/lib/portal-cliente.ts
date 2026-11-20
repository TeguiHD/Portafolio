// Sesión del portal del cliente en /cotizacion: usuario (el identificador del cliente) y contraseña
// (su código de acceso, guardado con argon2). La cookie va firmada con HMAC y lleva una huella del
// código vigente: si el admin cambia la contraseña, todas las sesiones abiertas dejan de valer.
//
// «Ver como cliente»: el admin abre el portal con una cookie aparte, de una hora, que además exige
// su sesión del panel vigente. En ese modo todo es de solo lectura (no se firma) y no cuenta como
// ingreso del cliente.
import "server-only";
import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encryptData } from "@/lib/security.server";
import { generateAccessToken, verifyAccessToken } from "@/lib/secure-token";

export const COOKIE_PORTAL = "qt_cliente";
export const COOKIE_VISTA = "qt_cliente_vista";
export const DURACION_SESION_PORTAL = 60 * 60 * 24 * 30; // 30 días
const DURACION_VISTA = 60 * 60; // 1 hora
const PREFIJO = "cliente:";
const PREFIJO_VISTA = "vista:";
const RETENCION_DIAS = 365;

export interface ClientePortal {
    id: string;
    slug: string;
    name: string;
    userId: string;
    /** true cuando es el admin viendo como el cliente: solo lectura. */
    vista: boolean;
}

function huellaClave(hashCodigo: string): string {
    return createHash("sha256").update(hashCodigo).digest("hex").slice(0, 16);
}

/** «Guillermo», « guillermo », «Guillérmo» → «guillermo» (el slug del cliente). */
export function normalizarUsuario(usuario: string): string {
    return usuario
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

export function tokenPortal(cliente: { id: string; slug: string; accessCode: string }): string {
    return generateAccessToken(
        `${PREFIJO}${cliente.id}`,
        cliente.slug,
        `clave:${huellaClave(cliente.accessCode)}`,
        DURACION_SESION_PORTAL,
    );
}

export async function guardarSesionPortal(cliente: { id: string; slug: string; accessCode: string }) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_PORTAL, tokenPortal(cliente), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // «lax» para que funcione al abrir el enlace desde WhatsApp o el correo.
        sameSite: "lax",
        path: "/cotizacion",
        maxAge: DURACION_SESION_PORTAL,
    });
}

export async function cerrarSesionPortal() {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_PORTAL, "", { path: "/cotizacion", maxAge: 0 });
    cookieStore.set(COOKIE_VISTA, "", { path: "/cotizacion", maxAge: 0 });
}

/** El admin abre el portal como el cliente (solo lectura). Quien llama ya verificó permisos. */
export async function abrirVistaCliente(cliente: { id: string; slug: string }, adminId: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_VISTA, generateAccessToken(`${PREFIJO_VISTA}${cliente.id}`, cliente.slug, `admin:${adminId}`, DURACION_VISTA), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/cotizacion",
        maxAge: DURACION_VISTA,
    });
}

async function vistaAdmin(): Promise<ClientePortal | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_VISTA)?.value;
    if (!token) return null;
    const verificacion = verifyAccessToken(token);
    const payload = verificacion.payload;
    if (!verificacion.valid || !payload || !payload.quotationId.startsWith(PREFIJO_VISTA)) return null;

    // Además de la cookie, la sesión del panel tiene que seguir vigente y ser del mismo admin.
    const session = await auth();
    if (!session?.user?.id || payload.quotationSlug !== `admin:${session.user.id}`) return null;

    const cliente = await prisma.quotationClient.findUnique({
        where: { id: payload.quotationId.slice(PREFIJO_VISTA.length) },
        select: { id: true, slug: true, name: true, userId: true },
    });
    if (!cliente || cliente.slug !== payload.clientSlug) return null;
    if (session.user.role !== "SUPERADMIN" && cliente.userId !== session.user.id) return null;
    return { ...cliente, vista: true };
}

/** El cliente con sesión abierta (o el admin viéndolo), o null. */
export async function sesionPortal(): Promise<ClientePortal | null> {
    const vista = await vistaAdmin();
    if (vista) return vista;

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_PORTAL)?.value;
    if (!token) return null;

    const verificacion = verifyAccessToken(token);
    const payload = verificacion.payload;
    if (!verificacion.valid || !payload || !payload.quotationId.startsWith(PREFIJO)) return null;

    const cliente = await prisma.quotationClient.findUnique({
        where: { id: payload.quotationId.slice(PREFIJO.length) },
        select: { id: true, slug: true, name: true, userId: true, accessCode: true, isActive: true },
    });
    if (!cliente || !cliente.isActive || cliente.slug !== payload.clientSlug) return null;
    if (payload.quotationSlug !== `clave:${huellaClave(cliente.accessCode)}`) return null;

    return { id: cliente.id, slug: cliente.slug, name: cliente.name, userId: cliente.userId, vista: false };
}

// ───────────── Historial de ingresos ─────────────

/** Sistema, navegador y tipo de dispositivo a partir del User-Agent, sin dependencias. */
export function describirAgente(ua: string): { sistema: string; navegador: string; dispositivo: string } {
    const u = ua || "";
    const sistema =
        /iPhone|iPad|iPod/.test(u) ? "iOS"
            : /Android/.test(u) ? "Android"
                : /Windows NT/.test(u) ? "Windows"
                    : /Mac OS X|Macintosh/.test(u) ? "macOS"
                        : /CrOS/.test(u) ? "ChromeOS"
                            : /Linux/.test(u) ? "Linux"
                                : "Desconocido";
    const navegador =
        /Edg\//.test(u) ? "Edge"
            : /OPR\/|Opera/.test(u) ? "Opera"
                : /SamsungBrowser/.test(u) ? "Samsung Internet"
                    : /Firefox\/|FxiOS/.test(u) ? "Firefox"
                        : /Chrome\/|CriOS/.test(u) ? "Chrome"
                            : /Safari\//.test(u) ? "Safari"
                                : "Desconocido";
    const dispositivo = /iPad|Tablet/.test(u) || (/Android/.test(u) && !/Mobile/.test(u)) ? "Tableta"
        : /Mobi|iPhone|Android/.test(u) ? "Celular"
            : "Computador";
    return { sistema, navegador, dispositivo };
}

function limpiarCabecera(valor: string | null, max = 60): string | null {
    if (!valor) return null;
    try { valor = decodeURIComponent(valor); } catch { /* se deja tal cual */ }
    const limpio = valor.replace(/[^\p{L}\p{N} .,'-]/gu, "").trim().slice(0, max);
    return limpio || null;
}

/** Anota un intento de ingreso de un cliente existente. Nunca rompe el ingreso si falla. */
export async function registrarIngreso(clientId: string, exito: boolean, motivo: "ok" | "clave" | "inactivo") {
    try {
        const h = await headers();
        const ip = h.get("cf-connecting-ip")?.trim() || h.get("x-real-ip")?.trim() || null;
        const pais = limpiarCabecera(h.get("cf-ipcountry"), 2);
        const { sistema, navegador, dispositivo } = describirAgente(h.get("user-agent") || "");
        await prisma.portalAcceso.create({
            data: {
                clientId,
                exito,
                motivo,
                ipCifrada: ip ? encryptData(ip) : null,
                pais: pais && pais !== "XX" && pais !== "T1" ? pais : null,
                ciudad: limpiarCabecera(h.get("cf-ipcity")),
                sistema,
                navegador,
                dispositivo,
            },
        });
        // Retención: lo de más de 12 meses de este cliente se borra.
        await prisma.portalAcceso.deleteMany({
            where: { clientId, createdAt: { lt: new Date(Date.now() - RETENCION_DIAS * 86_400_000) } },
        });
    } catch (error) {
        console.error("[portal] no se pudo anotar el ingreso:", error instanceof Error ? error.message : error);
    }
}
