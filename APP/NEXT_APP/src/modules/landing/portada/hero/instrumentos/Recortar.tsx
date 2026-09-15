"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { gsap } from "gsap";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaBoton, MesaGrupo, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import type { EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { IconoCuadricula, IconoDescargar, IconoEncuadre, IconoGirar, IconoPincel, IconoRestablecer, IconoSubir } from "@/components/tools/mesa/MesaIcons";
import { instrumentos } from "../../datos/instrumentos";
import { Instrumento } from "./Instrumento";
import { descargarLienzo, pintarMuestra, type InstrumentoProps } from "./tipos";

const W = 480;
const H = 300;
const PASOS = [
  { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
  { id: "encuadrar", etiqueta: "Encuadrar", icono: <IconoEncuadre /> },
  { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];
const LISTOS: EstadoPaso[] = ["listo", "listo", "listo"];
const PROPORCIONES = [
  { etiqueta: "Original", ratio: 0 },
  { etiqueta: "1:1", ratio: 1 },
  { etiqueta: "16:9", ratio: 16 / 9 },
  { etiqueta: "9:16", ratio: 9 / 16 },
  { etiqueta: "4:3", ratio: 4 / 3 },
  { etiqueta: "3:2", ratio: 1.5 },
  { etiqueta: "4:5", ratio: 0.8 },
];

interface Caja { x: number; y: number; w: number; h: number }

/** Recortar imagen: el encuadre recorre las proporciones; arrastra el marco para tomar el control. */
export function Recortar({ registrar }: InstrumentoProps) {
  const dato = instrumentos[3];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const [proporcion, setProporcion] = useState(1);
  const [dim, setDim] = useState("1000 × 1000 px");
  const [cuadricula, setCuadricula] = useState(true);
  const [modo, setModo] = useState<"recortar" | "sujeto">("recortar");
  const [giro, setGiro] = useState(0);
  const est = useRef({
    st: { x: (W - H) / 2, y: 0, w: H, h: H } as Caja,
    arrastre: null as { x: number; y: number; sx: number; sy: number } | null,
    manual: false,
    tl: null as gsap.core.Timeline | null,
  });

  function pintar() {
    const st = est.current.st;
    const caja = cajaRef.current;
    if (!caja) return;
    caja.style.left = `${(st.x / W) * 100}%`;
    caja.style.top = `${(st.y / H) * 100}%`;
    caja.style.width = `${(st.w / W) * 100}%`;
    caja.style.height = `${(st.h / H) * 100}%`;
    setDim(`${Math.round((st.w * 10) / 3)} × ${Math.round((st.h * 10) / 3)} px`);
  }

  function medida(ratio: number): Caja {
    const st = est.current.st;
    const r = ratio || W / H;
    let h = H;
    let w = h * r;
    if (w > W) {
      w = W;
      h = w / r;
    }
    return { w, h, x: Math.max(0, Math.min(st.x, W - w)), y: Math.max(0, Math.min(st.y, H - h)) };
  }

  function tomarControl() {
    const s = est.current;
    if (s.manual) return;
    s.manual = true;
    s.tl?.kill();
    s.tl = null;
  }

  function dibujarFuente(angulo: number) {
    const g = canvasRef.current?.getContext("2d");
    if (!g) return;
    g.save();
    g.clearRect(0, 0, W, H);
    g.translate(W / 2, H / 2);
    g.rotate((angulo * Math.PI) / 180);
    g.translate(-W / 2, -H / 2);
    pintarMuestra(g, W, H, 78, 56);
    g.restore();
  }

  useEffect(() => {
    dibujarFuente(giro);
  }, [giro]);

  useEffect(() => {
    pintar();
    const s = est.current;
    const demo = {
      start() {
        s.tl?.kill();
        s.manual = false;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
        [1, 2, 4, 6, 1].forEach((idx) => {
          tl.call(() => {
            setProporcion(idx);
            const m = medida(PROPORCIONES[idx].ratio);
            gsap.to(s.st, { w: m.w, h: m.h, x: (W - m.w) / 2 + (idx % 2 ? 30 : -30), y: (H - m.h) / 2, duration: 0.9, ease: "power3.inOut", onUpdate: pintar });
          }).to({}, { duration: 1.5 });
        });
        s.tl = tl;
      },
      stop() {
        s.tl?.kill();
        s.tl = null;
      },
    };
    registrar(demo);
    return () => {
      demo.stop();
      registrar(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function elegir(idx: number) {
    tomarControl();
    setProporcion(idx);
    const m = medida(PROPORCIONES[idx].ratio);
    gsap.to(est.current.st, { w: m.w, h: m.h, x: m.x, y: m.y, duration: 0.5, ease: "power3.out", onUpdate: pintar });
  }

  function descargar() {
    tomarControl();
    const fuente = canvasRef.current;
    if (!fuente) return;
    const st = est.current.st;
    const salida = document.createElement("canvas");
    salida.width = Math.round(st.w);
    salida.height = Math.round(st.h);
    salida.getContext("2d")?.drawImage(fuente, st.x, st.y, st.w, st.h, 0, 0, salida.width, salida.height);
    descargarLienzo(salida, "recorte.png");
  }

  function arrastrar(e: ReactPointerEvent<HTMLDivElement>) {
    const s = est.current;
    if (!s.arrastre || !marcoRef.current) return;
    const esc = marcoRef.current.getBoundingClientRect().width / W;
    s.st.x = Math.max(0, Math.min(W - s.st.w, s.arrastre.sx + (e.clientX - s.arrastre.x) / esc));
    s.st.y = Math.max(0, Math.min(H - s.st.h, s.arrastre.sy + (e.clientY - s.arrastre.y) / esc));
    pintar();
  }

  return (
    <Instrumento
      id={dato.id}
      nombre={dato.nombre}
      acento={dato.acento}
      archivo="muestra.jpg"
      detalle={dim}
      acciones={
        <button type="button" className="studio-button studio-button-primary" onClick={descargar}>
          <IconoDescargar />
          <span>Descargar PNG</span>
        </button>
      }
      pasos={{ etiqueta: "Progreso del recorte", pasos: PASOS, estados: LISTOS }}
      carril={
        <MesaRail etiqueta="Herramientas de recorte">
          <MesaGrupo etiqueta="Modo">
            <MesaBoton pista="Recortar" pulsado={modo === "recortar"} onClick={() => { tomarControl(); setModo("recortar"); }}><IconoEncuadre /></MesaBoton>
            <MesaBoton pista="Marcar sujeto" pulsado={modo === "sujeto"} onClick={() => { tomarControl(); setModo("sujeto"); }}><IconoPincel /></MesaBoton>
          </MesaGrupo>
          <MesaSeparador />
          <MesaBoton pista="Mostrar cuadrícula" pulsado={cuadricula} onClick={() => { tomarControl(); setCuadricula((c) => !c); }}><IconoCuadricula /></MesaBoton>
          <MesaBoton pista="Girar 90°" onClick={() => { tomarControl(); setGiro((g) => (g + 90) % 360); }}><IconoGirar /></MesaBoton>
          <MesaBoton pista="Restablecer encuadre" onClick={() => { tomarControl(); setGiro(0); est.current.st = { x: (W - H) / 2, y: 0, w: H, h: H }; setProporcion(1); pintar(); }}><IconoRestablecer /></MesaBoton>
        </MesaRail>
      }
    >
      <MesaEscenario fondo="dark" pista={modo === "sujeto" ? "Pinta sobre el sujeto para encajar el marco" : "Arrastra para encuadrar · flechas para ajustar"} className="p-rec-escenario">
        <div ref={marcoRef} className="p-rec-marco">
          <canvas ref={canvasRef} width={W} height={H} aria-label="Imagen de muestra" />
          <div
            ref={cajaRef}
            className="p-rec-caja"
            data-cuadricula={cuadricula ? "true" : "false"}
            role="img"
            aria-label="Marco de recorte"
            onPointerDown={(e) => {
              tomarControl();
              est.current.arrastre = { x: e.clientX, y: e.clientY, sx: est.current.st.x, sy: est.current.st.y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={arrastrar}
            onPointerUp={() => { est.current.arrastre = null; }}
            onPointerCancel={() => { est.current.arrastre = null; }}
          />
        </div>
      </MesaEscenario>
      <div className="mesa-pie">
        <div className="mesa-chips" role="group" aria-label="Proporción">
          {PROPORCIONES.map((p, i) => (
            <button key={p.etiqueta} type="button" className="mesa-chip" aria-pressed={proporcion === i} onClick={() => elegir(i)}>{p.etiqueta}</button>
          ))}
        </div>
        <span className="mesa-pie-estado">Recorte listo</span>
      </div>
    </Instrumento>
  );
}
