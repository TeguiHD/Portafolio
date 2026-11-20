"use client";

import { useEffect } from "react";

/**
 * El icono de la pestaña, vivo.
 *
 * Dibuja la marca —la «n» con su partícula de acento en el hombro, como `src/app/icon.svg`— en un lienzo: en la
 * portada, la partícula toma el color de la sección que se está leyendo. Si la pestaña deja de verse, el icono
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

/** Las secciones de la portada y su tinte. Fuera de la portada, la partícula se queda en el acento y no repinta. */
const TINTES: Record<string, string> = {
  inicio: "#5eead4",
  proyectos: "#7dd3fc",
  herramientas: "#a78bfa",
  blog: "#fbbf24",
  contacto: "#5eead4",
  firma: "#5eead4",
};

const PALETA = ["#5eead4"];
const TITULO_AUSENTE = "Aquí te espero · nicoholas.dev";
/** Dos pasos de color por segundo; quieto no escribe nada. */
const PASO_MS = 500;
const RADIO = 2.8;

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
    // La «n» sólida centrada como en icon.svg: translate(32 32) scale(1.05) translate(-26.6 -32.8).
    const letra = new Path2D("M16 44V25.5 M16 32.5C16 25.2 21.6 21.6 26.8 21.6 32.6 21.6 37.2 25.9 37.2 33V44");
    const fondo = (apagado: boolean) => {
      if (apagado) return "#0a0d12";
      const g = c.createRadialGradient(51, 9, 0, 51, 9, 64);
      g.addColorStop(0, "#15574f"); g.addColorStop(0.5, "#0c1b20"); g.addColorStop(1, "#07080c");
      return g;
    };

    let ultima = "";
    const pintar = (color: Rgb, radio: number, apagado = false) => {
      const clave = `${color.r},${color.g},${color.b}|${radio}|${apagado}`;
      if (clave === ultima) return;
      ultima = clave;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 64, 64);
      c.fillStyle = fondo(apagado);
      c.fill(teja);
      c.setTransform(1.05, 0, 0, 1.05, 32 - 26.6 * 1.05, 32 - 32.8 * 1.05);
      c.strokeStyle = apagado ? "#5b6574" : "#F5F8FA";
      c.lineWidth = 8.6;
      c.lineCap = "round";
      c.stroke(letra);
      c.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      c.beginPath();
      c.arc(37.2, 25.6, radio, 0, Math.PI * 2);
      c.fill();
      enlace.href = lienzo.toDataURL("image/png");
    };

    // El título se guarda al esconder la pestaña, no al montar: entre medias la
    // persona puede haber navegado a otra página y el título ya no sería el mismo.
    let tituloGuardado = document.title;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let destino = PALETA[0];
    let actual = aRgb(PALETA[0]);
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
      actual = acercar(actual, aRgb(destino));
      pintar(actual, RADIO);
    };

    // Solo la portada tiene secciones que seguir; en el resto del sitio el ícono queda quieto (sin reloj).
    const arrancar = () => {
      if (reloj !== null || quieto || !observando) return;
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
        pintar({ r: 100, g: 116, b: 139 }, 2.6, true);
        tituloGuardado = document.title;
        document.title = TITULO_AUSENTE;
      } else {
        if (document.title === TITULO_AUSENTE) document.title = tituloGuardado;
        pintar(actual, RADIO);
        arrancar();
      }
    };

    pintar(quieto ? aRgb(PALETA[0]) : actual, RADIO);
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
