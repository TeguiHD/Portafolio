/**
 * A qué direcciones puede conectarse el revisor público, y cómo se agrupa una IP para su límite de uso.
 * Sin dependencias de Node (lo prueban las pruebas puras de tests/e2e/indice-revision.spec.ts).
 */
import { ipConInversaPublica, leerIPv6 } from "@/lib/tools/dns-consulta";

/**
 * Solo direcciones públicas (las privadas, locales, CGNAT, de documentación y las IPv4 dentro de IPv6 ya las rechaza
 * ipConInversaPublica). Además, por si la VM tuviera IPv6 algún día: 6to4 (2002::/16) y Teredo (2001::/32) envuelven una
 * IPv4 cualquiera. Y nunca la IP pública propia: es la del router de la casa, y por NAT de vuelta (hairpin) daría a su
 * panel o a otro servicio de la red (revisión de seguridad del 23-11-2026).
 */
export function ipPermitida(ip: string, familia: number, propia: string | null): boolean {
    if (propia && ip === propia) return false;
    if (familia === 6) {
        const g = leerIPv6(ip);
        if (!g) return false;
        if (g[0] === 0x2002) return false;
        if (g[0] === 0x2001 && g[1] === 0x0000) return false;
    }
    return ipConInversaPublica({ tipo: "ip", version: familia === 6 ? 6 : 4, ip, inversa: "" });
}

/** La clave del límite por IP: una IPv6 se agrupa por su /64 (un VPS barato trae millones de direcciones). */
export function claveIp(ip: string): string {
    const g = ip.includes(":") ? leerIPv6(ip) : null;
    return g ? `${g.slice(0, 4).map((x) => x.toString(16)).join(":")}::/64` : ip;
}
