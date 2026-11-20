// Firma electrónica simple de cotizaciones por el cliente (Ley 19.799).
//
// El cliente firma desde /cotizacion/<cliente>/<cotización>: dibuja su firma o sube una imagen,
// y el navegador la entrega siempre como PNG. Aquí se limpia ese PNG, se calcula la huella del
// documento y se arma la versión firmada que ve el cliente y que se imprime.
import "server-only";
import { createHash } from "crypto";
import { crc32 } from "zlib";
import type { FormularioFirma, RespuestasFirma } from "@/lib/formulario-firma";

const PREFIJO_PNG = "data:image/png;base64,";
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Solo los bloques que hacen falta para dibujar la imagen: nada de texto, metadatos ni perfiles.
const BLOQUES_PERMITIDOS = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
/** Marca de las firmas hechas desde el portal (ClientApproval.fingerprint): solo esas se muestran ahí. */
export const MARCA_PORTAL = "portal-cotizacion";
export const MAX_BASE64_FIRMA = 800_000; // ~600 KB de PNG; el límite del cuerpo de la acción es 1 MB
const MAX_ANCHO = 2400;
const MAX_ALTO = 1200;

/**
 * Devuelve el PNG reconstruido solo con sus bloques de imagen, o null si no es un PNG válido.
 * Cada bloque se valida con su CRC; lo que no sea imagen se descarta.
 */
export function limpiarPngFirma(dataUrl: string): string | null {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith(PREFIJO_PNG)) return null;
    const base64 = dataUrl.slice(PREFIJO_PNG.length);
    if (base64.length === 0 || base64.length > MAX_BASE64_FIRMA || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;

    const datos = Buffer.from(base64, "base64");
    if (datos.length < FIRMA_PNG.length + 12 || !datos.subarray(0, 8).equals(FIRMA_PNG)) return null;

    const partes: Buffer[] = [FIRMA_PNG];
    let pos = 8;
    let vioIhdr = false;
    let vioIdat = false;
    let vioFin = false;

    while (pos + 12 <= datos.length) {
        const largo = datos.readUInt32BE(pos);
        const tipo = datos.toString("latin1", pos + 4, pos + 8);
        const fin = pos + 12 + largo;
        if (largo > datos.length || fin > datos.length) return null;

        const crcLeido = datos.readUInt32BE(pos + 8 + largo);
        if (crc32(datos.subarray(pos + 4, pos + 8 + largo)) !== crcLeido) return null;

        if (!vioIhdr) {
            if (tipo !== "IHDR" || largo !== 13) return null;
            const ancho = datos.readUInt32BE(pos + 8);
            const alto = datos.readUInt32BE(pos + 12);
            if (ancho < 1 || alto < 1 || ancho > MAX_ANCHO || alto > MAX_ALTO) return null;
            vioIhdr = true;
        }
        if (tipo === "IDAT") vioIdat = true;
        if (BLOQUES_PERMITIDOS.has(tipo)) partes.push(datos.subarray(pos, fin));

        pos = fin;
        if (tipo === "IEND") {
            vioFin = true;
            break;
        }
    }

    if (!vioIhdr || !vioIdat || !vioFin) return null;
    return PREFIJO_PNG + Buffer.concat(partes).toString("base64");
}

/** Huella SHA-256 del contenido tal como está guardado. Si cambia, la firma ya no le corresponde. */
export function huellaDocumento(html: string): string {
    return createHash("sha256").update(html ?? "", "utf8").digest("hex");
}

export interface DatosFirma {
    nombre: string;
    rut: string;
    imagen: string;
    fecha: Date;
    huella: string;
    /** Lo que el cliente completó al firmar, para dejarlo en su lugar dentro del documento. */
    respuestas?: { formulario: FormularioFirma; valores: RespuestasFirma };
}

/** «22 de octubre de 2026 a las 18:42», en hora de Chile. */
export function fechaFirma(fecha: Date): string {
    const dia = new Intl.DateTimeFormat("es-CL", {
        day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago",
    }).format(fecha);
    const hora = new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago",
    }).format(fecha);
    return `${dia} a las ${hora}`;
}

/**
 * La versión firmada del documento. Si la cotización trae un espacio marcado con
 * `data-firma-cliente`, la firma va ahí; si no, se agrega una constancia al final.
 * Los datos del firmante y sus respuestas se insertan como texto (nunca como HTML).
 */
export async function insertarFirma(html: string, firma: DatosFirma): Promise<string> {
    // JSDOM pesa decenas de MB: se carga solo cuando hay una firma que insertar.
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const bloque = doc.createElement("div");
    bloque.setAttribute("style", "display:flex;flex-direction:column");

    const espacio = doc.createElement("div");
    espacio.setAttribute("style", "height:76px;display:flex;align-items:flex-end;padding-bottom:6px");
    const img = doc.createElement("img");
    img.setAttribute("src", firma.imagen);
    img.setAttribute("alt", `Firma de ${firma.nombre}`);
    img.setAttribute("style", "max-height:70px;max-width:100%;width:auto;display:block");
    espacio.appendChild(img);

    const linea = doc.createElement("div");
    linea.setAttribute("style", "border-top:1px solid #98A2B3;padding-top:8px;font-size:9.6pt;line-height:1.45");
    const nombre = doc.createElement("b");
    nombre.setAttribute("style", "display:block;color:#0B0F14;font-weight:700");
    nombre.textContent = firma.nombre;
    const rut = doc.createElement("span");
    rut.setAttribute("style", "display:block;color:#5D6B7E");
    rut.textContent = `RUT ${firma.rut}`;
    const cuando = doc.createElement("span");
    cuando.setAttribute("style", "display:block;color:#5D6B7E");
    cuando.textContent = `Firmado electrónicamente el ${fechaFirma(firma.fecha)}`;
    const huella = doc.createElement("span");
    huella.setAttribute("style", "display:block;color:#98A2B3;font-size:7.5pt;word-break:break-all");
    huella.textContent = `Huella del documento: ${firma.huella.slice(0, 16)}`;
    linea.append(nombre, rut, cuando, huella);

    bloque.append(espacio, linea);

    // Las claves vienen validadas ([a-z0-9_]), así que van seguras dentro del selector.
    const formulario = firma.respuestas?.formulario;
    const valores: RespuestasFirma = firma.respuestas?.valores ?? {};
    for (const campo of formulario?.campos ?? []) {
        if (!valores[campo.clave]) continue;
        doc.querySelectorAll(`[data-campo-cliente="${campo.clave}"]`).forEach((el) => { el.textContent = valores[campo.clave]; });
    }
    for (const opcion of formulario?.opciones ?? []) {
        const elegido = valores[opcion.clave];
        if (!elegido) continue;
        doc.querySelectorAll(`[data-opcion-cliente="${opcion.clave}"]`).forEach((el) => {
            el.replaceChildren(...opcion.valores.map((valor) => {
                const marcada = valor === elegido;
                const item = doc.createElement("span");
                item.setAttribute("style", `display:inline-flex;align-items:center;gap:5px;margin-right:14px;${marcada ? "color:#0B0F14;font-weight:700" : ""}`);
                const casilla = doc.createElement("i");
                casilla.setAttribute("style", `display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid ${marcada ? "#0B0F14;background:#0B0F14" : "#98A2B3"}`);
                item.append(casilla, valor);
                return item;
            }));
        });
    }

    const destino = doc.querySelector("[data-firma-cliente]");
    if (destino) {
        destino.replaceChildren(bloque);
    } else {
        const constancia = doc.createElement("section");
        constancia.setAttribute(
            "style",
            "max-width:780px;margin:32px auto 0;padding:20px 24px;border-top:1px solid #E4E9EF;font-family:Inter,system-ui,sans-serif;break-inside:avoid",
        );
        const titulo = doc.createElement("p");
        titulo.setAttribute("style", "font-weight:700;color:#0B0F14;margin:0 0 10px");
        titulo.textContent = "Constancia de aceptación";
        const contenedor = doc.createElement("div");
        contenedor.setAttribute("style", "max-width:320px");
        contenedor.appendChild(bloque);
        constancia.append(titulo, contenedor);
        (doc.body ?? doc.documentElement).appendChild(constancia);
    }

    return dom.serialize();
}

/**
 * Costo de argon2 para los códigos de acceso de cotizaciones. Son aleatorios (no los elige una
 * persona), así que alcanza el mínimo de OWASP (19 MiB, 2 pasadas). Con los 64 MiB por omisión,
 * en el VPS de 1 GB con memoria en swap, cambiar el tipo de acceso tardaba 4–5 s.
 */
export const ARGON2_CODIGO = { type: 2 as const, memoryCost: 19456, timeCost: 2, parallelism: 1 };
