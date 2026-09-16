"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Aviso de versión nueva.
 *
 * Instalada como aplicación, la página puede quedarse abierta días: el service worker
 * trae la versión nueva a la caché, pero lo que se ve sigue siendo el código viejo hasta
 * que alguien recarga. Antes eso solo se anunciaba en la consola. Ahora aparece una
 * barra discreta abajo y recargar es un botón.
 *
 * Se comprueba al volver a la pestaña (como mucho una vez cada cinco minutos) y cada
 * media hora, que es cuando de verdad puede haber cambiado algo.
 */

const ESPERA_ENTRE_COMPROBACIONES = 5 * 60_000;
const RONDA = 30 * 60_000;

export function AvisoVersion() {
  const [hayVersion, setHayVersion] = useState(false);
  const [recargando, setRecargando] = useState(false);
  const registro = useRef<ServiceWorkerRegistration | null>(null);
  const ultima = useRef(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let vivo = true;

    const vigilar = (reg: ServiceWorkerRegistration) => {
      registro.current = reg;
      // Ya había una esperando cuando se abrió esta pestaña.
      if (reg.waiting && navigator.serviceWorker.controller) setHayVersion(true);
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          // Sin `controller` es la primera instalación: no hay nada viejo que sustituir.
          if (nuevo.state === "installed" && navigator.serviceWorker.controller && vivo) setHayVersion(true);
        });
      });
    };

    navigator.serviceWorker.ready.then((reg) => vivo && vigilar(reg)).catch(() => undefined);

    const comprobar = () => {
      const ahora = Date.now();
      if (ahora - ultima.current < ESPERA_ENTRE_COMPROBACIONES) return;
      ultima.current = ahora;
      registro.current?.update().catch(() => undefined);
    };
    const alVolver = () => {
      if (!document.hidden) comprobar();
    };
    document.addEventListener("visibilitychange", alVolver);
    const reloj = window.setInterval(comprobar, RONDA);

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alVolver);
      window.clearInterval(reloj);
    };
  }, []);

  const actualizar = useCallback(() => {
    setRecargando(true);
    const esperando = registro.current?.waiting;
    if (!esperando) {
      window.location.reload();
      return;
    }
    // Cuando el nuevo toma el mando, recargamos una sola vez.
    let recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargado) return;
      recargado = true;
      window.location.reload();
    });
    esperando.postMessage({ type: "SKIP_WAITING" });
    // Si el service worker no responde al mensaje, recargamos igual.
    window.setTimeout(() => {
      if (!recargado) window.location.reload();
    }, 2500);
  }, []);

  if (!hayVersion) return null;

  return (
    <div className="aviso-version" role="status">
      <span>Hay una versión nueva</span>
      <button type="button" onClick={actualizar} disabled={recargando}>
        <RefreshCw aria-hidden="true" width={14} height={14} className={recargando ? "aviso-version-gira" : undefined} />
        {recargando ? "Actualizando…" : "Actualizar"}
      </button>
    </div>
  );
}
