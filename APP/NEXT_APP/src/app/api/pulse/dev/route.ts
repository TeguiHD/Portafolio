import { NextResponse } from "next/server";
import { getPulseDevActivity } from "@/modules/pulse/lib/dev-service";

export async function GET() {
  try {
    const data = await getPulseDevActivity();

    return NextResponse.json(
      {
        data,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error("[Pulse Dev] Error:", error);
    return NextResponse.json({ error: "No fue posible cargar actividad de desarrollo." }, { status: 500 });
  }
}
