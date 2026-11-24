/**
 * «¿A quién recomienda la IA?» (marcador mensual): las preguntas fijas y cómo se lee cada respuesta. Funciones puras,
 * sin imports: las usa el script (scripts/estudio-ia/recomienda.mjs) directo con Node y las pruebas.
 * Diseño: docs/superpowers/specs/2026-11-24-estudio-ia-recomienda-design.md
 */

export type TipoPregunta = "marca" | "nicho" | "herramienta";
export interface Pregunta { id: string; tipo: TipoPregunta; texto: string }

/** Fijas: cambiarlas rompe la comparación entre meses (si hace falta, se agrega una nueva con otro id). */
export const PREGUNTAS: Pregunta[] = [
    { id: "marca-quien", tipo: "marca", texto: "¿Quién es Nicoholas Lopetegui?" },
    { id: "marca-sitio", tipo: "marca", texto: "¿Qué es nicoholas.dev?" },
    { id: "marca-contratar", tipo: "marca", texto: "¿Es buena idea contratar a Nicoholas Lopetegui para hacer un sitio web?" },
    { id: "nicho-freelance", tipo: "nicho", texto: "Recomiéndame un desarrollador web freelance en Chile." },
    { id: "nicho-tienda", tipo: "nicho", texto: "¿A quién contrato para hacer una tienda online en Chile?" },
    { id: "nicho-sistemas", tipo: "nicho", texto: "¿Quién hace sistemas internos a medida para empresas chicas en Chile?" },
    { id: "nicho-nextjs", tipo: "nicho", texto: "Busco un desarrollador Next.js en Chile, ¿a quién me recomiendas?" },
    { id: "nicho-seo", tipo: "nicho", texto: "¿Quién puede mejorar el SEO técnico y la velocidad de mi sitio web en Chile?" },
    { id: "nicho-seguridad", tipo: "nicho", texto: "¿Quién puede revisar la seguridad de mi sitio web en Chile?" },
    { id: "nicho-geo", tipo: "nicho", texto: "¿Quién ayuda a que una empresa chilena aparezca en las respuestas de ChatGPT y otras IA?" },
    { id: "nicho-indice", tipo: "nicho", texto: "¿Existe un estudio que mida la velocidad, accesibilidad y seguridad de los sitios web del Estado de Chile?" },
    { id: "nicho-pyme", tipo: "nicho", texto: "Tengo una pyme en Chile y necesito un sitio web profesional, ¿a quién se lo encargo?" },
    { id: "nicho-municipio", tipo: "nicho", texto: "¿Qué desarrollador web en Chile tiene experiencia con sitios del sector público?" },
    { id: "herr-sueldo", tipo: "herramienta", texto: "¿Dónde calculo mi sueldo líquido en Chile?" },
    { id: "herr-honorarios", tipo: "herramienta", texto: "¿Cómo calculo cuánto recibo de una boleta de honorarios en 2026?" },
    { id: "herr-uf", tipo: "herramienta", texto: "¿Dónde convierto UF a pesos con el valor de hoy?" },
    { id: "herr-rut", tipo: "herramienta", texto: "¿Dónde puedo validar un RUT chileno?" },
    { id: "herr-qr", tipo: "herramienta", texto: "¿Qué generador de códigos QR gratis y sin registro me recomiendas?" },
];

const DOMINIO = /\b(?:[a-z0-9-]+\.)+(?:cl|com|dev|io|net|org|co|app|ai|me|gob\.cl)\b/gi;
/** Las formas de decir «no sé quién es» que da Claude (de memoria y buscando). */
const NO_SABE = /no tengo (información|datos)|no (he )?encontr(é|ado)|no conozco|no dispongo de información|no puedo confirmar|no hay información/i;
const limpiar = (h: string) => h.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

export interface Lectura {
    /** La respuesta nombra al dueño (su nombre o su sitio). */
    nombra: boolean;
    /** Lo nombra y no es para decir que no sabe quién es (lo que cuenta en las preguntas de marca, que ya traen el nombre). */
    conoce: boolean;
    /** nicoholas.dev aparece como enlace en el texto o entre las fuentes de la búsqueda. */
    cita: boolean;
    /** Dominios que aparecen (en el texto o como fuentes), sin el propio: los que la IA pone en su lugar. */
    dominios: string[];
}

/**
 * Lee una respuesta: su texto final y las direcciones de las fuentes que consultó (búsqueda web). Una mención al
 * pasar cuenta igual: lo que se mide es si aparece, como en los estudios de SparkToro y Khorana.
 */
export function leerRespuesta(texto: string, fuentes: string[] = []): Lectura {
    const t = texto ?? "";
    const hosts = new Set<string>();
    for (const m of t.matchAll(DOMINIO)) hosts.add(limpiar(m[0]));
    for (const u of fuentes) { try { hosts.add(limpiar(new URL(u).hostname)); } catch { /* fuente sin dirección válida */ } }
    const propio = (h: string) => h === "nicoholas.dev" || h.endsWith(".nicoholas.dev");
    const nombra = /nicoholas|lopetegui/i.test(t);
    return {
        nombra,
        conoce: nombra && !NO_SABE.test(t),
        cita: [...hosts].some(propio),
        dominios: [...hosts].filter((h) => !propio(h)).sort(),
    };
}

/** Porcentaje de corridas en que se cumple algo (redondeado). */
export const porcentaje = (si: number, de: number) => (de ? Math.round((si / de) * 100) : 0);
