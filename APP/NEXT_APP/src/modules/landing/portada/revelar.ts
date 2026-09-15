"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { usePortada } from "./PortadaMotion";

/**
 * Revela una cabecera al entrar en pantalla: el eyebrow sube, las líneas del
 * título (`.ln > span`) entran por máscara y el párrafo (`.sub`) sube.
 */
export function revelarCabecera(cab: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: cab, start: "top 82%", once: true },
    defaults: { ease: "power3.out" },
  });
  const eyebrow = cab.querySelectorAll(".eyebrow");
  const lineas = cab.querySelectorAll(".ln > span");
  const sub = cab.querySelectorAll(".sub");
  if (eyebrow.length) tl.from(eyebrow, { y: 12, opacity: 0, duration: 0.5 });
  if (lineas.length) tl.from(lineas, { yPercent: 110, duration: 0.9, stagger: 0.1 }, "-=.3");
  if (sub.length) tl.from(sub, { y: 14, opacity: 0, duration: 0.6 }, "-=.5");
  return tl;
}

/** Devuelve la ref de una cabecera que se revela sola cuando el nivel lo permite. */
export function useRevelar<T extends HTMLElement = HTMLDivElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { nivel, listo } = usePortada();

  useEffect(() => {
    const el = ref.current;
    if (!el || !listo || nivel === "estatico") return;
    const tl = revelarCabecera(el);
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set(el.querySelectorAll(".eyebrow, .ln > span, .sub"), { clearProps: "all" });
    };
  }, [nivel, listo]);

  return ref;
}
