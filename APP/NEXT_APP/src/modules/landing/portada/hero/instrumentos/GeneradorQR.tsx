"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import { gsap } from "gsap";
import { Link2, Palette, Check } from "lucide-react";
import { instrumentos } from "../../datos/instrumentos";
import { Instrumento } from "./Instrumento";
import type { InstrumentoProps } from "./tipos";

const TEXTO_DEMO = "https://nicoholas.dev";
const TIPOS = ["URL", "WhatsApp", "WiFi", "Realidad aumentada", "Más tipos ▾"];
const ESTILOS = [
  { nombre: "Esencial", tinta: "#0b1017", fondo: "#ffffff" },
  { nombre: "Botánico", tinta: "#14532d", fondo: "#ecfdf5" },
  { nombre: "Editorial", tinta: "#312e81", fondo: "#eef2ff" },
  { nombre: "Terracota", tinta: "#9a3412", fondo: "#fff7ed" },
];

interface Modulos { n: number; oscuros: boolean[] }

function calcular(texto: string): Modulos | null {
  try {
    const q = QRCode.create(texto || " ", { errorCorrectionLevel: "M" });
    const n = q.modules.size;
    const oscuros: boolean[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) oscuros.push(Boolean(q.modules.get(r, c)));
    return { n, oscuros };
  } catch {
    return null;
  }
}

function esFinder(r: number, c: number, n: number) {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

/** Generador de QR: el texto se teclea solo, los módulos brotan desde el centro y recorre los estilos. */
export function GeneradorQR({ registrar }: InstrumentoProps) {
  const dato = instrumentos[1];
  const [texto, setTexto] = useState(TEXTO_DEMO);
  const [tipo, setTipo] = useState(0);
  const [estilo, setEstilo] = useState(0);
  const [animar, setAnimar] = useState(false);
  const [version, setVersion] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const est = useRef({ manual: false, tl: null as gsap.core.Timeline | null });

  const modulos = useMemo(() => calcular(texto), [texto]);
  const { tinta, fondo } = ESTILOS[estilo];

  function tomarControl() {
    if (est.current.manual) return;
    est.current.manual = true;
    est.current.tl?.kill();
    est.current.tl = null;
  }

  useEffect(() => {
    const s = est.current;
    const demo = {
      start() {
        s.tl?.kill();
        s.manual = false;
        setEstilo(0);
        setAnimar(false);
        setTexto("");
        const k = { k: 0 };
        let i = 0;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
        tl.call(() => {
          i = 0;
          k.k = 0;
          setAnimar(false);
          setEstilo(0);
          setTexto("");
        })
          .to({}, { duration: 0.4 })
          .to(k, {
            k: TEXTO_DEMO.length,
            duration: 1.3,
            ease: "none",
            onUpdate: () => {
              const n = Math.round(k.k);
              if (n !== i) {
                i = n;
                setTexto(TEXTO_DEMO.slice(0, i));
              }
            },
          })
          .call(() => { setAnimar(true); setVersion((v) => v + 1); })
          .to({}, { duration: 1.6 })
          .call(() => { setEstilo(1); setVersion((v) => v + 1); })
          .to({}, { duration: 1.2 })
          .call(() => { setEstilo(2); setVersion((v) => v + 1); })
          .to({}, { duration: 1.2 })
          .call(() => { setEstilo(3); setVersion((v) => v + 1); })
          .to({}, { duration: 1.2 })
          .call(() => { setEstilo(0); setVersion((v) => v + 1); })
          .to({}, { duration: 0.8 });
        s.tl = tl;
      },
      stop() {
        s.tl?.kill();
        s.tl = null;
        setTexto(TEXTO_DEMO);
        setAnimar(false);
      },
    };
    registrar(demo);
    return () => {
      demo.stop();
      registrar(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function descargarPng() {
    tomarControl();
    if (!modulos) return;
    const escala = 8;
    const margen = 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = (modulos.n + margen * 2) * escala;
    const g = canvas.getContext("2d");
    if (!g) return;
    g.fillStyle = fondo;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = tinta;
    for (let r = 0; r < modulos.n; r++) for (let c = 0; c < modulos.n; c++) if (modulos.oscuros[r * modulos.n + c]) g.fillRect((c + margen) * escala, (r + margen) * escala, escala, escala);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "codigo-qr.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  function descargarSvg() {
    tomarControl();
    if (!svgRef.current) return;
    const fuente = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([fuente], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codigo-qr.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const n = modulos?.n ?? 0;
  const s = n ? 100 / (n + 4) : 0;
  const o = 2 * s;

  return (
    <Instrumento id={dato.id} nombre={dato.nombre} acento={dato.acento} sinMesa>
      <div className="p-qr-grid">
        <div className="p-qr-columna">
          <div className="p-qr-card">
            <div className="t"><Link2 aria-hidden="true" />Contenido</div>
            <div className="p-qr-tabs" role="group" aria-label="Contenido del código">
              {TIPOS.map((t, i) => (
                <button key={t} type="button" className="p-chip" aria-pressed={tipo === i} onClick={() => { tomarControl(); setTipo(i); }}>{t}</button>
              ))}
            </div>
            <label htmlFor="p-qr-texto">https://ejemplo.com</label>
            <input
              id="p-qr-texto"
              value={texto}
              spellCheck={false}
              aria-label="Contenido del QR"
              onPointerDown={tomarControl}
              onChange={(e) => { tomarControl(); setAnimar(false); setTexto(e.target.value); }}
            />
          </div>
          <div className="p-qr-card">
            <div className="t"><Palette aria-hidden="true" />Personalización</div>
            <div className="p-qr-estilos" role="group" aria-label="Estilos listos">
              {ESTILOS.map((e, i) => (
                <button
                  key={e.nombre}
                  type="button"
                  className="p-qr-estilo"
                  aria-pressed={estilo === i}
                  style={{ "--tinta": e.tinta, "--fondoqr": e.fondo } as CSSProperties}
                  onClick={() => { tomarControl(); setAnimar(true); setEstilo(i); setVersion((v) => v + 1); }}
                >
                  <i aria-hidden="true" />
                  {e.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-qr-preview">
          <b>Tu código QR</b>
          <small><Check aria-hidden="true" />Listo para descargar</small>
          <div className="p-qr-lienzo" style={{ "--fondoqr": fondo } as CSSProperties}>
            {modulos ? (
              <svg ref={svgRef} key={version} viewBox="0 0 100 100" shapeRendering="geometricPrecision" role="img" aria-label={`Código QR de ${texto || "texto vacío"}`}>
                {modulos.oscuros.map((oscuro, idx) => {
                  if (!oscuro) return null;
                  const r = Math.floor(idx / n);
                  const c = idx % n;
                  if (esFinder(r, c, n)) return null;
                  const d = Math.hypot(r - n / 2, c - n / 2) / (n / 2);
                  return (
                    <circle
                      key={idx}
                      cx={(o + c * s + s / 2).toFixed(2)}
                      cy={(o + r * s + s / 2).toFixed(2)}
                      r={(s * 0.42).toFixed(2)}
                      fill={tinta}
                      className="p-qr-modulo"
                      style={{ animationDelay: `${animar ? Math.round(d * 380) : 0}ms`, animationDuration: animar ? ".45s" : "0s" }}
                    />
                  );
                })}
                {[[0, 0], [0, n - 7], [n - 7, 0]].map(([pr, pc]) => {
                  const x = o + pc * s;
                  const y = o + pr * s;
                  const w = 7 * s;
                  return (
                    <g key={`${pr}-${pc}`}>
                      <rect x={x} y={y} width={w} height={w} rx={s * 2} fill={tinta} />
                      <rect x={x + s} y={y + s} width={5 * s} height={5 * s} rx={s * 1.4} fill={fondo} />
                      <rect x={x + 2 * s} y={y + 2 * s} width={3 * s} height={3 * s} rx={s * 0.9} fill={tinta} />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <p className="p-qr-error">Contenido demasiado largo</p>
            )}
          </div>
          <button type="button" className="studio-button studio-button-primary" onClick={descargarPng}>Descargar PNG</button>
          <button type="button" className="studio-button" onClick={descargarSvg}>SVG</button>
        </div>
      </div>
    </Instrumento>
  );
}
