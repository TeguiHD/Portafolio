/**
 * País y ciudad de una IP.
 *
 * Antes se usaba geoip-lite, que cargaba ~150 MB de datos en la memoria del servidor al primer inicio de sesión.
 * Ahora la ubicación de quien hace la petición viene de Cloudflare (cabeceras cf-ipcountry y, si la regla de
 * «ubicación del visitante» está activa, cf-ipcity). Para IPs que no son las de la petición actual (sesiones SSH,
 * IPs bloqueadas) ya no hay base local: se informan como desconocidas, salvo las privadas.
 *
 * @module lib/vps/geo-ip
 */

import 'server-only'

// ============= TYPES =============

export interface GeoIPResult {
    ip: string
    country: string
    countryCode: string
    region: string
    city: string
    flag: string
    ll?: [number, number] // latitude, longitude
}

// ============= CLOUDFLARE =============

export interface GeoCloudflare { country: string | null; countryCode: string | null; city: string | null }

/** Ubicación de quien hace la petición según Cloudflare. «XX» y «T1» (Tor) no son países. */
export function geoDeCloudflare(h: Headers): GeoCloudflare | null {
    const codigo = h.get('cf-ipcountry')?.trim().toUpperCase() || ''
    const valido = /^[A-Z]{2}$/.test(codigo) && codigo !== 'XX' && codigo !== 'T1'
    const ciudad = h.get('cf-ipcity')?.trim().slice(0, 80) || null
    if (!valido && !ciudad) return null
    return { country: valido ? getCountryName(codigo) : null, countryCode: valido ? codigo : null, city: ciudad }
}

// ============= LOOKUP =============

/** Sin base local: las IPs privadas se marcan como red local y el resto como desconocidas. */
export async function lookupIP(ip: string): Promise<GeoIPResult> {
    const desconocida: GeoIPResult = { ip, country: 'Unknown', countryCode: '', region: '', city: '', flag: '🌐' }
    return isPrivateIP(ip) ? { ...desconocida, country: 'Local', city: 'Private Network' } : desconocida
}

/**
 * Batch lookup multiple IPs (deduplicates)
 */
export async function lookupIPs(ips: string[]): Promise<Map<string, GeoIPResult>> {
    const uniqueIPs = [...new Set(ips)]
    const results = new Map<string, GeoIPResult>()

    await Promise.all(
        uniqueIPs.map(async (ip) => {
            const result = await lookupIP(ip)
            results.set(ip, result)
        })
    )

    return results
}

// ============= HELPERS =============

function isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
        return true
    }
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1])
        if (second >= 16 && second <= 31) return true
    }
    // IPv6 private
    if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:')) {
        return true
    }
    return false
}

const COUNTRY_NAMES: Record<string, string> = {
    US: 'Estados Unidos', GB: 'Reino Unido', DE: 'Alemania',
    FR: 'Francia', JP: 'Japón', CN: 'China', RU: 'Rusia',
    BR: 'Brasil', IN: 'India', KR: 'Corea del Sur',
    CL: 'Chile', AR: 'Argentina', MX: 'México', CO: 'Colombia',
    PE: 'Perú', VE: 'Venezuela', EC: 'Ecuador', UY: 'Uruguay',
    PY: 'Paraguay', BO: 'Bolivia', CR: 'Costa Rica', PA: 'Panamá',
    NL: 'Países Bajos', IT: 'Italia', ES: 'España', PT: 'Portugal',
    CA: 'Canadá', AU: 'Australia', NZ: 'Nueva Zelanda', SG: 'Singapur',
    HK: 'Hong Kong', TW: 'Taiwán', SE: 'Suecia', NO: 'Noruega',
    FI: 'Finlandia', DK: 'Dinamarca', CH: 'Suiza', AT: 'Austria',
    BE: 'Bélgica', IE: 'Irlanda', PL: 'Polonia', CZ: 'Chequia',
    RO: 'Rumanía', HU: 'Hungría', UA: 'Ucrania', TR: 'Turquía',
    ZA: 'Sudáfrica', EG: 'Egipto', NG: 'Nigeria', KE: 'Kenia',
    IL: 'Israel', SA: 'Arabia Saudita', AE: 'Emiratos Árabes',
    TH: 'Tailandia', VN: 'Vietnam', PH: 'Filipinas', ID: 'Indonesia',
    MY: 'Malasia', BD: 'Bangladesh', PK: 'Pakistán',
}

function getCountryName(code: string): string {
    return COUNTRY_NAMES[code] || code
}
