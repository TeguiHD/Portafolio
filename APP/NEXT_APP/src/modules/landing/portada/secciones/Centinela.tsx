"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { Code, Database, Filter, Globe, Lock, ShieldCheck, UserCheck, Zap } from "lucide-react";
import { useMotionActivity } from "@/modules/landing/motion/LandingMotionProvider";
import { usePortada } from "../PortadaMotion";
import { useRevelar } from "../revelar";
import { onda, useMagnetico } from "../interaccion";
import { cabecerasEsperadas, capas, lineasFijas, presets, type LineaTerminal } from "../datos/seguridad";
import { matrixOrb, type MatrixOrb } from "./matrixOrb";
import "./centinela.css";

const RADIOS = [0.92, 0.74, 0.56, 0.38];
const ANGULOS = [-28, 34, 152, 214];
const ICONOS_CAPA = { escudo: ShieldCheck, filtro: Filter, usuario: UserCheck, datos: Database };
const ICONOS_PRESET = { normal: Globe, sql: Code, rafaga: Zap, sesion: Lock };

type Marca = "" | "toca" | "mal";
interface EstadoAnillo { marca: Marca; nota: string }

const ANILLOS_INICIALES: EstadoAnillo[] = capas.map(() => ({ marca: "", nota: "· esperando" }));

function arcos(i: number, kv: number) {
  const r = RADIOS[i] * 100;
  const ry = r * kv;
  const lejos = `M ${-r} 0 A ${r} ${ry} 0 0 1 ${r} 0`;
  const cerca = `M ${r} 0 A ${r} ${ry} 0 0 1 ${-r} 0`;
  return { lejos, cerca, completa: `${lejos} A ${r} ${ry} 0 0 1 ${-r} 0` };
}

/** Centinela de seguridad: un núcleo vigila, cada petición atraviesa cuatro anillos y el terminal muestra la respuesta real. */
export function Centinela() {
  const { nivel, listo } = usePortada();
  const { ref: seccion, active } = useMotionActivity<HTMLElement>();
  const cab = useRevelar<HTMLDivElement>();
  const centinela = useRef<HTMLDivElement>(null);
  const nucleo = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const pdot = useRef<HTMLSpanElement>(null);
  const estela = useRef<HTMLSpanElement>(null);
  const lanzarBtn = useRef<HTMLButtonElement>(null);
  useMagnetico(lanzarBtn, 6);

  const [actual, setActual] = useState(0);
  const [peticion, setPeticion] = useState(presets[0].peticion);
  const [orbEstado, setOrbEstado] = useState("Vigilando");
  const [veredicto, setVeredicto] = useState<{ texto: string; mal: boolean; on: boolean }>({ texto: "", mal: false, on: false });
  const [anillos, setAnillos] = useState<EstadoAnillo[]>(ANILLOS_INICIALES);
  const [lineas, setLineas] = useState<{ items: LineaTerminal[]; version: number }>({ items: lineasFijas, version: 0 });
  const [kv, setKv] = useState(0.47);

  const est = useRef({
    actual: 0,
    manual: false,
    arrancado: false,
    tl: null as gsap.core.Timeline | null,
    tipeo: null as gsap.core.Tween | null,
    temporizador: 0,
    rayoAng: Math.PI,
    rayoT: 1.02,
    K: { v: 0.47 },
    orb: null as MatrixOrb | null,
    reales: lineasFijas as LineaTerminal[],
  });
  const corre = active && nivel !== "estatico";

  const colocarRayo = useCallback(() => {
    const s = est.current;
    const c = centinela.current;
    if (!c || !pdot.current || !estela.current) return;
    const r = parseFloat(getComputedStyle(c).width) / 2;
    const x = Math.cos(s.rayoAng) * s.rayoT * r;
    const y = Math.sin(s.rayoAng) * s.rayoT * r * s.K.v;
    const fi = (Math.atan2(y, x) * 180) / Math.PI;
    pdot.current.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    estela.current.style.transform = `rotate(${fi.toFixed(2)}deg)`;
    estela.current.style.width = `${Math.hypot(x, y).toFixed(1)}px`;
  }, []);

  const luz = useCallback((color: string) => {
    centinela.current?.style.setProperty("--luz", color);
    nucleo.current?.style.setProperty("--luz", color);
    est.current.orb?.setColor(color);
  }, []);

  const marcar = useCallback((i: number, marca: Marca, nota?: string) => {
    setAnillos((prev) => prev.map((a, k) => (k === i ? { marca, nota: nota ?? a.nota } : a)));
  }, []);

  const limpiar = useCallback(() => {
    setAnillos(ANILLOS_INICIALES);
    if (pdot.current) gsap.set(pdot.current, { opacity: 0, scale: 1 });
    if (estela.current) gsap.set(estela.current, { opacity: 0 });
    setVeredicto({ texto: "", mal: false, on: false });
    luz("#5eead4");
    est.current.orb?.setState("idle");
    setOrbEstado("Vigilando");
  }, [luz]);

  const escribir = useCallback((items: LineaTerminal[] | null) => {
    setLineas((prev) => ({ items: items ?? est.current.reales, version: prev.version + 1 }));
  }, []);

  const elegir = useCallback((i: number) => {
    const s = est.current;
    s.actual = i;
    setActual(i);
    const texto = presets[i].peticion;
    s.tipeo?.kill();
    if (nivel === "estatico") {
      setPeticion(texto);
      return;
    }
    setPeticion("");
    const n = { n: 0 };
    let k = 0;
    s.tipeo = gsap.to(n, {
      n: texto.length,
      duration: Math.min(1.4, texto.length * 0.02),
      ease: "none",
      onUpdate: () => {
        const m = Math.round(n.n);
        if (m === k) return;
        k = m;
        setPeticion(texto.slice(0, k));
      },
    });
  }, [nivel]);

  const programarRef = useRef<() => void>(() => {});

  const lanzarPeticion = useCallback(() => {
    const s = est.current;
    window.clearTimeout(s.temporizador);
    s.tl?.kill();
    limpiar();
    const pr = presets[s.actual];
    const tope = pr.hasta < 4 ? RADIOS[pr.hasta - 1] + 0.04 : 0;
    const inicio = 1.02;
    const par = { t: inicio };
    s.rayoAng = ((180 + (Math.random() * 50 - 25)) * Math.PI) / 180;
    s.rayoT = inicio;
    colocarRayo();
    if (pdot.current) gsap.set(pdot.current, { opacity: 1, scale: 1 });
    if (estela.current) gsap.set(estela.current, { opacity: 0 });
    s.orb?.setState("listening");
    setOrbEstado("Petición entrante");
    const dur = 0.55 * pr.hasta + 0.4;
    const tl = gsap.timeline({ onComplete: () => { if (!s.manual) programarRef.current(); } });
    tl.to(estela.current, { opacity: 1, duration: 0.3 }, 0)
      .to(par, { t: tope, duration: dur, ease: "power1.inOut", onUpdate: () => { s.rayoT = par.t; colocarRayo(); } }, 0);
    capas.forEach((_, i) => {
      if (i >= pr.hasta) return;
      const cuando = dur * ((inicio - RADIOS[i]) / (inicio - tope)) - 0.05;
      const ultima = i === pr.hasta - 1 && pr.hasta < 4;
      tl.call(() => {
        marcar(i, ultima ? "mal" : "toca", `· ${pr.ok[i]}`);
        if (ultima) {
          luz("#ef4444");
          s.orb?.setState("thinking");
          setOrbEstado("Bloqueando");
          gsap.to(par, { t: 1.12, duration: 0.7, ease: "power2.in", onUpdate: () => { s.rayoT = par.t; colocarRayo(); } });
          if (pdot.current) gsap.to(pdot.current, { opacity: 0, duration: 0.7 });
          if (estela.current) gsap.to(estela.current, { opacity: 0, duration: 0.4 });
        }
      }, undefined, Math.max(0, cuando));
    });
    if (pr.hasta === 4) {
      tl.call(() => {
        s.orb?.setState("thinking");
        setOrbEstado("Consultando");
        if (pdot.current) gsap.to(pdot.current, { scale: 0, opacity: 0, duration: 0.35 });
      }, undefined, dur)
        .to({}, { duration: 0.6 })
        .call(() => {
          s.orb?.setState("listening");
          setOrbEstado("Respondiendo");
          if (pdot.current) gsap.set(pdot.current, { opacity: 1, scale: 1 });
          gsap.fromTo(par, { t: 0 }, { t: 1.12, duration: 0.9, ease: "power2.out", onUpdate: () => { s.rayoT = par.t; colocarRayo(); } });
          if (pdot.current) gsap.to(pdot.current, { opacity: 0, duration: 0.9 });
        });
    }
    tl.call(() => {
      setVeredicto({ texto: pr.fin, mal: pr.hasta < 4, on: true });
      escribir(pr.lineas);
    }, undefined, dur + (pr.hasta === 4 ? 0.9 : 0.5))
      .to({}, { duration: 1.6 })
      .call(() => {
        s.orb?.setState("idle");
        setOrbEstado(pr.hasta < 4 ? "Vigilando" : "Correcto");
        luz("#5eead4");
        setAnillos((prev) => prev.map((a) => (a.marca === "mal" ? { ...a, marca: "" } : a)));
      });
    s.tl = tl;
  }, [colocarRayo, escribir, limpiar, luz, marcar]);

  programarRef.current = () => {
    const s = est.current;
    window.clearTimeout(s.temporizador);
    s.temporizador = window.setTimeout(() => {
      if (document.hidden) return;
      elegir((s.actual + 1) % presets.length);
      s.temporizador = window.setTimeout(lanzarPeticion, 900);
    }, 2600);
  };

  // Cabeceras reales del sitio (misma origen) para el terminal de la visita normal.
  useEffect(() => {
    let vivo = true;
    fetch("/", { method: "HEAD", cache: "no-store" })
      .then((res) => {
        const encontradas: LineaTerminal[] = [];
        cabecerasEsperadas.forEach(({ nombre, lectura }) => {
          const valor = res.headers.get(nombre);
          if (valor) encontradas.push([nombre, valor.length > 60 ? `${valor.slice(0, 57)}…` : valor, lectura]);
        });
        if (vivo && encontradas.length >= 3) est.current.reales = [["curl -I https://nicoholas.dev", "", "cmd"], ...encontradas];
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Núcleo: se crea una vez y arranca solo mientras se ve.
  useEffect(() => {
    const canvas = lienzo.current;
    const s = est.current;
    if (!canvas) return;
    const size = Math.round(Math.min(300, window.innerWidth * 0.42) * 0.58);
    s.orb = matrixOrb(canvas, { size, color: "#5eead4", dots: 13 });
    return () => {
      s.orb?.stop();
      s.orb = null;
    };
  }, []);

  // Arranque, parada y estado estático.
  useEffect(() => {
    const s = est.current;
    if (nivel === "estatico") {
      s.tl?.kill();
      s.tipeo?.kill();
      window.clearTimeout(s.temporizador);
      s.orb?.stop();
      setAnillos(capas.map((_, i) => ({ marca: "toca", nota: `· ${presets[0].ok[i]}` })));
      setPeticion(presets[0].peticion);
      setVeredicto({ texto: "", mal: false, on: false });
      setLineas((prev) => ({ items: s.reales, version: prev.version + 1 }));
      return;
    }
    if (!corre) {
      s.orb?.stop();
      window.clearTimeout(s.temporizador);
      s.tl?.pause();
      return;
    }
    s.orb?.start();
    if (s.tl && s.tl.paused()) s.tl.play();
    if (!s.arrancado) {
      s.arrancado = true;
      elegir(0);
      s.temporizador = window.setTimeout(lanzarPeticion, 900);
    }
    return () => { window.clearTimeout(s.temporizador); };
  }, [corre, nivel, elegir, lanzarPeticion]);

  // Los anillos se aplastan un poco más al bajar: otro ángulo de la misma escena.
  useEffect(() => {
    const el = seccion.current;
    if (!el || !listo || nivel === "estatico") return;
    const K = est.current.K;
    const tw = gsap.fromTo(K, { v: 0.34 }, { v: 0.62, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 20%", scrub: 0.8, onUpdate: () => { setKv(K.v); colocarRayo(); } } });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, [listo, nivel, seccion, colocarRayo]);

  const pr = presets[actual];
  const partesPeticion = peticion.split("\n");

  return (
    <section ref={seccion} id="architecture" className="p-sec p-seg" data-motion-active={corre ? "true" : "false"} data-peticion={pr.id}>
      <div className="p-wrap">
        <div ref={cab} className="p-cab" data-revelar>
          <h2>
            <span className="ln"><span>La seguridad no es un extra.</span></span>
            <span className="ln"><span className="t">Es parte del diseño.</span></span>
          </h2>
          <p className="sub">
            Seguridad defensiva por diseño. Un núcleo vigila el sitio y cada petición atraviesa cuatro anillos antes de tocar un dato.
            Lanza una y mira cómo responde.
          </p>
        </div>

        <div className="p-prueba">
          <div className="p-lanzador">
            <h3>Ponla a prueba</h3>
            <div className="p-presets" role="group" aria-label="Tipo de petición">
              {presets.map((p, i) => {
                const Icono = ICONOS_PRESET[p.icono];
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="p-preset"
                    style={{ "--tono": p.tono } as CSSProperties}
                    aria-pressed={actual === i}
                    onClick={() => { est.current.manual = true; elegir(i); lanzarPeticion(); }}
                  >
                    <span className="ico"><Icono size={17} aria-hidden="true" /></span>
                    <span><b>{p.titulo}</b><small>{p.subtitulo}</small></span>
                  </button>
                );
              })}
            </div>
            <div className="p-peticion" aria-live="polite">
              {partesPeticion.map((linea, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {i === 0 && /^(GET|POST)/.test(linea) ? (<><span className="m">{linea.split(" ")[0]}</span>{linea.slice(linea.indexOf(" "))}</>) : linea}
                </span>
              ))}
              <span className="cursor" aria-hidden="true" />
            </div>
            <button ref={lanzarBtn} type="button" className="p-cta lanzar" data-magnetic onPointerDown={onda} onClick={() => { est.current.manual = true; lanzarPeticion(); }}>
              Lanzar petición
            </button>
          </div>

          <div className="p-centinela-wrap">
            <div ref={centinela} className="p-centinela">
              <svg className="p-anillos tras" viewBox="-100 -100 200 200" aria-hidden="true">
                <defs><filter id="p-glow-seg" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter></defs>
                {capas.map((c, i) => (
                  <g key={c.numero} className={anillos[i].marca} style={{ "--tono": c.tono, "--dur": `${18 + i * 9}s` } as CSSProperties}>
                    <path className="glow" d={arcos(i, kv).lejos} />
                    <path className="base" d={arcos(i, kv).lejos} />
                  </g>
                ))}
              </svg>
              <div className="p-rayo" aria-hidden="true">
                <span ref={estela} className="estela" />
                <span ref={pdot} className="pdot" />
              </div>
              <div ref={nucleo} className="p-nucleo">
                <span className="halo" aria-hidden="true" />
                <canvas ref={lienzo} aria-hidden="true" />
                <span className="estado-orb" role="status" aria-live="polite">{orbEstado}</span>
              </div>
              <svg className="p-anillos delante" viewBox="-100 -100 200 200" aria-hidden="true">
                {capas.map((c, i) => (
                  <g key={c.numero} className={anillos[i].marca} style={{ "--tono": c.tono, "--dur": `${18 + i * 9}s` } as CSSProperties}>
                    <path className="glow" d={arcos(i, kv).cerca} />
                    <path className="base" d={arcos(i, kv).cerca} />
                    <path className="tick" pathLength={1000} d={arcos(i, kv).completa} />
                  </g>
                ))}
              </svg>
              {capas.map((c, i) => {
                const Icono = ICONOS_CAPA[c.icono];
                const a = (ANGULOS[i] * Math.PI) / 180;
                const izq = ANGULOS[i] > 90 && ANGULOS[i] < 270;
                return (
                  <div
                    key={c.numero}
                    className={`p-anillo-seg ${anillos[i].marca}`}
                    style={{ "--tono": c.tono, left: `calc(50% + ${(Math.cos(a) * RADIOS[i]).toFixed(4)} * var(--R))`, top: `calc(50% + ${(Math.sin(a) * RADIOS[i] * kv).toFixed(4)} * var(--R))` } as CSSProperties}
                  >
                    <div className={izq ? "lbl-wrap izq" : "lbl-wrap"}>
                      <span className="lbl"><i><Icono size={12} aria-hidden="true" /></i>{c.nombre} <em>{anillos[i].nota}</em></span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-veredicto" aria-live="polite">
              <span className={`${veredicto.on ? "on" : ""} ${veredicto.mal ? "mal" : ""}`.trim()}>
                {veredicto.texto && (<><b>{veredicto.texto.split(" ")[0]}</b> {veredicto.texto.replace(/^\S+\s*/, "")}</>)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-terminal" key={lineas.version}>
          <div className="barra"><i /><i /><i />&nbsp;respuesta del servidor · {pr.titulo.toLowerCase()}</div>
          <pre id="term">
            {lineas.items.map((l, i) => (
              <div key={`${l[0]}-${i}`} className="l" style={{ animationDelay: `${80 + i * 120}ms` }}>
                {l[2] === "cmd" ? (
                  <span className="cmd">{l[0]}</span>
                ) : (
                  <><span><span className="k">{l[0]}</span>: {l[1]}</span><span className="ok">✓ {l[2]}</span></>
                )}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
