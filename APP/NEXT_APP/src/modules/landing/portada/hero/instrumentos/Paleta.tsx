"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaBoton, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import type { EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { IconoCopiar, IconoDescargar, IconoGota, IconoImagen, IconoSubir } from "@/components/tools/mesa/MesaIcons";
import { instrumentoPorId } from "../../datos/instrumentos";
import { Instrumento } from "./Instrumento";
import { pintarMuestra, type InstrumentoProps } from "./tipos";

const W = 480;
const H = 270;
const PASOS = [
  { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
  { id: "extraer", etiqueta: "Extraer", icono: <IconoGota /> },
  { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];
const LISTOS: EstadoPaso[] = ["listo", "listo", "listo"];
const CANTIDADES = [4, 6, 8, 10];

function extraer(g: CanvasRenderingContext2D, cantidad: number): string[] {
  const d = g.getImageData(0, 0, W, H).data;
  const cubos: Record<string, { n: number; r: number; g: number; b: number }> = {};
  for (let i = 0; i < d.length; i += 16) {
    const k = `${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`;
    const e = cubos[k] || (cubos[k] = { n: 0, r: 0, g: 0, b: 0 });
    e.n++;
    e.r += d[i];
    e.g += d[i + 1];
    e.b += d[i + 2];
  }
  return Object.values(cubos)
    .sort((a, b) => b.n - a.n)
    .slice(0, cantidad)
    .map((e) => `#${[e.r, e.g, e.b].map((x) => Math.round(x / e.n).toString(16).padStart(2, "0")).join("")}`);
}

/** Extractor de paleta: los colores salen de la imagen uno a uno; pulsa uno para copiar su HEX. */
export function Paleta({ registrar }: InstrumentoProps) {
  const router = useRouter();
  const dato = instrumentoPorId("paleta");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const franjaRef = useRef<HTMLDivElement>(null);
  const [cantidad, setCantidad] = useState(6);
  const [colores, setColores] = useState<string[]>([]);
  const [seleccionado, setSeleccionado] = useState(0);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [estados, setEstados] = useState<EstadoPaso[]>(LISTOS);
  const [pista, setPista] = useState("Pulsa un color para ver sus valores");
  const est = useRef({ manual: false, tl: null as gsap.core.Timeline | null });

  function botones() {
    return franjaRef.current ? Array.from(franjaRef.current.querySelectorAll("button")) : [];
  }

  /** Al desmontar ya no queda ninguna franja: pedirle a GSAP que pinte una lista vacía solo suelta un aviso. */
  function restaurarFranja() {
    const b = botones();
    if (b.length) gsap.set(b, { scaleY: 1, opacity: 1 });
  }

  function tomarControl() {
    const s = est.current;
    if (s.manual) return;
    s.manual = true;
    s.tl?.kill();
    s.tl = null;
    restaurarFranja();
    setEstados(LISTOS);
    setPista("Pulsa un color para ver sus valores");
  }

  useEffect(() => {
    const g = canvasRef.current?.getContext("2d");
    if (!g) return;
    pintarMuestra(g, W, H, 70, 64);
    setColores(extraer(g, cantidad));
  }, [cantidad]);

  useEffect(() => {
    const s = est.current;
    const demo = {
      start() {
        s.tl?.kill();
        s.manual = false;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.2 });
        tl.call(() => {
          gsap.set(botones(), { scaleY: 0, opacity: 0 });
          setEstados(["listo", "activo", "pendiente"]);
          setPista("Extrayendo colores");
          setSeleccionado(0);
        })
          .to({}, { duration: 0.5 })
          .call(() => { gsap.to(botones(), { scaleY: 1, opacity: 1, duration: 0.5, stagger: 0.16, ease: "back.out(1.4)" }); })
          .to({}, { duration: 1.4 })
          .call(() => {
            setEstados(LISTOS);
            setPista("6 colores · pulsa uno para copiar su HEX");
          })
          .to({}, { duration: 0.9 })
          .call(() => setSeleccionado(3))
          .to({}, { duration: 0.9 })
          .call(() => setSeleccionado(1))
          .to({}, { duration: 0.9 });
        s.tl = tl;
      },
      stop() {
        s.tl?.kill();
        s.tl = null;
        restaurarFranja();
        setEstados(LISTOS);
      },
    };
    registrar(demo);
    return () => {
      demo.stop();
      registrar(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copiarCss() {
    tomarControl();
    const css = colores.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n");
    navigator.clipboard?.writeText(`:root {\n${css}\n}`).catch(() => {});
    setPista("Paleta CSS copiada");
  }

  return (
    <Instrumento
      id={dato.id}
      nombre={dato.nombre}
      acento={dato.acento}
      archivo="muestra.jpg"
      detalle={`${colores.length} colores`}
      acciones={
        <>
          <div className="mesa-chips" role="group" aria-label="Cantidad de colores">
            {CANTIDADES.map((n) => (
              <button key={n} type="button" className="mesa-chip" aria-pressed={cantidad === n} onClick={() => { tomarControl(); setCantidad(n); }}>{n}</button>
            ))}
          </div>
          <button type="button" className="studio-button studio-button-primary" onClick={copiarCss}>
            <IconoCopiar />
            <span>CSS</span>
          </button>
        </>
      }
      pasos={{ etiqueta: "Progreso de la paleta", pasos: PASOS, estados }}
      carril={
        <MesaRail etiqueta="Herramientas de la paleta">
          <MesaBoton pista="Copiar paleta CSS" onClick={copiarCss}><IconoCopiar /></MesaBoton>
          <MesaSeparador />
          <MesaBoton pista="Cambiar imagen" onClick={() => router.push(dato.ruta)}><IconoImagen /></MesaBoton>
        </MesaRail>
      }
    >
      <MesaEscenario fondo="dark" pista={pista} className="p-pal-escenario">
        <canvas ref={canvasRef} className="p-pal-img" width={W} height={H} aria-label="Imagen de muestra" />
      </MesaEscenario>
      <div ref={franjaRef} className="p-franja" role="group" aria-label="Colores extraídos" style={{ gridTemplateColumns: `repeat(${Math.max(colores.length, 1)}, 1fr)` }}>
        {colores.map((hex, i) => (
          <button
            key={hex + i}
            type="button"
            style={{ background: hex }}
            aria-pressed={seleccionado === i}
            aria-label={`Seleccionar ${hex}`}
            className={copiado === i ? "copiado" : undefined}
            onClick={() => {
              tomarControl();
              setSeleccionado(i);
              navigator.clipboard?.writeText(hex).catch(() => {});
              setCopiado(i);
              setTimeout(() => setCopiado(null), 800);
            }}
          >
            <span className="ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" /></svg></span>
            <span>{hex.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </Instrumento>
  );
}
