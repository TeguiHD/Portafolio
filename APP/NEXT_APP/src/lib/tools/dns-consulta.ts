/**
 * Lectura de lo que se escribe en el verificador DNS: un nombre o una IP (para la consulta inversa PTR).
 * Sin dependencias de Node para que lo usen igual la página y la ruta /api/tools/dns.
 */

export type EntradaDns =
    | { tipo: "ip"; version: 4 | 6; ip: string; inversa: string }
    | { tipo: "nombre"; nombre: string };

function leerOctetosIPv4(texto: string): number[] | null {
    const partes = texto.split(".");
    if (partes.length !== 4) return null;
    const octetos: number[] = [];
    for (const parte of partes) {
        if (!/^\d{1,3}$/.test(parte) || (parte.length > 1 && parte.startsWith("0"))) return null;
        const octeto = Number(parte);
        if (octeto > 255) return null;
        octetos.push(octeto);
    }
    return octetos;
}

/** Devuelve los 8 grupos de 16 bits, o null. Acepta «::», IPv4 incrustada al final y corchetes. */
export function leerIPv6(texto: string): number[] | null {
    let t = texto.trim().toLowerCase();
    if (t.startsWith("[") && t.endsWith("]")) t = t.slice(1, -1);
    if (t.length > 45 || !t.includes(":") || !/^[0-9a-f:.]+$/.test(t)) return null;

    if (t.includes(".")) {
        const corte = t.lastIndexOf(":");
        const v4 = leerOctetosIPv4(t.slice(corte + 1));
        if (!v4) return null;
        t = `${t.slice(0, corte + 1)}${(v4[0] * 256 + v4[1]).toString(16)}:${(v4[2] * 256 + v4[3]).toString(16)}`;
    }

    const lados = t.split("::");
    if (lados.length > 2) return null;
    const grupos = (s: string) => (s === "" ? [] : s.split(":"));
    const izquierda = grupos(lados[0]);
    const derecha = lados.length === 2 ? grupos(lados[1]) : [];
    if ([...izquierda, ...derecha].some(grupo => !/^[0-9a-f]{1,4}$/.test(grupo))) return null;
    if (lados.length === 1 && izquierda.length !== 8) return null;
    if (lados.length === 2 && izquierda.length + derecha.length > 7) return null;
    const relleno = lados.length === 2 ? Array<string>(8 - izquierda.length - derecha.length).fill("0") : [];
    return [...izquierda, ...relleno, ...derecha].map(grupo => parseInt(grupo, 16));
}

/** Forma corta en minúsculas (RFC 5952) para mostrar la IPv6. */
function escribirIPv6(grupos: number[]): string {
    let mejorInicio = -1, mejorLargo = 0;
    for (let i = 0; i < 8;) {
        if (grupos[i] !== 0) { i++; continue; }
        let j = i;
        while (j < 8 && grupos[j] === 0) j++;
        if (j - i > mejorLargo && j - i >= 2) { mejorInicio = i; mejorLargo = j - i; }
        i = j;
    }
    const hex = grupos.map(grupo => grupo.toString(16));
    if (mejorInicio < 0) return hex.join(":");
    return `${hex.slice(0, mejorInicio).join(":")}::${hex.slice(mejorInicio + mejorLargo).join(":")}`;
}

/** Nombre para la consulta PTR: 4.3.2.1.in-addr.arpa o los 32 nibbles al revés en ip6.arpa. */
export function nombreInverso(version: 4 | 6, partes: number[]): string {
    if (version === 4) return `${partes.slice().reverse().join(".")}.in-addr.arpa`;
    const nibbles = partes.map(grupo => grupo.toString(16).padStart(4, "0")).join("").split("");
    return `${nibbles.reverse().join(".")}.ip6.arpa`;
}

/**
 * Quita esquema, usuario, ruta y puerto. Si queda una IP, prepara la consulta inversa;
 * si no, devuelve el nombre en minúsculas y sin punto final (la conversión a punycode la hace quien llama).
 * Un correo («contacto@empresa.cl», «mailto:…») deja su dominio: es lo que se pega para revisar SPF y DMARC.
 */
export function limpiarEntradaDns(entrada: string): EntradaDns {
    let t = entrada.trim().replace(/^mailto:/i, "").replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    const arroba = (t.split(/[/?#]/)[0] ?? "").lastIndexOf("@");
    if (arroba >= 0) t = t.slice(arroba + 1);
    if (t.startsWith("[")) {
        const cierre = t.indexOf("]");
        t = cierre > 0 ? t.slice(0, cierre + 1) : t;
    } else {
        t = t.split(/[/?#]/)[0] ?? "";
    }

    const v6 = leerIPv6(t);
    if (v6) return { tipo: "ip", version: 6, ip: escribirIPv6(v6), inversa: nombreInverso(6, v6) };

    const sinPuerto = t.split(":")[0] ?? "";
    const v4 = leerOctetosIPv4(sinPuerto);
    if (v4) return { tipo: "ip", version: 4, ip: v4.join("."), inversa: nombreInverso(4, v4) };

    return { tipo: "nombre", nombre: sinPuerto.toLowerCase().replace(/\.$/, "") };
}

/**
 * Nombres que no tiene sentido preguntar al DNS público (localhost, .local, .internal…). Se compara por etiqueta:
 * antes se buscaba el texto en cualquier parte y «tiendas.locales.cl» o «mylocalhosting.com» quedaban rechazados.
 */
export function nombreReservado(nombre: string): boolean {
    const n = nombre.toLowerCase().replace(/\.$/, "");
    return ["localhost", "local", "internal"].some(sufijo => n === sufijo || n.endsWith(`.${sufijo}`));
}

/**
 * ¿Tiene sentido buscar el nombre inverso en el DNS público? Las IP privadas, de documentación o reservadas
 * no publican PTR ahí (responde un servidor de descarte o nadie).
 */
export function ipConInversaPublica(entrada: Extract<EntradaDns, { tipo: "ip" }>): boolean {
    if (entrada.version === 6) {
        const grupos = leerIPv6(entrada.ip);
        if (!grupos) return false;
        // Solo unicast global (2000::/3), sin el rango de documentación 2001:db8::/32.
        if ((grupos[0] & 0xe000) !== 0x2000) return false;
        return !(grupos[0] === 0x2001 && grupos[1] === 0x0db8);
    }
    const [a, b, c] = entrada.ip.split(".").map(Number) as [number, number, number, number];
    const reservada =
        a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 192 && b === 0 && (c === 0 || c === 2)) ||
        (a === 198 && (b === 18 || b === 19)) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113);
    return !reservada;
}
