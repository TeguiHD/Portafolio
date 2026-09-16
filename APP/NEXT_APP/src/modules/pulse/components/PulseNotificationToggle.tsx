"use client";

/**
 * Avisos del blog, en una campana.
 *
 * Antes era una tarjeta con título, explicación, insignia de estado y dos botones. Para
 * lo que hace —encender o apagar las notificaciones del navegador— sobraba todo menos el
 * gesto, así que ahora es un icono al lado del tiempo: apagada, activa o bloqueada.
 */

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";

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


  if (!supported) {
    return null;
  }

  const bloqueado = permission === "denied";
  const rotulo = bloqueado
    ? "Avisos bloqueados en el navegador"
    : subscribed
      ? "Avisos activos · pulsa para desactivarlos"
      : "Avisarme de novedades";

  return (
    <div className="pulso-campana-caja">
      <button
        type="button"
        className="pulso-campana"
        data-estado={loading ? "cargando" : bloqueado ? "bloqueada" : subscribed ? "activa" : "apagada"}
        aria-pressed={subscribed}
        aria-label={rotulo}
        title={rotulo}
        disabled={loading || bloqueado}
        onClick={subscribed ? unsubscribe : subscribe}
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" width={17} height={17} className="pulso-campana-gira" />
        ) : bloqueado ? (
          <BellOff aria-hidden="true" width={17} height={17} />
        ) : (
          <Bell aria-hidden="true" width={17} height={17} />
        )}
      </button>
      {message ? (
        <p className="pulso-campana-nota" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
