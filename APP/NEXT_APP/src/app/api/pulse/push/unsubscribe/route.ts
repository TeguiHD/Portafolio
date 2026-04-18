import { NextRequest, NextResponse } from "next/server";
import { removePulseSubscription } from "@/modules/pulse/lib/push-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint inválido." }, { status: 400 });
    }

    await removePulseSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Pulse Push Unsubscribe] Error:", error);
    return NextResponse.json({ error: "No fue posible eliminar la suscripción." }, { status: 500 });
  }
}
