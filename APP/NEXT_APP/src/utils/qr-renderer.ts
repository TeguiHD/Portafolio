import QRCode from "qrcode";

export type QRStyle = "square" | "dots" | "rounded" | "classy" | "diamond";
export type EyeStyle = "square" | "circle" | "rounded" | "leaf" | "diamond";

interface RenderOptions {
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
}

export const renderQRToCanvas = async (
    canvas: HTMLCanvasElement,
    options: RenderOptions
) => {
    const {
        text,
        size,
        bg,
        fg,
        eyeColor = fg,
        style,
        eyeStyle,
        logo,
        level,
        margin = 1,
    } = options;

    const qrData = QRCode.create(text, {
        errorCorrectionLevel: level,
    });
    const moduleCount = qrData.modules.size;
    const modules = qrData.modules.data;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingEnabled = true;

    const tileSize = size / (moduleCount + 2 * margin);
    const offset = margin * tileSize;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const isEye = (row: number, col: number) => {
        if (row < 7 && col < 7) return true;
        if (row < 7 && col >= moduleCount - 7) return true;
        if (row >= moduleCount - 7 && col < 7) return true;
        return false;
    };

    // Helper to draw different shapes
    const drawShape = (x: number, y: number, shapeStyle: string, _isEyeModule: boolean) => {
        const s = tileSize;
        const cx = x + s / 2;
        const cy = y + s / 2;

        switch (shapeStyle) {
            case "square":
                ctx.fillRect(x - 0.2, y - 0.2, s + 0.4, s + 0.4);
                break;
            case "dots":
            case "circle":
                ctx.beginPath();
                ctx.arc(cx, cy, s / 2.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case "rounded":
                ctx.beginPath();
                ctx.roundRect(x, y, s, s, s * 0.35);
                ctx.fill();
                break;
            case "classy":
                // Rounded on two opposite corners
                ctx.beginPath();
                ctx.moveTo(x + s * 0.3, y);
                ctx.lineTo(x + s, y);
                ctx.lineTo(x + s, y + s * 0.7);
                ctx.quadraticCurveTo(x + s, y + s, x + s * 0.7, y + s);
                ctx.lineTo(x, y + s);
                ctx.lineTo(x, y + s * 0.3);
                ctx.quadraticCurveTo(x, y, x + s * 0.3, y);
                ctx.fill();
                break;
            case "diamond":
                ctx.beginPath();
                ctx.moveTo(cx, y + s * 0.1);
                ctx.lineTo(x + s * 0.9, cy);
                ctx.lineTo(cx, y + s * 0.9);
                ctx.lineTo(x + s * 0.1, cy);
                ctx.closePath();
                ctx.fill();
                break;
            case "leaf":
                // Leaf shape for eyes - rounded on opposite corners
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + s, y);
                ctx.quadraticCurveTo(x + s, y + s * 0.5, x + s, y + s);
                ctx.lineTo(x, y + s);
                ctx.quadraticCurveTo(x, y + s * 0.5, x, y);
                ctx.fill();
                break;
            default:
                ctx.fillRect(x, y, s, s);
        }
    };

    for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
            if (!modules[r * moduleCount + c]) continue;

            const x = offset + c * tileSize;
            const y = offset + r * tileSize;
            const isEyeModule = isEye(r, c);

            ctx.fillStyle = isEyeModule ? eyeColor : fg;
            const currentStyle = isEyeModule ? eyeStyle : style;
            drawShape(x, y, currentStyle, isEyeModule);
        }
    }

    // 6. Draw Logo (if exists)
    if (logo) {
        try {
            const img = new Image();
            img.src = logo;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Logo size relative to QR (e.g., 20% of QR size)
            // Error correction M handles up to 15%, Q up to 25%, H up to 30% coverage
            const logoSize = size * 0.2;
            const logoX = (size - logoSize) / 2;
            const logoY = (size - logoSize) / 2;

            // Draw white background text behind logo for contrast
            // We use a rounded rect for the logo background
            ctx.fillStyle = bg;
            const bgPadding = logoSize * 0.1;
            ctx.beginPath();
            ctx.roundRect(
                logoX - bgPadding,
                logoY - bgPadding,
                logoSize + bgPadding * 2,
                logoSize + bgPadding * 2,
                logoSize * 0.2
            );
            ctx.fill();
            // Shadow
            ctx.shadowColor = "rgba(0,0,0,0.1)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            // Draw Logo image
            // Clip to rounded rect
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(logoX, logoY, logoSize, logoSize, logoSize * 0.2);
            ctx.clip();
            ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
            ctx.restore();

            // Reset shadow
            ctx.shadowColor = "transparent";

        } catch (e) {
            console.error("Failed to load logo", e);
        }
    }
};
