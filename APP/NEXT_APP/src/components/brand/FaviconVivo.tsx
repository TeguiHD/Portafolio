"use client";

import { useEffect } from "react";

/**
 * El icono de la pestaña, vivo.
 *
 * Dibuja la marca «n.» en un lienzo y la repinta despacio: el punto respira y va
 * tomando el color de la sección que se está leyendo (el mismo tinte que usa el fondo).
 * Si la pestaña deja de verse, el icono se apaga y el título avisa de que aquí sigue
 * todo; al volver, se recupera tal cual estaba.
 *
 * Con movimiento reducido no anima: deja el icono en su color de siempre.
 */

/** El mismo mapa de tintes que el fondo vivo, para que icono y página digan lo mismo. */
const TINTES: Record<string, string> = {
  hero: "#5eead4",
  "tools-belt": "#8bd5c3",
  vault: "#f59e0b",
  casos: "#f5b04a",
  tecnologias: "#a78bfa",
  architecture: "#fb7185",
  contact: "#f59e0b",
};

/** Fuera de la portada, el punto recorre la paleta del sitio. */
const PALETA = ["#2dd4bf", "#a78bfa", "#f59e0b", "#60a5fa"];
const TITULO_AUSENTE = "Aquí te espero · nicoholas.dev";
/** Cuatro repintados por segundo bastan para que se note vivo sin gastar nada. */
const PASO_MS = 250;

function aRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mezclar(a: string, b: string, t: number) {
  const x = aRgb(a);
  const y = aRgb(b);
  const c = (k: "r" | "g" | "b") => Math.round(x[k] + (y[k] - x[k]) * t);
  return `rgb(${c("r")},${c("g")},${c("b")})`;
}

export function FaviconVivo() {
  useEffect(() => {
    const lienzo = document.createElement("canvas");
    lienzo.width = 64;
    lienzo.height = 64;
    const c = lienzo.getContext("2d");
    if (!c) return;

    // Un solo <link> propio; los del servidor se quedan como respaldo si esto falla.
    const enlace = document.createElement("link");
    enlace.rel = "icon";
    enlace.type = "image/png";
    document.head.appendChild(enlace);

    const teja = new Path2D();
    teja.roundRect(0, 0, 64, 64, 15);
    const letra = new Path2D("M16 43.5V25.5 M16 32.5C16 25.4 21.5 22 26.8 22 32.4 22 37 26.1 37 33v10.5");

    const pintar = (color: string, radio: number, apagado = false) => {
      c.clearRect(0, 0, 64, 64);
      c.fillStyle = apagado ? "#0a0d12" : "#0B0F14";
      c.fill(teja);
      c.strokeStyle = apagado ? "#5b6574" : "#F5F8FA";
      c.lineWidth = 8.5;
      c.lineCap = "round";
      c.stroke(letra);
      c.fillStyle = color;
      c.beginPath();
      c.arc(48.5, 43.5, radio, 0, Math.PI * 2);
      c.fill();
      enlace.href = lienzo.toDataURL("image/png");
    };

    // El título se guarda al esconder la pestaña, no al montar: entre medias la
    // persona puede haber navegado a otra página y el título ya no sería el mismo.
    let tituloGuardado = document.title;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let destino = PALETA[0];
    let actualColor = PALETA[0];
    let paso = 0;
    let reloj: number | null = null;

    // El color sigue a la sección que cruza el centro de la pantalla, como el fondo.
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) destino = TINTES[e.target.id] ?? destino;
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    let observando = false;
    const observar = () => {
      Object.keys(TINTES).forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          observador.observe(el);
          observando = true;
        }
      });
    };
    observar();

    const latir = () => {
      paso++;
      // Sin secciones que seguir (el resto del sitio), el punto recorre la paleta.
      if (!observando) destino = PALETA[Math.floor(paso / 40) % PALETA.length];
      actualColor = mezclar(actualColor.startsWith("#") ? actualColor : destino, destino, 0.12);
      const respira = 4.2 + Math.sin(paso / 6) * 0.9;
      pintar(destino, respira);
    };

    const arrancar = () => {
      if (reloj !== null || quieto) return;
      reloj = window.setInterval(latir, PASO_MS);
    };
    const parar = () => {
      if (reloj === null) return;
      window.clearInterval(reloj);
      reloj = null;
    };

    const cambioVisibilidad = () => {
      if (document.hidden) {
        parar();
        pintar("#64748b", 4.2, true);
        tituloGuardado = document.title;
        document.title = TITULO_AUSENTE;
      } else {
        if (document.title === TITULO_AUSENTE) document.title = tituloGuardado;
        pintar(destino, 4.6);
        arrancar();
      }
    };

    pintar(quieto ? "#2dd4bf" : destino, 4.6);
    arrancar();
    document.addEventListener("visibilitychange", cambioVisibilidad);

    return () => {
      parar();
      observador.disconnect();
      document.removeEventListener("visibilitychange", cambioVisibilidad);
      if (document.title === TITULO_AUSENTE) document.title = tituloGuardado;
      enlace.remove();
    };
  }, []);

  return null;
}
