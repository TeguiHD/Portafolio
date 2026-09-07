"use client";

import { useEffect, useRef } from "react";
import { useMotionActivity } from "../motion/LandingMotionProvider";

type Arrival = typeof import("../motion/scenes/arrival");

/** Parte del recorrido de la seccion que consume la coreografia. El resto
 *  mantiene la constelacion terminada a la vista antes de dar paso al footer. */
const FRACCION_RECORRIDO = 0.68;

/** The selected choreography is loaded only when this visible panel may animate. */
export function ClosingSignature() {
  const { ref, active } = useMotionActivity();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const canvas = canvasRef.current;
    if (!panel || !canvas || !active) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let disposed = false;
    let frame: number | null = null;
    let idle: number | null = null;
    let timer: number | null = null;
    let scene: Arrival | null = null;
    let state: ReturnType<Arrival["initArrival"]> | null = null;
    let width = 0;
    let height = 0;
    let scrollProgress = 0;
    let quality = window.innerWidth < 768 ? 0.45 : 0.65;
    let samples = 0;
    let cost = 0;
    let slowWindows = 0;
    let staticQuality = false;

    const readProgress = () => {
      const section = ref.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      // La coreografia termina antes de que el panel se despegue, de modo que la
      // constelacion final se ve completa y quieta un momento y solo despues
      // aparece el footer. Sin este margen, en pantallas estrechas el ultimo
      // tramo ocurria mientras el panel ya salia de la vista.
      const recorrido = Math.max(1, (rect.height + viewport * 0.2) * FRACCION_RECORRIDO);
      scrollProgress = Math.max(0, Math.min(1, (viewport * 0.8 - rect.top) / recorrido));
    };
    const requestDraw = () => {
      if (!disposed && !staticQuality && frame === null && scene) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      if (!scene || disposed) return;
      const nextWidth = Math.round(panel.clientWidth);
      const nextHeight = Math.round(panel.clientHeight);
      if (!nextWidth || !nextHeight) return;
      if (nextWidth === width && nextHeight === height) { readProgress(); requestDraw(); return; }
      width = nextWidth;
      height = nextHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = scene.initArrival(width, height, quality);
      readProgress();
      requestDraw();
    };
    function draw() {
      frame = null;
      if (disposed || !scene || !state) return;
      const start = performance.now();
      const progress = scrollProgress;
      scene.drawArrival(context!, width, height, progress, progress * 2800, state);
      canvas!.dataset.state = progress < 0.46 ? "forming" : progress < 0.625 ? "signature" : "constellation";
      canvas!.dataset.progress = progress.toFixed(3);
      panel!.dataset.sceneReady = "true";
      cost += performance.now() - start;
      samples++;
      if (samples === 30) {
        slowWindows = cost / samples > 8 ? slowWindows + 1 : 0;
        if (slowWindows >= 2) {
          if (quality > 0.25) {
            quality = 0.25;
            state = scene.initArrival(width, height, quality);
          } else if (cost / samples > 16) {
            staticQuality = true;
            panel!.dataset.sceneReady = "false";
            canvas!.dataset.state = "limited";
          }
          slowWindows = 0;
        }
        cost = 0;
        samples = 0;
      }
      // No continuous loop: drawing occurs only on scroll or resize.
    }
    const onScroll = () => { readProgress(); requestDraw(); };
    const observer = new ResizeObserver(resize);
    const start = async () => {
      try {
        const loaded = await import("../motion/scenes/arrival");
        if (disposed) return;
        scene = loaded;
        observer.observe(panel);
        observer.observe(document.body);
        resize();
        window.addEventListener("scroll", onScroll, { passive: true });
      } catch {
        // The quiet server-rendered graphic remains if the optional chunk fails.
        if (!disposed) canvas.dataset.state = "unavailable";
      }
    };
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => { void start(); }, { timeout: 1200 });
    else timer = window.setTimeout(() => { void start(); }, 250);

    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (idle !== null) window.cancelIdleCallback(idle);
      if (timer !== null) window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      canvas.width = 1;
      canvas.height = 1;
      canvas.dataset.state = "paused";
      panel.dataset.sceneReady = "false";
      state = null;
      scene = null;
    };
  }, [active, ref]);

  return (
    <section ref={ref} id="closing-signature" aria-label="Firma animada" className="closing-scene relative h-[160svh] bg-[#07090f]">
      <noscript><style>{`.closing-scene{height:auto;padding-block:2rem}.closing-scene>div{position:relative;top:auto}.closing-signature{height:18rem}`}</style></noscript>
      <div className="sticky top-[12svh] mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div ref={panelRef} className="closing-signature relative h-[60svh] max-h-[640px] overflow-hidden" data-scene-ready="false" aria-hidden="true">
          <div className="closing-signature-fallback absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(0,184,169,0.12),transparent_65%)]">
            <div className="flex items-center gap-6 text-teal-200/70"><span className="h-1.5 w-1.5 rounded-full bg-current" /><span className="h-px w-16 bg-gradient-to-r from-teal-300/10 to-teal-300/50" /><span className="h-2.5 w-2.5 rounded-full bg-current" /><span className="h-px w-16 bg-gradient-to-l from-teal-300/10 to-teal-300/50" /><span className="h-1.5 w-1.5 rounded-full bg-current" /></div>
          </div>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-state="static" />
        </div>
      </div>
    </section>
  );
}
