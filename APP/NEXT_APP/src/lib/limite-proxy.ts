import { claveUsoIp } from "./ip-uso";

/**
 * La clave del límite de pedidos del proxy: quién (una IPv4 tal cual, una IPv6 por su prefijo /64) y qué categoría de
 * ruta. Con la IPv6 completa, quien tiene un /64 (lo normal en una conexión) cambiaba el final de la dirección en cada
 * pedido y no llegaba nunca al límite (24-11-2026).
 */
export function claveLimiteProxy(ip: string, ruta: string): string {
    const categoria = ruta.startsWith("/api/auth") ? "auth"
        : ruta.startsWith("/api/finance") ? "finance"
            : ruta.startsWith("/api/") ? "api" : "page";
    return `ratelimit:${claveUsoIp(ip)}:${categoria}`;
}
