/**
 * Base64 de texto con UTF-8 real. `btoa` solo acepta Latin-1 y lanza con
 * "ñ", "中" o emojis; aquí se pasa por TextEncoder y, cuando el navegador
 * lo trae, por el nativo `Uint8Array.prototype.toBase64` (ES2025).
 */

type WithBase64 = Uint8Array & { toBase64?: () => string };
type Uint8ArrayCtor = typeof Uint8Array & { fromBase64?: (s: string) => Uint8Array };

export function bytesToBase64(bytes: Uint8Array): string {
    const native = bytes as WithBase64;
    if (typeof native.toBase64 === "function") return native.toBase64();
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
    const clean = base64.replace(/\s+/g, "");
    const ctor = Uint8Array as Uint8ArrayCtor;
    if (typeof ctor.fromBase64 === "function") return ctor.fromBase64(clean);
    return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

export function encodeUtf8Base64(text: string): string {
    return bytesToBase64(new TextEncoder().encode(text));
}

export function decodeUtf8Base64(base64: string): string {
    return new TextDecoder("utf-8", { fatal: false }).decode(base64ToBytes(base64));
}
