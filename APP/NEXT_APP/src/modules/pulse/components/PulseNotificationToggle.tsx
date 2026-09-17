"use client";

/**
 * Avisos del blog, en una campana.
 *
 * Antes era una tarjeta con título, explicación, insignia de estado y dos botones. Para
 * lo que hace —encender o apagar las notificaciones del navegador— sobraba todo menos el
 * gesto, así que ahora es un icono al lado del tiempo: apagada, activa o bloqueada.
 *
 * Encender o apagar avisos no es un clic cualquiera: el navegador va a pedir permiso, o
 * se va a dejar de recibir algo que se pidió. Así que el icono abre primero un diálogo
 * que dice qué va a pasar y espera confirmación.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, LoaderCircle, X } from "lucide-react";

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
  const [preguntando, setPreguntando] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

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

    /**
     * El permiso puede cambiar desde el propio navegador —el candado de la barra de
     * direcciones— y eso no dispara ningún evento en la página. `permissions.query` sí
     * avisa, así que la campana se entera de que la han desbloqueado sin recargar.
     */
    let soltarVigilante: (() => void) | null = null;
    let montado = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((estado) => {
          if (!montado) return;
          const sincronizar = () => setPermission(Notification.permission);
          estado.addEventListener("change", sincronizar);
          soltarVigilante = () => estado.removeEventListener("change", sincronizar);
          sincronizar();
        })
        .catch(() => undefined);
    }

    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(subscription));
      })
      .catch(() => undefined);

    return () => {
      montado = false;
      soltarVigilante?.();
    };
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


  const cerrarPregunta = useCallback(() => {
    setPreguntando(false);
    disparador.current?.focus();
  }, []);

  /** Relee el permiso ahora mismo: el respaldo de quien acaba de cambiarlo a mano. */
  const volverAComprobar = () => {
    const ahora = Notification.permission;
    setPermission(ahora);
    if (ahora === "denied") {
      setMessage("Sigue bloqueado en el navegador.");
      return;
    }
    setMessage(null);
  };

  const confirmar = async () => {
    const apagar = subscribed;
    await (apagar ? unsubscribe() : subscribe());
    setPreguntando(false);
    disparador.current?.focus();
  };

  // Escape cierra, el foco entra al panel y el fondo no se desplaza mientras está abierto.
  useEffect(() => {
    if (!preguntando) return;
    panel.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarPregunta();
    };
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [preguntando, cerrarPregunta]);

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
        ref={disparador}
        type="button"
        className="pulso-campana"
        data-estado={loading ? "cargando" : bloqueado ? "bloqueada" : subscribed ? "activa" : "apagada"}
        aria-pressed={subscribed}
        aria-label={rotulo}
        aria-haspopup="dialog"
        title={rotulo}
        disabled={loading}
        onClick={() => {
          setMessage(null);
          setPreguntando(true);
        }}
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

      {preguntando && typeof document !== "undefined"
        ? createPortal(
            <div className="pulso-dialogo-fondo" onClick={(e) => e.target === e.currentTarget && cerrarPregunta()}>
              <div
                ref={panel}
                className="pulso-dialogo"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pulso-avisos-titulo"
                tabIndex={-1}
              >
                <div className="pulso-dialogo-cab">
                  <span
                    className="pulso-dialogo-ico"
                    data-apagar={bloqueado || subscribed ? "true" : "false"}
                    aria-hidden="true"
                  >
                    {bloqueado || subscribed ? <BellOff width={19} height={19} /> : <Bell width={19} height={19} />}
                  </span>
                  <h3 id="pulso-avisos-titulo">
                    {bloqueado
                      ? "Los avisos están bloqueados"
                      : subscribed
                        ? "¿Desactivar los avisos?"
                        : "¿Activar los avisos?"}
                  </h3>
                  <button type="button" className="pulso-cerrar" onClick={cerrarPregunta} aria-label="Cerrar">
                    <X aria-hidden="true" width={16} height={16} />
                  </button>
                </div>

                {bloqueado ? (
                  <>
                    <p className="pulso-dialogo-texto">
                      Este navegador tiene las notificaciones bloqueadas para el sitio, así que la página no puede
                      volver a pedirte permiso: hay que quitarlo desde el navegador.
                    </p>
                    <ol className="pulso-dialogo-pasos">
                      <li>Pulsa el candado —o el icono de ajustes— que está a la izquierda de la dirección.</li>
                      <li>Busca «Notificaciones» y cámbialo a «Permitir» o quita el bloqueo.</li>
                      <li>Vuelve aquí: la campana se entera sola, sin recargar.</li>
                    </ol>
                    <div className="pulso-dialogo-botones">
                      <button type="button" className="pulso-dialogo-no" onClick={cerrarPregunta}>
                        Entendido
                      </button>
                      <button type="button" className="pulso-dialogo-si" onClick={volverAComprobar}>
                        Volver a comprobar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="pulso-dialogo-texto">
                      {subscribed
                        ? "Dejarás de recibir novedades del radar en este navegador. Puedes volver a activarlas cuando quieras desde la misma campana."
                        : "Recibirás un aviso del navegador cuando el radar detecte una señal relevante: un aviso de seguridad, un movimiento fuerte del mercado o una novedad del stack. Nada más."}
                    </p>
                    {!subscribed ? (
                      <p className="pulso-dialogo-pie">
                        El navegador te pedirá permiso a continuación. La suscripción se guarda en este dispositivo.
                      </p>
                    ) : null}
                    <div className="pulso-dialogo-botones">
                      <button type="button" className="pulso-dialogo-no" onClick={cerrarPregunta}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="pulso-dialogo-si"
                        data-apagar={subscribed ? "true" : "false"}
                        disabled={loading}
                        onClick={confirmar}
                      >
                        {loading ? (
                          <LoaderCircle aria-hidden="true" width={15} height={15} className="pulso-campana-gira" />
                        ) : null}
                        {subscribed ? "Desactivar" : "Activar avisos"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
