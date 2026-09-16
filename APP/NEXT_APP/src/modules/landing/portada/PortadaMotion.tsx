"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type Lenis from "lenis";
import { usePortadaNivel, type Nivel } from "./nivel";
import { usePrimeraInteraccion } from "./interaccionInicial";
import type { Motor } from "./motor";

interface Portada {
  nivel: Nivel;
  lenis: Lenis | null;
  /** Verdadero cuando el motor está cargado y ScrollTrigger operativo (nivel distinto de estático). */
  listo: boolean;
  /** GSAP, ScrollTrigger y Lenis; null hasta que se cargan (o siempre en nivel estático). */
  motor: Motor | null;
}

const Ctx = createContext<Portada>({ nivel: "estatico", lenis: null, listo: false, motor: null });

export function usePortada() {
  return useContext(Ctx);
}

/**
 * Motor de movimiento de la portada. GSAP, ScrollTrigger y Lenis se cargan en su propio
 * chunk con la primera interacción y solo si el nivel no es estático; Lenis solo en nivel
 * completo. Pinta la barra de progreso de lectura y reproduce el
 * autoscroll del botón central del ratón (Lenis virtualiza la rueda y lo pierde).
 */
export function PortadaMotion({ children }: { children: ReactNode }) {
  const nivel = usePortadaNivel();
  const interactuado = usePrimeraInteraccion();
  // El motor espera siempre a la primera interacción. Cargarlo al hidratar le costaba a
  // la portada de escritorio ~350 ms de tareas largas y todo el trabajo del ticker —GSAP,
  // ScrollTrigger y el bucle de Lenis— dentro de la ventana en la que se mide la página,
  // para animar cosas que nadie estaba mirando todavía. Quien se mueve lo enciende.
  const tocaCargar = nivel !== "estatico" && interactuado;
  const [motor, setMotor] = useState<Motor | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [listo, setListo] = useState(false);
  const progreso = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tocaCargar || motor) return;
    let vivo = true;
    // El motor espera a que el hilo principal respire: cargarlo justo al hidratar
    // alargaba las tareas largas del arranque sin que nadie viera nada a cambio.
    const cargar = () => {
      import("./motor")
        .then((m) => m.cargarMotor())
        .then((m) => { if (vivo) setMotor(m); })
        .catch(() => { /* sin motor la portada queda estática pero completa */ });
    };
    let ocioso: number | null = null;
    let reloj: number | null = null;
    if (typeof window.requestIdleCallback === "function") ocioso = window.requestIdleCallback(cargar, { timeout: 1500 });
    else reloj = window.setTimeout(cargar, 200);
    return () => {
      vivo = false;
      if (ocioso !== null) window.cancelIdleCallback(ocioso);
      if (reloj !== null) window.clearTimeout(reloj);
    };
  }, [tocaCargar, motor]);

  useEffect(() => {
    if (!motor || nivel !== "completo") {
      setLenis(null);
      return;
    }
    const { gsap, ScrollTrigger, Lenis: LenisCtor } = motor;
    const l = new LenisCtor({ lerp: 0.11, smoothWheel: true });
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
  }, [motor, nivel]);

  useEffect(() => {
    if (!motor || nivel === "estatico") {
      motor?.ScrollTrigger.getAll().forEach((st) => st.disable(false));
      setListo(false);
      return;
    }
    const { gsap, ScrollTrigger } = motor;
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
  }, [motor, nivel]);

  return (
    <Ctx.Provider value={{ nivel, lenis, listo, motor }}>
      <div ref={progreso} className="p-progreso" aria-hidden="true" data-nivel={nivel} />
      {children}
    </Ctx.Provider>
  );
}
