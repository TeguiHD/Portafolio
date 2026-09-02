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

function readByte(data: Uint8ClampedArray, bitIndex: number): number {
    let byte = 0;
    for (let bit = 7; bit >= 0; bit--) {
        const pixelIndex = Math.floor(bitIndex / 3);
        const channelOffset = bitIndex % 3;
        byte |= (data[pixelIndex * 4 + channelOffset] & 1) << bit;
        bitIndex++;
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
    const totalBitsAvailable = image.width * image.height * 3;
    if (totalBitsNeeded > totalBitsAvailable) {
        return {
            error:
                `La imagen es muy pequeña. Necesitas al menos ${Math.ceil(totalBitsNeeded / 3)} píxeles. ` +
                `Esta imagen tiene ${image.width * image.height} píxeles.`,
        };
    }

    const data = new Uint8ClampedArray(image.data.length);
    data.set(image.data);
    let bitIndex = 0;
    for (let byteIdx = 0; byteIdx < payload.length; byteIdx++) {
        for (let bit = 7; bit >= 0; bit--) {
            const pixelIndex = Math.floor(bitIndex / 3);
            const dataIndex = pixelIndex * 4 + (bitIndex % 3);
            data[dataIndex] = (data[dataIndex] & 0xfe) | ((payload[byteIdx] >> bit) & 1);
            bitIndex++;
        }
    }
    return data;
}

export function decodeMessage(image: RgbaBuffer): { message: string; messageBytes: number } | { error: string } {
    const { data } = image;
    const totalBitsAvailable = image.width * image.height * 3;
    let bitIndex = 0;

    for (let i = 0; i < MAGIC_HEADER.length; i++) {
        if (readByte(data, bitIndex) !== MAGIC_HEADER[i]) {
            return { error: "No se encontró ningún mensaje oculto en esta imagen." };
        }
        bitIndex += 8;
    }

    let messageLength = 0;
    for (let i = 0; i < 4; i++) {
        messageLength = (messageLength << 8) | readByte(data, bitIndex);
        bitIndex += 8;
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
        messageBytes[i] = readByte(data, bitIndex);
        bitIndex += 8;
    }
    return { message: new TextDecoder("utf-8", { fatal: false }).decode(messageBytes), messageBytes: messageLength };
}
