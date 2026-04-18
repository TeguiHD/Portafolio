"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamic import with SSR disabled to prevent recharts hydration mismatch
const FloatingDashboard = dynamic(
  () => import("../components/FloatingDashboard").then((mod) => mod.FloatingDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="hidden lg:block w-[420px] h-[400px] rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse" />
    )
  }
);

// Terminal lines - professional value propositions
const terminalLines = [
  "Transformo ideas en productos",
  "Del problema a la solución",
  "Tu proyecto, listo para crecer",
  "Sin excusas, solo resultados",
];

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

/**
 * Client-side interactive enhancements for the Hero section.
 * These progressively enhance the server-rendered HeroContent.
 * Not blocking for LCP — the static content is already visible.
 */
export function HeroInteractive() {
  const [isMounted, setIsMounted] = useState(false);
  const [enableEnhancements, setEnableEnhancements] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsMounted(true);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const updateCapabilities = () => {
      const saveData = Boolean(
        (navigator as NavigatorWithConnection).connection?.saveData
      );
      const shouldReduce = motionQuery.matches;
      const isMobile = mobileQuery.matches;
      const allowEnhancements = !shouldReduce && !saveData && !isMobile;

      setReducedMotion(shouldReduce);
      setEnableEnhancements(allowEnhancements);
      setShowDashboard(desktopQuery.matches && allowEnhancements);
    };

    const onMediaChange = () => updateCapabilities();
    updateCapabilities();

    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", onMediaChange);
      mobileQuery.addEventListener("change", onMediaChange);
      desktopQuery.addEventListener("change", onMediaChange);
    } else {
      motionQuery.addListener(onMediaChange);
      mobileQuery.addListener(onMediaChange);
      desktopQuery.addListener(onMediaChange);
    }

    return () => {
      if (typeof motionQuery.removeEventListener === "function") {
        motionQuery.removeEventListener("change", onMediaChange);
        mobileQuery.removeEventListener("change", onMediaChange);
        desktopQuery.removeEventListener("change", onMediaChange);
      } else {
        motionQuery.removeListener(onMediaChange);
        mobileQuery.removeListener(onMediaChange);
        desktopQuery.removeListener(onMediaChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!enableEnhancements || typeof window === "undefined") {
      return;
    }

    const idleWindow = window as IdleWindow;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    let stopTyping: (() => void) | null = null;
    let stopProjectsCounter: (() => void) | null = null;
    let stopUptimeCounter: (() => void) | null = null;

    const startEnhancements = () => {
      stopTyping = startTypingAnimation();
      stopProjectsCounter = startCounterAnimation("hero-counter-projects", 500, 2500);
      stopUptimeCounter = startCounterAnimation("hero-counter-uptime", 99, 2000);
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(() => startEnhancements(), {
        timeout: 1400,
      });
    } else {
      timeoutHandle = window.setTimeout(startEnhancements, 900);
    }

    return () => {
      if (
        idleHandle !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }

      stopTyping?.();
      stopProjectsCounter?.();
      stopUptimeCounter?.();
    };
  }, [enableEnhancements]);

  return (
    <>
      {/* Right: Floating Dashboard — desktop only, lazy loaded */}
      {showDashboard ? (
        <div className="hidden lg:flex w-full lg:w-2/5 xl:w-1/3 justify-end items-center">
          <FloatingDashboard />
        </div>
      ) : null}

      {/* Scroll Indicator — only after mount to avoid SSR mismatch */}
      {isMounted && (
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 ${
            enableEnhancements ? "hero-fade-in" : ""
          }`}
          style={enableEnhancements ? { animationDelay: "1.2s" } : undefined}
        >
          <span className="text-xs font-mono text-gray-600 tracking-widest uppercase">
            Scroll
          </span>
          <div
            className={reducedMotion || !enableEnhancements ? "" : "animate-bounce"}
            aria-hidden="true"
          >
            <svg className="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Typing Animation ────────────────────────────────────────
function startTypingAnimation() {
  const target = document.getElementById("hero-typing-target");
  const cursor = document.getElementById("hero-typing-cursor");
  if (!target) return () => undefined;

  cursor?.classList.add("animate-blink");

  let currentIndex = 0;
  let isTyping = true;
  let displayText = "";
  const typingSpeed = 60;
  const pauseDuration = 2500;
  let timeoutId: number | null = null;
  let stopped = false;

  const schedule = (callback: () => void, delay: number) => {
    timeoutId = window.setTimeout(() => {
      if (!stopped) {
        callback();
      }
    }, delay);
  };

  function tick() {
    if (stopped || !target) return;

    if (document.hidden) {
      schedule(tick, 350);
      return;
    }

    const currentText = terminalLines[currentIndex];

    if (isTyping) {
      if (displayText.length < currentText.length) {
        displayText = currentText.slice(0, displayText.length + 1);
        target.textContent = displayText;
        schedule(tick, typingSpeed);
      } else {
        schedule(() => {
          isTyping = false;
          tick();
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        displayText = displayText.slice(0, -1);
        target.textContent = displayText;
        schedule(tick, typingSpeed / 2);
      } else {
        currentIndex = (currentIndex + 1) % terminalLines.length;
        isTyping = true;
        tick();
      }
    }
  }

  // Start after a short delay so server-rendered text is visible first
  schedule(tick, 1500);

  return () => {
    stopped = true;
    cursor?.classList.remove("animate-blink");
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}

// ─── Counter Animation ───────────────────────────────────────
function startCounterAnimation(elementId: string, end: number, duration: number) {
  const el = document.getElementById(elementId);
  if (!el) return () => undefined;
  const counterEl = el;

  // Reset to 0 before animating
  counterEl.textContent = "0";

  let startTime: number | null = null;
  let frameId: number | null = null;
  let startTimeoutId: number | null = null;
  let stopped = false;

  function animate(timestamp: number) {
    if (stopped) return;

    if (document.hidden) {
      frameId = requestAnimationFrame(animate);
      return;
    }

    if (startTime === null) startTime = timestamp;

    const progress = Math.min((timestamp - startTime) / duration, 1);
    const value = Math.floor(progress * end);
    counterEl.textContent = String(value);

    if (progress < 1) {
      frameId = requestAnimationFrame(animate);
    }
  }

  // Start after 1 second
  startTimeoutId = window.setTimeout(() => {
    frameId = requestAnimationFrame(animate);
  }, 1000);

  return () => {
    stopped = true;

    if (startTimeoutId !== null) {
      window.clearTimeout(startTimeoutId);
    }

    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  };
}
