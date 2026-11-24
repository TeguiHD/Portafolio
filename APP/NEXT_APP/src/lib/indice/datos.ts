/**
 * Índice de la Web Chilena (jugada 4 del informe GEO): los datos de la edición vigente y las cuentas que se publican.
 * El archivo de la edición lo arma scripts/indice/compilar.mjs a partir de las mediciones (scripts/indice/medir.mjs).
 * Todo es cálculo sobre esos datos: ninguna cifra se escribe a mano. Los cálculos puros están en calculos.ts.
 */
import edicionActual from "@/data/indice/2026-12.json";
import edicionNoviembre from "@/data/indice/2026-11.json";
import { RUTA, periodoMedicion as periodo, type Edicion, type IdCategoria } from "./calculos";

export * from "./calculos";

export const EDICION = edicionActual as unknown as Edicion;
/** Las ediciones con datos descargables (la vigente primero): sus direcciones citadas siguen funcionando. */
export const EDICIONES = [EDICION, edicionNoviembre as unknown as Edicion];
export const sitiosDe = (categoria: IdCategoria) => EDICION.sitios.filter((s) => s.categoria === categoria);
export const sitioPorSlug = (slug: string) => EDICION.sitios.find((s) => s.slug === slug);
/** «el 23-11-2026» o «entre el 22-11-2026 y el 23-11-2026», de la edición vigente. */
export const periodoMedicion = (e: Edicion = EDICION) => periodo(e);

/** Huella de los datos (FNV-1a de 32 bits, en hexadecimal): cambia si cambia cualquier cosa de la edición. */
function huella(texto: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193);
    return (h >>> 0).toString(16).padStart(8, "0");
}
const VERSION_DATOS = huella(JSON.stringify(EDICION));
const versionDe = (e: Edicion) => (e === EDICION ? VERSION_DATOS : huella(JSON.stringify(e)));
/** Dónde se descargan los datos. Con la huella (?v=): Cloudflare guarda los .csv un día, y sin ella seguiría sirviendo los
 *  de antes de una corrección (pasó el 23-11-2026). */
export const urlDatos = (formato: "csv" | "json", e: Edicion = EDICION) => `${RUTA}/datos/${e.edicion}.${formato}?v=${versionDe(e)}`;
