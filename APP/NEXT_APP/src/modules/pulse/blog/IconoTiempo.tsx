/**
 * El cielo, dibujado.
 *
 * Los códigos de Open-Meteo (WMO) traen la condición como número y hasta ahora solo se
 * leía en texto: la cápsula enseñaba un sol fijo lloviera o nevara. Aquí cada condición
 * tiene su figura —sol, luna, nube, niebla, llovizna, lluvia, chubasco, nieve, tormenta—
 * y su color, para reconocerla sin leer.
 *
 * El movimiento va en `blog.css` y se apaga con `prefers-reduced-motion`.
 */

type Figura = "sol" | "luna" | "sol-nube" | "luna-nube" | "nube" | "niebla" | "llovizna" | "lluvia" | "chubasco" | "nieve" | "tormenta";

/** Código WMO → figura. Los tramos son los de Open-Meteo. */
export function figuraDelCielo(codigo: number, dia = true): Figura {
  if (codigo >= 95) return "tormenta";
  if (codigo >= 80) return "chubasco";
  if (codigo >= 71 && codigo <= 77) return "nieve";
  if (codigo >= 61) return "lluvia";
  if (codigo >= 51) return "llovizna";
  if (codigo === 45 || codigo === 48) return "niebla";
  if (codigo === 3) return "nube";
  if (codigo === 1 || codigo === 2) return dia ? "sol-nube" : "luna-nube";
  return dia ? "sol" : "luna";
}

/**
 * Dos nubes: la baja para cuando la nube es todo el dibujo, y la alta cuando debajo
 * tiene que caber lluvia, nieve, niebla o un rayo. Con una sola, la precipitación se
 * quedaba en los últimos tres píxeles y a 17 px no se distinguía nada.
 */
const NUBE_BAJA = "M7.5 17.5h9a3.2 3.2 0 0 0 .3-6.4A4.8 4.8 0 0 0 8 9.6a3.9 3.9 0 0 0-.5 7.9Z";
const NUBE_ALTA = "M7.4 13.8h9.2a3.3 3.3 0 0 0 .3-6.6A4.9 4.9 0 0 0 7.9 5.8a4 4 0 0 0-.5 8Z";
/** Con algo debajo, la nube sube y el sol se retira a la esquina. */
const CON_CAIDA: ReadonlySet<string> = new Set(["niebla", "llovizna", "lluvia", "chubasco", "nieve", "tormenta"]);

function Sol({ r = 3.4, cx = 12, cy = 12 }: { r?: number; cx?: number; cy?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} className="it-sol" />
      <g className="it-rayos">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const rad = (a * Math.PI) / 180;
          const d = r + 1.6;
          const l = r + 3.6;
          return (
            <line
              key={a}
              x1={(cx + Math.cos(rad) * d).toFixed(2)}
              y1={(cy + Math.sin(rad) * d).toFixed(2)}
              x2={(cx + Math.cos(rad) * l).toFixed(2)}
              y2={(cy + Math.sin(rad) * l).toFixed(2)}
            />
          );
        })}
      </g>
    </>
  );
}

function Luna() {
  return <path className="it-sol" d="M15.6 15.2A6 6 0 0 1 9.3 6.1a6.4 6.4 0 1 0 6.3 9.1Z" />;
}

function Gotas({ n, nieve = false }: { n: number; nieve?: boolean }) {
  const xs = n === 2 ? [9.8, 14.2] : [8.8, 12, 15.2];
  return (
    <g className={nieve ? "it-copos" : "it-gotas"}>
      {xs.map((x, i) => (
        nieve ? (
          <g key={x} style={{ animationDelay: `${i * 0.35}s` }}>
            <line x1={x - 2} y1={18.6} x2={x + 2} y2={18.6} />
            <line x1={x} y1={16.6} x2={x} y2={20.6} />
          </g>
        ) : (
          <line key={x} x1={x + 0.9} y1={16.2} x2={x - 0.9} y2={20.8} style={{ animationDelay: `${i * 0.28}s` }} />
        )
      ))}
    </g>
  );
}

export function IconoTiempo({
  codigo,
  dia = true,
  size = 18,
  className = "",
}: {
  codigo: number;
  dia?: boolean;
  size?: number;
  className?: string;
}) {
  const figura = figuraDelCielo(codigo, dia);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`it ${className}`}
      data-cielo={figura}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {figura === "sol" && <Sol />}
      {figura === "luna" && <Luna />}
      {figura === "sol-nube" && <Sol r={2.4} cx={8.6} cy={8.4} />}
      {figura === "chubasco" && <Sol r={2.2} cx={7.4} cy={6.2} />}
      {figura === "luna-nube" && <path className="it-sol" d="M11.4 10.4A4.2 4.2 0 0 1 7 5.8a4.5 4.5 0 1 0 4.4 4.6Z" />}
      {figura !== "sol" && figura !== "luna" && (
        <path className="it-nube" d={CON_CAIDA.has(figura) ? NUBE_ALTA : NUBE_BAJA} />
      )}
      {figura === "niebla" && (
        <g className="it-niebla">
          <line x1={6.6} y1={17.4} x2={17.4} y2={17.4} />
          <line x1={8.8} y1={20.6} x2={15.2} y2={20.6} />
        </g>
      )}
      {figura === "llovizna" && <Gotas n={2} />}
      {(figura === "lluvia" || figura === "chubasco") && <Gotas n={3} />}
      {figura === "nieve" && <Gotas n={2} nieve />}
      {figura === "tormenta" && <path className="it-rayo" d="M13.4 15.4 9.9 20h2.6l-1 3.2 4.2-4.8h-2.7Z" />}
    </svg>
  );
}
