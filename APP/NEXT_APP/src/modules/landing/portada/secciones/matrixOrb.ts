/**
 * Matrix Orb — adaptación a lienzo 2D del componente "Matrix Orb" de rareui
 * (https://www.rareui.com/, licencia MIT; ver docs/licencias/rareui-matrix-orb.md).
 * Una rejilla de puntos que respira, escucha y piensa; el color y el estado se
 * cambian desde fuera y el bucle se para cuando el núcleo no se ve.
 */

export type EstadoOrb = "idle" | "listening" | "thinking";

export interface MatrixOrb {
  setState(estado: EstadoOrb): void;
  setColor(color: string): void;
  start(): void;
  stop(): void;
}

const TAU = Math.PI * 2;
const STATES: EstadoOrb[] = ["idle", "listening", "thinking"];
const SCALE: Record<EstadoOrb, number> = { idle: 0.88, listening: 1, thinking: 0.92 };
const ORB = [
  { radius: 0.62, speed: 2.2, phase: 0, spread: 0.42 },
  { radius: 0.4, speed: -1.7, phase: 2.1, spread: 0.36 },
  { radius: 0.8, speed: 1.15, phase: 4, spread: 0.34 },
];

export function matrixOrb(canvas: HTMLCanvasElement, opts: { size: number; color: string; dots?: number }): MatrixOrb | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const size = opts.size;
  let color = opts.color;
  let state: EstadoOrb = "idle";
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const buffer = Math.round(size * dpr);
  canvas.width = canvas.height = buffer;
  canvas.style.width = canvas.style.height = `${size}px`;
  ctx.scale(buffer / size, buffer / size);

  const grid = Math.max(3, Math.round(opts.dots ?? 11));
  const half = (grid - 1) / 2;
  const spacing = (size * 0.74) / (grid - 1);
  const maxRadius = spacing * 0.6;
  const center = size / 2;
  const weights: Record<EstadoOrb, number> = { idle: 1, listening: 0, thinking: 0 };

  function envelope(t: number) {
    const slow = 0.5 + 0.5 * Math.sin(t * 0.62 + 0.4);
    const fast = 0.5 + 0.5 * Math.sin(t * 1.9 + 1.1);
    return 0.22 + 0.78 * (0.45 + 0.55 * slow) * fast;
  }

  function intensity(st: EstadoOrb, d: number, nx: number, ny: number, t: number, amp: number) {
    if (st === "listening") {
      const ripple = 0.5 + 0.5 * Math.sin(d * 4.2 - t * 3);
      return 0.32 + amp * (0.34 + 0.38 * ripple);
    }
    if (st === "thinking") {
      let heat = 0;
      ORB.forEach((o) => {
        const a = t * o.speed + o.phase;
        const dx = nx - Math.cos(a) * o.radius;
        const dy = ny - Math.sin(a) * o.radius;
        heat += Math.exp(-(dx * dx + dy * dy) / (o.spread * o.spread));
      });
      return 0.26 + 0.8 * Math.min(1, heat);
    }
    return 0.62 + 0.12 * Math.sin(t * 1.05 - d * 2.4);
  }

  function draw(t: number, amp: number, scale: number) {
    const c = ctx!;
    c.clearRect(0, 0, size, size);
    c.fillStyle = color;
    for (let iy = 0; iy < grid; iy++) {
      for (let ix = 0; ix < grid; ix++) {
        const nx = (ix - half) / half;
        const ny = (iy - half) / half;
        const d = Math.hypot(nx, ny);
        if (d > 1.12) continue;
        let blended = 0;
        STATES.forEach((st) => {
          if (weights[st] < 0.001) return;
          blended += weights[st] * intensity(st, d, nx, ny, t, amp);
        });
        const inten = Math.min(1, Math.max(0, blended));
        const radius = maxRadius * Math.exp(-d * d * 1.7) * inten * scale;
        if (radius * dpr < 0.5) continue;
        c.beginPath();
        c.arc(center + (ix - half) * spacing * scale, center + (iy - half) * spacing * scale, radius, 0, TAU);
        c.fill();
      }
    }
  }

  let t = 0;
  let amp = 0;
  let scale = SCALE.idle;
  let vel = 0;
  let last = performance.now();
  let raf = 0;
  let corriendo = false;

  function frame(now: number) {
    if (!corriendo) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    const target = envelope(t);
    const rate = target > amp ? 0.22 : 0.08;
    amp += (target - amp) * (1 - Math.pow(1 - rate, dt * 60));
    const step = 1 - Math.pow(1 - 0.16, dt * 60);
    STATES.forEach((st) => {
      weights[st] += ((st === state ? 1 : 0) - weights[st]) * step;
    });
    vel += (-180 * (scale - SCALE[state]) - 26 * vel) * dt;
    scale += vel * dt;
    draw(t, amp, scale);
    raf = requestAnimationFrame(frame);
  }

  draw(0, 0.5, SCALE.idle);

  return {
    setState(st) { state = st; },
    setColor(c) { color = c; },
    start() {
      if (corriendo) return;
      corriendo = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      corriendo = false;
      cancelAnimationFrame(raf);
      draw(0, 0.5, SCALE.idle);
    },
  };
}
