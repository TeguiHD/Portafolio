import { NextRequest, NextResponse } from "next/server";
import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";

/** Una recarga forzada no puede disparar la ronda de feeds más de una vez cada tanto. */
const PISO_REFRESCO_MS = 1000 * 60 * 3;
let ultimoForzado = 0;

const cabeceras = { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" };

export async function GET(request: NextRequest) {
  // "refresh=1" es un parámetro público: sin este piso, cualquiera podría lanzar la
  // ronda de veinte feeds a voluntad desde fuera.
  const ahora = Date.now();
  const forzar = request.nextUrl.searchParams.get("refresh") === "1" && ahora - ultimoForzado > PISO_REFRESCO_MS;
  if (forzar) ultimoForzado = ahora;

  try {
    const { valor: items, cacheado, rancio } = await getPulseNewsCached(forzar);
    return NextResponse.json(
      { items, generatedAt: new Date().toISOString(), cached: cacheado, stale: rancio },
      { headers: cabeceras }
    );
  } catch (error) {
    console.error("[Pulse News] Error:", error);
    return NextResponse.json({ error: "Las fuentes no responden ahora mismo." }, { status: 503 });
  }
}
