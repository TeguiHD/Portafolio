import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type LenisType from "lenis";

/** Motor de movimiento de la portada: GSAP, ScrollTrigger y Lenis, cargados fuera del paquete inicial. */
export interface Motor {
  gsap: typeof GsapType;
  ScrollTrigger: typeof ScrollTriggerType;
  Lenis: typeof LenisType;
}

export type Timeline = ReturnType<Motor["gsap"]["timeline"]>;
export type Tween = ReturnType<Motor["gsap"]["to"]>;
export type Trigger = ReturnType<Motor["ScrollTrigger"]["create"]>;

let promesa: Promise<Motor> | null = null;

/**
 * Carga las librerías una sola vez y registra el plugin. Se llama después de
 * hidratar, cuando hay movimiento que hacer: así el texto del hero (LCP) no
 * espera a ningún script de animación.
 */
export function cargarMotor(): Promise<Motor> {
  if (!promesa) {
    promesa = Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]).then(([g, st, l]) => {
      g.gsap.registerPlugin(st.ScrollTrigger);
      return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger, Lenis: l.default };
    });
  }
  return promesa;
}
