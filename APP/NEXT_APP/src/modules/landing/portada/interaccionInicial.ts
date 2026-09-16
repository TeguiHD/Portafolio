"use client";

import { useEffect, useState } from "react";

const EVENTOS = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;

/**
 * Verdadero desde la primera interacción real de la persona.
 *
 * En equipos con presupuesto bajo el motor de movimiento y la mesa del hero esperan a
 * ese momento, y en todos ellos lo esperan las demostraciones: quien no interactúa no
 * paga el trabajo, y las métricas de carga miden la página que de verdad se ve al llegar.
 *
 * Dos señales no cuentan, porque no las produce nadie:
 *  - un `scroll` con la página arriba del todo (Lenis emite uno al arrancar);
 *  - el primer `pointermove` en el origen, que es donde el navegador deja el puntero
 *    virtual al abrir la pestaña.
 */
export function usePrimeraInteraccion(): boolean {
  const [hubo, setHubo] = useState(false);

  useEffect(() => {
    if (hubo) return;
    // Si la persona ya se movió antes de hidratar (scroll inicial), cuenta como interacción.
    if (window.scrollY > 0) {
      setHubo(true);
      return;
    }
    const marcar = (e: Event) => {
      if (e.type === "scroll" && window.scrollY <= 0) return;
      if (e.type === "pointermove") {
        const p = e as PointerEvent;
        if (p.clientX === 0 && p.clientY === 0) return;
      }
      setHubo(true);
    };
    EVENTOS.forEach((tipo) => window.addEventListener(tipo, marcar, { passive: true }));
    return () => EVENTOS.forEach((tipo) => window.removeEventListener(tipo, marcar));
  }, [hubo]);

  return hubo;
}
