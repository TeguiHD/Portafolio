/**
 * Índice de la Web Chilena: tipos y cálculos puros (sin los datos de la edición, para que las pruebas los usen sin
 * importar el JSON). Los datos y lo que depende de ellos están en datos.ts.
 */
import { CONTROLES, puntajeRevision, type IdControl, type ResultadoRevision } from "./revision";
import type { Dimensiones } from "./dimensiones";

export type IdCategoria = "municipalidad" | "ministerio" | "gobierno-regional" | "universidad" | "slep" | "delegacion" | "salud" | "servicio";
export const CATEGORIAS: { id: IdCategoria; ruta: string; plural: string; singular: string; articulo: string; femenino: boolean }[] = [
    { id: "municipalidad", ruta: "municipalidades", plural: "Municipalidades", singular: "municipalidad", articulo: "las municipalidades", femenino: true },
    { id: "slep", ruta: "servicios-locales-de-educacion", plural: "Servicios locales de educación", singular: "servicio local de educación", articulo: "los servicios locales de educación", femenino: false },
    { id: "salud", ruta: "salud", plural: "Hospitales y servicios de salud", singular: "institución de salud", articulo: "los hospitales y servicios de salud", femenino: false },
    { id: "servicio", ruta: "servicios-publicos", plural: "Servicios públicos", singular: "servicio público", articulo: "los servicios públicos", femenino: false },
    { id: "ministerio", ruta: "ministerios", plural: "Ministerios", singular: "ministerio", articulo: "los ministerios", femenino: false },
    { id: "delegacion", ruta: "delegaciones-presidenciales", plural: "Delegaciones presidenciales", singular: "delegación presidencial", articulo: "las delegaciones presidenciales", femenino: true },
    { id: "gobierno-regional", ruta: "gobiernos-regionales", plural: "Gobiernos regionales", singular: "gobierno regional", articulo: "los gobiernos regionales", femenino: false },
    { id: "universidad", ruta: "universidades", plural: "Universidades", singular: "universidad", articulo: "las universidades", femenino: true },
];
export const categoriaPorRuta = (ruta: string) => CATEGORIAS.find((c) => c.ruta === ruta);
export const categoriaPorId = (id: string) => CATEGORIAS.find((c) => c.id === id);

export interface NotasSitio { rendimiento: number; accesibilidad: number; practicas: number; seo: number }
/** url y region son null cuando la lista oficial no indica sitio ni sede (universidades en cierre). */
interface SitioBase { slug: string; nombre: string; categoria: IdCategoria; region: string | null; comuna?: string; tipo?: string; url: string | null; fecha: string | null }
export interface SitioMedido extends SitioBase {
    estado: "medido"; url: string; urlFinal: string; notas: NotasSitio;
    lcp: number | null; tbt: number | null; cls: number | null; peso: number | null; pedidos: number | null;
    revision: ResultadoRevision | null;
    /** [id de la auditoría, título (de Lighthouse, en español), elementos afectados] */
    a11y: [string, string, number][];
    /** Desde la edición 2026-12: las siete dimensiones y la nota general (promedio de las medidas). */
    dim?: Dimensiones;
    general?: number | null;
    /** «Lo que responde la IA»: la respuesta de Claude y si acierta, de memoria y buscando. */
    ia?: { memoria: RespuestaIa | null; busqueda: RespuestaIa | null };
    /** Velocidad y calidad en la edición anterior (lo único que se midió igual). */
    antes?: number;
    software?: { generador: string | null; poweredBy: string | null };
    /** El dominio propio es compartido con otros organismos: correo no aplica. */
    correoNoAplica?: string;
}
export interface RespuestaIa { r: string; ok: boolean }
export interface SitioSinRespuesta extends SitioBase { estado: "sin-respuesta"; motivo: string }
export type Sitio = SitioMedido | SitioSinRespuesta;
/** Quien quedó fuera de la edición, y por qué (la metodología lo nombra). */
export interface Excluida { nombre: string; categoria: IdCategoria; motivo: string }
export interface Universo { sinSitio: number; yaNoExisten: number; compartenSitio: number; dudosos: number }
export interface Edicion { edicion: string; lighthouse: string | null; medidoDesde: string | null; medidoHasta: string | null; sitios: Sitio[]; excluidas?: Excluida[]; universo?: Universo }

export const RUTA = "/indice-web-chilena";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** «2026-11» → «noviembre de 2026». */
export const nombreEdicion = (e: string) => `${MESES[Number(e.slice(5, 7)) - 1]} de ${e.slice(0, 4)}`;
/** «2026-11-22» → «22-11-2026». */
export const fechaCorta = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("-") : "");

/** «el 23-11-2026» o «entre el 22-11-2026 y el 23-11-2026». */
export function periodoMedicion(e: Edicion): string {
    const a = fechaCorta(e.medidoDesde), b = fechaCorta(e.medidoHasta);
    return a === b ? `el ${a}` : `entre el ${a} y el ${b}`;
}

/** Nota del índice: el promedio simple de las cuatro notas de Lighthouse, redondeado. */
export const notaIndice = (n: NotasSitio) => Math.round((n.rendimiento + n.accesibilidad + n.practicas + n.seo) / 4);

/** La nota con que se ordena: la general desde 2026-12; en ediciones anteriores, la de Lighthouse. */
export const notaSitio = (s: SitioMedido) => (typeof s.general === "number" ? s.general : notaIndice(s.notas));

export const medidos = (sitios: Sitio[]) => sitios.filter((s): s is SitioMedido => s.estado === "medido");

export function mediana(valores: number[]): number | null {
    if (!valores.length) return null;
    const v = [...valores].sort((a, b) => a - b), m = v.length >> 1;
    return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

/** Orden del ranking: nota del índice, luego controles cumplidos, luego nombre. Empates comparten puesto. */
export function ranking(sitios: SitioMedido[]): { sitio: SitioMedido; puesto: number; nota: number; controles: number | null }[] {
    const filas = sitios.map((sitio) => ({ sitio, nota: notaSitio(sitio), controles: sitio.revision ? puntajeRevision(sitio.revision) : null }));
    filas.sort((a, b) => b.nota - a.nota || (b.controles ?? -1) - (a.controles ?? -1) || a.sitio.nombre.localeCompare(b.sitio.nombre, "es"));
    let puesto = 0, anterior: string | null = null;
    return filas.map((f, i) => {
        const clave = `${f.nota}|${f.controles}`;
        if (clave !== anterior) { puesto = i + 1; anterior = clave; }
        return { ...f, puesto };
    });
}

/** Porcentaje de sitios (con revisión) que cumple cada control. */
export function cumplimiento(sitios: SitioMedido[]): { id: IdControl; nombre: string; cumplen: number; total: number; pct: number }[] {
    const con = sitios.filter((s) => s.revision);
    return CONTROLES.map((c) => {
        const cumplen = con.filter((s) => s.revision![c.id]).length;
        return { id: c.id, nombre: c.nombre, cumplen, total: con.length, pct: con.length ? Math.round((cumplen / con.length) * 100) : 0 };
    });
}

/** Cuántos sitios caen en cada tramo de 10 puntos de la nota del índice (el último tramo es 90–100). */
export function distribucion(sitios: SitioMedido[]): number[] {
    const tramos = Array<number>(10).fill(0);
    for (const s of sitios) tramos[Math.min(9, Math.floor(notaSitio(s) / 10))]!++;
    return tramos;
}

/** «Mejor que el X % de los sitios del índice» según los controles cumplidos (estrictamente menos que el tuyo). */
export function percentilControles(puntaje: number, sitios: SitioMedido[]): number {
    const con = sitios.filter((s) => s.revision);
    if (!con.length) return 0;
    return Math.round((con.filter((s) => puntajeRevision(s.revision!) < puntaje).length / con.length) * 100);
}

/** Cifras de un grupo de sitios. */
export function resumen(sitios: Sitio[]) {
    const m = medidos(sitios);
    const de = (f: (s: SitioMedido) => number | null) => m.map(f).filter((v): v is number => typeof v === "number");
    return {
        total: sitios.length,
        medidos: m.length,
        sinRespuesta: sitios.length - m.length,
        mediana: {
            nota: mediana(m.map(notaSitio)),
            velocidad: mediana(m.map((s) => notaIndice(s.notas))),
            rendimiento: mediana(de((s) => s.notas.rendimiento)),
            accesibilidad: mediana(de((s) => s.notas.accesibilidad)),
            practicas: mediana(de((s) => s.notas.practicas)),
            seo: mediana(de((s) => s.notas.seo)),
            lcp: mediana(de((s) => s.lcp)),
            peso: mediana(de((s) => s.peso)),
            controles: mediana(de((s) => (s.revision ? puntajeRevision(s.revision) : null))),
        },
        /** Sitios con 90 o más en cada categoría de Lighthouse. */
        sobre90: {
            rendimiento: m.filter((s) => s.notas.rendimiento >= 90).length,
            accesibilidad: m.filter((s) => s.notas.accesibilidad >= 90).length,
            practicas: m.filter((s) => s.notas.practicas >= 90).length,
            seo: m.filter((s) => s.notas.seo >= 90).length,
        },
    };
}


/** «1,8 MB», «640 KB». */
export function peso(bytes: number | null): string {
    if (bytes === null) return "—";
    return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB` : `${Math.round(bytes / 1000)} KB`;
}
/** «2,4 s». */
export const segundos = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} s`);
export const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);
