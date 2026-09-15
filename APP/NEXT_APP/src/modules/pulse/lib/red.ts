/**
 * Peticiones a terceros del Pulse, con las tres reglas que faltaban: plazo máximo,
 * tamaño máximo y destino comprobado.
 *
 * Todo lo que hay aquí sale del servidor hacia servicios que no controlamos (feeds,
 * APIs públicas, páginas de noticias enlazadas desde un RSS). Sin plazo, una sola
 * respuesta lenta bloquea la página entera; sin tope de tamaño, una respuesta enorme
 * agota la memoria; y sin comprobar el destino, una URL venida de un feed puede
 * apuntar a la red interna del propio servidor.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const AGENTE = "nicoholas-digital-pulse";
/** Tope por respuesta: los feeds más gordos rondan los 300 KB. */
const MAX_BYTES = 2_000_000;

export class ErrorDeRed extends Error {
  constructor(public readonly url: string, mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeRed";
  }
}

/** Rangos que nunca deben alcanzarse desde una URL de terceros. */
function esIpPrivada(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // únicas locales
    if (v.startsWith("fe80")) return true; // enlace local
    // IPv4 embebida (::ffff:10.0.0.1)
    const embebida = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (embebida) return esIpPrivada(embebida[1]);
    return false;
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // enlace local y metadatos de la nube
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multidifusión y reservados
  return false;
}

/**
 * Deja pasar solo http(s) hacia una dirección pública. Resuelve el nombre para que
 * un dominio que apunta a 127.0.0.1 o a 169.254.169.254 no pase el filtro.
 */
export async function destinoPermitido(url: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.port && !["", "80", "443", "8080", "8443"].includes(u.port)) return false;
  const anfitrion = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(anfitrion)) return !esIpPrivada(anfitrion);
  if (anfitrion === "localhost" || anfitrion.endsWith(".local") || anfitrion.endsWith(".internal")) return false;
  try {
    const direcciones = await lookup(anfitrion, { all: true });
    return direcciones.length > 0 && direcciones.every((d) => !esIpPrivada(d.address));
  } catch {
    return false;
  }
}

interface Opciones {
  /** Segundos que Next puede reutilizar la respuesta. */
  revalidate?: number;
  /** Plazo máximo en milisegundos. */
  plazo?: number;
  cabeceras?: Record<string, string>;
  /** Comprueba el destino antes de salir (para URLs que vienen de terceros). */
  comprobarDestino?: boolean;
  /** Tipos de contenido aceptados; si no encaja, se descarta la respuesta. */
  tipos?: string[];
}

async function pedir(url: string, { revalidate, plazo = 6000, cabeceras, comprobarDestino, tipos }: Opciones) {
  if (comprobarDestino && !(await destinoPermitido(url))) {
    throw new ErrorDeRed(url, "destino no permitido");
  }
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      headers: { "User-Agent": AGENTE, ...cabeceras },
      redirect: "follow",
      signal: AbortSignal.timeout(plazo),
      ...(revalidate === undefined ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
  } catch (error) {
    throw new ErrorDeRed(url, error instanceof Error && error.name === "TimeoutError" ? `sin respuesta en ${plazo} ms` : "no se pudo conectar");
  }
  if (!respuesta.ok) throw new ErrorDeRed(url, `respuesta ${respuesta.status}`);
  if (tipos) {
    const tipo = (respuesta.headers.get("content-type") ?? "").toLowerCase();
    if (!tipos.some((t) => tipo.includes(t))) throw new ErrorDeRed(url, `tipo inesperado: ${tipo || "sin tipo"}`);
  }
  const declarado = Number(respuesta.headers.get("content-length") ?? 0);
  if (declarado > MAX_BYTES) throw new ErrorDeRed(url, "respuesta demasiado grande");
  return respuesta;
}

/** Lee como mucho MAX_BYTES, aunque el servidor no declare el tamaño. */
async function leerAcotado(respuesta: Response, url: string): Promise<string> {
  const cuerpo = respuesta.body;
  if (!cuerpo) return "";
  const lector = cuerpo.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await lector.cancel();
        throw new ErrorDeRed(url, "respuesta demasiado grande");
      }
      trozos.push(value);
    }
  } finally {
    lector.releaseLock();
  }
  return new TextDecoder("utf-8").decode(await new Blob(trozos as BlobPart[]).arrayBuffer());
}

export async function pedirJson<T>(url: string, opciones: Opciones = {}): Promise<T> {
  const respuesta = await pedir(url, { tipos: ["json"], ...opciones, cabeceras: { Accept: "application/json", ...opciones.cabeceras } });
  const texto = await leerAcotado(respuesta, url);
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErrorDeRed(url, "JSON ilegible");
  }
}

export async function pedirTexto(url: string, opciones: Opciones = {}): Promise<string> {
  const respuesta = await pedir(url, opciones);
  return leerAcotado(respuesta, url);
}

interface Guardado<T> {
  valor: T;
  momento: number;
}

/**
 * Memoria del proceso con respaldo: sirve lo fresco, y si la fuente falla devuelve lo
 * último bueno mientras no esté rancio del todo. Evita que un 429 de la fuente deje la
 * sección en blanco.
 */
export function crearCache<T>(nombre: string, frescoMs: number, rancioMs: number) {
  let guardado: Guardado<T> | null = null;
  return {
    nombre,
    async leer(cargar: () => Promise<T>, forzar = false): Promise<{ valor: T; cacheado: boolean; rancio: boolean }> {
      const ahora = Date.now();
      if (guardado && !forzar && ahora - guardado.momento < frescoMs) {
        return { valor: guardado.valor, cacheado: true, rancio: false };
      }
      try {
        const valor = await cargar();
        guardado = { valor, momento: ahora };
        return { valor, cacheado: false, rancio: false };
      } catch (error) {
        if (guardado && ahora - guardado.momento < rancioMs) {
          return { valor: guardado.valor, cacheado: true, rancio: true };
        }
        throw error;
      }
    },
  };
}
