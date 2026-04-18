"use client";

import { OfflineIndicator, PWAInstallBanner } from "@/modules/finance/components/PWAComponents";
import { CommandCenter } from "@/modules/pulse/components/CommandCenter";

export function PulsePageClient() {
  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-hidden bg-[#030305] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pb-20 text-gray-100 selection:bg-blue-500/30"
    >
      <CommandCenter mode="page" visible />
      <PWAInstallBanner />
      <OfflineIndicator />
    </main>
  );
}
