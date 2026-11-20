/**
 * Nubes de puntos que la materia puede formar: texto, figuras dibujadas y trazos SVG.
 * Todo se dibuja en un lienzo oculto y se muestrea; las coordenadas quedan relativas al centro.
 */
export interface Nube {
    x: Float32Array;
    y: Float32Array;
    /** 1 = punto que va en el color de acento. */
    marca: Uint8Array;
    n: number;
    /** Color propio de la figura, como "r g b" (por ejemplo, el de una marca). */
    tinta?: string | null;
}

function nube(pts: number[], marcas: number[]): Nube {
    const n = marcas.length;
    const orden = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = orden[i]; orden[i] = orden[j]; orden[j] = t;
    }
    const x = new Float32Array(n), y = new Float32Array(n), marca = new Uint8Array(n);
    for (let q = 0; q < n; q++) { const i = orden[q]; x[q] = pts[i * 2]; y[q] = pts[i * 2 + 1]; marca[q] = marcas[i]; }
    return { x, y, marca, n };
}

function muestra(c: HTMLCanvasElement, g: CanvasRenderingContext2D, paso: number): Nube {
    const d = g.getImageData(0, 0, c.width, c.height).data, pts: number[] = [], marcas: number[] = [];
    for (let py = 0; py < c.height; py += paso) for (let px = 0; px < c.width; px += paso) {
        const k = (py * c.width + px) * 4;
        if (d[k + 3] > 130) { pts.push(px - c.width / 2, py - c.height / 2); marcas.push(d[k] > 200 && d[k + 1] < 120 ? 1 : 0); }
    }
    return nube(pts, marcas);
}

function lienzoOculto(ancho: number, alto: number) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.floor(ancho)); c.height = Math.max(1, Math.floor(alto));
    const g = c.getContext("2d", { willReadFrequently: true })!;
    return { c, g };
}

/** Un texto en la fuente monoespaciada del sitio, ajustado a la caja. */
export function nubeDeTexto(texto: string, anchoMax: number, altoMax: number, paso: number, familia: string): Nube {
    const medida = lienzoOculto(1, 1).g;
    medida.font = `700 200px ${familia}`;
    const escala = Math.min(anchoMax / Math.max(1, medida.measureText(texto).width), altoMax / 150);
    const cuerpo = Math.max(8, Math.floor(200 * escala));
    const { c, g } = lienzoOculto(anchoMax, cuerpo * 1.3);
    g.font = `700 ${cuerpo}px ${familia}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    g.fillText(texto, c.width / 2, c.height / 2);
    return muestra(c, g, paso);
}

type Dibujo = (g: CanvasRenderingContext2D, S: number) => void;

/** Una figura dibujada en un cuadrado de lado S. Lo que se pinta en rojo sale en color de acento. */
export function nubeDeFigura(dibujo: Dibujo, lado: number, paso: number): Nube {
    const { c, g } = lienzoOculto(lado, lado);
    const S = c.width;
    g.fillStyle = g.strokeStyle = "#fff"; g.lineWidth = S * 0.024; g.lineCap = g.lineJoin = "round";
    dibujo(g, S);
    return muestra(c, g, paso);
}

const caja = (g: CanvasRenderingContext2D, S: number, x: number, y: number, w: number, h: number, r = 0.02) => {
    g.beginPath(); g.roundRect(x * S, y * S, w * S, h * S, r * S);
};

/** Un sitio: ventana de navegador con su contenido. */
export const ventana: Dibujo = (g, S) => {
    caja(g, S, 0.05, 0.13, 0.9, 0.74, 0.05); g.stroke();
    g.beginPath(); g.moveTo(0.05 * S, 0.27 * S); g.lineTo(0.95 * S, 0.27 * S); g.stroke();
    for (const x of [0.12, 0.18, 0.24]) { g.beginPath(); g.arc(x * S, 0.2 * S, 0.02 * S, 0, 7); g.fill(); }
    g.fillStyle = "#f00"; caja(g, S, 0.12, 0.34, 0.44, 0.2); g.fill(); caja(g, S, 0.12, 0.74, 0.17, 0.065, 0.03); g.fill();
    g.fillStyle = "#fff"; caja(g, S, 0.12, 0.59, 0.36, 0.035, 0.01); g.fill(); caja(g, S, 0.12, 0.655, 0.27, 0.035, 0.01); g.fill();
    caja(g, S, 0.64, 0.34, 0.24, 0.46, 0.03); g.stroke();
};

/** Un sistema interno: panel con barras y una línea de tendencia. */
export const panel: Dibujo = (g, S) => {
    g.beginPath(); g.moveTo(0.1 * S, 0.14 * S); g.lineTo(0.1 * S, 0.84 * S); g.lineTo(0.92 * S, 0.84 * S); g.stroke();
    [0.24, 0.4, 0.32, 0.56, 0.46].forEach((h, k) => { g.fillStyle = k === 3 ? "#f00" : "#fff"; caja(g, S, 0.17 + k * 0.15, 0.84 - h - 0.03, 0.1, h, 0.02); g.fill(); });
    const linea: [number, number][] = [[0.22, 0.5], [0.37, 0.33], [0.52, 0.41], [0.67, 0.17], [0.82, 0.26]];
    g.strokeStyle = g.fillStyle = "#fff"; g.beginPath();
    linea.forEach(([x, y], k) => (k ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S))); g.stroke();
    for (const [x, y] of linea) { g.beginPath(); g.arc(x * S, y * S, 0.026 * S, 0, 7); g.fill(); }
};

/** Una herramienta: un código QR (el patrón es decorativo, no codifica nada). */
export const qr: Dibujo = (g, S) => {
    const n = 21, m = (S * 0.8) / n, o = S * 0.1;
    let sem = 7;
    const azar = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
    const ojo = (cx: number, cy: number) => {
        for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
            const borde = x === 0 || y === 0 || x === 6 || y === 6, centro = x > 1 && x < 5 && y > 1 && y < 5;
            if (borde || centro) { g.fillStyle = centro ? "#f00" : "#fff"; g.fillRect(o + (cx + x) * m, o + (cy + y) * m, m * 0.9, m * 0.9); }
        }
    };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const enOjo = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12), v = azar();
        if (!enOjo && v < 0.47) { g.fillStyle = "#fff"; g.fillRect(o + x * m, o + y * m, m * 0.9, m * 0.9); }
    }
    ojo(0, 0); ojo(14, 0); ojo(0, 14);
};

export const FIGURAS: Dibujo[] = [ventana, panel, qr];

/** El trazo de un ícono SVG de 24 × 24 (por ejemplo, el logo de una tecnología). */
export function nubeDeTrazo(d: string, lado: number, paso: number): Nube {
    return nubeDeFigura((g, S) => { const e = (S * 0.8) / 24; g.translate(S * 0.1, S * 0.1); g.scale(e, e); g.fill(new Path2D(d)); }, lado, paso);
}

export interface Mosaico { x: Float32Array; y: Float32Array; tinta: string[]; n: number; medio: number }

/** Una imagen reducida a celdas de color: cada partícula toma una. Devuelve null si el lienzo no puede leerla. */
export function mosaicoDeImagen(fuente: HTMLImageElement | HTMLCanvasElement, ancho: number, alto: number, columnas: number): Mosaico | null {
    const fw = "naturalWidth" in fuente ? fuente.naturalWidth : fuente.width, fh = "naturalHeight" in fuente ? fuente.naturalHeight : fuente.height;
    if (!fw || !fh || ancho < 2 || alto < 2) return null;
    const lado = ancho / columnas, filas = Math.max(1, Math.round(alto / lado));
    const { g } = lienzoOculto(columnas, filas);
    const ri = fw / fh, rc = columnas / filas;
    let sw = fw, sh = fh, sx = 0;
    if (ri > rc) { sw = fh * rc; sx = (fw - sw) / 2; } else { sh = fw / rc; }
    let d: Uint8ClampedArray;
    try { g.drawImage(fuente, sx, 0, sw, sh, 0, 0, columnas, filas); d = g.getImageData(0, 0, columnas, filas).data; } catch { return null; }
    const n = columnas * filas, orden = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = orden[i]; orden[i] = orden[j]; orden[j] = t; }
    const x = new Float32Array(n), y = new Float32Array(n), tinta = new Array<string>(n);
    for (let q = 0; q < n; q++) {
        const i = orden[q], cx = i % columnas, cy = (i / columnas) | 0, k = i * 4;
        x[q] = (cx + 0.5) * lado - ancho / 2; y[q] = (cy + 0.5) * lado - (filas * lado) / 2; tinta[q] = `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`;
    }
    return { x, y, tinta, n, medio: lado * 0.45 };
}
