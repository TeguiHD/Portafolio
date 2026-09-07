"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

function PanelPlaceholder() {
  return <div className="h-[430px] rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-slate-400">Monitor del sistema</div>;
}

const FloatingDashboard = dynamic(
  () => import("../components/FloatingDashboard").then(module => module.FloatingDashboard),
  { ssr: false, loading: PanelPlaceholder }
);

/** Restore the original desktop demo without downloading its chart on mobile. */
export function HeroDashboard() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return <div data-hero-dashboard className="hidden w-[36%] max-w-[420px] shrink-0 lg:block">{desktop ? <FloatingDashboard /> : <PanelPlaceholder />}</div>;
}
