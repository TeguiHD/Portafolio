"use client";

import { useEffect, useState } from "react";

const EVENTOS = ["pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;

/**
 * Verdadero desde la primera interacción de la persona (toque, rueda, tecla o scroll).
 * En equipos con presupuesto bajo el motor de movimiento y la mesa del hero esperan
 * a ese momento: quien no interactúa no paga el trabajo, y las métricas de carga
 * (TBT, Speed Index) miden la página que realmente se ve al llegar.
 */
export function usePrimeraInteraccion(): boolean {
  const [hubo, setHubo] = useState(false);
  useEffect(() => {
    if (hubo) return;
    const marcar = () => setHubo(true);
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true, once: true }));
    return () => EVENTOS.forEach((e) => window.removeEventListener(e, marcar));
  }, [hubo]);
  return hubo;
}
