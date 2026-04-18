/**
 * GeoIP Lookup
 * 
 * IP address to country/city resolution using geoip-lite.
 * Uses the MaxMind GeoLite2 database (offline, no external API calls).
 * Results are cached in-memory with TTL.
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

// ============= CACHE =============

const geoCache = new Map<string, { result: GeoIPResult; expiresAt: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Cleanup expired entries every 10 min
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of geoCache) {
            if (now > entry.expiresAt) {
                geoCache.delete(key)
            }
        }
    }, 10 * 60 * 1000)
}

// ============= COUNTRY CODE TO FLAG =============

function countryCodeToFlag(code: string): string {
    if (!code || code.length !== 2) return '🌐'
    const codePoints = [...code.toUpperCase()].map(
        char => 0x1F1E6 + char.charCodeAt(0) - 65
    )
    return String.fromCodePoint(...codePoints)
}

// ============= LOOKUP =============

/**
 * Look up geographic information for an IP address
 */
export async function lookupIP(ip: string): Promise<GeoIPResult> {
    // Check cache
    const cached = geoCache.get(ip)
    if (cached && Date.now() < cached.expiresAt) {
        return cached.result
    }

    // Default result for private/invalid IPs
    const defaultResult: GeoIPResult = {
        ip,
        country: 'Unknown',
        countryCode: '',
        region: '',
        city: '',
        flag: '🌐',
    }

    try {
        // Private IP ranges
        if (isPrivateIP(ip)) {
            const privateResult = { ...defaultResult, country: 'Local', city: 'Private Network' }
            geoCache.set(ip, { result: privateResult, expiresAt: Date.now() + CACHE_TTL })
            return privateResult
        }

        // Use geoip-lite (offline MaxMind database)
        const geoip = await import('geoip-lite')
        const geo = geoip.lookup(ip)

        if (!geo) {
            geoCache.set(ip, { result: defaultResult, expiresAt: Date.now() + CACHE_TTL })
            return defaultResult
        }

        const result: GeoIPResult = {
            ip,
            country: getCountryName(geo.country),
            countryCode: geo.country,
            region: Array.isArray(geo.region) ? geo.region[0] || '' : geo.region || '',
            city: Array.isArray(geo.city) ? geo.city[0] || '' : geo.city || '',
            flag: countryCodeToFlag(geo.country),
            ll: geo.ll as [number, number] | undefined,
        }

        geoCache.set(ip, { result, expiresAt: Date.now() + CACHE_TTL })
        return result

    } catch (error) {
        console.error('[GeoIP] Lookup failed for', ip, error)
        geoCache.set(ip, { result: defaultResult, expiresAt: Date.now() + CACHE_TTL })
        return defaultResult
    }
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
