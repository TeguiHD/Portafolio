"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Connection = EventTarget & { saveData?: boolean };
const MotionContext = createContext({ allowed: false });

export function useLandingMotion() { return useContext(MotionContext); }

/** Shared permission for decorative work; starts static during server rendering. */
export function LandingMotionProvider({ children }: { children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [restricted, setRestricted] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => {
      setRestricted(query.matches || Boolean(connection?.saveData));
      setVisible(!document.hidden);
    };
    try { setPaused(sessionStorage.getItem("portfolio:motion-paused") === "true"); } catch { /* Storage is optional. */ }
    update();
    setReady(true);
    query.addEventListener("change", update);
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      query.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const allowed = ready && !paused && !restricted && visible;
  return (
    <MotionContext.Provider value={{ allowed }}>
      <div className="landing-experience" data-motion={allowed ? "active" : "paused"} data-motion-restricted={ready && restricted}>
        {children}
        {ready && !restricted && (
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => {
              const next = !paused;
              setPaused(next);
              try { sessionStorage.setItem("portfolio:motion-paused", String(next)); } catch { /* Keep the control usable. */ }
            }}
            className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-[#0a0a0f]/95 px-4 text-xs text-slate-200 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300"
          >
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            {paused ? "Activar efectos" : "Pausar efectos"}
          </button>
        )}
      </div>
    </MotionContext.Provider>
  );
}

/** Hidden responsive duplicates remain inactive as well as offscreen sections. */
export function useMotionActivity<T extends HTMLElement = HTMLDivElement>() {
  const { allowed } = useContext(MotionContext);
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !allowed) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0);
    }, { threshold: 0 });
    observer.observe(element);
    return () => { observer.disconnect(); setInView(false); };
  }, [allowed]);
  return { ref, active: allowed && inView, allowed };
}
