import { getPulseNewsCached } from "@/modules/pulse/lib/news-service";
import { isPulsePushConfigured, notifySubscribersAboutNews } from "@/modules/pulse/lib/push-service";

declare global {
  var __pulseNotifierStarted: boolean | undefined;
}

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

async function runPulsePushCycle() {
  try {
    // Forzada y por la caché compartida: la ronda de feeds que dispara el aviso es la misma que luego sirve el blog
    // (antes eran dos rondas independientes, una del aviso y otra de la página).
    const { valor: items } = await getPulseNewsCached(true);
    await notifySubscribersAboutNews(items);
  } catch (error) {
    console.error("[Pulse Push Notifier] Error:", error);
  }
}

export function startPulseNotifier() {
  if (globalThis.__pulseNotifierStarted) {
    return;
  }

  if (process.env.PULSE_PUSH_BOOT !== "true" || !isPulsePushConfigured()) {
    return;
  }

  globalThis.__pulseNotifierStarted = true;

  const intervalMs = Number(process.env.PULSE_PUSH_POLL_MS || DEFAULT_INTERVAL_MS);
  console.log(`[Pulse Push Notifier] Started with interval ${intervalMs}ms`);

  void runPulsePushCycle();
  setInterval(() => {
    void runPulsePushCycle();
  }, intervalMs).unref?.();
}
