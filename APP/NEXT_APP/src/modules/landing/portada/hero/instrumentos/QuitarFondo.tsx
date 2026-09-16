"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { MesaEscenario } from "@/components/tools/mesa/MesaEscenario";
import { MesaBoton, MesaGrupo, MesaRail, MesaSeparador } from "@/components/tools/mesa/MesaRail";
import type { EstadoPaso } from "@/components/tools/mesa/MesaPasos";
import { IconoCapas, IconoDescargar, IconoDeshacer, IconoGoma, IconoImagen, IconoOjo, IconoPincel, IconoRestablecer, IconoSubir, IconoVarita } from "@/components/tools/mesa/MesaIcons";
import { instrumentoPorId } from "../../datos/instrumentos";
import { Instrumento } from "./Instrumento";
import { descargarLienzo, type InstrumentoProps } from "./tipos";

const W = 480;
const H = 360;
const PASOS = [
  { id: "subir", etiqueta: "Subir", icono: <IconoSubir /> },
  { id: "ia", etiqueta: "Recorte con IA", icono: <IconoVarita /> },
  { id: "listo", etiqueta: "Listo", icono: <IconoDescargar /> },
];
const LISTOS: EstadoPaso[] = ["listo", "listo", "listo"];
const PISTA_BORRAR = "Pinta para borrar restos";
const PISTA_RESTAURAR = "Pinta para restaurar · el fantasma muestra lo borrado";

type Modo = "erase" | "restore";

function sujeto(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(208, 290);
  c.bezierCurveTo(170, 240, 170, 168, 224, 132);
  c.lineTo(224, 88);
  c.lineTo(256, 88);
  c.lineTo(256, 132);
  c.bezierCurveTo(310, 168, 310, 240, 272, 290);
  c.closePath();
}

/** Quitar fondo: sube, la IA recorta, el pincel borra los restos y la descarga queda lista. Si tocas, tomas el control. */
export function QuitarFondo({ registrar }: InstrumentoProps) {
  const router = useRouter();
  const dato = instrumentoPorId("quitar-fondo");
  const lienzoRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const fantasmaRef = useRef<HTMLDivElement>(null);

  const [estados, setEstados] = useState<EstadoPaso[]>(LISTOS);
  const [progreso, setProgreso] = useState<number | undefined>(undefined);
  const [pista, setPista] = useState(PISTA_BORRAR);
  const [cambios, setCambios] = useState(0);
  const [modo, setModo] = useState<Modo>("erase");
  const [comparando, setComparando] = useState(false);
  const [verMascara, setVerMascara] = useState(false);
  const [listo, setListo] = useState(false);

  // La verdad del lienzo vive en refs: el dibujo es imperativo y no debe esperar a un render.
  const est = useRef({
    base: null as HTMLCanvasElement | null,
    mask: null as HTMLCanvasElement | null,
    inicial: null as ImageData | null,
    lleno: null as ImageData | null,
    hist: [] as ImageData[],
    modo: "erase" as Modo,
    comparando: false,
    verMascara: false,
    pintando: false,
    ultimo: null as { x: number; y: number } | null,
    manual: false,
    tl: null as gsap.core.Timeline | null,
    temporal: null as HTMLCanvasElement | null,
    ultimoAvance: -1,
  });

  function componer() {
    const s = est.current;
    const view = viewRef.current;
    if (!view || !s.base || !s.mask) return;
    const v = view.getContext("2d");
    if (!v) return;
    v.globalCompositeOperation = "source-over";
    v.clearRect(0, 0, W, H);
    if (s.comparando) {
      v.drawImage(s.base, 0, 0);
      return;
    }
    if (s.verMascara) {
      v.fillStyle = "#080e17";
      v.fillRect(0, 0, W, H);
      v.drawImage(s.mask, 0, 0);
      return;
    }
    if (s.modo === "restore") {
      v.globalAlpha = 0.22;
      v.drawImage(s.base, 0, 0);
      v.globalAlpha = 1;
    }
    if (!s.temporal) {
      s.temporal = document.createElement("canvas");
      s.temporal.width = W;
      s.temporal.height = H;
    }
    const t = s.temporal;
    const tc = t.getContext("2d");
    if (!tc) return;
    tc.globalCompositeOperation = "source-over";
    tc.clearRect(0, 0, W, H);
    tc.drawImage(s.base, 0, 0);
    tc.globalCompositeOperation = "destination-in";
    tc.drawImage(s.mask, 0, 0);
    v.drawImage(t, 0, 0);
  }

  function trazo(a: { x: number; y: number } | null, p: { x: number; y: number }, radio = 18) {
    const s = est.current;
    const m = s.mask?.getContext("2d");
    if (!m) return;
    m.globalCompositeOperation = s.modo === "erase" ? "destination-out" : "source-over";
    m.strokeStyle = m.fillStyle = "#fff";
    m.lineCap = "round";
    m.lineWidth = radio * 2;
    if (a) {
      m.beginPath();
      m.moveTo(a.x, a.y);
      m.lineTo(p.x, p.y);
      m.stroke();
    }
    m.beginPath();
    m.arc(p.x, p.y, radio, 0, 7);
    m.fill();
    m.globalCompositeOperation = "source-over";
    componer();
  }

  function actualizarHistorial() {
    const n = est.current.hist.length - 1;
    setCambios(n);
  }

  function cambiarModo(mo: Modo) {
    est.current.modo = mo;
    setModo(mo);
    setPista(mo === "erase" ? PISTA_BORRAR : PISTA_RESTAURAR);
    componer();
  }

  function tomarControl() {
    const s = est.current;
    if (s.manual) return;
    s.manual = true;
    s.tl?.kill();
    s.tl = null;
    if (fantasmaRef.current) fantasmaRef.current.style.display = "none";
    setEstados(LISTOS);
    setProgreso(undefined);
    const m = s.mask?.getContext("2d");
    if (m && s.hist.length) m.putImageData(s.hist[s.hist.length - 1], 0, 0);
    componer();
  }

  function posicion(e: ReactPointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }

  function terminarTrazo() {
    const s = est.current;
    if (!s.pintando) return;
    s.pintando = false;
    const m = s.mask?.getContext("2d");
    if (m) s.hist.push(m.getImageData(0, 0, W, H));
    if (s.hist.length > 30) s.hist.shift();
    actualizarHistorial();
  }

  useEffect(() => {
    const s = est.current;
    const base = document.createElement("canvas");
    const mask = document.createElement("canvas");
    base.width = mask.width = W;
    base.height = mask.height = H;
    const b = base.getContext("2d");
    const m = mask.getContext("2d");
    if (!b || !m) return;
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e9eef5");
    g.addColorStop(1, "#c9d3e0");
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
    b.fillStyle = "rgba(0,0,0,.18)";
    b.beginPath();
    b.ellipse(250, 300, 105, 16, 0, 0, 7);
    b.fill();
    sujeto(b);
    b.fillStyle = "#1f2937";
    b.fill();
    b.fillStyle = "#c2410c";
    b.fillRect(216, 72, 48, 16);
    b.fillStyle = "#f8fafc";
    b.fillRect(224, 188, 32, 36);
    b.fillStyle = "#5b6b7c";
    b.beginPath();
    b.ellipse(380, 250, 40, 22, 0.4, 0, 7);
    b.fill();
    m.fillStyle = "#fff";
    sujeto(m);
    m.fill();
    m.beginPath();
    m.ellipse(380, 250, 40, 22, 0.4, 0, 7);
    m.fill();
    m.fillRect(216, 72, 48, 16);
    m.beginPath();
    m.ellipse(250, 300, 105, 16, 0, 0, 7);
    m.fill();
    s.base = base;
    s.mask = mask;
    s.inicial = m.getImageData(0, 0, W, H);
    s.hist = [s.inicial];
    const todo = document.createElement("canvas");
    todo.width = W;
    todo.height = H;
    const tc0 = todo.getContext("2d");
    if (tc0) {
      tc0.fillStyle = "#fff";
      tc0.fillRect(0, 0, W, H);
      s.lleno = tc0.getImageData(0, 0, W, H);
    }
    componer();

    const ruta = (t: number, a: { x: number; y: number }, c: { x: number; y: number }) => ({ x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t });
    const mover = (p: { x: number; y: number }) => {
      const lienzo = lienzoRef.current;
      const view = viewRef.current;
      const f = fantasmaRef.current;
      if (!lienzo || !view || !f) return;
      const r = lienzo.getBoundingClientRect();
      const rv = view.getBoundingClientRect();
      f.style.display = "block";
      f.style.left = `${rv.left - r.left + (p.x / W) * rv.width}px`;
      f.style.top = `${rv.top - r.top + (p.y / H) * rv.height}px`;
    };
    const pasos = (e: EstadoPaso[], avance?: number) => {
      setEstados(e);
      // el anillo de progreso se actualiza en 20 pasos: bastan para verlo avanzar y evitan un render por frame
      const paso = avance === undefined ? -1 : Math.round(avance * 20) / 20;
      if (paso !== s.ultimoAvance) {
        s.ultimoAvance = paso;
        setProgreso(avance === undefined ? undefined : paso);
      }
    };

    const demo = {
      start() {
        s.tl?.kill();
        s.manual = false;
        s.comparando = false;
        s.verMascara = false;
        setComparando(false);
        setVerMascara(false);
        cambiarModo("erase");
        s.hist = s.inicial ? [s.inicial] : [];
        actualizarHistorial();
        setListo(false);
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 });
        const av = { v: 0 };
        let prev: { x: number; y: number } | null = null;
        const t1 = { t: 0 };
        const t2 = { t: 0 };
        tl.call(() => {
          if (s.lleno) m.putImageData(s.lleno, 0, 0);
          componer();
          pasos(["activo", "pendiente", "pendiente"]);
          setPista("Subiendo producto.png");
          if (fantasmaRef.current) fantasmaRef.current.style.display = "none";
        })
          .to({}, { duration: 0.7 })
          .call(() => {
            av.v = 0;
            pasos(["listo", "activo", "pendiente"], 0);
            setPista("Detectando el sujeto");
          })
          .to(av, { v: 1, duration: 1.5, ease: "power2.inOut", onUpdate: () => pasos(["listo", "activo", "pendiente"], av.v) })
          .call(() => {
            if (s.inicial) m.putImageData(s.inicial, 0, 0);
            componer();
            pasos(["listo", "listo", "activo"]);
            setPista(PISTA_BORRAR);
          })
          .to({}, { duration: 0.6 })
          .set(t1, { t: 0 })
          .to(t1, {
            t: 1,
            duration: 1.1,
            ease: "power1.inOut",
            onStart: () => { prev = null; },
            onUpdate: () => {
              const p = ruta(t1.t, { x: 340, y: 236 }, { x: 424, y: 268 });
              mover(p);
              trazo(prev, p, 24);
              prev = p;
            },
          })
          .to({}, { duration: 0.35 })
          .set(t2, { t: 0 })
          .to(t2, {
            t: 1,
            duration: 1.3,
            ease: "power1.inOut",
            onStart: () => { prev = null; },
            onUpdate: () => {
              const p = ruta(t2.t, { x: 140, y: 302 }, { x: 362, y: 302 });
              mover(p);
              trazo(prev, p, 20);
              prev = p;
            },
          })
          .call(() => {
            if (fantasmaRef.current) fantasmaRef.current.style.display = "none";
            const ahora = m.getImageData(0, 0, W, H);
            s.hist = s.inicial ? [s.inicial, ahora, ahora] : [ahora];
            actualizarHistorial();
            pasos(LISTOS);
            setPista("Recorte retocado");
          })
          .to({}, { duration: 0.5 })
          .call(() => {
            setListo(true);
            setPista("Descarga lista · PNG a resolución original");
          })
          .to({}, { duration: 1.6 });
        s.tl = tl;
      },
      stop() {
        s.tl?.kill();
        s.tl = null;
        if (fantasmaRef.current) fantasmaRef.current.style.display = "none";
      },
    };
    registrar(demo);
    return () => {
      demo.stop();
      registrar(null);
    };
    // El montaje del lienzo y el registro de la demo ocurren una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pistaVisible = comparando ? "Original" : verMascara ? "Máscara · pinta para editarla" : pista;

  return (
    <Instrumento
      id={dato.id}
      nombre={dato.nombre}
      acento={dato.acento}
      archivo="producto.png"
      detalle="1200 × 900 px · 0.8 MB"
      acciones={
        <>
          <button
            type="button"
            className="studio-button studio-button-primary"
            onClick={() => {
              tomarControl();
              if (viewRef.current) descargarLienzo(viewRef.current, "producto-sin-fondo.png");
            }}
          >
            <IconoDescargar listo={listo} />
            <span>Descargar PNG</span>
          </button>
          <button type="button" className="studio-icon-button" aria-label="Elegir otra imagen" onClick={() => router.push(dato.ruta)}>
            <IconoImagen />
          </button>
        </>
      }
      pasos={{ etiqueta: "Progreso del recorte", pasos: PASOS, estados, progreso }}
      carril={
        <MesaRail etiqueta="Herramientas de retoque">
          <MesaGrupo etiqueta="Modo del pincel">
            <MesaBoton pista="Borrar" atajo="E" tono="borrar" pulsado={modo === "erase"} onClick={() => { tomarControl(); cambiarModo("erase"); }}>
              <IconoGoma />
            </MesaBoton>
            <MesaBoton pista="Restaurar" atajo="R" tono="restaurar" pulsado={modo === "restore"} onClick={() => { tomarControl(); cambiarModo("restore"); }}>
              <IconoPincel />
            </MesaBoton>
          </MesaGrupo>
          <MesaSeparador />
          <MesaBoton
            pista="Deshacer pincelada"
            atajo="Ctrl+Z"
            disabled={cambios === 0}
            onClick={() => {
              tomarControl();
              const s = est.current;
              if (s.hist.length < 2) return;
              s.hist.pop();
              s.mask?.getContext("2d")?.putImageData(s.hist[s.hist.length - 1], 0, 0);
              componer();
              actualizarHistorial();
            }}
          >
            <IconoDeshacer />
          </MesaBoton>
          <MesaBoton
            pista="Volver al recorte inicial"
            onClick={() => {
              tomarControl();
              const s = est.current;
              if (!s.inicial) return;
              s.mask?.getContext("2d")?.putImageData(s.inicial, 0, 0);
              s.hist = [s.inicial];
              componer();
              actualizarHistorial();
            }}
          >
            <IconoRestablecer />
          </MesaBoton>
          <MesaSeparador />
          <MesaBoton
            pista="Comparar con el original"
            atajo="C"
            pulsado={comparando}
            onMantener={(activo) => {
              tomarControl();
              est.current.comparando = activo;
              setComparando(activo);
              componer();
            }}
          >
            <IconoOjo />
          </MesaBoton>
          <MesaBoton
            pista="Ver máscara"
            atajo="M"
            pulsado={verMascara}
            onClick={() => {
              tomarControl();
              const siguiente = !est.current.verMascara;
              est.current.verMascara = siguiente;
              setVerMascara(siguiente);
              componer();
            }}
          >
            <IconoCapas />
          </MesaBoton>
        </MesaRail>
      }
    >
      <MesaEscenario fondo="transparent" pista={pistaVisible} cambios={cambios} className="p-qf-escenario">
        <div ref={lienzoRef} className="mesa-lienzo p-qf-lienzo">
          <canvas
            ref={viewRef}
            width={W}
            height={H}
            aria-label="Resultado editable"
            onPointerDown={(e) => {
              if (est.current.comparando) return;
              tomarControl();
              est.current.pintando = true;
              const p = posicion(e);
              est.current.ultimo = p;
              trazo(null, p);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const s = est.current;
              const cur = cursorRef.current;
              const lienzo = lienzoRef.current;
              if (cur && lienzo) {
                const r = lienzo.getBoundingClientRect();
                cur.style.display = s.comparando || !s.manual ? "none" : "block";
                cur.style.left = `${e.clientX - r.left}px`;
                cur.style.top = `${e.clientY - r.top}px`;
              }
              if (!s.pintando) return;
              const p = posicion(e);
              trazo(s.ultimo, p);
              s.ultimo = p;
            }}
            onPointerUp={terminarTrazo}
            onPointerCancel={terminarTrazo}
            onPointerLeave={() => {
              if (cursorRef.current) cursorRef.current.style.display = "none";
              terminarTrazo();
            }}
          />
          <div ref={cursorRef} className="mesa-cursor" data-modo={modo} style={{ display: "none", width: 32, height: 32 }} aria-hidden="true" />
          <div ref={fantasmaRef} className="mesa-cursor p-fantasma" data-modo={modo} style={{ display: "none", width: 34, height: 34 }} aria-hidden="true" />
        </div>
      </MesaEscenario>
    </Instrumento>
  );
}
