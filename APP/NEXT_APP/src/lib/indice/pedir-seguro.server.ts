import "server-only";
import http from "node:http";
import https from "node:https";
import { lookup as buscarDns, type LookupAddress } from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import zlib from "node:zlib";
import { domainToASCII } from "node:url";
import { nombreReservado } from "@/lib/tools/dns-consulta";
import { ipPermitida } from "./ip-permitida";
import { revisarCabeceras, revisarHtml, type ResultadoRevision } from "./revision";

/**
 * El revisor público pide un sitio que escribe cualquiera: es la puerta clásica de SSRF (que el servidor termine pidiendo
 * algo de la red interna). Defensas, todas a la vez:
 *  - Solo http/https, sin usuario ni contraseña en la URL, sin puertos explícitos, sin IP literales ni nombres locales.
 *  - La resolución DNS la hace un lookup propio que rechaza si CUALQUIER dirección no es pública, y la conexión usa esa
 *    misma dirección (no hay segunda resolución que se pueda cambiar entre medio: DNS rebinding).
 *  - Cada redirección se vuelve a validar igual; máximo 5.
 *  - Tope de tiempo total, tope de bytes leídos (también tras descomprimir) y solo se lee el cuerpo si es HTML.
 */
export type CodigoError = "url" | "privada" | "dns" | "tiempo" | "conexion" | "redirecciones" | "respuesta";
export class ErrorRevision extends Error {
    constructor(public codigo: CodigoError, mensaje: string) { super(mensaje); }
}

const UA = "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const MAX_BYTES = 3_000_000;
const MAX_SALTOS = 5;

/**
 * La IP pública propia (la del router de la casa): se pregunta a Cloudflare cada 10 minutos, porque es dinámica.
 * Si no se puede saber, se sigue sin ella (lo que se perdería es poco: el revisor solo devuelve doce sí/no).
 */
let propia: { ip: string | null; at: number } = { ip: null, at: 0 };
async function ipPropia(): Promise<string | null> {
    if (Date.now() - propia.at < 10 * 60_000) return propia.ip;
    try {
        const t = await (await fetch("https://cloudflare.com/cdn-cgi/trace", { signal: AbortSignal.timeout(3000), cache: "no-store" })).text();
        propia = { ip: /^ip=(.+)$/m.exec(t)?.[1]?.trim() ?? null, at: Date.now() };
    } catch {
        propia = { ip: propia.ip, at: Date.now() - 9 * 60_000 }; // reintenta en un minuto
    }
    return propia.ip;
}

const lookupSeguro: LookupFunction = (nombre, opciones, listo) => {
    buscarDns(nombre, { all: true, family: 0 }, (err, direcciones: LookupAddress[]) => {
        if (err) return listo(err, "", 4);
        if (!direcciones.length || direcciones.some((d) => !ipPermitida(d.address, d.family, propia.ip))) {
            return listo(Object.assign(new Error("IP_NO_PUBLICA"), { code: "IP_NO_PUBLICA" }), "", 4);
        }
        if ((opciones as { all?: boolean }).all) return (listo as unknown as (e: null, d: LookupAddress[]) => void)(null, direcciones);
        listo(null, direcciones[0]!.address, direcciones[0]!.family);
    });
};

/** Valida y normaliza lo que escribe la persona. «ejemplo.cl» → https://ejemplo.cl/. */
export function normalizarUrl(entrada: string): URL {
    const texto = entrada.trim();
    if (!texto || texto.length > 300) throw new ErrorRevision("url", "Escribe la dirección de un sitio, como ejemplo.cl.");
    let url: URL;
    try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(texto) ? texto : `https://${texto}`); } catch { throw new ErrorRevision("url", "Esa dirección no se entiende. Prueba con algo como ejemplo.cl."); }
    validar(url);
    return new URL(`${url.protocol}//${url.host}${url.pathname}${url.search}`);
}

function validar(url: URL) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new ErrorRevision("url", "Solo se revisan direcciones web (http o https).");
    if (url.username || url.password) throw new ErrorRevision("url", "La dirección no puede llevar usuario ni contraseña.");
    if (url.port) throw new ErrorRevision("url", "Solo se revisan sitios en los puertos normales (sin «:puerto» en la dirección).");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host)) throw new ErrorRevision("url", "Escribe el nombre del sitio, no una dirección IP.");
    const ascii = domainToASCII(host);
    if (!ascii || !ascii.includes(".") || nombreReservado(ascii)) throw new ErrorRevision("url", "Ese no es el nombre de un sitio público.");
}

interface Respuesta { estado: number; cabeceras: Headers; cuerpo: string; url: string }

function cabecerasDe(m: http.IncomingMessage): Headers {
    const h = new Headers();
    for (const [k, v] of Object.entries(m.headers)) if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(", ") : v);
    return h;
}

/** Una sola petición, sin seguir redirecciones. Lee el cuerpo solo si es HTML y `leer` lo pide. */
function pedirUna(url: URL, senal: AbortSignal, leer: boolean): Promise<Respuesta> {
    validar(url);
    const modulo = url.protocol === "https:" ? https : http;
    return new Promise((resolver, rechazar) => {
        const req = modulo.request(url, {
            method: "GET", lookup: lookupSeguro, signal: senal, agent: false,
            headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8", "accept-encoding": "gzip, deflate, br", "accept-language": "es-CL,es;q=0.9" },
        }, (res) => {
            const cabeceras = cabecerasDe(res), estado = res.statusCode ?? 0;
            const esHtml = /text\/html|application\/xhtml/i.test(cabeceras.get("content-type") ?? "");
            // Lo que no se lee se corta: con resume() el cuerpo seguía bajando (hasta 15 s y sin tope) después de responder.
            if (!leer || !esHtml || (estado >= 300 && estado < 400)) { res.destroy(); return resolver({ estado, cabeceras, cuerpo: "", url: url.href }); }
            const cod = (cabeceras.get("content-encoding") ?? "").toLowerCase();
            const flujo = cod.includes("br") ? res.pipe(zlib.createBrotliDecompress()) : cod.includes("gzip") ? res.pipe(zlib.createGunzip()) : cod.includes("deflate") ? res.pipe(zlib.createInflate()) : res;
            const partes: Buffer[] = []; let total = 0, cerrado = false;
            const terminar = () => { if (cerrado) return; cerrado = true; resolver({ estado, cabeceras, cuerpo: Buffer.concat(partes).toString("utf8"), url: url.href }); };
            flujo.on("data", (b: Buffer) => {
                if (cerrado) return;
                partes.push(b); total += b.length;
                // Se corta la respuesta Y el descompresor: si no, una bomba brotli seguía descomprimiendo cientos de MB
                // en el grupo de hilos de Node después de responder.
                if (total >= MAX_BYTES) { terminar(); res.destroy(); if (flujo !== res) flujo.destroy(); }
            });
            flujo.on("end", terminar);
            flujo.on("error", () => terminar());
        });
        req.on("error", (e: NodeJS.ErrnoException) => {
            if (e.code === "IP_NO_PUBLICA") return rechazar(new ErrorRevision("privada", "Ese sitio apunta a una red privada: solo se revisan sitios públicos."));
            if (e.name === "AbortError" || e.code === "ABORT_ERR") return rechazar(new ErrorRevision("tiempo", "El sitio tardó demasiado en responder."));
            if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN") return rechazar(new ErrorRevision("dns", "Ese dominio no existe o no tiene dirección publicada."));
            rechazar(new ErrorRevision("conexion", "No se pudo conectar con el sitio."));
        });
        req.end();
    });
}

/** Sigue redirecciones validando cada salto. */
async function pedir(inicio: URL, senal: AbortSignal): Promise<Respuesta> {
    let url = inicio;
    for (let salto = 0; salto <= MAX_SALTOS; salto++) {
        const r = await pedirUna(url, senal, true);
        const destino = r.estado >= 300 && r.estado < 400 ? r.cabeceras.get("location") : null;
        if (!destino) return r;
        try { url = new URL(destino, url); } catch { throw new ErrorRevision("respuesta", "El sitio redirige a una dirección inválida."); }
    }
    throw new ErrorRevision("redirecciones", "El sitio redirige demasiadas veces.");
}

/** ¿La versión HTTP lleva a la HTTPS? Si HTTP no responde, no hay versión sin cifrar: aprueba (igual que el medidor). */
async function redirigeAHttps(host: string, senal: AbortSignal): Promise<boolean> {
    let url = new URL(`http://${host}/`);
    try {
        for (let salto = 0; salto <= MAX_SALTOS; salto++) {
            const r = await pedirUna(url, senal, false);
            const destino = r.estado >= 300 && r.estado < 400 ? r.cabeceras.get("location") : null;
            if (!destino) return false;
            url = new URL(destino, url);
            if (url.protocol === "https:") return true;
        }
        return false;
    } catch (e) {
        if (e instanceof ErrorRevision && e.codigo === "privada") throw e;
        // Sin respuesta por HTTP no hay versión sin cifrar; una redirección a algo inválido no cuenta como ir a HTTPS.
        return e instanceof ErrorRevision && (e.codigo === "conexion" || e.codigo === "tiempo");
    }
}

export interface RevisionSitio { url: string; urlFinal: string; estado: number; revision: ResultadoRevision }

/** La revisión completa de un sitio, con un tope de 15 s en total. */
export async function revisarSitio(entrada: string): Promise<RevisionSitio> {
    const url = normalizarUrl(entrada);
    await ipPropia();
    const senal = AbortSignal.timeout(15_000);
    const r = await pedir(url, senal);
    if (r.estado >= 400) throw new ErrorRevision("respuesta", `El sitio respondió con un error (${r.estado}).`);
    const final = new URL(r.url);
    const [cab, html, redireccion] = [revisarCabeceras(r.cabeceras, r.url), revisarHtml(r.cuerpo), await redirigeAHttps(final.host, AbortSignal.timeout(8_000))];
    return { url: url.href, urlFinal: r.url, estado: r.estado, revision: { ...cab, redireccion, ...html } };
}
