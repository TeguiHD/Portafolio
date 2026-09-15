import { NextResponse } from "next/server";
import { getPulseDevActivityCached } from "@/modules/pulse/lib/dev-service";

export async function GET() {
  try {
    const { valor: data, cacheado, rancio } = await getPulseDevActivityCached();
    return NextResponse.json(
      { data, generatedAt: new Date().toISOString(), cached: cacheado, stale: rancio },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
    );
  } catch (error) {
    console.error("[Pulse Dev] Error:", error);
    return NextResponse.json({ error: "GitHub no responde ahora mismo." }, { status: 503 });
  }
}
