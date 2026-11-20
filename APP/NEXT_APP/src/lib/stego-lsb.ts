/**
 * Esteganografía LSB: núcleo puro sin DOM. Lo usan el Web Worker y el
 * respaldo en hilo principal, y se prueba en Node sobre arreglos RGBA.
 */

export interface RgbaBuffer {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

// SECURITY(CWE-400): límites contra agotamiento de recursos
export const MAX_MESSAGE_LENGTH = 50000;
export const MAGIC_HEADER = [0x53, 0x54, 0x47, 0x4f]; // "STGO"

export function calculateCapacityBytes(width: number, height: number): number {
    const totalBits = width * height * 3;
    const headerBits = (MAGIC_HEADER.length + 4) * 8;
    return Math.max(0, Math.floor((totalBits - headerBits) / 8));
}

/** Estimación conservadora: ~2 bytes por carácter para texto internacional. */
export function calculateCapacity(width: number, height: number): number {
    return Math.floor(calculateCapacityBytes(width, height) / 2);
}

/**
 * Recorre los canales R, G y B de los píxeles opacos y entrega su posición en `data` (-1 al final).
 * Un píxel con transparencia pierde sus bits bajos al pasar por el lienzo, que guarda el color premultiplicado por el
 * alfa: si el mensaje cae ahí, se borra al exportar. En una imagen sin transparencia el orden es el mismo de siempre.
 */
function recorrido(data: Uint8ClampedArray): () => number {
    let pixel = 0;
    let canal = 0;
    return () => {
        while (pixel * 4 < data.length) {
            if (canal < 3 && data[pixel * 4 + 3] === 255) return pixel * 4 + canal++;
            pixel += 1;
            canal = 0;
        }
        return -1;
    };
}

function contarOpacos(data: Uint8ClampedArray): number {
    let opacos = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 255) opacos += 1;
    return opacos;
}

function readByte(data: Uint8ClampedArray, siguiente: () => number): number {
    let byte = 0;
    for (let bit = 7; bit >= 0; bit--) {
        const indice = siguiente();
        byte |= (indice < 0 ? 0 : data[indice] & 1) << bit;
    }
    return byte;
}

/** Devuelve una copia de los píxeles con el mensaje en los LSB de R, G y B. */
export function encodeMessage(image: RgbaBuffer, message: string): Uint8ClampedArray<ArrayBuffer> | { error: string } {
    const messageBytes = new TextEncoder().encode(message);
    const payload = new Uint8Array(MAGIC_HEADER.length + 4 + messageBytes.length);
    payload.set(MAGIC_HEADER, 0);
    const lengthOffset = MAGIC_HEADER.length;
    payload[lengthOffset] = (messageBytes.length >>> 24) & 0xff;
    payload[lengthOffset + 1] = (messageBytes.length >>> 16) & 0xff;
    payload[lengthOffset + 2] = (messageBytes.length >>> 8) & 0xff;
    payload[lengthOffset + 3] = messageBytes.length & 0xff;
    payload.set(messageBytes, lengthOffset + 4);

    const totalBitsNeeded = payload.length * 8;
    const pixeles = image.width * image.height;
    const opacos = contarOpacos(image.data);
    if (totalBitsNeeded > opacos * 3) {
        const necesarios = Math.ceil(totalBitsNeeded / 3).toLocaleString("es-CL");
        return {
            error: opacos < pixeles
                ? `El mensaje no cabe: las zonas transparentes no pueden guardar datos. Necesitas al menos ${necesarios} píxeles opacos y esta imagen tiene ${opacos.toLocaleString("es-CL")}.`
                : `La imagen es muy pequeña. Necesitas al menos ${necesarios} píxeles. Esta imagen tiene ${pixeles.toLocaleString("es-CL")} píxeles.`,
        };
    }

    const data = new Uint8ClampedArray(image.data.length);
    data.set(image.data);
    const siguiente = recorrido(data);
    for (let byteIdx = 0; byteIdx < payload.length; byteIdx++) {
        for (let bit = 7; bit >= 0; bit--) {
            const dataIndex = siguiente();
            data[dataIndex] = (data[dataIndex] & 0xfe) | ((payload[byteIdx] >> bit) & 1);
        }
    }
    return data;
}

export function decodeMessage(image: RgbaBuffer): { message: string; messageBytes: number } | { error: string } {
    const { data } = image;
    const totalBitsAvailable = contarOpacos(data) * 3;
    const siguiente = recorrido(data);

    for (let i = 0; i < MAGIC_HEADER.length; i++) {
        if (readByte(data, siguiente) !== MAGIC_HEADER[i]) {
            return { error: "No se encontró ningún mensaje oculto en esta imagen." };
        }
    }

    let messageLength = 0;
    for (let i = 0; i < 4; i++) {
        messageLength = (messageLength << 8) | readByte(data, siguiente);
    }
    messageLength >>>= 0;

    // SECURITY(CWE-20): validar longitud antes de leer
    if (messageLength <= 0 || messageLength > MAX_MESSAGE_LENGTH * 4) {
        return { error: "Los datos del mensaje están corruptos o no son válidos." };
    }
    if ((MAGIC_HEADER.length + 4 + messageLength) * 8 > totalBitsAvailable) {
        return { error: "La imagen no contiene suficientes datos para el mensaje indicado." };
    }

    const messageBytes = new Uint8Array(messageLength);
    for (let i = 0; i < messageLength; i++) {
        messageBytes[i] = readByte(data, siguiente);
    }
    return { message: new TextDecoder("utf-8", { fatal: false }).decode(messageBytes), messageBytes: messageLength };
}
