/**
 * Entrega una clave temporal a un usuario y lo obliga a cambiarla al entrar.
 *
 *   CORREO=alguien@ejemplo.com CLAVE='la-temporal' npx tsx scripts/set-temp-password.ts
 *
 * La clave se lee del entorno y nunca se imprime: así no queda en el historial del
 * terminal ni en los registros. Se corre dentro del contenedor, que es donde viven la
 * pimienta y la llave de cifrado del correo.
 *
 * Al aplicarla:
 *   · se guarda con Argon2 y la misma pimienta que usa el login;
 *   · se marca `mustChangePassword`, así el panel manda a /cambiar-clave y nada más;
 *   · se cierran todas las sesiones abiertas, porque la clave anterior ya no vale;
 *   · queda anotado en la auditoría.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, hashEmail } from "../src/lib/security.server";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
    const correo = process.env.CORREO?.trim();
    const clave = process.env.CLAVE;

    if (!correo || !clave) {
        console.error("Falta CORREO o CLAVE en el entorno.");
        process.exit(1);
    }
    if (clave.length < 8) {
        console.error("La clave temporal necesita al menos 8 caracteres.");
        process.exit(1);
    }

    const usuario = await prisma.user.findUnique({
        where: { email: hashEmail(correo) },
        select: { id: true, name: true, role: true },
    });
    if (!usuario) {
        console.error("No existe un usuario con ese correo.");
        process.exit(1);
    }

    await prisma.user.update({
        where: { id: usuario.id },
        data: {
            password: await hashPassword(clave),
            mustChangePassword: true,
            passwordChangedAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });

    const cerradas = await prisma.userSession.updateMany({
        where: { userId: usuario.id, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokeReason: "clave_temporal" },
    });

    await prisma.auditLog.create({
        data: {
            action: "password.temp_issued",
            category: "security",
            userId: usuario.id,
            metadata: { sesionesCerradas: cerradas.count, obligaCambio: true },
        },
    });

    console.log(`Clave temporal aplicada a ${usuario.name || usuario.id} (${usuario.role}).`);
    console.log(`Sesiones cerradas: ${cerradas.count}.`);
    console.log("Al entrar, el panel va a exigir el cambio antes de mostrar cualquier cosa.");
}

main()
    .catch((e) => {
        console.error("Error:", e instanceof Error ? e.message : e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
