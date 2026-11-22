import type { WiFiData } from "@/utils/qr-data-formats";

/**
 * Lo que el QR puede llenar solo. Ningún navegador deja leer el nombre ni la clave del Wi-Fi (privacidad): lo más rápido
 * de verdad es leer el QR que el propio celular muestra al «Compartir» la red (Android, y iPhone desde iOS 18).
 */

/** Separa un texto `WIFI:` por `;` respetando los escapes (`\;`, `\,`, `\:`, `\\`, `\"`), como los escribe formatWiFi. */
function campos(texto: string): string[] {
    const out: string[] = [];
    let actual = "";
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i]!;
        if (c === "\\" && i + 1 < texto.length) { actual += texto[++i]; continue; }
        if (c === ";") { out.push(actual); actual = ""; continue; }
        actual += c;
    }
    if (actual) out.push(actual);
    return out;
}

/** Lee el contenido de un QR de Wi-Fi (`WIFI:S:…;T:…;P:…;H:…;;`). Devuelve null si no es de una red o no trae su nombre. */
export function leerWifi(texto: string): WiFiData | null {
    if (!/^WIFI:/i.test(texto.trim())) return null;
    const valores: Record<string, string> = {};
    for (const campo of campos(texto.trim().slice(5))) {
        const i = campo.indexOf(":");
        if (i > 0) valores[campo.slice(0, i).toUpperCase()] = campo.slice(i + 1);
    }
    const ssid = valores.S ?? "";
    if (!ssid) return null;
    const tipo = (valores.T ?? "").toUpperCase();
    // WPA2, WPA3 (SAE) y WPA se configuran igual al escanear: el formato las escribe todas como WPA.
    const encryption: WiFiData["encryption"] = tipo === "WEP" ? "WEP" : tipo === "NOPASS" || (!tipo && !valores.P) ? "nopass" : "WPA";
    const red: WiFiData = { ssid, encryption };
    if (encryption !== "nopass" && valores.P) red.password = valores.P;
    if ((valores.H ?? "").toLowerCase() === "true") red.hidden = true;
    return red;
}

/** «Ana María Pérez» → nombre «Ana María», apellido «Pérez» (el selector de contactos entrega el nombre completo). */
export function separarNombre(completo: string): { nombre: string; apellido: string } {
    const partes = completo.trim().split(/\s+/).filter(Boolean);
    if (partes.length < 2) return { nombre: partes[0] ?? "", apellido: "" };
    return { nombre: partes.slice(0, -1).join(" "), apellido: partes.at(-1)! };
}

/**
 * El texto de un QR dentro de una imagen (foto o captura). Usa el detector nativo del navegador si existe (Chrome en
 * Android y macOS) y, si no, jsQR, que solo se descarga en ese momento. Todo ocurre en el navegador.
 */
export async function leerQrDeImagen(archivo: Blob): Promise<string | null> {
    const imagen = await createImageBitmap(archivo);
    try {
        const Detector = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(i: ImageBitmap): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        if (Detector) {
            try {
                const [primero] = await new Detector({ formats: ["qr_code"] }).detect(imagen);
                if (primero?.rawValue) return primero.rawValue;
            } catch { /* sin soporte para qr_code en este equipo: sigue jsQR */ }
        }
        // Fotos grandes se reducen (jsQR recorre cada píxel); 1600 px de lado sobran para leer un QR.
        const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height));
        const w = Math.max(1, Math.round(imagen.width * escala)), h = Math.max(1, Math.round(imagen.height * escala));
        const lienzo = new OffscreenCanvas(w, h);
        const cx = lienzo.getContext("2d", { willReadFrequently: true });
        if (!cx) return null;
        cx.drawImage(imagen, 0, 0, w, h);
        const { default: jsQR } = await import("jsqr");
        return jsQR(cx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
    } finally {
        imagen.close();
    }
}
