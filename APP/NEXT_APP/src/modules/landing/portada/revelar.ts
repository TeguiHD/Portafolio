"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePortada } from "./PortadaMotion";
import type { Motor, Timeline } from "./motor";

const PIEZAS = '.eyebrow, [data-revela="eyebrow"], .ln > span, .sub, [data-revela="sub"]';

/**
 * Revela una cabecera al entrar en pantalla: el eyebrow sube, las líneas del
 * título (`.ln > span`) entran por máscara y el párrafo (`.sub`) sube.
 */
export function revelarCabecera(gsap: Motor["gsap"], cab: HTMLElement): Timeline {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: cab, start: "top 82%", once: true },
    defaults: { ease: "power3.out" },
  });
  const eyebrow = cab.querySelectorAll('.eyebrow, [data-revela="eyebrow"]');
  const lineas = cab.querySelectorAll(".ln > span");
  const sub = cab.querySelectorAll('.sub, [data-revela="sub"]');
  if (eyebrow.length) tl.from(eyebrow, { y: 12, opacity: 0, duration: 0.5 });
  if (lineas.length) tl.from(lineas, { yPercent: 110, duration: 0.9, stagger: 0.1 }, "-=.3");
  if (sub.length) tl.from(sub, { y: 14, opacity: 0, duration: 0.6 }, "-=.5");
  return tl;
}

/** Devuelve la ref de una cabecera que se revela sola cuando el nivel y el motor lo permiten. */
export function useRevelar<T extends HTMLElement = HTMLDivElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { nivel, listo, motor } = usePortada();

  useEffect(() => {
    const el = ref.current;
    if (!el || !listo || !motor || nivel === "estatico") return;
    const tl = revelarCabecera(motor.gsap, el);
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      motor.gsap.set(el.querySelectorAll(PIEZAS), { clearProps: "all" });
    };
  }, [nivel, listo, motor]);

  return ref;
}
