import type { ReactElement } from "react";

/**
 * Marca del sitio para los iconos generados (PWA, Apple, insignia de avisos): la "n"
 * de nicoholas con el punto de .dev, el mismo dibujo que `src/app/icon.svg`.
 *
 * Va como SVG incrustado en vez de texto para no depender de ninguna fuente: así el
 * trazo es idéntico en todos los tamaños y no cambia si el servidor no carga la letra.
 */
function marcaSvg({
  fondo,
  letra,
  punto,
  zonaSegura = false,
}: {
  fondo: string | null;
  letra: string;
  punto: string;
  /**
   * Para los iconos «maskable»: el lanzador recorta el icono con la forma que quiera
   * —círculo, cuadrado redondeado, gota— y solo garantiza el 80% central. Con la marca
   * a tamaño completo, Android le cortaba el pie a la «n». Aquí el fondo llega al borde
   * y el dibujo se encoge dentro de esa zona.
   */
  zonaSegura?: boolean;
}) {
  const teja = fondo
    ? zonaSegura
      ? `<rect width="64" height="64" fill="${fondo}"/><circle cx="32" cy="32" r="30" fill="#12202b"/>`
      : `<rect width="64" height="64" rx="15" fill="${fondo}"/><rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.5"/>`
    : "";
  const marca = `<g fill="none" stroke="${letra}" stroke-width="8.5" stroke-linecap="round"><path d="M16 43.5V25.5"/><path d="M16 32.5C16 25.4 21.5 22 26.8 22 32.4 22 37 26.1 37 33v10.5"/></g><circle cx="48.5" cy="43.5" r="4.6" fill="${punto}"/>`;
  const cuerpo = zonaSegura ? `<g transform="translate(32 32) scale(0.72) translate(-32 -32)">${marca}</g>` : marca;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${teja}${cuerpo}</svg>`;
}

function comoDatos(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * @param size lado en píxeles.
 * @param insignia insignia de aviso: solo la silueta blanca, sin teja, como pide Android.
 * @param maskable variante para lanzadores que recortan el icono a su antojo.
 */
export function AppIcon({
  size,
  insignia = false,
  maskable = false,
}: {
  size: number;
  insignia?: boolean;
  maskable?: boolean;
}): ReactElement {
  const svg = insignia
    ? marcaSvg({ fondo: null, letra: "#FFFFFF", punto: "#FFFFFF" })
    : marcaSvg({ fondo: "#0B0F14", letra: "#F5F8FA", punto: "#2DD4BF", zonaSegura: maskable });
  return (
    <div style={{ width: size, height: size, display: "flex" }}>
      <img src={comoDatos(svg)} width={size} height={size} alt="" />
    </div>
  );
}
