"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, ChevronLeft, ChevronRight, GraduationCap, ShoppingBag, Wrench } from "lucide-react";
import { usePortada } from "../PortadaMotion";
import { useRevelar } from "../revelar";
import type { Caso } from "../datos/casos";

const ICONOS = [ShoppingBag, GraduationCap, Wrench];
const RECORRIDO = 1200;

/** Coverflow de los tres proyectos: el scroll dentro de la sección fijada desplaza el panel activo. */
export function CoverflowEscena({ casos }: { casos: readonly Caso[] }) {
  const { nivel, listo, lenis } = usePortada();
  const cab = useRevelar<HTMLDivElement>();
  const escena = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [activo, setActivo] = useState(0);
  const fijado = nivel !== "estatico";

  const paneles = useCallback(() => (escena.current ? Array.from(escena.current.querySelectorAll<HTMLElement>(".p-panel")) : []), []);

  const colocar = useCallback((p: number, animar = false) => {
    paneles().forEach((el, i) => {
      const o = i - p;
      const a = Math.abs(o);
      const props = { xPercent: o * 64, rotateY: -o * 32, z: -a * 220, scale: 1 - a * 0.14, opacity: 1 - a * 0.3, zIndex: 10 - Math.round(a) };
      if (animar) gsap.to(el, { ...props, duration: 0.6, ease: "power3.out" });
      else gsap.set(el, props);
    });
    setActivo(Math.round(Math.max(0, Math.min(casos.length - 1, p))));
  }, [paneles, casos.length]);

  useEffect(() => {
    if (!listo || !fijado) {
      paneles().forEach((el) => gsap.set(el, { clearProps: "all" }));
      return;
    }
    colocar(0);
    const st = ScrollTrigger.create({
      trigger: ".p-cover-pin",
      start: "top top",
      end: `+=${RECORRIDO}`,
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => colocar(self.progress * (casos.length - 1)),
    });
    trigger.current = st;
    return () => {
      st.kill();
      trigger.current = null;
      paneles().forEach((el) => gsap.set(el, { clearProps: "all" }));
    };
  }, [listo, fijado, colocar, paneles, casos.length]);

  function ir(i: number) {
    const st = trigger.current;
    if (!st) {
      colocar(i, true);
      return;
    }
    const y = st.start + ((st.end - st.start) * i) / (casos.length - 1);
    if (lenis) lenis.scrollTo(y);
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
