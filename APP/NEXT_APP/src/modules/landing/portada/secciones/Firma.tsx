"use client";

import { useEffect, useRef } from "react";
import { useMotionActivity } from "@/modules/landing/motion/LandingMotionProvider";
import { usePortada } from "../PortadaMotion";
import "./firma.css";

/** El nombre que dibujan las partículas; el mismo texto queda en el DOM para quien no ve el lienzo. */
const TEXTO = "nicoholas.dev";
const ANCHO_MAX = 880;
/** Color de reposo, acento y destello bajo el puntero. */
const BASE = "#cbd5e1";
const ACENTO = "#5eead4";
const CERCA = "#7dd3fc";

/**
 * Firma de cierre: el nombre está hecho de partículas con física real. Vuelan a su
 * sitio al llegar a la sección, el puntero (o el dedo) las repele y un clic las
 * dispersa; un muelle amortiguado las devuelve a su letra.
 *
 * Coste: el bucle solo corre con la sección a la vista y con los efectos
 * permitidos, y se duerme solo cuando todo está quieto, así que en reposo no
 * consume nada. En nivel medio hay menos partículas, sin líneas de constelación
 * y con menos densidad de píxel.
 */
export function Firma() {
  const { nivel } = usePortada();
  const { ref, active } = useMotionActivity<HTMLElement>();
  const cajaRef = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  /** Tras la primera entrada las partículas ya no vuelven a volar desde fuera. */
  const yaEntro = useRef(false);

  useEffect(() => {
    const seccion = ref.current;
    const caja = cajaRef.current;
    const lienzo = lienzoRef.current;
    if (!seccion || !caja || !lienzo) return;
    if (!active || nivel === "estatico") {
      seccion.dataset.estado = "pausado";
      return;
    }
    const ctx = lienzo.getContext("2d");
    if (!ctx) {
      seccion.dataset.estado = "sin-lienzo";
      return;
    }

    const medio = nivel === "medio";
    let vivo = true;
    let cuadro: number | null = null;
    let ancho = 0;
    let alto = 0;
    let total = 0;
    // Posición, destino (la letra), velocidad y radio de cada partícula.
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let radio = new Float32Array(0);
    let radioBase = new Float32Array(0);
    let acento = new Uint8Array(0);
    let avance = yaEntro.current ? 1 : 0;
    let quietud = 0;
    let desvioPublicado = -1;
    let estadoPublicado = "";
    /** Escribe en el DOM solo si el valor cambia: un atributo por cuadro invalida estilo sin motivo. */
    const anunciar = (estado: string) => {
      if (estado === estadoPublicado) return;
      estadoPublicado = estado;
      seccion.dataset.estado = estado;
      seccion.dataset.motionActive = estado === "entrando" || estado === "activo" ? "true" : "false";
    };
    const puntero = { x: -9999, y: -9999, activo: false, radio: medio ? 88 : 110 };

    const familia =
      getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() ||
      "ui-monospace, monospace";

    /** Dibuja el texto fuera de pantalla y convierte sus píxeles en partículas. */
    const muestrear = () => {
      const anchoNuevo = Math.max(260, Math.min(ANCHO_MAX, Math.floor(caja.clientWidth)));
      const altoNuevo = anchoNuevo < 520 ? 130 : 190;
      const dpr = Math.min(window.devicePixelRatio || 1, medio ? 1.5 : 2);
      ancho = anchoNuevo;
      alto = altoNuevo;
      lienzo.style.width = `${ancho}px`;
      lienzo.style.height = `${alto}px`;
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fuera = document.createElement("canvas");
      fuera.width = ancho;
      fuera.height = alto;
      const fctx = fuera.getContext("2d", { willReadFrequently: true });
      if (!fctx) return false;
      const cuerpo = Math.floor(Math.min(72, ancho / 11));
      fctx.fillStyle = "#ffffff";
      fctx.font = `700 ${cuerpo}px ${familia}`;
      fctx.textAlign = "center";
      fctx.textBaseline = "middle";
      fctx.fillText(TEXTO, ancho / 2, alto / 2);
      const pixeles = fctx.getImageData(0, 0, ancho, alto).data;

      // Densidad ligada al cuerpo de letra: en pantallas pequeñas el nombre es más pequeño
      // y necesita un paso más fino para seguir leyéndose.
      const paso = Math.max(2, Math.round(cuerpo / (medio ? 20 : 24)));
      const dx: number[] = [];
      const dy: number[] = [];
      const marcas: number[] = [];
      for (let fy = 0; fy < alto; fy += paso) {
        for (let fx = 0; fx < ancho; fx += paso) {
          if (pixeles[(fy * ancho + fx) * 4 + 3] > 120) {
            dx.push(fx);
            dy.push(fy);
            marcas.push(Math.random() > 0.82 ? 1 : 0);
          }
        }
      }
      total = dx.length;
      px = new Float32Array(total);
      py = new Float32Array(total);
      hx = Float32Array.from(dx);
      hy = Float32Array.from(dy);
      vx = new Float32Array(total);
      vy = new Float32Array(total);
      radio = new Float32Array(total);
      radioBase = new Float32Array(total);
      acento = Uint8Array.from(marcas);
      for (let i = 0; i < total; i++) {
        const r = acento[i] ? 2 : 1.3;
        radio[i] = r;
        radioBase[i] = r;
        if (avance >= 1) {
          px[i] = hx[i];
          py[i] = hy[i];
        } else {
          const angulo = Math.random() * Math.PI * 2;
          const lejos = Math.random() * 260 + 60;
          px[i] = hx[i] + Math.cos(angulo) * lejos;
          py[i] = hy[i] + Math.sin(angulo) * lejos;
        }
      }
      lienzo.dataset.particulas = String(total);
      seccion.dataset.listo = "true";
      return total > 0;
    };

    const despertar = () => {
      quietud = 0;
      if (vivo && cuadro === null) cuadro = requestAnimationFrame(pintar);
    };

    const pintar = () => {
      cuadro = null;
      if (!vivo || total === 0) return;
      if (avance < 1) avance = Math.min(1, avance + 0.025);

      ctx.clearRect(0, 0, ancho, alto);

      // Líneas de constelación entre partículas vecinas ya asentadas.
      if (!medio && avance > 0.7) {
        ctx.strokeStyle = "rgba(94, 234, 212, 0.09)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < total; i += 7) {
          for (let j = i + 1; j < Math.min(total, i + 9); j++) {
            const ex = px[i] - px[j];
            const ey = py[i] - py[j];
            if (ex * ex + ey * ey < 360) {
              ctx.moveTo(px[i], py[i]);
              ctx.lineTo(px[j], py[j]);
            }
          }
        }
        ctx.stroke();
      }

      const repelRadio = puntero.radio;
      const repelRadio2 = repelRadio * repelRadio;
      let masRapido = 0;
      let suma = 0;
      // Tres trazos por cuadro (reposo, acento y destello) en vez de uno por partícula.
      const camino = [new Path2D(), new Path2D(), new Path2D()];

      for (let i = 0; i < total; i++) {
        let toque = 0;
        if (puntero.activo) {
          const ex = px[i] - puntero.x;
          const ey = py[i] - puntero.y;
          const dist2 = ex * ex + ey * ey;
          if (dist2 < repelRadio2 && dist2 > 0) {
            const dist = Math.sqrt(dist2);
            // Impulso fuerte cerca del puntero que se apaga suavemente en el borde.
            const factor = (1 - dist / repelRadio) ** 2;
            vx[i] += (ex / dist) * factor * 16;
            vy[i] += (ey / dist) * factor * 16;
            radio[i] = radioBase[i] * (1 + factor * 2.2);
            toque = 1;
          }
        }
        if (!toque) radio[i] += (radioBase[i] - radio[i]) * 0.1;

        // Muelle hacia la letra y rozamiento: vuelven sin oscilar.
        const muelle = 0.08 * avance;
        vx[i] += (hx[i] - px[i]) * muelle;
        vy[i] += (hy[i] - py[i]) * muelle;
        vx[i] *= 0.84;
        vy[i] *= 0.84;
        px[i] += vx[i];
        py[i] += vy[i];

        const velocidad = Math.abs(vx[i]) + Math.abs(vy[i]);
        if (velocidad > masRapido) masRapido = velocidad;
        suma += Math.abs(px[i] - hx[i]) + Math.abs(py[i] - hy[i]);

        const trazo = toque ? camino[2] : acento[i] ? camino[1] : camino[0];
        trazo.moveTo(px[i] + radio[i], py[i]);
        trazo.arc(px[i], py[i], radio[i], 0, Math.PI * 2);
      }

      ctx.globalAlpha = avance < 0.8 ? 0.55 + avance * 0.45 : 1;
      ctx.fillStyle = BASE;
      ctx.fill(camino[0]);
      ctx.fillStyle = ACENTO;
      ctx.fill(camino[1]);
      ctx.fillStyle = CERCA;
      ctx.fill(camino[2]);
      ctx.globalAlpha = 1;

      // Anillo tenue que marca el radio de influencia mientras el puntero está encima.
      if (puntero.activo) {
        ctx.strokeStyle = "rgba(125, 211, 252, 0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(puntero.x, puntero.y, repelRadio, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Cuánto se ha alejado la firma de su letra, de media: 0 en reposo, unos
      // pocos píxeles con el puntero encima y decenas tras una detonación.
      const desvio = Math.round(suma / total);
      if (desvio !== desvioPublicado) {
        desvioPublicado = desvio;
        seccion.dataset.desvio = String(desvio);
      }

      // Con todo quieto y sin puntero el bucle se apaga hasta la próxima interacción.
      if (avance >= 1 && !puntero.activo && masRapido < 0.05) quietud++;
      else quietud = 0;
      if (quietud > 12) {
        anunciar("reposo");
        return;
      }
      anunciar(avance < 1 ? "entrando" : "activo");
      cuadro = requestAnimationFrame(pintar);
    };

    const situar = (e: PointerEvent) => {
      const caja2 = lienzo.getBoundingClientRect();
      puntero.x = e.clientX - caja2.left;
      puntero.y = e.clientY - caja2.top;
      puntero.activo = true;
      despertar();
    };
    const salir = () => {
      puntero.activo = false;
      puntero.x = -9999;
      puntero.y = -9999;
      despertar();
    };
    /** Un clic (o un toque) lanza las partículas desde el punto pulsado. */
    /**
     * Con el dedo, la detonación espera a levantarlo y solo si no hubo viaje ni scroll:
     * apoyarse sobre el nombre para desplazar la página no debe dispersarlo.
     */
    let toque: { x: number; y: number; t: number; scroll: number } | null = null;
    const apoyar = (e: PointerEvent) => {
      if (e.pointerType !== "touch") {
        detonar(e);
        return;
      }
      toque = { x: e.clientX, y: e.clientY, t: performance.now(), scroll: window.scrollY };
    };
    const levantar = (e: PointerEvent) => {
      const t0 = toque;
      toque = null;
      if (!t0 || e.type !== "pointerup") return;
      const viaje = Math.hypot(e.clientX - t0.x, e.clientY - t0.y);
      if (viaje < 12 && Math.abs(window.scrollY - t0.scroll) < 4 && performance.now() - t0.t < 600) detonar(e);
    };

    const detonar = (e: PointerEvent) => {
      const caja2 = lienzo.getBoundingClientRect();
      const cx = e.clientX - caja2.left;
      const cy = e.clientY - caja2.top;
      for (let i = 0; i < total; i++) {
        const ex = px[i] - cx;
        const ey = py[i] - cy;
        const dist = Math.hypot(ex, ey) || 1;
        const fuerza = Math.max(10, 42 - dist * 0.14);
        vx[i] += (ex / dist) * fuerza + (Math.random() - 0.5) * 8;
        vy[i] += (ey / dist) * fuerza + (Math.random() - 0.5) * 8;
      }
      despertar();
    };

    lienzo.addEventListener("pointermove", situar, { passive: true });
    lienzo.addEventListener("pointerenter", situar, { passive: true });
    lienzo.addEventListener("pointerleave", salir, { passive: true });
    lienzo.addEventListener("pointercancel", salir, { passive: true });
    lienzo.addEventListener("pointerdown", apoyar, { passive: true });
    lienzo.addEventListener("pointerup", levantar, { passive: true });
    lienzo.addEventListener("pointercancel", levantar, { passive: true });

    let anchoPrevio = 0;
    const observador = new ResizeObserver(() => {
      if (!vivo || Math.abs(caja.clientWidth - anchoPrevio) < 8) return;
      anchoPrevio = caja.clientWidth;
      if (muestrear()) despertar();
    });

    const arrancar = async () => {
      try {
        // Sin la fuente cargada, el muestreo tomaría la forma de la tipografía de respaldo.
        await document.fonts.load(`700 72px ${familia}`, TEXTO);
      } catch {
        /* con la de respaldo la firma sigue siendo legible */
      }
      if (!vivo) return;
      anchoPrevio = caja.clientWidth;
      if (!muestrear()) return;
      yaEntro.current = true;
      observador.observe(caja);
      despertar();
    };
    void arrancar();

    return () => {
      vivo = false;
      if (cuadro !== null) cancelAnimationFrame(cuadro);
      observador.disconnect();
      lienzo.removeEventListener("pointermove", situar);
      lienzo.removeEventListener("pointerenter", situar);
      lienzo.removeEventListener("pointerleave", salir);
      lienzo.removeEventListener("pointercancel", salir);
      lienzo.removeEventListener("pointerdown", apoyar);
      lienzo.removeEventListener("pointerup", levantar);
      lienzo.removeEventListener("pointercancel", levantar);
      lienzo.width = 1;
      lienzo.height = 1;
      delete lienzo.dataset.particulas;
      seccion.dataset.listo = "false";
      anunciar("pausado");
      delete seccion.dataset.desvio;
    };
  }, [active, nivel, ref]);

  return (
    <section
      ref={ref}
      id="closing-signature"
      className="p-firma"
      data-listo="false"
      data-estado="pausado"
      aria-label="Firma del sitio"
    >
      <div ref={cajaRef} className="p-firma-caja">
        <p className="p-firma-txt">{TEXTO}</p>
        <canvas ref={lienzoRef} className="p-firma-lienzo" aria-hidden="true" />
      </div>
    </section>
  );
}
