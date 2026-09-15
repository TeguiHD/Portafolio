import { NextRequest, NextResponse } from "next/server";
import { getPulseNews } from "@/modules/pulse/lib/news-service";
import type { PulseNewsItem } from "@/modules/pulse/types";

const FRESCO_MS = 1000 * 60 * 20;
/** Una recarga forzada no puede disparar la ronda de feeds más de una vez cada tanto. */
const PISO_REFRESCO_MS = 1000 * 60 * 3;

interface Guardado {
  items: PulseNewsItem[];
  generatedAt: string;
  momento: number;
}

let guardado: Guardado | null = null;
/** Una sola ronda de feeds a la vez: si llegan diez visitas juntas, comparten trabajo. */
let enCurso: Promise<Guardado> | null = null;

const cabeceras = { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" };

async function reunir(): Promise<Guardado> {
  if (!enCurso) {
    enCurso = getPulseNews()
      .then((items) => {
        guardado = { items, generatedAt: new Date().toISOString(), momento: Date.now() };
        return guardado;
      })
      .finally(() => {
        enCurso = null;
      });
  }
  return enCurso;
}

export async function GET(request: NextRequest) {
  const ahora = Date.now();
  const edad = guardado ? ahora - guardado.momento : Infinity;
  // "refresh=1" solo adelanta el trabajo si lo guardado ya tiene unos minutos: es un
  // parámetro público y sin ese piso cualquiera podría lanzar la ronda de feeds a voluntad.
  const pedido = request.nextUrl.searchParams.get("refresh") === "1" && edad > PISO_REFRESCO_MS;

  if (guardado && !pedido && edad < FRESCO_MS) {
    return NextResponse.json({ items: guardado.items, generatedAt: guardado.generatedAt, cached: true }, { headers: cabeceras });
  }

  try {
    const fresco = await reunir();
    return NextResponse.json({ items: fresco.items, generatedAt: fresco.generatedAt, cached: false }, { headers: cabeceras });
  } catch (error) {
    console.error("[Pulse News] Error:", error);
    if (guardado) {
      return NextResponse.json(
        { items: guardado.items, generatedAt: guardado.generatedAt, cached: true, stale: true },
        { headers: cabeceras }
      );
    }
    return NextResponse.json({ error: "Las fuentes no responden ahora mismo." }, { status: 503 });
  }
}
