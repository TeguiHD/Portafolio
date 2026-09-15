"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { usePortadaNivel, type Nivel } from "./nivel";

gsap.registerPlugin(ScrollTrigger);

interface Portada {
  nivel: Nivel;
  lenis: Lenis | null;
  /** Verdadero cuando ScrollTrigger está operativo (nivel distinto de estático). */
  listo: boolean;
}

const Ctx = createContext<Portada>({ nivel: "estatico", lenis: null, listo: false });

export function usePortada() {
  return useContext(Ctx);
}

/**
 * Motor de movimiento de la portada: GSAP + ScrollTrigger siempre que el nivel
 * no sea estático, Lenis solo en nivel completo, barra de progreso de lectura
 * y autoscroll del botón central del ratón (Lenis virtualiza la rueda y lo pierde).
 */
export function PortadaMotion({ children }: { children: ReactNode }) {
  const nivel = usePortadaNivel();
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [listo, setListo] = useState(false);
  const progreso = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nivel !== "completo") {
      setLenis(null);
      return;
    }
    const l = new Lenis({ lerp: 0.11, smoothWheel: true });
    l.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(l);

    let ancla: number | null = null;
    let v = 0;
    const abajo = (e: PointerEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      ancla = e.clientY;
      v = 0;
    };
    const mueve = (e: PointerEvent) => {
      if (ancla === null) return;
      const d = e.clientY - ancla;
      v = Math.abs(d) < 8 ? 0 : Math.max(-38, Math.min(38, (d - Math.sign(d) * 8) * 0.09));
    };
    const suelta = () => {
      ancla = null;
      v = 0;
    };
    const auto = (_t: number, dt: number) => {
      if (ancla === null || !v) return;
      l.scrollTo(l.scroll + v * (dt / 16.67), { immediate: true });
    };
    window.addEventListener("pointerdown", abajo, { passive: false });
    window.addEventListener("pointermove", mueve, { passive: true });
    window.addEventListener("pointerup", suelta);
    window.addEventListener("pointercancel", suelta);
    window.addEventListener("blur", suelta);
    gsap.ticker.add(auto);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.remove(auto);
      window.removeEventListener("pointerdown", abajo);
      window.removeEventListener("pointermove", mueve);
      window.removeEventListener("pointerup", suelta);
      window.removeEventListener("pointercancel", suelta);
      window.removeEventListener("blur", suelta);
      l.destroy();
      setLenis(null);
    };
  }, [nivel]);

  useEffect(() => {
    if (nivel === "estatico") {
      ScrollTrigger.getAll().forEach((st) => st.disable(false));
      setListo(false);
      return;
    }
    ScrollTrigger.getAll().forEach((st) => st.enable());
    const barra = progreso.current;
    const tw = barra
      ? gsap.to(barra, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 },
        })
      : null;
    // Las secciones diferidas cambian la altura del documento al cargarse.
    let pendiente = 0;
    const observador = new ResizeObserver(() => {
      window.clearTimeout(pendiente);
      pendiente = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    });
    observador.observe(document.body);
    setListo(true);
    return () => {
      observador.disconnect();
      window.clearTimeout(pendiente);
      tw?.scrollTrigger?.kill();
      tw?.kill();
      if (barra) gsap.set(barra, { clearProps: "transform" });
    };
  }, [nivel]);

  return (
    <Ctx.Provider value={{ nivel, lenis, listo }}>
      <div ref={progreso} className="p-progreso" aria-hidden="true" data-nivel={nivel} />
      {children}
    </Ctx.Provider>
  );
}
