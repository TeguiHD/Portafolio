import type { ReactElement } from "react";

/**
 * Marca del sitio para los íconos generados (PWA, Apple, insignia de avisos): la «n» de nicoholas hecha de materia,
 * como las partículas del sitio, con una partícula de acento encendida en el hombro. Sin punto detrás: «n.» se leía «No».
 * El ícono de la pestaña (`src/app/icon.svg`) es la versión sólida, que se lee a 16 px.
 *
 * Va como SVG incrustado en vez de texto para no depender de ninguna fuente: el dibujo es idéntico en todos los tamaños.
 */

type Punto = [number, number];

/** El esqueleto de la «n» en el espacio 64 × 64, como polilínea (para medir distancias). */
const ESQUELETO: Punto[] = (() => {
    const recta = (a: Punto, b: Punto, n = 50): Punto[] => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
    const curva = (p0: Punto, p1: Punto, p2: Punto, p3: Punto, n = 80): Punto[] => Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n, u = 1 - t;
        return [0, 1].map((k) => u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]) as Punto;
    });
    return [
        ...recta([16, 44], [16, 25]),
        ...curva([16, 32.5], [16, 25.2], [21.6, 21.6], [26.8, 21.6]),
        ...curva([26.8, 21.6], [32.6, 21.6], [37.2, 25.9], [37.2, 33]),
        ...recta([37.2, 33], [37.2, 44]),
    ];
})();
const distancia = (x: number, y: number) => Math.min(...ESQUELETO.map(([a, b]) => Math.hypot(x - a, y - b)));
/** La partícula de acento: en el hombro derecho, dentro del trazo. */
const ACENTO: Punto = [37.2, 24.6];

/** Azar con semilla: el polvo cae siempre en el mismo sitio (el ícono no cambia entre compilaciones). */
function azar(semilla: number) {
    let s = semilla >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** La «n» como rejilla de partículas: más gruesas al centro del trazo (volumen), polvo tenue alrededor y el acento. */
function materia({ color, acento, polvo }: { color: string; acento: string | null; polvo: boolean }) {
    const partes: string[] = [];
    for (let y = 18.4; y < 47.5; y += 2.55) {
        for (let x = 10.5; x < 43.5; x += 2.55) {
            const d = distancia(x, y);
            if (d > 4.7 || Math.hypot(x - ACENTO[0], y - ACENTO[1]) <= 3.2) continue;
            partes.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(1.22 * (1 - (d / 4.7) ** 2 * 0.55)).toFixed(2)}" fill="${color}"/>`);
        }
    }
    if (polvo) {
        const r = azar(11);
        for (let i = 0; i < 16; i++) {
            const x = 6 + r() * 46, y = 8 + r() * 46, tam = 0.35 + r() * 0.35, op = 0.15 + r() * 0.2;
            if (distancia(x, y) > 7) partes.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${tam.toFixed(2)}" fill="${color}" fill-opacity="${op.toFixed(2)}"/>`);
        }
    }
    partes.push(acento
        ? `<circle cx="${ACENTO[0]}" cy="${ACENTO[1]}" r="6.4" fill="url(#halo)"/><circle cx="${ACENTO[0]}" cy="${ACENTO[1]}" r="2.35" fill="${acento}"/>`
        : `<circle cx="${ACENTO[0]}" cy="${ACENTO[1]}" r="2.35" fill="${color}"/>`);
    return partes.join("");
}

/** La «n» sólida (insignia de avisos y pestaña): un solo trazo que aguanta tamaños chicos. */
const solida = (color: string) => `<g fill="none" stroke="${color}" stroke-width="8.6" stroke-linecap="round"><path d="M16 44V25.5"/><path d="M16 32.5C16 25.2 21.6 21.6 26.8 21.6 32.6 21.6 37.2 25.9 37.2 33V44"/></g>`;

const DEFS = '<defs><radialGradient id="g1" cx="80%" cy="14%" r="78%"><stop offset="0" stop-color="#15574f"/><stop offset=".5" stop-color="#0c1b20"/><stop offset="1" stop-color="#07080c"/></radialGradient>'
    + '<radialGradient id="g2" cx="8%" cy="96%" r="60%"><stop offset="0" stop-color="#0b3a5a" stop-opacity=".55"/><stop offset="1" stop-color="#0b3a5a" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5eead4" stop-opacity=".7"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient></defs>';
/** El fondo: profundidad con dos luces (acento arriba a la derecha, azul abajo a la izquierda), como el sitio. */
const teja = (sangre: boolean) => sangre
    ? '<rect width="64" height="64" fill="url(#g1)"/><rect width="64" height="64" fill="url(#g2)"/>'
    : '<rect width="64" height="64" rx="15" fill="url(#g1)"/><rect width="64" height="64" rx="15" fill="url(#g2)"/><rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="1.5"/>';
const centrar = (cuerpo: string, escala: number) => `<g transform="translate(32 32) scale(${escala}) translate(-26.6 -32.8)">${cuerpo}</g>`;
const svg = (cuerpo: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${DEFS}${cuerpo}</svg>`;

export type VarianteIcono = "app" | "sangre" | "maskable" | "monocromo" | "insignia";

/** El SVG de cada variante. Se arma una vez por variante. */
const MARCAS: Record<VarianteIcono, string> = {
    // Lanzadores de escritorio y Android sin máscara: teja redondeada.
    app: svg(teja(false) + centrar(materia({ color: "#eef2f6", acento: "#5eead4", polvo: true }), 1.08)),
    // Apple pone su propia máscara y no admite transparencia: fondo a sangre.
    sangre: svg(teja(true) + centrar(materia({ color: "#eef2f6", acento: "#5eead4", polvo: true }), 1.02)),
    // El lanzador recorta a su antojo y solo garantiza el 80 % central: el dibujo se encoge dentro de esa zona.
    maskable: svg(teja(true) + centrar(materia({ color: "#eef2f6", acento: "#5eead4", polvo: true }), 0.82)),
    // Íconos con tema de Android: solo la silueta, en blanco sobre transparente.
    monocromo: svg(centrar(materia({ color: "#ffffff", acento: null, polvo: false }), 0.82)),
    // Insignia de los avisos: silueta blanca y sólida (a 24 dp la rejilla no se leería).
    insignia: svg(centrar(solida("#ffffff"), 1.05)),
};

function comoDatos(texto: string) {
    return `data:image/svg+xml;base64,${Buffer.from(texto).toString("base64")}`;
}

/**
 * @param size lado en píxeles.
 * @param variante app (teja redondeada), sangre (Apple), maskable, monocromo o insignia.
 */
export function AppIcon({ size, variante = "app" }: { size: number; variante?: VarianteIcono }): ReactElement {
    return (
        <div style={{ width: size, height: size, display: "flex" }}>
            <img src={comoDatos(MARCAS[variante])} width={size} height={size} alt="" />
        </div>
    );
}
