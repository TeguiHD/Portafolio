"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles } from "lucide-react";
import { useMotionActivity } from "@/modules/landing/motion/LandingMotionProvider";
import { usePortada } from "../PortadaMotion";
import { useRevelar } from "../revelar";
import { tecnologias } from "../datos/tecnologias";
import "./orbita.css";

/** El blanco puro de Next.js no se lee sobre el fondo como nombre: se aclara apenas. */
function colorNombre(color: string) {
  return color.toUpperCase() === "#FFFFFF" ? "#e2e8f0" : color;
}

/** Órbita de tecnologías: doce iconos en anillo; el nombre sube por el centro al pasar o pulsar. */
export function Orbita() {
  const { nivel, listo } = usePortada();
  const { ref: seccion, active } = useMotionActivity<HTMLElement>();
  const cab = useRevelar<HTMLDivElement>();
  const anillo = useRef<HTMLDivElement>(null);
  const escena = useRef<HTMLDivElement>(null);
  const texto = useRef<HTMLElement>(null);
  const [activo, setActivo] = useState<number | null>(null);
  /** El que se pinta: sobrevive a la animación de salida para que el nombre no cambie
   *  de color ni se vacíe a mitad del recorrido. */
  const [pintado, setPintado] = useState<number | null>(null);
  const activoRef = useRef<number | null>(null);
  /** Un clic fija el nombre aunque el puntero se vaya; otro clic sobre el mismo lo suelta. */
  const fijado = useRef<number | null>(null);
  const pausa = useRef(false);
  const salida = useRef<gsap.core.Tween | null>(null);
  const corre = active && nivel !== "estatico";

  // Giro continuo (más lento con un nombre activo) y empuje por la velocidad del scroll.
  useEffect(() => {
    const el = anillo.current;
    if (!el || !corre) return;
    const angulo = { v: 0 };
    const tick = (_t: number, dt: number) => {
      if (pausa.current) return;
      angulo.v += dt * 0.008 * (activoRef.current === null ? 1 : 0.25);
      el.style.setProperty("--ang", `${angulo.v.toFixed(2)}deg`);
    };
    gsap.ticker.add(tick);
    const st = listo
      ? ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6, onUpdate: (self) => { angulo.v += self.getVelocity() / 900; } })
      : null;
    return () => {
      gsap.ticker.remove(tick);
      st?.kill();
    };
  }, [corre, listo]);

  // Entrada escalonada de los iconos (no de los satélites, cuyo transform lo fija el CSS).
  useEffect(() => {
    const el = escena.current;
    if (!el || !listo || nivel === "estatico") return;
    const iconos = el.querySelectorAll(".p-satelite > svg");
    const tw = gsap.from(iconos, { scale: 0, opacity: 0, duration: 0.6, stagger: 0.05, ease: "back.out(1.6)", scrollTrigger: { trigger: el, start: "top 80%", once: true } });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
      gsap.set(iconos, { clearProps: "all" });
    };
  }, [listo, nivel]);

  function mostrar(i: number) {
    salida.current?.kill();
    salida.current = null;
    activoRef.current = i;
    setActivo(i);
    setPintado(i);
    if (texto.current && nivel !== "estatico") gsap.fromTo(texto.current, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: "power3.out", overwrite: true });
  }

  function ocultar() {
    activoRef.current = null;
    setActivo(null);
    if (!texto.current || nivel === "estatico") {
      setPintado(null);
      return;
    }
    salida.current = gsap.to(texto.current, {
      yPercent: -110,
      duration: 0.4,
      ease: "power3.in",
      overwrite: true,
      // El nombre se suelta al terminar: si se soltara antes, el texto se vaciaría y el
      // color saltaría al de reserva durante el último tramo de la salida.
      onComplete: () => { if (activoRef.current === null) setPintado(null); },
    });
  }

  const tec = pintado === null ? null : tecnologias[pintado];
  const tono = tec ? colorNombre(tec.color) : undefined;
  /** El halo se apaga al irse el puntero; el nombre conserva su color mientras sale. */
  const encendido = activo !== null;

  return (
    <section ref={seccion} id="tecnologias" className="p-sec p-orbita-sec" data-motion-active={corre ? "true" : "false"}>
      <div className="p-wrap">
        <div ref={cab} className="p-cab centrada" data-revelar>
          <h2>
            <span className="ln"><span>Una base <span className="m">para crecer</span></span></span>
          </h2>
          <p className="sub">
            Elijo las tecnologías según tu proyecto: una web ágil, procesos conectados y un sistema fácil de mantener.
          </p>
        </div>
        <div ref={escena} className="p-orbita-escena" style={{ "--n": tecnologias.length } as CSSProperties}>
          <div className={encendido ? "p-orbita-halo on" : "p-orbita-halo"} style={{ "--tono": tono } as CSSProperties} aria-hidden="true" />
          <div id="orbNombre" className={encendido ? "p-orbita-nombre on" : "p-orbita-nombre"} style={{ "--tono": tono } as CSSProperties} aria-live="polite">
            <span className="ln"><b ref={texto}>{tec ? tec.name : ""}</b></span>
            <small>en el stack</small>
          </div>
          <div
            ref={anillo}
            className="p-anillo"
            onPointerEnter={() => { pausa.current = true; }}
            onPointerLeave={() => { pausa.current = false; }}
          >
            {tecnologias.map((t, i) => (
              <button
                key={t.name}
                type="button"
                className="p-satelite"
                aria-label={t.name}
                aria-pressed={activo === i}
                style={{ "--i": i, "--tono": t.color } as CSSProperties}
                onPointerEnter={() => mostrar(i)}
                onPointerLeave={() => { if (activoRef.current === i && fijado.current !== i) ocultar(); }}
                onFocus={() => mostrar(i)}
                onBlur={() => { if (activoRef.current === i && fijado.current !== i) ocultar(); }}
                onClick={() => {
                  if (fijado.current === i) {
                    fijado.current = null;
                    ocultar();
                  } else {
                    fijado.current = i;
                    mostrar(i);
                  }
                }}
              >
                {t.logo ? (
                  <svg viewBox={t.logo.viewBox} data-logo="" style={{ width: t.logo.ancho }} aria-hidden="true">
                    {t.logo.piezas.map((pieza, k) => (
                      <path key={k} fill={pieza.color} d={pieza.d} />
                    ))}
                  </svg>
                ) : t.path ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill={t.color} d={t.path} /></svg>
                ) : (
                  <Sparkles aria-hidden="true" color={t.color} strokeWidth={2} />
                )}
              </button>
            ))}
          </div>
        </div>
        <noscript>
          <ul className="p-orbita-lista">
            {tecnologias.map((t) => (
              <li key={t.name}>{t.name}</li>
            ))}
          </ul>
        </noscript>
      </div>
    </section>
  );
}
