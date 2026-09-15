"use client";

import { useEffect, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { usePortada } from "./PortadaMotion";

/** Onda al pulsar con el botón principal. El elemento necesita `position: relative; overflow: hidden`. */
export function onda(e: ReactPointerEvent<HTMLElement>) {
  if (e.button !== 0) return;
  const b = e.currentTarget;
  const r = b.getBoundingClientRect();
  const o = document.createElement("span");
  o.className = "p-onda";
  const s = Math.max(r.width, r.height) * 2;
  o.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left}px;top:${e.clientY - r.top}px`;
  b.appendChild(o);
  o.addEventListener("animationend", () => o.remove());
}

function punteroFino() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Imán de unos píxeles hacia el puntero, solo con puntero fino y nivel completo. */
export function useMagnetico(ref: RefObject<HTMLElement | null>, fuerza = 8) {
  const { nivel, motor } = usePortada();
  useEffect(() => {
    const el = ref.current;
    if (!el || !motor || nivel !== "completo" || !punteroFino()) return;
    const { gsap } = motor;
    const qx = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const qy = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * fuerza * 2);
      qy(((e.clientY - r.top) / r.height - 0.5) * fuerza * 2);
    };
    const salir = () => {
      qx(0);
      qy(0);
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", salir);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", salir);
      gsap.set(el, { clearProps: "transform" });
    };
  }, [ref, nivel, motor, fuerza]);
}

/** Inclinación 3D siguiendo al puntero, con `--gx`/`--gy` para un brillo `.p-brillo`. */
export function useInclinar(ref: RefObject<HTMLElement | null>, max = 8) {
  const { nivel, motor } = usePortada();
  useEffect(() => {
    const el = ref.current;
    if (!el || !motor || nivel !== "completo" || !punteroFino()) return;
    const { gsap } = motor;
    const rx = gsap.quickTo(el, "rotateX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotateY", { duration: 0.5, ease: "power3.out" });
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * max * 2);
      rx((0.5 - py) * max * 2);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const salir = () => {
      rx(0);
      ry(0);
    };
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", salir);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", salir);
      gsap.set(el, { clearProps: "transform" });
    };
  }, [ref, nivel, motor, max]);
}
