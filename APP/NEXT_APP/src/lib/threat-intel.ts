/**
 * Threat Intelligence — AbuseIPDB integration with circuit breaker.
 *
 * Non-blocking: lookups are fire-and-forget; results apply to the next request.
 * Circuit breaker: 3 consecutive failures → 10min degraded mode (internal scoring only).
 * Budget: max 80 lookups/day (free tier = 1000/day).
 *
 * @see https://docs.abuseipdb.com/#check-endpoint
 */
import 'server-only'
import { getRedisClient, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'

export interface AbuseIPDBResult {
  ipAddress: string
  isPublic: boolean
  abuseConfidenceScore: number  // 0-100
  countryCode: string | null
  usageType: string | null
  isp: string | null
  totalReports: number
  numDistinctUsers: number
  lastReportedAt: string | null
}

interface CachedAbuseResult {
  result: AbuseIPDBResult
  fetchedAt: string
}

const DAILY_BUDGET_KEY = 'threat:intel:abuseipdb:daily-count'
const BREAKER_KEY = CACHE_KEYS.THREAT_INTEL_BREAKER
const FAIL_COUNT_KEY = 'threat:intel:abuseipdb:fail-count'
const MAX_DAILY = parseInt(process.env.ABUSEIPDB_MAX_DAILY_LOOKUPS ?? '80')

/** Returns true if circuit breaker is open (degraded mode). */
export async function isAbuseIPDBDegraded(): Promise<boolean> {
  if (!process.env.ABUSEIPDB_API_KEY) return true
  try {
    const client = await getRedisClient()
    const breaker = await client.exists(BREAKER_KEY)
    return breaker === 1
  } catch {
    return true
  }
}

/** Returns the cached AbuseIPDB result for an IP hash (16-char hex). */
export async function getCachedAbuseScore(ipHash: string): Promise<AbuseIPDBResult | null> {
  try {
    const client = await getRedisClient()
    const raw = await client.get(`threat:ip:${ipHash}:abuseipdb`)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedAbuseResult
    return cached.result
  } catch {
    return null
  }
}

/**
 * Trigger an AbuseIPDB lookup for a real IP address (not the hash).
 * Fire-and-forget: does not block the calling request.
 * ipHash is the 16-char HMAC-SHA256 prefix used as Redis key.
 */
export function triggerAbuseIPDBLookup(realIp: string, ipHash: string): void {
  if (!process.env.ABUSEIPDB_API_KEY) return

  void (async () => {
    try {
      if (await isAbuseIPDBDegraded()) return

      const client = await getRedisClient()
      const dailyCount = await client.incr(DAILY_BUDGET_KEY)
      if (dailyCount === 1) {
        await client.expire(DAILY_BUDGET_KEY, 24 * 60 * 60)
      }
      if (dailyCount > MAX_DAILY) return

      const url = new URL('https://api.abuseipdb.com/api/v2/check')
      url.searchParams.set('ipAddress', realIp)
      url.searchParams.set('maxAgeInDays', '90')

      const res = await fetch(url.toString(), {
        headers: {
          Key: process.env.ABUSEIPDB_API_KEY!,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })

      if (!res.ok) throw new Error(`AbuseIPDB HTTP ${res.status}`)

      const json = await res.json() as { data: AbuseIPDBResult }
      const result = json.data

      const cached: CachedAbuseResult = { result, fetchedAt: new Date().toISOString() }
      await client.setEx(
        `threat:ip:${ipHash}:abuseipdb`,
        CACHE_TTL.THREAT_ABUSEIPDB,
        JSON.stringify(cached)
      )

      await client.del(FAIL_COUNT_KEY)

    } catch (err) {
      console.error('[ThreatIntel] AbuseIPDB lookup failed:', err instanceof Error ? err.message : err)
      try {
        const client = await getRedisClient()
        const fails = await client.incr(FAIL_COUNT_KEY)
        if (fails === 1) {
          await client.expire(FAIL_COUNT_KEY, CACHE_TTL.THREAT_INTEL_BREAKER)
        }
        if (fails >= 3) {
          await client.setEx(BREAKER_KEY, CACHE_TTL.THREAT_INTEL_BREAKER, '1')
          console.warn('[ThreatIntel] Circuit breaker OPEN — AbuseIPDB degraded for 10min')
        }
      } catch {
        // Redis also down — silent fail
      }
    }
  })()
}
