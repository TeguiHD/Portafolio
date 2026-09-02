/**
 * QR con realidad aumentada: validación de parámetros y construcción de los
 * lanzadores nativos. Sin dependencias, sin estado, y el servidor NUNCA
 * descarga el modelo: solo emite URLs que el visor nativo del teléfono abre.
 *
 * Diseño: docs/superpowers/specs/2026-08-05-qr-ar-design.md
 */

export interface ArModel {
    title: string;
    glb?: string;
    usdz?: string;
    poster?: string;
}

export type ArPlatform = "ios" | "android" | "other";

const MAX_URL = 2048;
const MAX_TITLE = 80;
const MODEL_ANDROID = [".glb", ".gltf"];
const MODEL_IOS = [".usdz"];
const POSTER = [".png", ".jpg", ".jpeg", ".webp"];
/** Quita caracteres de control (C0 y DEL) sin regex: legible y sin excepciones de lint. */
function stripControlChars(value: string): string {
    return Array.from(value)
        .filter((ch) => {
            const code = ch.charCodeAt(0);
            return code > 31 && code !== 127;
        })
        .join("");
}

/** Solo https, extensión en lista blanca sobre el pathname parseado, longitud acotada, sin credenciales. */
function httpsUrl(raw: unknown, allowedExt: string[]): string | undefined {
    if (typeof raw !== "string") return undefined;
    const value = raw.trim();
    if (!value || value.length > MAX_URL) return undefined;
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return undefined;
    }
    if (url.protocol !== "https:") return undefined;
    if (!url.hostname || url.username || url.password) return undefined;
    const path = url.pathname.toLowerCase();
    if (!allowedExt.some((ext) => path.endsWith(ext))) return undefined;
    return url.href;
}

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

/** Modelo validado, o null si no hay nada utilizable. Nunca refleja la entrada cruda. */
export function parseArParams(sp: Record<string, string | string[] | undefined>): ArModel | null {
    const glb = httpsUrl(first(sp.glb), MODEL_ANDROID);
    const usdz = httpsUrl(first(sp.usdz), MODEL_IOS);
    if (!glb && !usdz) return null;
    const poster = httpsUrl(first(sp.p), POSTER);
    const rawTitle = first(sp.t);
    const title = typeof rawTitle === "string" ? stripControlChars(rawTitle).trim().slice(0, MAX_TITLE) : "";
    return { title: title || "Modelo 3D", glb, usdz, poster };
}

export function detectPlatform(userAgent: string): ArPlatform {
    if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
    if (/Android/i.test(userAgent)) return "android";
    return "other";
}

/** Fallback web de Scene Viewer cuando la app de Google no está instalada. */
export function sceneViewerFallback(glb: string): string {
    return `https://arvr.google.com/scene-viewer?file=${encodeURIComponent(glb)}&mode=ar_preferred`;
}

/** Intent de Android que abre Scene Viewer en modo AR con el .glb. */
export function sceneViewerIntent(glb: string, title: string): string {
    const params = `file=${encodeURIComponent(glb)}&mode=ar_preferred&title=${encodeURIComponent(title)}`;
    return (
        `intent://arvr.google.com/scene-viewer/1.0?${params}` +
        `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;` +
        `S.browser_fallback_url=${encodeURIComponent(sceneViewerFallback(glb))};end;`
    );
}

/** Query canónica de un modelo válido (la misma que produce el generador). */
export function arQuery(model: ArModel): string {
    const q = new URLSearchParams();
    if (model.title && model.title !== "Modelo 3D") q.set("t", model.title);
    if (model.glb) q.set("glb", model.glb);
    if (model.usdz) q.set("usdz", model.usdz);
    if (model.poster) q.set("p", model.poster);
    return q.toString();
}
