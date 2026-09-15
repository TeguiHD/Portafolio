import { NextRequest, NextResponse } from "next/server";
import { savePulseSubscription, type PulsePushSubscription } from "@/modules/pulse/lib/push-service";

export const runtime = "nodejs";

/**
 * Servicios de notificación de los navegadores. El endpoint se guarda y más tarde el
 * servidor le hace una petición, así que solo se aceptan estos: cualquier URL valdría
 * para convertir el servidor en un reenviador de peticiones a donde alguien quiera.
 */
const SERVICIOS_PUSH = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];

function servicioConocido(endpoint: string): boolean {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return SERVICIOS_PUSH.includes(host) || host.endsWith(".notify.windows.com") || host.endsWith(".push.apple.com");
}

/** Clave de la suscripción: base64url, con un largo razonable. */
function claveValida(valor: unknown, maximo: number): valor is string {
  return typeof valor === "string" && valor.length > 0 && valor.length <= maximo && /^[A-Za-z0-9_-]+=*$/.test(valor);
}

function isValidSubscription(input: unknown): input is PulsePushSubscription {
  if (!input || typeof input !== "object") return false;
  const subscription = input as Partial<PulsePushSubscription>;
  return Boolean(
    typeof subscription.endpoint === "string" &&
    subscription.endpoint.length <= 600 &&
    servicioConocido(subscription.endpoint) &&
    claveValida(subscription.keys?.auth, 64) &&
    claveValida(subscription.keys?.p256dh, 200)
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
