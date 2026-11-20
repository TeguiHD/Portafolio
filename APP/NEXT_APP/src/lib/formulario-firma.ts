// Datos que el cliente completa al firmar, declarados en el propio documento:
//
//   <span data-campo-cliente="razon_social" data-etiqueta="Razón social de la empresa"></span>
//   <span data-campo-cliente="rut_empresa" data-etiqueta="RUT de la empresa" data-tipo="rut"></span>
//   <span data-opcion-cliente="prueba_carga" data-etiqueta="Prueba de carga" data-valores="Sí|No"></span>
//   <div data-firma-cliente data-documento="acuerdo" data-acepta="Leí y acepto el acuerdo…"></div>
//
// El panel de firma pide esos datos, el servidor los valida contra el documento guardado (nunca
// contra lo que mande el navegador) y la versión firmada los muestra en su lugar.
import { cleanRut, formatRut, validateRut } from "@/lib/rut";

export interface CampoFirma {
    clave: string;
    etiqueta: string;
    tipo: "texto" | "rut";
}

export interface OpcionFirma {
    clave: string;
    etiqueta: string;
    valores: string[];
}

export interface FormularioFirma {
    /** Cómo se llama el documento en los botones: «propuesta», «acuerdo»… */
    documento: string;
    /** Frase de aceptación propia del documento; si no trae, el panel usa la de la propuesta. */
    acepta: string | null;
    campos: CampoFirma[];
    opciones: OpcionFirma[];
}

export type RespuestasFirma = Record<string, string>;

const MAX_CAMPOS = 6;
const MAX_OPCIONES = 4;
const CLAVE = /^[a-z0-9_]{1,40}$/;

function decodificar(texto: string): string {
    return texto
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&#x27;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");
}

function atributo(etiqueta: string, nombre: string): string | null {
    const m = new RegExp(`\\s${nombre}="([^"]*)"`, "i").exec(etiqueta);
    return m ? decodificar(m[1]).replace(/\s+/g, " ").trim() : null;
}

/** Lee el formulario del HTML ya sanitizado (DOMPurify deja los atributos entre comillas dobles). */
export function formularioFirma(html: string): FormularioFirma {
    const formulario: FormularioFirma = { documento: "propuesta", acepta: null, campos: [], opciones: [] };
    const vistas = new Set<string>();

    for (const [etiqueta] of (html || "").matchAll(/<[a-z][a-z0-9-]*\s[^>]*>/gi)) {
        if (/\sdata-firma-cliente[\s=>]/i.test(etiqueta)) {
            const documento = atributo(etiqueta, "data-documento")?.toLowerCase();
            if (documento && /^[\p{L} ]{3,40}$/u.test(documento)) formulario.documento = documento;
            const acepta = atributo(etiqueta, "data-acepta");
            if (acepta && acepta.length <= 220) formulario.acepta = acepta;
            continue;
        }

        const campo = atributo(etiqueta, "data-campo-cliente");
        if (campo !== null) {
            if (!CLAVE.test(campo) || vistas.has(campo) || formulario.campos.length >= MAX_CAMPOS) continue;
            vistas.add(campo);
            formulario.campos.push({
                clave: campo,
                etiqueta: (atributo(etiqueta, "data-etiqueta") || campo).slice(0, 80),
                tipo: atributo(etiqueta, "data-tipo") === "rut" ? "rut" : "texto",
            });
            continue;
        }

        const opcion = atributo(etiqueta, "data-opcion-cliente");
        if (opcion !== null) {
            if (!CLAVE.test(opcion) || vistas.has(opcion) || formulario.opciones.length >= MAX_OPCIONES) continue;
            const valores = [...new Set((atributo(etiqueta, "data-valores") || "").split("|").map((v) => v.trim()))]
                .filter((v) => v.length >= 1 && v.length <= 30);
            if (valores.length < 2 || valores.length > 4) continue;
            vistas.add(opcion);
            formulario.opciones.push({
                clave: opcion,
                etiqueta: (atributo(etiqueta, "data-etiqueta") || opcion).slice(0, 80),
                valores,
            });
        }
    }
    return formulario;
}

/** Valida lo que mandó el navegador contra el formulario del documento. Solo pasan sus claves. */
export function validarRespuestas(
    formulario: FormularioFirma,
    entrada: unknown,
): { ok: true; respuestas: RespuestasFirma } | { ok: false; error: string } {
    const datos = entrada && typeof entrada === "object" && !Array.isArray(entrada) ? entrada as Record<string, unknown> : {};
    const respuestas: RespuestasFirma = {};

    for (const campo of formulario.campos) {
        const bruto = typeof datos[campo.clave] === "string" ? datos[campo.clave] as string : "";
        if (campo.tipo === "rut") {
            if (!validateRut(bruto)) return { ok: false, error: `${campo.etiqueta}: el RUT no es válido.` };
            respuestas[campo.clave] = formatRut(cleanRut(bruto));
            continue;
        }
        const texto = Array.from(bruto, (c) => { const n = c.codePointAt(0)!; return n < 32 || n === 127 ? " " : c; }).join("").replace(/\s+/g, " ").trim();
        if (texto.length < 2 || texto.length > 120) return { ok: false, error: `Completa «${campo.etiqueta}».` };
        respuestas[campo.clave] = texto;
    }

    for (const opcion of formulario.opciones) {
        const elegido = datos[opcion.clave];
        if (typeof elegido !== "string" || !opcion.valores.includes(elegido)) {
            return { ok: false, error: `Elige una opción en «${opcion.etiqueta}».` };
        }
        respuestas[opcion.clave] = elegido;
    }

    return { ok: true, respuestas };
}

/** Las respuestas guardadas (JSON) como texto plano; lo que no sea texto se descarta. */
export function leerRespuestas(json: unknown): RespuestasFirma {
    if (!json || typeof json !== "object" || Array.isArray(json)) return {};
    return Object.fromEntries(
        Object.entries(json as Record<string, unknown>).filter(([k, v]) => CLAVE.test(k) && typeof v === "string"),
    ) as RespuestasFirma;
}

/** «Prueba de carga: Sí. Razón social: Agrícola Sur SpA», para avisos e historial. */
export function resumenRespuestas(formulario: FormularioFirma, respuestas: RespuestasFirma): string {
    return [...formulario.opciones, ...formulario.campos]
        .filter((d) => respuestas[d.clave])
        .map((d) => `${d.etiqueta}: ${respuestas[d.clave]}`)
        .join(". ");
}
