export const DNS_RECORD_TYPE_IDS = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA", "SRV", "PTR"] as const;
export type DnsRecordType = (typeof DNS_RECORD_TYPE_IDS)[number];

export interface DnsResolverNode {
    id: string;
    name: string;
    ip: string;
    description: string;
}

export const DNS_RESOLVER_NODES: DnsResolverNode[] = [
    {
        id: "google",
        name: "Google Public DNS",
        ip: "8.8.8.8",
        description: "Resolvedor público de Google con gran presencia global.",
    },
    {
        id: "cloudflare",
        name: "Cloudflare",
        ip: "1.1.1.1",
        description: "Anycast de alto rendimiento orientado a baja latencia.",
    },
    {
        id: "quad9",
        name: "Quad9",
        ip: "9.9.9.9",
        description: "Resolvedor con foco en seguridad y bloqueo de amenazas.",
    },
    {
        id: "opendns",
        name: "OpenDNS",
        ip: "208.67.222.222",
        description: "Resolvedor histórico de Cisco OpenDNS.",
    },
    {
        id: "adguard",
        name: "AdGuard DNS",
        ip: "94.140.14.14",
        description: "Resolvedor público con perfil de filtrado y privacidad.",
    },
    {
        id: "cleanbrowsing",
        name: "CleanBrowsing",
        ip: "185.228.168.9",
        description: "Resolvedor centrado en políticas de navegación segura.",
    },
];

/** `formato` explica el orden de los campos cuando el valor trae varios; `vacio`, qué significa no tener el registro. */
export const DNS_RECORD_TYPES: Array<{ id: DnsRecordType; name: string; desc: string; formato?: string; vacio?: string }> = [
    { id: "A", name: "A", desc: "Dirección IPv4" },
    { id: "AAAA", name: "AAAA", desc: "Dirección IPv6" },
    { id: "CNAME", name: "CNAME", desc: "Alias canónico" },
    { id: "MX", name: "MX", desc: "Servidor de correo", formato: "Prioridad y servidor (menor número, mayor preferencia)." },
    { id: "TXT", name: "TXT", desc: "Registros de texto" },
    { id: "NS", name: "NS", desc: "Servidores autoritativos" },
    {
        id: "SOA",
        name: "SOA",
        desc: "Inicio de autoridad de la zona",
        formato: "Servidor primario, correo del responsable, serie, refresh, retry, expire y TTL negativo (segundos). Si la serie difiere entre resolvedores, alguno tiene la zona vieja en caché.",
    },
    {
        id: "CAA",
        name: "CAA",
        desc: "Autoridades que pueden emitir certificados",
        formato: "Flags, etiqueta (issue, issuewild o iodef) y valor.",
        vacio: "Sin CAA en este nombre: si el dominio padre tampoco tiene, cualquier autoridad puede emitir certificados para él.",
    },
    { id: "SRV", name: "SRV", desc: "Servicio (_servicio._protocolo.dominio)", formato: "Prioridad, peso, puerto y destino. Consulta nombres como _sip._tcp.ejemplo.com." },
    { id: "PTR", name: "PTR", desc: "Nombre inverso de una IP", formato: "Escribe una IPv4 o IPv6 y se consulta su nombre inverso (in-addr.arpa o ip6.arpa)." },
];
