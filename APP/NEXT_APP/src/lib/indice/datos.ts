/**
 * Índice de la Web Chilena (jugada 4 del informe GEO): los datos de la edición vigente y las cuentas que se publican.
 * El archivo de la edición lo arma scripts/indice/compilar.mjs a partir de las mediciones (scripts/indice/medir.mjs).
 * Todo es cálculo sobre esos datos: ninguna cifra se escribe a mano. Los cálculos puros están en calculos.ts.
 */
import edicionActual from "@/data/indice/2026-11.json";
import { periodoMedicion as periodo, type Edicion, type IdCategoria } from "./calculos";

export * from "./calculos";

export const EDICION = edicionActual as unknown as Edicion;
export const sitiosDe = (categoria: IdCategoria) => EDICION.sitios.filter((s) => s.categoria === categoria);
export const sitioPorSlug = (slug: string) => EDICION.sitios.find((s) => s.slug === slug);
/** «el 23-11-2026» o «entre el 22-11-2026 y el 23-11-2026», de la edición vigente. */
export const periodoMedicion = (e: Edicion = EDICION) => periodo(e);
