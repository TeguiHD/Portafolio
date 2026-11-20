"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// document.referrer solo dice de dónde llegó la persona en la PRIMERA página; después, al navegar dentro del sitio,
// sigue igual y contaría la misma llegada varias veces.
let origenEnviado = false;

function AnalyticsTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Debounce analytics calls to prevent spamming when navigating rapidly
    const timeoutId = setTimeout(() => {
      const path = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
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
  }, [pathname, searchParams]);

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
