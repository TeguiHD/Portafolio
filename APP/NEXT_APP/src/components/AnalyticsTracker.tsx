"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function AnalyticsTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Debounce analytics calls to prevent spamming when navigating rapidly
    const timeoutId = setTimeout(() => {
      const path = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pageview", path }),
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
