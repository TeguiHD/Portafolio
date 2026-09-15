import { NextResponse } from "next/server";
import { getPulseFinanceCached } from "@/modules/pulse/lib/finance-service";

export async function GET() {
  try {
    const { valor: items, cacheado, rancio } = await getPulseFinanceCached();
    return NextResponse.json(
      { items, generatedAt: new Date().toISOString(), cached: cacheado, stale: rancio },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } }
    );
  } catch (error) {
    console.error("[Pulse Finance] Error:", error);
    return NextResponse.json({ error: "El mercado no responde ahora mismo." }, { status: 503 });
  }
}
