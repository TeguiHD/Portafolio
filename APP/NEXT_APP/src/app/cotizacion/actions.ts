"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "argon2";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { hashIdentifier } from "@/lib/security.server";
import { cerrarSesionPortal, guardarSesionPortal, normalizarUsuario, registrarIngreso, sesionPortal } from "@/lib/portal-cliente";


// Hash de relleno: si el usuario no existe se verifica igual contra algo, para que la respuesta
// tarde lo mismo y no delate qué usuarios existen.
let hashRelleno: Promise<string> | null = null;

/** Entrada al portal del cliente con usuario y contraseña. */
export async function ingresarPortalAction(
    usuario: string,
    contrasena: string
): Promise<{ success: true; destino: string } | { success: false; error: string }> {
    const headersList = await headers();
    const ip = headersList.get("cf-connecting-ip")?.trim() || headersList.get("x-real-ip")?.trim() || "unknown";
    const limite = await checkRateLimit(`portal_login:${hashIdentifier(ip)}`, 8, 15 * 60);
    if (!limite.allowed) {
        return { success: false, error: "Demasiados intentos. Prueba de nuevo en 15 minutos." };
    }

    const slug = normalizarUsuario(typeof usuario === "string" ? usuario : "");
    const clave = typeof contrasena === "string" ? contrasena.trim() : "";
    if (!slug || !clave || clave.length > 200) {
        return { success: false, error: "Escribe tu usuario y tu contraseña." };
    }

    const cliente = await prisma.quotationClient.findUnique({
        where: { slug },
        select: { id: true, slug: true, accessCode: true, isActive: true },
    });

    hashRelleno ??= hash("relleno-sin-usuario");
    const valida = await verify(cliente?.accessCode || (await hashRelleno), clave).catch(() => false);
    if (cliente && !valida) await registrarIngreso(cliente.id, false, "clave");
    else if (cliente && !cliente.isActive) await registrarIngreso(cliente.id, false, "inactivo");
    if (!cliente || !cliente.isActive || !valida) {
        return { success: false, error: "El usuario o la contraseña no coinciden." };
    }

    await guardarSesionPortal(cliente);
    await registrarIngreso(cliente.id, true, "ok");
    return { success: true, destino: `/cotizacion/${cliente.slug}` };
}

export async function salirPortalAction() {
    const sesion = await sesionPortal();
    await cerrarSesionPortal();
    // El admin que estaba viendo como el cliente vuelve a la ficha del cliente.
    if (sesion?.vista) redirect(`/admin/cotizaciones/${sesion.id}`);
    redirect("/cotizacion");
}
