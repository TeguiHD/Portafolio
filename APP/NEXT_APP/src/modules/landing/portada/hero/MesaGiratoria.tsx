"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePortada } from "../PortadaMotion";
import { usePrimeraInteraccion } from "../interaccionInicial";
import { instrumentos } from "../datos/instrumentos";
import { QuitarFondo } from "./instrumentos/QuitarFondo";
import { GeneradorQR } from "./instrumentos/GeneradorQR";
import { Paleta } from "./instrumentos/Paleta";
import { Recortar } from "./instrumentos/Recortar";
import type { Demo } from "./instrumentos/tipos";

const N = instrumentos.length;
const ICONOS = [
  <path key="0" d="m18.4 3.6 2 2-9 9-3.5 1.5L9.4 12.6z" />,
  <g key="1"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /></g>,
  <path key="2" d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  <path key="3" d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />,
];

function radio() {
  return window.innerWidth < 1100 ? 150 : 220;
}

/**
 * Mesa giratoria V1 (tocadiscos): las cuatro tarjetas giran sobre un eje vertical;
 * la del frente queda nítida y corre su demostración; las otras se atenúan y quedan inertes.
 */
export function MesaGiratoria() {
  const { nivel, listo } = usePortada();
  /** Las demostraciones esperan a que haya alguien delante: quien no interactúa no
   *  paga su coste, y la página se queda quieta en vez de repintarse sin público. */
  const interactuado = usePrimeraInteraccion();
  const mesaRef = useRef<HTMLDivElement>(null);
  const escenaRef = useRef<HTMLDivElement>(null);
  const demos = useRef<(Demo | null)[]>(Array.from({ length: N }, () => null));
  const [activo, setActivo] = useState(0);
  const activoRef = useRef(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const [registro, setRegistro] = useState(0);
  const giroScroll = useRef(0);
  const pausaHasta = useRef(0);
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  // Se anima el contenedor posicionado (hijo directo del contexto 3D), como en el prototipo: así la profundidad ordena bien las tarjetas.
  const tarjetas = useCallback(() => (mesaRef.current ? Array.from(mesaRef.current.querySelectorAll<HTMLElement>(".p-instrumento-pos")) : []), []);

  const colocar = useCallback((animar: boolean | "adelante") => {
    const dur = animar && nivelRef.current !== "estatico" ? 1.1 : 0;
    const r = radio();
    tarjetas().forEach((c, i) => {
      const k = (((i - activoRef.current) % N) + N) % N;
      const ang = k * (360 / N) + giroScroll.current;
      const prof = (Math.cos((ang * Math.PI) / 180) + 1) / 2;
      gsap.to(c, {
        duration: dur,
        ease: "power3.inOut",
        rotateY: ang,
        z: r,
        x: 0,
        y: 0,
        transformOrigin: `50% 50% -${r}px`,
        opacity: 0.3 + prof * 0.7,
        filter: `blur(${((1 - prof) * 2.4).toFixed(2)}px)`,
      });
    });
  }, [tarjetas]);

  const ir = useCallback((i: number, manual: boolean) => {
    const siguiente = ((i % N) + N) % N;
    demos.current.forEach((d, k) => { if (k !== siguiente) d?.stop(); });
    activoRef.current = siguiente;
    setActivo(siguiente);
    pausaHasta.current = Date.now() + (manual ? 12000 : 0);
    colocar(manual ? true : "adelante");
  }, [colocar]);

  // Colocación inicial y al cambiar de nivel.
  useEffect(() => {
    if (mesaRef.current) gsap.set(mesaRef.current, { rotateX: -6 });
    colocar(false);
    const alRedimensionar = () => colocar(false);
    window.addEventListener("resize", alRedimensionar, { passive: true });
    return () => window.removeEventListener("resize", alRedimensionar);
  }, [colocar, nivel]);

  // Giro por scroll e inclinación de la mesa: solo en nivel completo.
  useEffect(() => {
    const mesa = mesaRef.current;
    if (nivel !== "completo" || !listo || !mesa) return;
    const st = ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
      onUpdate: (self) => {
        giroScroll.current = window.innerWidth < 1100 ? 0 : self.progress * 28;
        colocar(false);
      },
    });
    const inclinacion = gsap.to(mesa, { rotateX: -14, y: 40, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.6 } });
    return () => {
      st.kill();
      inclinacion.scrollTrigger?.kill();
      inclinacion.kill();
      giroScroll.current = 0;
      gsap.set(mesa, { rotateX: -6, y: 0 });
    };
  }, [nivel, listo, colocar]);

  // Visibilidad del hero: fuera de pantalla no corre ninguna demo.
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const obs = new IntersectionObserver((e) => setHeroVisible(e[0].isIntersecting), { threshold: 0 });
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  // Arranque y parada de la demo del frente.
  useEffect(() => {
    const corre = heroVisible && nivel !== "estatico" && interactuado;
    const lista = demos.current;
    lista.forEach((d, k) => {
      if (!d) return;
      if (k === activo && corre) d.start();
      else d.stop();
    });
    if (!corre) return;
    return () => lista[activo]?.stop();
  }, [activo, heroVisible, nivel, registro, interactuado]);

  // Avance automático cada 11 s.
  useEffect(() => {
    if (nivel !== "completo" || !interactuado) return;
    const id = window.setInterval(() => {
      if (!heroVisible || document.hidden || Date.now() < pausaHasta.current) return;
      ir(activoRef.current + 1, false);
    }, 11000);
    return () => window.clearInterval(id);
  }, [nivel, heroVisible, ir, interactuado]);

  // Coreografía de entrada del hero (una vez, si el hero sigue retenido).
  useEffect(() => {
    const html = document.documentElement;
    if (!listo || nivel === "estatico" || !html.classList.contains("portada-entrada")) {
      html.classList.remove("portada-entrada");
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onStart: () => html.classList.remove("portada-entrada") });
    tl.from(".p-hero .p-insignia", { y: 16, opacity: 0, duration: 0.5 })
      .from(".p-hero h1 .ln > span", { yPercent: 110, duration: 0.9, stagger: 0.09, clipPath: "inset(0 0 100% 0)" }, "-=.3")
      .from(".p-hero .p-cta", { y: 14, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=.2")
      .from(".p-hero .p-mesa", { y: 60, opacity: 0, rotateX: -18, duration: 1.1, ease: "power4.out" }, 0.25)
      .from(".p-hero .p-puntos button", { y: 10, opacity: 0, duration: 0.4, stagger: 0.05 }, "-=.5")
      .from(".p-hero .p-explorar", { opacity: 0, duration: 0.5 }, "-=.2");
    return () => { tl.kill(); };
    // Solo debe correr una vez, cuando el motor está listo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo]);

  const registrar = useCallback((i: number) => (d: Demo | null) => {
    demos.current[i] = d;
    setRegistro((v) => v + 1);
  }, []);
  const registradores = useRef(instrumentos.map((_, i) => registrar(i)));

  /** Por id, no por posición: el orden del carrusel se cambia solo en datos/instrumentos. */
  const componentes: Record<(typeof instrumentos)[number]["id"], typeof QuitarFondo> = {
    "quitar-fondo": QuitarFondo,
    qr: GeneradorQR,
    paleta: Paleta,
    recortar: Recortar,
  };
  // El mismo criterio que usa el efecto: si no, el atributo decía que la demo
  // corría cuando en realidad estaba parada esperando a que hubiera alguien.
  const corre = heroVisible && nivel !== "estatico" && interactuado;

  return (
    <div className="p-mesa" onPointerEnter={() => { pausaHasta.current = Date.now() + 9e9; }} onPointerLeave={() => { pausaHasta.current = Date.now() + 4000; }}>
      <div ref={escenaRef} className="p-mesa-3d">
        <div ref={mesaRef} className="p-mesa-giro">
          {instrumentos.map((ins, i) => {
            const Comp = componentes[ins.id];
            const frente = i === activo;
            return (
              <div
                key={ins.id}
                className="p-instrumento-pos"
                data-frente={frente ? "true" : "false"}
                data-motion-active={frente && corre ? "true" : "false"}
                inert={!frente}
                aria-hidden={!frente}
              >
                <Comp registrar={registradores.current[i]} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-puntos" role="tablist" aria-label="Instrumento en el frente">
        {instrumentos.map((ins, i) => (
          <button
            key={ins.id}
            type="button"
            role="tab"
            aria-label={ins.nombre}
            aria-selected={i === activo}
            aria-current={i === activo ? "true" : "false"}
            onClick={() => ir(i, true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONOS[i]}</svg>
            <span className="lbl" aria-hidden="true">{ins.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
