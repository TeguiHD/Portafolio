import { claveUsoIp } from "./ip-uso";

/** El tope que el proxy aplica a una ruta. `categoria` es la de los ajustes dinámicos (EnforcementExecutor) y los
 * registros; `cuenta` es el contador: una por cada tope y ventana distintos. */
export interface ReglaLimite { categoria: "auth" | "finance" | "admin" | "api" | "page"; cuenta: string; limite: number; ventanaMs: number }

const MINUTO = 60_000;

/**
 * La regla de una ruta. Antes el tope y el contador salían de dos funciones distintas: /api/admin usaba el contador de
 * toda la API con el tope de admin (50/min), y en /api/auth la sesión (30/min), entrar (10/min) y pedir otra clave
 * (3/h) compartían contador. Ahora cada tope cuenta aparte (25-11-2026).
 */
export function reglaLimite(ruta: string): ReglaLimite {
    if (ruta.startsWith("/api/auth")) {
        if (ruta.includes("/signout") || ruta.includes("/csrf") || ruta.includes("/session")) return { categoria: "auth", cuenta: "auth-sesion", limite: 30, ventanaMs: MINUTO };
        if (ruta.includes("/password-reset/request")) return { categoria: "auth", cuenta: "auth-clave", limite: 3, ventanaMs: 60 * MINUTO };
        return { categoria: "auth", cuenta: "auth", limite: 10, ventanaMs: MINUTO };
    }
    if (ruta.startsWith("/api/finance/ocr")) return { categoria: "finance", cuenta: "ocr", limite: 10, ventanaMs: MINUTO };
    if (ruta.startsWith("/api/finance")) return { categoria: "api", cuenta: "finance", limite: 100, ventanaMs: MINUTO };
    if (ruta.startsWith("/api/admin")) return { categoria: "admin", cuenta: "admin", limite: 50, ventanaMs: MINUTO };
    if (ruta.startsWith("/api/")) return { categoria: "api", cuenta: "api", limite: 100, ventanaMs: MINUTO };
    return { categoria: "page", cuenta: "page", limite: 100, ventanaMs: MINUTO };
}

/**
 * La clave del límite de pedidos del proxy: quién (una IPv4 tal cual, una IPv6 por su prefijo /64) y qué contador. Con la
 * IPv6 completa, quien tiene un /64 (lo normal en una conexión) cambiaba el final de la dirección en cada pedido y no
 * llegaba nunca al límite (24-11-2026).
 */
export function claveLimiteProxy(ip: string, ruta: string): string {
    return `ratelimit:${claveUsoIp(ip)}:${reglaLimite(ruta).cuenta}`;
}

/**
 * Si este pedido es el primero sobre el tope en su ventana: solo ese suma una falta. Antes sumaba cada pedido
 * rechazado, y tres rechazos en el mismo minuto bloqueaban 15 min; ahora hacen falta tres minutos excedidos.
 */
export function esPrimerExceso(cuenta: number, limite: number): boolean {
    return cuenta === limite + 1;
}
