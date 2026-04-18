export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";

export interface DnsResolverNode {
    id: string;
    name: string;
    location: string;
    region: string;
    ip: string;
    description: string;
    x: number;
    y: number;
}

export const DNS_RESOLVER_NODES: DnsResolverNode[] = [
    {
        id: "google",
        name: "Google Public DNS",
        location: "Iowa, EE.UU.",
        region: "Norteamérica",
        ip: "8.8.8.8",
        description: "Resolvedor público de Google con gran presencia global.",
        x: 22,
        y: 35,
    },
    {
        id: "cloudflare",
        name: "Cloudflare",
        location: "Lisboa, Portugal",
        region: "Europa",
        ip: "1.1.1.1",
        description: "Anycast de alto rendimiento orientado a baja latencia.",
        x: 47,
        y: 31,
    },
    {
        id: "quad9",
        name: "Quad9",
        location: "Zúrich, Suiza",
        region: "Europa",
        ip: "9.9.9.9",
        description: "Resolvedor con foco en seguridad y bloqueo de amenazas.",
        x: 50,
        y: 29,
    },
    {
        id: "opendns",
        name: "OpenDNS",
        location: "California, EE.UU.",
        region: "Norteamérica",
        ip: "208.67.222.222",
        description: "Resolvedor histórico de Cisco OpenDNS.",
        x: 14,
        y: 36,
    },
    {
        id: "adguard",
        name: "AdGuard DNS",
        location: "Lárnaca, Chipre",
        region: "Mediterráneo",
        ip: "94.140.14.14",
        description: "Resolvedor público con perfil de filtrado y privacidad.",
        x: 57,
        y: 36,
    },
    {
        id: "cleanbrowsing",
        name: "CleanBrowsing",
        location: "Virginia, EE.UU.",
        region: "Norteamérica",
        ip: "185.228.168.9",
        description: "Resolvedor centrado en políticas de navegación segura.",
        x: 26,
        y: 33,
    },
];

export const DNS_RECORD_TYPES: Array<{ id: DnsRecordType; name: string; desc: string }> = [
    { id: "A", name: "A", desc: "Dirección IPv4" },
    { id: "AAAA", name: "AAAA", desc: "Dirección IPv6" },
    { id: "CNAME", name: "CNAME", desc: "Alias canónico" },
    { id: "MX", name: "MX", desc: "Servidor de correo" },
    { id: "TXT", name: "TXT", desc: "Registros de texto" },
    { id: "NS", name: "NS", desc: "Servidores autoritativos" },
];