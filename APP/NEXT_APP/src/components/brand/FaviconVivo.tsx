"use client";

import { useEffect } from "react";

/**
 * El icono de la pestaña, vivo.
 *
 * Dibuja la marca «n.» en un lienzo: el punto va tomando el color de la sección que se
 * está leyendo, el mismo tinte que usa el fondo. Si la pestaña deja de verse, el icono
 * se apaga y el título avisa de que aquí sigue todo; al volver, se recupera tal cual.
 *
 * Cada repintado escribe un `data:` nuevo en el `<link rel="icon">` y el navegador anota
 * cada uno como una petición, así que solo se repinta cuando el icono cambia de verdad:
 * el color avanza a saltos hacia su destino y se detiene al llegar. Antes había también
 * un latido del punto, y se quitó porque con el icono a 16 px medía 0,15 px —invisible—
 * mientras costaba cuatro repintados por segundo para siempre.
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
/** Dos pasos de color por segundo; quieto no escribe nada. */
const PASO_MS = 500;
const RADIO = 4.4;

interface Rgb { r: number; g: number; b: number }

function aRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Un paso hacia el color de destino; cuando llega, deja de moverse y de repintar. */
function acercar(desde: Rgb, hacia: Rgb): Rgb {
  const paso = (a: number, b: number) => (Math.abs(b - a) < 2 ? b : Math.round(a + (b - a) * 0.28));
  return { r: paso(desde.r, hacia.r), g: paso(desde.g, hacia.g), b: paso(desde.b, hacia.b) };
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

    let ultima = "";
    const pintar = (color: Rgb, radio: number, apagado = false) => {
      const clave = `${color.r},${color.g},${color.b}|${radio}|${apagado}`;
      if (clave === ultima) return;
      ultima = clave;
      c.clearRect(0, 0, 64, 64);
      c.fillStyle = apagado ? "#0a0d12" : "#0B0F14";
      c.fill(teja);
      c.strokeStyle = apagado ? "#5b6574" : "#F5F8FA";
      c.lineWidth = 8.5;
      c.lineCap = "round";
      c.stroke(letra);
      c.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
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
    let actual = aRgb(PALETA[0]);
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
    Object.keys(TINTES).forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observador.observe(el);
        observando = true;
      }
    });

    const latir = () => {
      paso++;
      // Sin secciones que seguir (el resto del sitio), el punto recorre la paleta.
      if (!observando) destino = PALETA[Math.floor(paso / 30) % PALETA.length];
      actual = acercar(actual, aRgb(destino));
      pintar(actual, RADIO);
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
        pintar({ r: 100, g: 116, b: 139 }, 4.2, true);
        tituloGuardado = document.title;
        document.title = TITULO_AUSENTE;
      } else {
        if (document.title === TITULO_AUSENTE) document.title = tituloGuardado;
        pintar(actual, RADIO);
        arrancar();
      }
    };

    pintar(quieto ? aRgb("#2dd4bf") : actual, RADIO);
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
