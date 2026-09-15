"use client";

import { useEffect, useState } from "react";
import { useLandingMotion } from "@/modules/landing/motion/LandingMotionProvider";

/**
 * Nivel de movimiento de la portada.
 *
 * - `estatico`: los efectos están pausados o restringidos (movimiento reducido,
 *   ahorro de datos, pestaña oculta). Nada anima en bucle.
 * - `medio`: presupuesto bajo (pocos núcleos, poca memoria, pantalla estrecha o
 *   puntero grueso). Sin Lenis, fondo a 30 fps con menos partículas.
 * - `completo`: todo activo.
 */
export type Nivel = "completo" | "medio" | "estatico";

type NavegadorConPresupuesto = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function presupuestoBajo(): boolean {
  if (typeof window === "undefined") return true;
  const n = navigator as NavegadorConPresupuesto;
  return (
    (typeof n.hardwareConcurrency === "number" && n.hardwareConcurrency <= 4) ||
    (typeof n.deviceMemory === "number" && n.deviceMemory <= 4) ||
    Boolean(n.connection?.saveData) ||
    window.innerWidth < 768 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** Empieza en `estatico` hasta montar, para que el HTML del servidor sea estable. */
export function usePortadaNivel(): Nivel {
  const { allowed } = useLandingMotion();
  const [bajo, setBajo] = useState(true);

  useEffect(() => {
    const medir = () => setBajo(presupuestoBajo());
    medir();
    window.addEventListener("resize", medir, { passive: true });
    return () => window.removeEventListener("resize", medir);
  }, []);

  if (!allowed) return "estatico";
  return bajo ? "medio" : "completo";
}
