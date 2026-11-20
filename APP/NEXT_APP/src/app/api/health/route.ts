import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRedisAvailable } from "@/lib/redis";

export const dynamic = "force-dynamic";

const conPlazo = <T,>(promesa: Promise<T>, ms: number) =>
    Promise.race([promesa, new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error("plazo")), ms))]);

/**
 * Salud para Docker y monitores externos: prueba que Node responde y que la base contesta en menos de 2 s.
 * Redis se informa pero no la tumba (sin Redis el sitio sigue sirviendo; reiniciar la web no lo arreglaría).
 * No expone versiones ni mensajes de error.
 */
export async function GET() {
    const inicio = Date.now();
    const base = await conPlazo(prisma.$queryRaw`SELECT 1`, 2000).then(() => true, () => false);
    const redis = await conPlazo(isRedisAvailable(), 1000).catch(() => false);
    return NextResponse.json(
        { ok: base, base, redis, ms: Date.now() - inicio },
        { status: base ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
}
