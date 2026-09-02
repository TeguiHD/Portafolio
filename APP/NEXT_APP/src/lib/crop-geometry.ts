/**
 * Geometría del recorte "al sujeto". Funciones puras, sin DOM: se prueban
 * en Node y no dependen de react-easy-crop ni de la segmentación.
 */

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SizeLike {
    width: number;
    height: number;
}

/**
 * Caja mínima de los píxeles cuyo alfa supera el umbral. Si se pasa `within`
 * (máscara 0/1 del pincel, misma rejilla), solo cuentan los píxeles pintados:
 * así el pincel elige el sujeto y la segmentación afina sus bordes.
 */
export function bboxFromAlpha(
    alpha: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    threshold = 64,
    within?: Uint8Array | null
): Rect | null {
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
            const i = row + x;
            if (alpha[i] <= threshold) continue;
            if (within && !within[i]) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Caja de una máscara 0/1 (la pincelada sola, cuando no hay segmentación). */
export function bboxFromMask(mask: Uint8Array, width: number, height: number): Rect | null {
    return bboxFromAlpha(mask, width, height, 0);
}

export function scaleRect(rect: Rect, factor: number): Rect {
    return {
        x: Math.round(rect.x * factor),
        y: Math.round(rect.y * factor),
        width: Math.max(1, Math.round(rect.width * factor)),
        height: Math.max(1, Math.round(rect.height * factor)),
    };
}

/**
 * Encuadre final a partir de la caja del sujeto: añade margen, luego amplía al
 * aspecto pedido de modo que el rectángulo CONTENGA al sujeto (nunca lo corta),
 * centrado en él, y por último lo mantiene dentro de la imagen.
 */
export function fitCropToSubject(
    bbox: Rect,
    image: SizeLike,
    opts: { aspect?: number; paddingRatio?: number } = {}
): Rect {
    const pad = opts.paddingRatio ?? 0.08;
    const aspect = opts.aspect && opts.aspect > 0 ? opts.aspect : undefined;

    let w = bbox.width * (1 + 2 * pad);
    let h = bbox.height * (1 + 2 * pad);
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    if (aspect) {
        if (w / h < aspect) w = h * aspect;
        else h = w / aspect;
    }
    if (w > image.width) {
        w = image.width;
        if (aspect) h = w / aspect;
    }
    if (h > image.height) {
        h = image.height;
        if (aspect) w = h * aspect;
    }

    let x = cx - w / 2;
    let y = cy - h / 2;
    x = Math.max(0, Math.min(x, image.width - w));
    y = Math.max(0, Math.min(y, image.height - h));

    return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
}
