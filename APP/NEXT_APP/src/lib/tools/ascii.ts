/**
 * Arte ASCII a partir de píxeles, y su pintado en un canvas (vista en color y exportación PNG).
 * Funciones puras salvo `pintarAscii`, que solo usa el contexto 2D que recibe.
 */

export interface ResultadoAscii {
    /** Caracteres por fila (con «Espaciado» cada píxel ocupa 2). */
    columnas: number;
    filas: number;
    /** Un arreglo de caracteres por fila (puntos de código, así un juego propio con emojis no se parte). */
    celdas: string[][];
    /** RGB de cada píxel muestreado (ancho × alto × 3). */
    colores: Uint8ClampedArray;
    /** Celdas por píxel: 1 o 2. */
    paso: number;
    texto: string;
}

/** Enfoque 3×3 (núcleo laplaciano) sobre RGBA; los bordes se copian tal cual. */
export function enfocar(datos: Uint8ClampedArray, ancho: number, alto: number): Uint8ClampedArray {
    const salida = new Uint8ClampedArray(datos);
    for (let y = 1; y < alto - 1; y++) {
        for (let x = 1; x < ancho - 1; x++) {
            const i = (y * ancho + x) * 4;
            for (let c = 0; c < 3; c++) {
                const suma = 5 * datos[i + c]! - datos[i - 4 + c]! - datos[i + 4 + c]! - datos[i - ancho * 4 + c]! - datos[i + ancho * 4 + c]!;
                salida[i + c] = suma;
            }
        }
    }
    return salida;
}

/**
 * Convierte RGBA en caracteres: el brillo de cada píxel elige un carácter de `rampa` (de oscuro a claro).
 * `espaciado` agrega un espacio después de cada carácter.
 */
export function pixelesAAscii(datos: Uint8ClampedArray, ancho: number, alto: number, rampa: string[], espaciado: boolean): ResultadoAscii {
    const caracteres = rampa.length ? rampa : [" ", "#"];
    const ultimo = caracteres.length - 1;
    const paso = espaciado ? 2 : 1;
    const colores = new Uint8ClampedArray(ancho * alto * 3);
    const celdas: string[][] = [];
    for (let y = 0; y < alto; y++) {
        const fila: string[] = [];
        for (let x = 0; x < ancho; x++) {
            const i = (y * ancho + x) * 4;
            const r = datos[i]!, g = datos[i + 1]!, b = datos[i + 2]!;
            const brillo = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            fila.push(caracteres[Math.min(Math.floor(brillo * ultimo), ultimo)]!);
            if (espaciado) fila.push(" ");
            const k = (y * ancho + x) * 3;
            colores[k] = r; colores[k + 1] = g; colores[k + 2] = b;
        }
        celdas.push(fila);
    }
    return { columnas: ancho * paso, filas: alto, celdas, colores, paso, texto: celdas.map((fila) => fila.join("")).join("\n") };
}

const FUENTE = `ui-monospace, "Cascadia Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace`;

export interface OpcionesPintado {
    tamFuente: number;
    conColor: boolean;
    /** Color del texto sin «color». */
    colorTexto: string;
    /** null = transparente. */
    fondo: string | null;
    /** Escala del lienzo (densidad de pantalla o exportación). */
    escala?: number;
}

/** Ancho de una celda: la fuente monoespaciada mide todos sus caracteres igual. */
export function medirCelda(ctx: CanvasRenderingContext2D, tamFuente: number): number {
    ctx.font = `${tamFuente}px ${FUENTE}`;
    return ctx.measureText("M").width || tamFuente * 0.6;
}

/** Tamaño en píxeles CSS que ocupa el resultado con esa fuente. */
export function medidasAscii(ctx: CanvasRenderingContext2D, r: ResultadoAscii, tamFuente: number) {
    const celda = medirCelda(ctx, tamFuente);
    return { ancho: Math.max(1, Math.ceil(celda * r.columnas)), alto: Math.max(1, Math.ceil(tamFuente * r.filas)), celda };
}

/**
 * Pinta el resultado en el canvas, ajustando su tamaño. Cada carácter va en su celda (no por línea), así los
 * bloques ░▒▓█ que vienen de otra fuente no descuadran la grilla.
 */
export function pintarAscii(canvas: HTMLCanvasElement, r: ResultadoAscii, op: OpcionesPintado): { ancho: number; alto: number } {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ancho: 0, alto: 0 };
    const escala = op.escala ?? 1;
    const { ancho, alto, celda } = medidasAscii(ctx, r, op.tamFuente);
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    if (op.fondo) {
        ctx.fillStyle = op.fondo;
        ctx.fillRect(0, 0, ancho, alto);
    } else {
        ctx.clearRect(0, 0, ancho, alto);
    }
    ctx.font = `${op.tamFuente}px ${FUENTE}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = op.colorTexto;
    let ultimoColor = "";
    for (let y = 0; y < r.filas; y++) {
        const fila = r.celdas[y]!;
        for (let x = 0; x < fila.length; x++) {
            const ch = fila[x]!;
            if (ch === " ") continue;
            if (op.conColor) {
                const k = (y * (r.columnas / r.paso) + Math.floor(x / r.paso)) * 3;
                const color = `rgb(${r.colores[k]},${r.colores[k + 1]},${r.colores[k + 2]})`;
                if (color !== ultimoColor) { ctx.fillStyle = color; ultimoColor = color; }
            }
            ctx.fillText(ch, x * celda, y * op.tamFuente);
        }
    }
    return { ancho, alto };
}

/** Escala del lienzo: nítida, pero sin pasar de ~16 millones de píxeles ni de 8000 px por lado (límites de Safari). */
export function escalaExportacion(ancho: number, alto: number, deseada = 2): number {
    const porArea = Math.sqrt(16_000_000 / Math.max(1, ancho * alto));
    const porLado = 8000 / Math.max(ancho, alto, 1);
    return Math.max(0.01, Math.min(deseada, porArea, porLado));
}

function escaparHtml(texto: string): string {
    return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * HTML autónomo con el arte en color. Agrupa celdas seguidas del mismo color en un solo <span> (mucho más liviano
 * que un span por carácter) y prohíbe todo con CSP salvo los estilos en línea.
 */
export function asciiAHtml(r: ResultadoAscii, titulo: string, fondo: string | null, conColor: boolean, colorTexto: string): string {
    const filas = r.celdas.map((fila, y) => {
        let html = "";
        let color = "";
        let tramo = "";
        const cerrar = () => { if (tramo) html += conColor ? `<span style="color:${color}">${escaparHtml(tramo)}</span>` : escaparHtml(tramo); tramo = ""; };
        for (let x = 0; x < fila.length; x++) {
            const k = (y * (r.columnas / r.paso) + Math.floor(x / r.paso)) * 3;
            const actual = conColor ? `rgb(${r.colores[k]},${r.colores[k + 1]},${r.colores[k + 2]})` : "";
            if (actual !== color && fila[x] !== " ") { cerrar(); color = actual; }
            tramo += fila[x];
        }
        cerrar();
        return html;
    }).join("\n");
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arte ASCII · ${escaparHtml(titulo)}</title>
<style>
body { background: ${fondo ?? "transparent"}; margin: 0; padding: 20px; display: flex; justify-content: center; }
pre { font-family: ui-monospace, "Cascadia Mono", Menlo, Consolas, "Courier New", monospace; font-size: 8px; line-height: 1; letter-spacing: 0; white-space: pre; color: ${colorTexto}; }
</style>
</head>
<body>
<pre>${filas}</pre>
</body>
</html>`;
}
