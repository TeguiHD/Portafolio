"use client";

import { useEffect, useRef } from "react";
import { usePortada } from "./PortadaMotion";

/** Tinte del fondo según la sección que cruza el centro de la pantalla. */
const TINTES: Record<string, string> = {
  hero: "#5eead4",
  "tools-belt": "#8bd5c3",
  vault: "#f59e0b",
  casos: "#f5b04a",
  tecnologias: "#a78bfa",
  architecture: "#fb7185",
  contact: "#f59e0b",
};

interface Particula {
  x: number;
  y: number;
  sy: number;
  r: number;
  prof: number;
  vx: number;
  vy: number;
  a: number;
  f: number;
}

interface Onda {
  x: number;
  y: number;
  r: number;
  a: number;
}

function hex(h: string) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mezcla(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Fondo vivo de la portada: partículas en tres profundidades que siguen al
 * ratón, reaccionan a los clics y al scroll, con uniones entre las cercanas y
 * dos auroras del color de la sección visible.
 *
 * Presupuesto: en nivel medio dibuja a 1× y 30 fps con un 60 % de partículas; la
 * aurora se pinta en un lienzo de 1/8 y se escala, porque dos degradados a
 * pantalla completa por frame eran el coste dominante en móvil.
 */
export function FondoVivo() {
  const { nivel, lenis, motor } = usePortada();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !motor || nivel === "estatico") return;
    const { gsap } = motor;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const presupuesto = nivel === "medio" ? 0.48 : 1;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let capas: Particula[][] = [];
    let ondas: Onda[] = [];
    const raton = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4 };
    /** Cualquier señal de que hay alguien delante saca al fondo del reposo. */
    let despertar = () => {};
    let vel = 0;
    let scrollActual = 0;
    const tinte = hex(TINTES.hero);
    let meta = hex(TINTES.hero);
    const aurora = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.4 };
    let calidad = 1;
    let tiempos: number[] = [];
    const auroraLienzo = document.createElement("canvas");
    const auroraCtx = auroraLienzo.getContext("2d");
    let AW = 1;
    let AH = 1;

    function poblar() {
      const n = Math.round(Math.min(260, (W * H) / 5600) * presupuesto * calidad);
      capas = [0.32, 0.62, 1].map((prof, li) =>
        Array.from({ length: Math.round(n * [0.42, 0.32, 0.26][li]) }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          sy: 0,
          r: 0.5 + prof * 1.5 + Math.random() * 0.7,
          prof,
          vx: (Math.random() - 0.5) * 0.14 * prof,
          vy: (Math.random() - 0.5) * 0.1 * prof,
          a: 0.18 + Math.random() * 0.5,
          f: Math.random() * 6.28,
        })),
      );
    }

    function tam() {
      dpr = presupuesto < 1 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      AW = Math.max(1, Math.round(W / 8));
      AH = Math.max(1, Math.round(H / 8));
      auroraLienzo.width = AW;
      auroraLienzo.height = AH;
      poblar();
    }

    tam();
    window.addEventListener("resize", tam, { passive: true });

    const mover = (e: PointerEvent) => {
      despertar();
      raton.x = e.clientX;
      raton.y = e.clientY;
    };
    const onda = (x: number, y: number) => {
      ondas.push({ x, y, r: 0, a: 1 });
      if (ondas.length > 6) ondas.shift();
    };
    /**
     * La onda responde a un toque, no a un dedo que se apoya para desplazar la página.
     * Con ratón sale al pulsar; con el dedo espera a levantarlo y solo si no hubo viaje
     * ni scroll entre medias, que es lo que distingue tocar de arrastrar. Antes salía en
     * cada `pointerdown` y en el móvil el fondo parecía responder a cada desplazamiento.
     */
    let toque: { x: number; y: number; t: number; scroll: number } | null = null;
    const pulsar = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (e.pointerType === "touch") {
        toque = { x: e.clientX, y: e.clientY, t: performance.now(), scroll: window.scrollY };
        return;
      }
      onda(e.clientX, e.clientY);
    };
    const soltarToque = (e: PointerEvent) => {
      const t0 = toque;
      toque = null;
      if (!t0 || e.type !== "pointerup") return;
      const viaje = Math.hypot(e.clientX - t0.x, e.clientY - t0.y);
      if (viaje < 12 && Math.abs(window.scrollY - t0.scroll) < 4 && performance.now() - t0.t < 600) {
        onda(e.clientX, e.clientY);
      }
    };
    /**
     * En una pantalla táctil el puntero solo existe mientras el dedo está apoyado, y
     * el navegador deja de mandarlo en cuanto decide que el gesto es un scroll. Este
     * escuchador va aparte y es pasivo: el fondo sigue al dedo también mientras se
     * desplaza la página, y nunca interrumpe el desplazamiento.
     */
    const dedo = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      despertar();
      raton.x = t.clientX;
      raton.y = t.clientY;
    };
    const soltar = () => {
      raton.x = -1e4;
      raton.y = -1e4;
    };

    window.addEventListener("pointermove", mover, { passive: true });
    window.addEventListener("touchmove", dedo, { passive: true });
    window.addEventListener("touchend", soltar, { passive: true });
    window.addEventListener("touchcancel", soltar, { passive: true });
    window.addEventListener("pointerdown", pulsar, { passive: true });
    window.addEventListener("pointerup", soltarToque, { passive: true });
    window.addEventListener("pointercancel", soltarToque, { passive: true });
    window.addEventListener("keydown", despertar, { passive: true });
    window.addEventListener("wheel", despertar, { passive: true });
    window.addEventListener("touchstart", despertar, { passive: true });

    const alScroll = (e: { velocity?: number; scroll?: number }) => {
      despertar();
      vel = e.velocity || 0;
      scrollActual = e.scroll || 0;
    };
    const scrollNativo = () => {
      despertar();
      vel = (window.scrollY - scrollActual) * 0.6;
      scrollActual = window.scrollY;
    };
    if (lenis) lenis.on("scroll", alScroll);
    else window.addEventListener("scroll", scrollNativo, { passive: true });

    // El tinte sigue a la sección que cruza el centro de la pantalla.
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((en) => {
          if (en.isIntersecting) meta = hex(TINTES[en.target.id] ?? TINTES.hero);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    Object.keys(TINTES).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observador.observe(el);
    });

    let acum = 0;
    const paso30 = presupuesto < 1;

    /**
     * Reposo por inactividad: sin puntero, scroll ni teclas durante unos segundos, el
     * fondo se queda quieto y deja de pintar. Quien está leyendo no lo nota y deja de
     * gastar batería.
     *
     * Durante la carga no hay nada que frenar: este bucle va en el ticker de GSAP, que
     * ahora no llega hasta la primera interacción (ver `PortadaMotion`), así que el
     * fondo no existe mientras se mide la página.
     */
    const ESPERA_REPOSO = 3500;
    let ultimaActividad = performance.now();
    let dormido = false;

    despertar = () => {
      ultimaActividad = performance.now();
      if (dormido) {
        dormido = false;
        canvas.dataset.reposo = "false";
      }
    };

    const frame = (_t: number, dtRaw: number) => {
      if (document.hidden) return;
      if (!dormido && performance.now() - ultimaActividad > ESPERA_REPOSO) {
        dormido = true;
        canvas.dataset.reposo = "true";
      }
      if (dormido) {
        acum = 0;
        return;
      }
      acum += dtRaw;
      if (paso30 && acum < 30) return;
      const dt = acum;
      acum = 0;
      const k = Math.min(dt / 16.67, 2.5);

      // Si el dispositivo no sostiene ~40 fps, baja la densidad un escalón (hasta la mitad).
      tiempos.push(paso30 ? dt / 2 : dt);
      if (tiempos.length >= 90) {
        const media = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        tiempos = [];
        if (media > 25 && calidad > 0.5) {
          calidad = Math.max(0.5, calidad - 0.2);
          poblar();
        }
      }

      tinte.r = mezcla(tinte.r, meta.r, 0.03 * k);
      tinte.g = mezcla(tinte.g, meta.g, 0.03 * k);
      tinte.b = mezcla(tinte.b, meta.b, 0.03 * k);
      raton.sx = mezcla(raton.sx < -1e3 ? raton.x : raton.sx, raton.x, 0.08 * k);
      raton.sy = mezcla(raton.sy < -1e3 ? raton.y : raton.sy, raton.y, 0.08 * k);
      aurora.x = mezcla(aurora.x, raton.x > -1e3 ? raton.x : W * 0.7, 0.02 * k);
      aurora.y = mezcla(aurora.y, raton.y > -1e3 ? raton.y : H * 0.4, 0.02 * k);
      vel *= Math.pow(0.9, k);

      const c = ctx!;
      c.clearRect(0, 0, W, H);
      c.globalCompositeOperation = "lighter";

      if (auroraCtx) {
        const e8 = AW / W;
        auroraCtx.globalCompositeOperation = "source-over";
        auroraCtx.clearRect(0, 0, AW, AH);
        auroraCtx.globalCompositeOperation = "lighter";
        const g1 = auroraCtx.createRadialGradient(aurora.x * e8, aurora.y * e8, 0, aurora.x * e8, aurora.y * e8, Math.max(AW, AH) * 0.42);
        g1.addColorStop(0, `rgba(${tinte.r | 0},${tinte.g | 0},${tinte.b | 0},.075)`);
        g1.addColorStop(1, "rgba(0,0,0,0)");
        auroraCtx.fillStyle = g1;
        auroraCtx.fillRect(0, 0, AW, AH);
        const ax = (W - aurora.x * 0.5) * e8;
        const ay = (H * 0.8 - aurora.y * 0.3) * e8;
        const g2 = auroraCtx.createRadialGradient(ax, ay, 0, ax, ay, Math.max(AW, AH) * 0.35);
        g2.addColorStop(0, "rgba(120,90,255,.05)");
        g2.addColorStop(1, "rgba(0,0,0,0)");
        auroraCtx.fillStyle = g2;
        auroraCtx.fillRect(0, 0, AW, AH);
        c.drawImage(auroraLienzo, 0, 0, W, H);
      }

      const estira = 1 + Math.min(6, Math.abs(vel) * 0.012);
      const cr0 = tinte.r | 0;
      const cg0 = tinte.g | 0;
      const cb0 = tinte.b | 0;

      capas.forEach((capa) => {
        const prof = capa.length ? capa[0].prof : 1;
        const cr = mezcla(255, cr0, prof * 0.75) | 0;
        const cg = mezcla(255, cg0, prof * 0.75) | 0;
        const cb = mezcla(255, cb0, prof * 0.75) | 0;
        const ry = prof > 0.5 ? estira : 1;
        // Dos lotes por capa (tenues y brillantes): seis rellenos en total en vez de uno por partícula.
        const lotes = [
          { a: 0.18 * (0.35 + 0.65 * prof), path: new Path2D() },
          { a: 0.5 * (0.35 + 0.65 * prof), path: new Path2D() },
        ];
        capa.forEach((p) => {
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.f += 0.01 * k;
          const dx = raton.sx - p.x;
          const y = (((p.y - scrollActual * (0.04 + p.prof * 0.14)) % H) + H) % H;
          const dy = raton.sy - y;
          const d = Math.hypot(dx, dy);
          if (d < 200 && d > 1) {
            const f = ((200 - d) / 200) * 0.55 * p.prof * p.prof;
            p.x += (dx / d) * f * k;
            p.y += (dy / d) * f * k;
          }
          for (let oi = 0; oi < ondas.length; oi++) {
            const o = ondas[oi];
            const ox = p.x - o.x;
            const oy = y - o.y;
            const od = Math.hypot(ox, oy);
            if (Math.abs(od - o.r) < 46 && od > 1) {
              const e = (1 - Math.abs(od - o.r) / 46) * o.a * 6 * p.prof;
              p.x += (ox / od) * e * k;
              p.y += (oy / od) * e * k;
            }
          }
          if (p.x < -10) p.x = W + 10;
          if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10;
          if (p.y > H + 10) p.y = -10;
          p.sy = (((p.y - scrollActual * (0.04 + p.prof * 0.14)) % H) + H) % H;
          const lote = lotes[0.6 + 0.4 * Math.sin(p.f) > 0.8 ? 1 : 0];
          lote.path.moveTo(p.x + p.r, p.sy);
          lote.path.ellipse(p.x, p.sy, p.r, p.r * ry, 0, 0, 6.2832);
        });
        lotes.forEach((l) => {
          c.fillStyle = `rgba(${cr},${cg},${cb},${l.a.toFixed(3)})`;
          c.fill(l.path);
        });
      });

      // Constelación entre partículas cercanas y medias: rejilla espacial y tres lotes de opacidad.
      // El umbral de unión va con el ancho de la pantalla: 135 px fijos tejían en un
      // móvil una malla mucho más tupida que la que se ve en un portátil.
      const LIM = Math.min(135, Math.max(70, W * 0.2));
      const TOPE_TRAZOS = presupuesto < 1 ? 150 : 420;
      const rejilla: Record<string, number[]> = {};
      const nodos = capas[2].concat(capas[1]);
      const sendas = [new Path2D(), new Path2D(), new Path2D()];
      let trazos = 0;
      nodos.forEach((p, idx) => {
        const key = `${(p.x / LIM) | 0},${(p.sy / LIM) | 0}`;
        (rejilla[key] || (rejilla[key] = [])).push(idx);
      });
      for (let i = 0; i < nodos.length && trazos < TOPE_TRAZOS; i++) {
        const a = nodos[i];
        const cx = (a.x / LIM) | 0;
        const cy = (a.sy / LIM) | 0;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const lista = rejilla[`${gx},${gy}`];
            if (!lista) continue;
            for (let q = 0; q < lista.length; q++) {
              const jx = lista[q];
              if (jx <= i) continue;
              const b = nodos[jx];
              const dd = Math.hypot(a.x - b.x, a.sy - b.sy);
              if (dd < LIM) {
                trazos++;
                const fuerza = (1 - dd / LIM) * (a.prof + b.prof) * 0.5;
                const sp = sendas[fuerza > 0.5 ? 2 : fuerza > 0.25 ? 1 : 0];
                sp.moveTo(a.x, a.sy);
                sp.lineTo(b.x, b.sy);
              }
            }
          }
        }
      }
      c.lineWidth = 1;
      [0.05, 0.11, 0.19].forEach((al, si) => {
        c.strokeStyle = `rgba(${cr0},${cg0},${cb0},${al})`;
        c.stroke(sendas[si]);
      });

      ondas.forEach((o) => {
        o.r += 7 * k;
        o.a -= 0.014 * k;
        if (o.a <= 0) return;
        c.strokeStyle = `rgba(${cr0},${cg0},${cb0},${(o.a * 0.45).toFixed(3)})`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(o.x, o.y, o.r, 0, 6.2832);
        c.stroke();
      });
      ondas = ondas.filter((o) => o.a > 0);
      c.globalCompositeOperation = "source-over";
    };

    gsap.ticker.add(frame);

    return () => {
      gsap.ticker.remove(frame);
      observador.disconnect();
      window.removeEventListener("resize", tam);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("touchmove", dedo);
      window.removeEventListener("touchend", soltar);
      window.removeEventListener("touchcancel", soltar);
      window.removeEventListener("pointerdown", pulsar);
      window.removeEventListener("pointerup", soltarToque);
      window.removeEventListener("pointercancel", soltarToque);
      window.removeEventListener("keydown", despertar);
      window.removeEventListener("wheel", despertar);
      window.removeEventListener("touchstart", despertar);
      if (lenis) lenis.off("scroll", alScroll);
      else window.removeEventListener("scroll", scrollNativo);
      canvas.width = 1;
      canvas.height = 1;
    };
  }, [nivel, lenis, motor]);

  if (nivel === "estatico") return null;
  return <canvas ref={ref} className="p-fondo" data-landing-background="true" aria-hidden="true" />;
}
