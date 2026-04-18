"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DropCursor = dynamic(() => import("@/components/DropCursor"), {
  ssr: false,
});

const BackgroundManager = dynamic(
  () =>
    import("@/modules/landing/layout/BackgroundManager").then(
      (mod) => mod.BackgroundManager
    ),
  { ssr: false }
);

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export function VisualEnhancements() {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setIsReady(false);
      setShowBackground(false);
      setShowCursor(false);
      return;
    }

    const updateCapabilities = () => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      const finePointer = window.matchMedia("(pointer: fine)").matches;
      const hoverCapable = window.matchMedia("(hover: hover)").matches;
      const desktopLikeViewport = window.innerWidth >= 768;
      const saveData = Boolean(
        (navigator as NavigatorWithConnection).connection?.saveData
      );
      const lowCpu =
        typeof navigator.hardwareConcurrency === "number" &&
        navigator.hardwareConcurrency <= 4;

      const allowAdvancedVisuals = !reducedMotion && !saveData && !lowCpu;

      setShowBackground(allowAdvancedVisuals && desktopLikeViewport);
      setShowCursor(
        allowAdvancedVisuals &&
          desktopLikeViewport &&
          finePointer &&
          hoverCapable
      );
    };

    updateCapabilities();

    const onResize = () => updateCapabilities();
    window.addEventListener("resize", onResize, { passive: true });

    const idleWindow = window as IdleWindow;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(
        () => setIsReady(true),
        { timeout: 1200 }
      );
    } else {
      timeoutHandle = window.setTimeout(() => setIsReady(true), 900);
    }

    return () => {
      window.removeEventListener("resize", onResize);

      if (
        idleHandle !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [pathname]);

  if (pathname !== "/" || !isReady) {
    return null;
  }

  return (
    <>
      {showBackground ? <BackgroundManager /> : null}
      {showCursor ? <DropCursor /> : null}
    </>
  );
}
