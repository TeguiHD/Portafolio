import { NextRequest, NextResponse } from "next/server";
import { savePulseSubscription, type PulsePushSubscription } from "@/modules/pulse/lib/push-service";

export const runtime = "nodejs";

function isValidSubscription(input: unknown): input is PulsePushSubscription {
  if (!input || typeof input !== "object") return false;

  const subscription = input as Partial<PulsePushSubscription>;
  return Boolean(
    subscription.endpoint &&
    subscription.keys?.auth &&
    subscription.keys?.p256dh
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isValidSubscription(body?.subscription)) {
      return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
    }

    await savePulseSubscription(body.subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Pulse Push Subscribe] Error:", error);
    return NextResponse.json({ error: "No fue posible guardar la suscripción." }, { status: 500 });
  }
}
