/**
 * Revisión propia del Índice de la Web Chilena y del revisor público: doce controles sobre lo que entrega el servidor,
 * sin ejecutar JavaScript (lo mismo que ve un buscador o una IA que no ejecuta código). La misma función mide los sitios
 * del índice y el sitio que alguien revisa, así que la comparación es pareja.
 *
 * Sin dependencias ni imports: la usa también el medidor (scripts/indice/medir.mjs) directo con Node.
 */

export type IdControl =
    | "https" | "redireccion" | "hsts" | "csp" | "marcos" | "nosniff" | "referrer"
    | "lang" | "titulo" | "descripcion" | "viewport" | "alt";

export interface Control {
    id: IdControl;
    grupo: "seguridad" | "basicos";
    nombre: string;
    /** Por qué importa, en una frase, para quien no es técnico. */
    porQue: string;
    /** Qué hacer si falla, en una frase. */
    arreglo: string;
}

export const CONTROLES: Control[] = [
    { id: "https", grupo: "seguridad", nombre: "Conexión cifrada (HTTPS)", porQue: "Sin HTTPS, lo que la gente escribe en el sitio viaja a la vista de cualquiera en la red y el navegador lo marca como no seguro.", arreglo: "Instala un certificado (Let's Encrypt es gratis) y sirve el sitio por HTTPS." },
    { id: "redireccion", grupo: "seguridad", nombre: "De HTTP a HTTPS", porQue: "Quien escribe la dirección sin «https» debe terminar en la versión cifrada, no en una copia sin cifrar.", arreglo: "Redirige todo lo que llega por HTTP a la misma dirección con HTTPS (código 301)." },
    { id: "hsts", grupo: "seguridad", nombre: "HSTS", porQue: "Le dice al navegador que use siempre HTTPS con el sitio, aunque un enlace o una red intenten bajarlo a HTTP.", arreglo: "Agrega la cabecera Strict-Transport-Security con max-age de al menos seis meses." },
    { id: "csp", grupo: "seguridad", nombre: "Política de contenido (CSP)", porQue: "Limita de dónde puede cargar código la página: es la defensa principal si alguien logra inyectar un script.", arreglo: "Publica una cabecera Content-Security-Policy (empieza en modo de reporte y luego aplícala)." },
    { id: "marcos", grupo: "seguridad", nombre: "Protección contra marcos", porQue: "Impide que otro sitio muestre el tuyo dentro de un marco invisible para engañar a la gente (clickjacking).", arreglo: "Agrega X-Frame-Options: SAMEORIGIN o frame-ancestors en la CSP." },
    { id: "nosniff", grupo: "seguridad", nombre: "Tipos de archivo estrictos", porQue: "Evita que el navegador adivine el tipo de un archivo y ejecute como código algo que no lo es.", arreglo: "Agrega la cabecera X-Content-Type-Options: nosniff." },
    { id: "referrer", grupo: "seguridad", nombre: "Política de referencia", porQue: "Controla cuánto de la dirección visitada se comparte con otros sitios al seguir un enlace.", arreglo: "Agrega Referrer-Policy: strict-origin-when-cross-origin." },
    { id: "lang", grupo: "basicos", nombre: "Idioma declarado", porQue: "Los lectores de pantalla y los traductores necesitan saber en qué idioma está la página para leerla bien.", arreglo: "Pon lang=\"es\" (o es-CL) en la etiqueta <html>." },
    { id: "titulo", grupo: "basicos", nombre: "Título de la página", porQue: "Es lo que muestran la pestaña, los buscadores y las IA cuando citan el sitio.", arreglo: "Escribe un <title> que diga qué es el sitio." },
    { id: "descripcion", grupo: "basicos", nombre: "Descripción", porQue: "Es el resumen que usan los buscadores bajo el título; sin ella, lo inventan con cualquier texto de la página.", arreglo: "Agrega <meta name=\"description\"> con una o dos frases sobre el sitio." },
    { id: "viewport", grupo: "basicos", nombre: "Adaptado al celular", porQue: "Sin la etiqueta viewport, el celular muestra la versión de escritorio en miniatura.", arreglo: "Agrega <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." },
    { id: "alt", grupo: "basicos", nombre: "Imágenes con texto alternativo", porQue: "Quien usa lector de pantalla escucha ese texto en vez de la imagen; sin él, no sabe qué hay.", arreglo: "Agrega alt a cada imagen: una descripción breve, o alt=\"\" si es decorativa." },
];

export type ResultadoCabeceras = Pick<Record<IdControl, boolean>, "https" | "hsts" | "csp" | "marcos" | "nosniff" | "referrer">;
export type ResultadoHtml = Pick<Record<IdControl, boolean>, "lang" | "titulo" | "descripcion" | "viewport" | "alt">;
export type ResultadoRevision = Record<IdControl, boolean>;

interface LeeCabeceras { get(nombre: string): string | null }

/** HSTS con max-age mayor que cero, solo si llegó por HTTPS (por HTTP el navegador la ignora). */
export function revisarCabeceras(h: LeeCabeceras, urlFinal: string): ResultadoCabeceras {
    const https = urlFinal.startsWith("https://");
    const hstsValor = h.get("strict-transport-security") ?? "";
    const maxAge = /max-age\s*=\s*"?(\d+)/i.exec(hstsValor);
    const csp = (h.get("content-security-policy") ?? "").trim();
    const xfo = (h.get("x-frame-options") ?? "").trim().toUpperCase();
    const ancestros = /(?:^|;)\s*frame-ancestors\s+([^;]*)/i.exec(csp)?.[1]?.trim() ?? "";
    const referrer = (h.get("referrer-policy") ?? "").toLowerCase();
    return {
        https,
        hsts: https && !!maxAge && Number(maxAge[1]) > 0,
        csp: csp.length > 0,
        marcos: xfo === "DENY" || xfo === "SAMEORIGIN" || (ancestros.length > 0 && !ancestros.split(/\s+/).includes("*")),
        nosniff: /\bnosniff\b/i.test(h.get("x-content-type-options") ?? ""),
        // Cualquier política explícita menos las que comparten la dirección completa con todos.
        referrer: referrer.length > 0 && !/(^|,)\s*unsafe-url\s*$/.test(referrer),
    };
}

/** Lee un atributo de una etiqueta (con comillas dobles, simples o sin comillas). */
function atributo(etiqueta: string, nombre: string): string | null {
    const m = new RegExp(`\\s${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(etiqueta);
    return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

/**
 * Lo básico del HTML que entrega el servidor. Los comentarios, scripts y estilos se quitan antes de buscar.
 * El HTML es de terceros (y en el revisor público, de cualquiera): ningún regex puede volver a recorrer el texto desde
 * cada «<». Un comentario o script sin cerrar corre hasta el final (`|$`) y las etiquetas se cortan en el siguiente «<»;
 * si no, 3 MB de «<html» repetido tomaban minutos y congelaban el servidor (ReDoS, revisión del 23-11-2026).
 */
export function revisarHtml(html: string): ResultadoHtml {
    const limpio = html
        .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
        .replace(/<script\b[\s\S]*?(?:<\/script\s*>|$)/gi, "")
        .replace(/<style\b[\s\S]*?(?:<\/style\s*>|$)/gi, "");
    const htmlTag = /<html\b[^<>]*>/i.exec(limpio)?.[0] ?? "";
    const titulo = /<title\b[^<>]*>([^<]*)/i.exec(limpio)?.[1]?.trim() ?? "";
    const metas = limpio.match(/<meta\b[^<>]*>/gi) ?? [];
    const meta = (nombre: string) => metas.find((m) => (atributo(m, "name") ?? "").toLowerCase() === nombre);
    const descripcion = meta("description");
    const viewport = meta("viewport");
    const imagenes = limpio.match(/<img\b[^<>]*>/gi) ?? [];
    return {
        lang: (atributo(htmlTag, "lang") ?? "").trim().length > 0,
        titulo: titulo.length > 0,
        descripcion: !!descripcion && (atributo(descripcion, "content") ?? "").trim().length > 0,
        viewport: !!viewport && /width\s*=\s*device-width/i.test(atributo(viewport, "content") ?? ""),
        alt: imagenes.every((img) => atributo(img, "alt") !== null),
    };
}

/** Cuántos de los doce controles aprueba. */
export function puntajeRevision(r: ResultadoRevision): number {
    return CONTROLES.reduce((n, c) => n + (r[c.id] ? 1 : 0), 0);
}
