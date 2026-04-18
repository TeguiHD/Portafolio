"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle, Send } from "lucide-react";
import { cn } from "@/components/ui/Button";

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PulseNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setSupported(isSupported);
    setPermission(isSupported ? Notification.permission : "denied");

    if (!isSupported) {
      return;
    }

    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(subscription));
      })
      .catch(() => undefined);
  }, []);

  const subscribe = async () => {
    if (!supported) {
      setMessage("Tu navegador no soporta Web Push.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const requestedPermission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();

      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        setMessage("Debes permitir notificaciones para activar el radar.");
        return;
      }

      const keyResponse = await fetch("/api/pulse/push/public-key");
      if (!keyResponse.ok) {
        throw new Error("Push no configurado en el servidor.");
      }

      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(publicKey),
        }));

      await fetch("/api/pulse/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setSubscribed(true);
      setMessage("Radar push activado. Te avisaré cuando llegue una señal nueva.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo activar el radar push.");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!supported) return;

    setLoading(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/pulse/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setSubscribed(false);
      setMessage("Radar push desactivado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar el radar push.");
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    try {
      if (Notification.permission !== "granted") {
        throw new Error("Activa permisos de notificación primero.");
      }

      new Notification("Digital Pulse activo", {
        body: "Radar listo. Recibirás avisos cuando el command center detecte novedades relevantes.",
        icon: "/icon-192.png",
      });
      setMessage("Notificación de prueba enviada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la prueba.");
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Push radar</p>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Activa alertas del navegador para enterarte cuando el blog detecte una noticia nueva o una señal relevante.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.22em]",
            permission === "granted" && "bg-emerald-400/15 text-emerald-100",
            permission === "denied" && "bg-rose-400/15 text-rose-100",
            permission === "default" && "bg-white/[0.06] text-white/55"
          )}
        >
          {permission}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition disabled:opacity-60 [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08131f]",
            subscribed
              ? "bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/20"
              : "bg-white text-black hover:bg-white/90"
          )}
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : subscribed ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {subscribed ? "Desactivar" : "Activar avisos"}
        </button>

        {subscribed ? (
          <button
            type="button"
            onClick={sendTest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08] disabled:opacity-60 [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08131f]"
          >
            <Send className="h-4 w-4" />
            Probar
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-white/60">
        Estado de la suscripción: <span className="text-white">{subscribed ? "activa" : "inactiva"}</span>
      </p>
      {message ? (
        <p aria-live="polite" className="mt-2 text-sm text-cyan-100">
          {message}
        </p>
      ) : null}
    </div>
  );
}
