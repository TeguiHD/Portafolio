import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permission-check";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

/**
 * Piezas comunes de las rutas de /api/finance. La carpeta empieza con «_» para que Next no la trate como ruta.
 */

type Acceso = { ok: true; userId: string } | { ok: false; respuesta: NextResponse };

/** Sesión y al menos uno de los permisos indicados. Devuelve el userId para filtrar siempre por dueño. */
export async function accesoFinanzas(...permisos: [string, ...string[]]): Promise<Acceso> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, respuesta: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
    }
    const rol = session.user.role as Role;
    for (const permiso of permisos) {
        if (await hasPermission(session.user.id, rol, permiso)) return { ok: true, userId: session.user.id };
    }
    return { ok: false, respuesta: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
}

/** Categoría que el usuario puede usar: del sistema (sin dueño) o propia, y activa. */
export function categoriaUsable(userId: string, id: string) {
    return prisma.financeCategory.findFirst({
        where: { id, isActive: true, OR: [{ userId: null }, { userId }] },
        select: { id: true, type: true },
    });
}

/** Cuenta propia y activa, con su moneda. */
export function cuentaPropia(userId: string, id: string) {
    return prisma.financeAccount.findFirst({
        where: { id, userId, isActive: true },
        select: { id: true, currencyId: true, currency: { select: { code: true } } },
    });
}

/**
 * Moneda para un registro que no la trae: la de la cuenta elegida, si no la de la cuenta principal del usuario
 * y, si no tiene cuentas, CLP. Devuelve null si no hay ninguna moneda activa.
 */
export async function monedaPorDefecto(userId: string, monedaDeCuenta: string | null): Promise<string | null> {
    if (monedaDeCuenta) return monedaDeCuenta;
    const principal = await prisma.financeAccount.findFirst({
        where: { userId, isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { currencyId: true },
    });
    if (principal) return principal.currencyId;
    const clp = await prisma.currency.findFirst({ where: { code: "CLP", isActive: true }, select: { id: true } });
    return clp?.id ?? null;
}

/** Moneda activa por id (para validar la que manda el cliente). */
export async function monedaActiva(id: string): Promise<string | null> {
    const moneda = await prisma.currency.findFirst({ where: { id, isActive: true }, select: { id: true } });
    return moneda?.id ?? null;
}
