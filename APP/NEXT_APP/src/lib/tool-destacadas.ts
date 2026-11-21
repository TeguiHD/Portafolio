import { DEFAULT_TOOL_REGISTRY } from "./tool-registry";

/**
 * Las 6 destacadas de /herramientas (y la lista corta de la portada en el celular) cuando el uso real no alcanza para
 * ordenarlas: las de uso más amplio, en el orden del dueño.
 */
export const DESTACADAS_RESPALDO = ["qr", "quitar-fondo", "comprimir-imagen", "claves", "json", "impuestos"] as const;

/** Visitas distintas (IP con hash) en 30 días para que una herramienta entre a las destacadas por uso. */
export const UMBRAL_SESIONES = 5;

/**
 * Agentes de usuario que no son una persona en un navegador: navegadores sin interfaz, robots y clientes de línea de
 * comandos o de librerías. (Los navegadores automatizados que se hacen pasar por Chrome normal no registran: los
 * frena `navigator.webdriver` en el cliente.) «unknown» es lo que guarda la API cuando no llega ninguno.
 * Es una expresión de PostgreSQL (`~*`) y de JavaScript a la vez.
 */
export const AGENTES_AUTOMATIZADOS = "headless|playwright|puppeteer|selenium|bot|crawler|spider|curl|wget|python|go-http|java/|httpclient|okhttp|axios|node-fetch|undici|^unknown$";

const CUANTAS = 6;
const DIAS_NUEVA = 60;

export interface Destacadas { slugs: string[]; porUso: boolean }

/**
 * Las que pasan el umbral van primero, por uso; los huecos se llenan con el respaldo y, si faltara (herramientas
 * ocultas en el panel), con el resto del catálogo en su orden. Solo si las 6 salen de datos se puede decir «las más usadas».
 */
export function elegirDestacadas(conteos: { slug: string; sesiones: number }[], publicas: string[]): Destacadas {
    const visibles = new Set(publicas);
    const porUso = [...conteos]
        .filter((c) => c.sesiones >= UMBRAL_SESIONES && visibles.has(c.slug))
        .sort((a, b) => b.sesiones - a.sesiones)
        .map((c) => c.slug);
    const slugs: string[] = [];
    for (const s of [...porUso, ...DESTACADAS_RESPALDO, ...publicas]) {
        if (slugs.length === CUANTAS) break;
        if (visibles.has(s) && !slugs.includes(s)) slugs.push(s);
    }
    return { slugs, porUso: porUso.length >= CUANTAS };
}

/** «Nueva» durante los 60 días siguientes a su publicación. */
export function esNueva(publicada: string | undefined, hoy: Date): boolean {
    if (!publicada) return false;
    const dias = (hoy.getTime() - new Date(publicada).getTime()) / 86_400_000;
    return dias >= 0 && dias <= DIAS_NUEVA;
}

/** Las relacionadas de una herramienta que siguen visibles en el catálogo (una oculta en el panel no se sugiere). */
export function relacionadasDe(slug: string, publicas: string[]): string[] {
    const visibles = new Set(publicas);
    return (DEFAULT_TOOL_REGISTRY.find((t) => t.slug === slug)?.relacionadas ?? []).filter((s) => visibles.has(s));
}
