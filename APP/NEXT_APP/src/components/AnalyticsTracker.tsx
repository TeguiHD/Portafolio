"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// document.referrer solo dice de dónde llegó la persona en la PRIMERA página; después, al navegar dentro del sitio,
// sigue igual y contaría la misma llegada varias veces.
let origenEnviado = false;

function AnalyticsTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Solo las marcas de campaña cuentan: cambiar otra parte de la consulta (p. ej. ?abrir= del modo escritorio) no es otra visita.
  const campanaTexto = [...(searchParams ?? new URLSearchParams()).entries()].filter(([k]) => k.startsWith("utm_")).map(([k, v]) => `${k}=${v}`).join("&");

  useEffect(() => {
    // Debounce analytics calls to prevent spamming when navigating rapidly
    const timeoutId = setTimeout(() => {
      // Solo la ruta, más las marcas de campaña (utm_*): el resto de la consulta puede llevar lo que la persona escribe
      // (unidades guarda ?valor= en la URL; /ar lleva las direcciones de sus modelos). Eso no debe llegar al servidor.
      const campana = new URLSearchParams(campanaTexto);
      const path = pathname + (campana.toString() ? `?${campana.toString()}` : "");
      const origen = origenEnviado ? undefined : document.referrer || undefined;
      origenEnviado = true;

      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pageview", path, origen }),
        keepalive: true,
      }).catch(() => { });
    }, 1000); // Wait 1s before tracking

    return () => clearTimeout(timeoutId);
  }, [pathname, campanaTexto]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner />
    </Suspense>
  );
}

export default AnalyticsTracker;
