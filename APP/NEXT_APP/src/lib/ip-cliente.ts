/**
 * La IP del visitante, en el orden que no se puede falsificar en producción:
 * 1. `cf-connecting-ip`: la pone Cloudflare (pisa cualquier valor que mande el cliente).
 * 2. `x-real-ip`: la pone nuestro nginx desde esa misma cabecera (real_ip_header CF-Connecting-IP).
 * 3. El ÚLTIMO valor de `x-forwarded-for`: el primero lo puede escribir el cliente (Cloudflare y nginx solo agregan al final).
 * Antes varias rutas tomaban el primero de x-forwarded-for: cambiándolo se saltaban sus límites de tasa.
 */
export function ipCliente(h: Headers): string {
    const cf = h.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
    const real = h.get("x-real-ip")?.trim();
    if (real) return real;
    const xff = h.get("x-forwarded-for");
    const ultima = xff?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
    return ultima || "unknown";
}
