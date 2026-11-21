/**
 * Con qué se cuenta a una persona en el uso de herramientas. Una IPv4 tal cual; una IPv6 por su prefijo /64, porque
 * los teléfonos y computadores cambian a diario la parte final (direcciones temporales): sin esto, quien vuelve cinco
 * días seguidos contaba como cinco personas. Se guarda con hash, nunca en claro.
 */
export function claveUsoIp(ip: string): string {
    if (!ip.includes(":")) return ip;
    const [izq, der = ""] = ip.toLowerCase().split("::");
    const a = izq ? izq.split(":") : [], b = der ? der.split(":") : [];
    const completa = ip.includes("::") ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b] : a;
    return completa.slice(0, 4).map((h) => h.replace(/^0+(?=.)/, "")).join(":");
}
