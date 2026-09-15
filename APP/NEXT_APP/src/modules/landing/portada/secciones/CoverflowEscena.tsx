"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, GraduationCap, ShoppingBag, Wrench } from "lucide-react";
import { usePortada } from "../PortadaMotion";
import { useRevelar } from "../revelar";
import type { Caso } from "../datos/casos";
import type { Trigger } from "../motor";

const ICONOS = [ShoppingBag, GraduationCap, Wrench];
const RECORRIDO = 1200;

/** Coverflow de los tres proyectos: el scroll dentro de la sección fijada desplaza el panel activo. */
export function CoverflowEscena({ casos }: { casos: readonly Caso[] }) {
  const { nivel, listo, lenis, motor } = usePortada();
  const cab = useRevelar<HTMLDivElement>();
  const escena = useRef<HTMLDivElement>(null);
  const trigger = useRef<Trigger | null>(null);
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;
  const [activo, setActivo] = useState(0);
  const fijado = nivel !== "estatico";

  const paneles = useCallback(() => (escena.current ? Array.from(escena.current.querySelectorAll<HTMLElement>(".p-panel")) : []), []);

  const colocar = useCallback((p: number, animar = false) => {
    const gsap = motor?.gsap;
    if (!gsap) return;
    paneles().forEach((el, i) => {
      const o = i - p;
      const a = Math.abs(o);
      const props = { xPercent: o * 64, rotateY: -o * 32, z: -a * 220, scale: 1 - a * 0.14, opacity: 1 - a * 0.3, zIndex: 10 - Math.round(a) };
      if (animar) gsap.to(el, { ...props, duration: 0.6, ease: "power3.out" });
      else gsap.set(el, props);
    });
    setActivo(Math.round(Math.max(0, Math.min(casos.length - 1, p))));
  }, [paneles, casos.length, motor]);

  useEffect(() => {
    if (!motor) return;
    const { gsap, ScrollTrigger } = motor;
    if (!listo || !fijado) {
      paneles().forEach((el) => gsap.set(el, { clearProps: "all" }));
      return;
    }
    colocar(0);
    const antes = document.getElementById("tecnologias")?.getBoundingClientRect().top ?? 0;
    const st = ScrollTrigger.create({
      trigger: ".p-cover-pin",
      start: "top top",
      end: `+=${RECORRIDO}`,
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => colocar(self.progress * (casos.length - 1)),
    });
    trigger.current = st;
    // El fijado inserta el recorrido por encima de lo que sigue: si el usuario ya
    // había pasado esta sección (p. ej. llegó por /#contact), se compensa lo que
    // se movió, medido en el DOM, para que no cambie de sitio. La limpieza
    // deshace la compensación con la misma medida.
    const siguiente = document.getElementById("tecnologias");
    const desplazar = (delta: number) => {
      if (Math.abs(delta) < 2) return;
      const l = lenisRef.current;
      if (l) l.scrollTo(window.scrollY + delta, { immediate: true, force: true });
      else window.scrollBy(0, delta);
      ScrollTrigger.update();
    };
    if (siguiente && window.scrollY > st.start + 10) desplazar(siguiente.getBoundingClientRect().top - antes);
    return () => {
      const previo = siguiente ? siguiente.getBoundingClientRect().top : 0;
      const habiaPasado = window.scrollY > st.start + 10;
      st.kill();
      trigger.current = null;
      paneles().forEach((el) => gsap.set(el, { clearProps: "all" }));
      if (siguiente && habiaPasado) desplazar(siguiente.getBoundingClientRect().top - previo);
    };
  }, [listo, fijado, colocar, paneles, casos.length, motor]);

  function ir(i: number) {
    const st = trigger.current;
    if (!st) {
      colocar(i, true);
      return;
    }
    const y = st.start + ((st.end - st.start) * i) / (casos.length - 1);
    const l = lenisRef.current;
    // Con duración explícita Lenis termina la animación y vuelve a aceptar scroll nativo;
    // en modo lerp se queda "suavizando" y revierte cualquier salto programático posterior.
    if (l) l.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <>
      <div ref={cab} className="p-cab" data-revelar>
        <span className="eyebrow">Trabajo que puedes conocer</span>
        <h2 id="projects-title"><span className="ln"><span>De la necesidad al producto</span></span></h2>
        <p className="sub">Conoce qué construí, para qué sirve y qué puedes explorar en cada proyecto.</p>
      </div>
      <div ref={escena} className="p-cover-escena" data-fijado={fijado ? "true" : "false"}>
        {casos.map((caso, i) => {
          const Icono = ICONOS[i] ?? Wrench;
          return (
            <article key={caso.id} className="p-panel" data-caso={caso.id} aria-current={i === activo ? "true" : undefined} onClick={() => ir(i)}>
              <div className="p-panel-visual" style={{ "--fondo": caso.fondo } as CSSProperties}>
                <Image src={caso.image} alt={caso.imageAlt} fill sizes="(min-width: 1024px) 660px, 84vw" className="p-panel-imagen" />
                <span className="p-panel-etiqueta">{caso.visualLabel}</span>
              </div>
              <div className="p-panel-texto">
                <small><Icono size={12} aria-hidden="true" />{caso.category}</small>
                <h3>{caso.title}</h3>
                <p>{caso.description}</p>
                <p className="p-panel-detalle">{caso.details}</p>
                <div className="p-panel-pie">
                  <span>{caso.evidence}</span>
                  <Link
                    href={caso.href}
                    target={caso.external ? "_blank" : undefined}
                    rel={caso.external ? "noopener noreferrer" : undefined}
                    className="p-panel-enlace"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {caso.cta}
                    <ArrowUpRight aria-hidden="true" />
                    {caso.external && <span className="sr-only">(se abre en otra pestaña)</span>}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="p-cover-mando" role="group" aria-label="Elegir proyecto">
        <button type="button" aria-label="Proyecto anterior" onClick={() => ir(Math.max(0, activo - 1))} disabled={activo === 0}><ChevronLeft size={16} aria-hidden="true" /></button>
        {casos.map((caso, i) => (
          <button key={caso.id} type="button" className="p-cover-punto" aria-label={`Ver ${caso.title}`} aria-current={i === activo ? "true" : undefined} onClick={() => ir(i)} />
        ))}
        <button type="button" aria-label="Proyecto siguiente" onClick={() => ir(Math.min(casos.length - 1, activo + 1))} disabled={activo === casos.length - 1}><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </>
  );
}
