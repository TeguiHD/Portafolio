/**
 * Qué páginas puede mostrar el modo escritorio (/escritorio) dentro de sus ventanas: las públicas, en un iframe del
 * mismo origen (CSP `frame-ancestors 'self'`). El panel, el portal de clientes, el acceso y la API siguen sin poder
 * enmarcarse en ningún sitio (`frame-ancestors 'none'`). La misma lista está en next.config.mjs (X-Frame-Options).
 */
const PRIVADAS = /^\/(admin|api|acceso|cambiar-clave|cotizacion|forbidden|unauthorized)(\/|$)/;

export function enmarcableEnEscritorio(ruta: string): boolean {
    return !PRIVADAS.test(ruta);
}
