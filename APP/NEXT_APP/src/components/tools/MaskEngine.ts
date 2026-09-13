export interface MaskPoint { x: number; y: number }
export type MaskBrushMode = "erase" | "restore";
export type MaskBackground = { color: string } | { from: string; to: string } | null;

/** Store only alpha, not four channels per pixel. The original remains separately available. */
export class MaskHistory {
    private snapshots: Uint8ClampedArray[];
    private position = 0;
    private readonly limit: number;

    constructor(initial: Uint8ClampedArray, budget = 48 * 1024 * 1024) {
        this.snapshots = [initial.slice()];
        this.limit = Math.max(2, Math.min(25, Math.floor(budget / Math.max(1, initial.byteLength))));
    }

    get canUndo() { return this.position > 0; }
    get canRedo() { return this.position < this.snapshots.length - 1; }
    get current() { return this.snapshots[this.position]; }

    push(alpha: Uint8ClampedArray) {
        if (alpha.length !== this.current.length) throw new Error("La máscara cambió de tamaño.");
        if (alpha.every((value, index) => value === this.current[index])) return;
        this.snapshots.splice(this.position + 1);
        this.snapshots.push(alpha.slice());
        if (this.snapshots.length > this.limit) this.snapshots.shift();
        this.position = this.snapshots.length - 1;
    }

    undo() { if (this.canUndo) this.position -= 1; return this.current; }
    redo() { if (this.canRedo) this.position += 1; return this.current; }
}

export function readMaskAlpha(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Tu navegador no pudo abrir el editor de imagen.");
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let index = 0; index < alpha.length; index++) alpha[index] = rgba[index * 4 + 3];
    return alpha;
}

export function writeMaskAlpha(canvas: HTMLCanvasElement, alpha: Uint8ClampedArray) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No se pudo actualizar el recorte.");
    if (alpha.length !== canvas.width * canvas.height) throw new Error("La máscara cambió de tamaño.");
    const image = context.createImageData(canvas.width, canvas.height);
    for (let index = 0; index < alpha.length; index++) {
        image.data[index * 4] = 255;
        image.data[index * 4 + 1] = 255;
        image.data[index * 4 + 2] = 255;
        image.data[index * 4 + 3] = alpha[index];
    }
    context.putImageData(image, 0, 0);
}

export function createSubjectMask(result: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = result.naturalWidth;
    canvas.height = result.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("No se pudo abrir el resultado.");
    context.drawImage(result, 0, 0);
    const alpha = readMaskAlpha(canvas);
    writeMaskAlpha(canvas, alpha);
    return { canvas, alpha };
}

export function paintMaskStroke(
    canvas: HTMLCanvasElement, from: MaskPoint, to: MaskPoint,
    diameter: number, hardness: number, mode: MaskBrushMode,
) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const radius = Math.max(0.5, diameter / 2);
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.25)));
    context.save();
    context.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
    for (let index = 0; index <= steps; index++) {
        const ratio = index / steps;
        const x = from.x + (to.x - from.x) * ratio;
        const y = from.y + (to.y - from.y) * ratio;
        if (hardness >= 100) {
            context.fillStyle = "white";
        } else {
            const gradient = context.createRadialGradient(x, y, radius * Math.max(0, hardness) / 100, x, y, radius);
            gradient.addColorStop(0, "rgba(255,255,255,1)");
            gradient.addColorStop(1, "rgba(255,255,255,0)");
            context.fillStyle = gradient;
        }
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
}

/** The same composition is used for the live preview and the full resolution download. */
export function composeSubject(
    output: HTMLCanvasElement, original: HTMLImageElement, mask: HTMLCanvasElement,
    background: MaskBackground = null, showMask = false, restoreHint = false,
) {
    const context = output.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    const { width, height } = output;
    context.clearRect(0, 0, width, height);
    if (showMask) {
        context.fillStyle = "#080e17";
        context.fillRect(0, 0, width, height);
        context.drawImage(mask, 0, 0, width, height);
        return;
    }
    context.drawImage(original, 0, 0, width, height);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(mask, 0, 0, width, height);
    context.globalCompositeOperation = "destination-over";
    if (restoreHint) {
        context.globalAlpha = 0.22;
        context.drawImage(original, 0, 0, width, height);
        context.globalAlpha = 1;
    }
    if (background) {
        if ("color" in background) context.fillStyle = background.color;
        else {
            const gradient = context.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, background.from);
            gradient.addColorStop(1, background.to);
            context.fillStyle = gradient;
        }
        context.fillRect(0, 0, width, height);
    }
    context.globalCompositeOperation = "source-over";
}
