import { NextResponse } from "next/server";
import { getPulseFinance } from "@/modules/pulse/lib/finance-service";

export async function GET() {
  try {
    const items = await getPulseFinance();

    return NextResponse.json(
      {
        items,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("[Pulse Finance] Error:", error);
    return NextResponse.json({ error: "No fue posible cargar finanzas." }, { status: 500 });
  }
}
