import QRCode from "qrcode";

export type QRStyle = "square" | "dots" | "rounded" | "classy" | "diamond";
export type EyeStyle = "square" | "circle" | "rounded" | "leaf" | "diamond";

/** Degradado lineal del cuerpo. `angle` sigue la convención CSS: 0° hacia arriba, 90° hacia la derecha. */
export interface QRGradient {
    from: string;
    to: string;
    angle: number;
}

export interface RenderOptions {
    text: string;
    size: number;
    bg: string;
    fg: string;
    eyeColor?: string;
    style: QRStyle;
    eyeStyle: EyeStyle;
    logo?: string | null;
    level: "L" | "M" | "Q" | "H";
    margin?: number;
    gradient?: QRGradient | null;
}

type Shape = QRStyle | EyeStyle;

const f = (n: number) => Number(n.toFixed(3));

/**
 * Geometría de UN módulo como fragmento de path SVG.
 *
 * Es la única definición de forma: el canvas la pinta con `Path2D` y el SVG
 * la emite literal. Así el PNG y el SVG salen idénticos por construcción, y
 * un estilo nuevo se añade en un solo sitio.
 */
export function moduleShapePath(x: number, y: number, s: number, shape: Shape): string {
    const cx = x + s / 2;
    const cy = y + s / 2;
    switch (shape) {
        case "square": {
            // Sangrado de 0.2px para que módulos vecinos no dejen costura.
            const b = 0.2;
            return `M${f(x - b)} ${f(y - b)}h${f(s + 2 * b)}v${f(s + 2 * b)}h${f(-(s + 2 * b))}z`;
        }
        case "dots":
        case "circle": {
            const r = s / 2.2;
            return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0z`;
        }
        case "rounded": {
            const r = s * 0.35;
            const e = s - 2 * r;
            return (
                `M${f(x + r)} ${f(y)}h${f(e)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}v${f(e)}` +
                `a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}h${f(-e)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}` +
                `v${f(-e)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}z`
            );
        }
        case "classy":
            // Redondeado en dos esquinas opuestas.
            return (
                `M${f(x + s * 0.3)} ${f(y)}L${f(x + s)} ${f(y)}L${f(x + s)} ${f(y + s * 0.7)}` +
                `Q${f(x + s)} ${f(y + s)} ${f(x + s * 0.7)} ${f(y + s)}L${f(x)} ${f(y + s)}L${f(x)} ${f(y + s * 0.3)}` +
                `Q${f(x)} ${f(y)} ${f(x + s * 0.3)} ${f(y)}z`
            );
        case "diamond":
            return `M${f(cx)} ${f(y + s * 0.1)}L${f(x + s * 0.9)} ${f(cy)}L${f(cx)} ${f(y + s * 0.9)}L${f(x + s * 0.1)} ${f(cy)}z`;
        case "leaf":
            return (
                `M${f(x)} ${f(y)}L${f(x + s)} ${f(y)}Q${f(x + s)} ${f(y + s * 0.5)} ${f(x + s)} ${f(y + s)}` +
                `L${f(x)} ${f(y + s)}Q${f(x)} ${f(y + s * 0.5)} ${f(x)} ${f(y)}z`
            );
        default:
            return `M${f(x)} ${f(y)}h${f(s)}v${f(s)}h${f(-s)}z`;
    }
}

interface QRLayout {
    size: number;
    bodyPath: string;
    eyePath: string;
}

/** Matriz de módulos → dos paths (cuerpo y ojos) en coordenadas de `size`. */
function buildLayout(options: RenderOptions): QRLayout {
    const { text, size, style, eyeStyle, level, margin = 1 } = options;
    const qrData = QRCode.create(text, { errorCorrectionLevel: level });
    const moduleCount = qrData.modules.size;
    const modules = qrData.modules.data;
    const tileSize = size / (moduleCount + 2 * margin);
    const offset = margin * tileSize;

    const isEye = (row: number, col: number) =>
        (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7);

    let bodyPath = "";
    let eyePath = "";
    for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
            if (!modules[r * moduleCount + c]) continue;
            const x = offset + c * tileSize;
            const y = offset + r * tileSize;
            if (isEye(r, c)) eyePath += moduleShapePath(x, y, tileSize, eyeStyle);
            else bodyPath += moduleShapePath(x, y, tileSize, style);
        }
    }
    return { size, bodyPath, eyePath };
}

/** Extremos de la línea de degradado, igual que CSS `linear-gradient(<angle>)`. Mismos números en canvas y SVG. */
function gradientLine(size: number, angle: number) {
    const rad = (angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (size / 2) * (Math.abs(dx) + Math.abs(dy));
    const c = size / 2;
    return { x1: f(c - dx * half), y1: f(c - dy * half), x2: f(c + dx * half), y2: f(c + dy * half) };
}

const LOGO_RATIO = 0.2; // Corrección H admite ~30% de cobertura.

function logoBox(size: number) {
    const logoSize = size * LOGO_RATIO;
    const pos = (size - logoSize) / 2;
    const pad = logoSize * 0.1;
    return { logoSize, pos, pad, radius: logoSize * 0.2 };
}

export const renderQRToCanvas = async (canvas: HTMLCanvasElement, options: RenderOptions) => {
    const { size, bg, fg, eyeColor = fg, logo, gradient } = options;
    const layout = buildLayout(options);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingEnabled = true;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    if (gradient) {
        const { x1, y1, x2, y2 } = gradientLine(size, gradient.angle);
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, gradient.from);
        g.addColorStop(1, gradient.to);
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = fg;
    }
    ctx.fill(new Path2D(layout.bodyPath));

    // Los ojos siempre sólidos: es lo que los lectores localizan primero.
    ctx.fillStyle = eyeColor;
    ctx.fill(new Path2D(layout.eyePath));

    if (logo) {
        try {
            const img = new Image();
            img.src = logo;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            const { logoSize, pos, pad, radius } = logoBox(size);

            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.roundRect(pos - pad, pos - pad, logoSize + pad * 2, logoSize + pad * 2, radius);
            ctx.fill();
            ctx.shadowColor = "rgba(0,0,0,0.1)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(pos, pos, logoSize, logoSize, radius);
            ctx.clip();
            ctx.drawImage(img, pos, pos, logoSize, logoSize);
            ctx.restore();
            ctx.shadowColor = "transparent";
        } catch (e) {
            console.error("Failed to load logo", e);
        }
    }
};

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Mismo QR como SVG vectorial: misma matriz, mismas formas, mismo degradado.
 * Escala a cualquier tamaño sin pixelarse — es el formato para imprimir.
 */
export const renderQRToSVG = async (options: RenderOptions): Promise<string> => {
    const { size, bg, fg, eyeColor = fg, logo, gradient } = options;
    const layout = buildLayout(options);

    let defs = "";
    let bodyFill = esc(fg);
    if (gradient) {
        const { x1, y1, x2, y2 } = gradientLine(size, gradient.angle);
        defs +=
            `<linearGradient id="qr-g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
            `<stop offset="0" stop-color="${esc(gradient.from)}"/><stop offset="1" stop-color="${esc(gradient.to)}"/></linearGradient>`;
        bodyFill = "url(#qr-g)";
    }

    let logoMarkup = "";
    if (logo) {
        const { logoSize, pos, pad, radius } = logoBox(size);
        defs += `<clipPath id="qr-logo-clip"><rect x="${f(pos)}" y="${f(pos)}" width="${f(logoSize)}" height="${f(logoSize)}" rx="${f(radius)}"/></clipPath>`;
        logoMarkup =
            `<rect x="${f(pos - pad)}" y="${f(pos - pad)}" width="${f(logoSize + pad * 2)}" height="${f(logoSize + pad * 2)}" rx="${f(radius)}" fill="${esc(bg)}"/>` +
            `<image href="${esc(logo)}" xlink:href="${esc(logo)}" x="${f(pos)}" y="${f(pos)}" width="${f(logoSize)}" height="${f(logoSize)}" preserveAspectRatio="none" clip-path="url(#qr-logo-clip)"/>`;
    }

    return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="geometricPrecision">` +
        (defs ? `<defs>${defs}</defs>` : "") +
        `<rect width="${size}" height="${size}" fill="${esc(bg)}"/>` +
        `<path d="${layout.bodyPath}" fill="${bodyFill}"/>` +
        `<path d="${layout.eyePath}" fill="${esc(eyeColor)}"/>` +
        logoMarkup +
        `</svg>`
    );
};
