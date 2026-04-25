/**
 * ThreatScoringEngine — composite [0-100] score per IP and user.
 *
 * CGNAT-aware: authenticated traffic is scored by userId (primary),
 * unauthenticated by ipHash (primary).
 *
 * Hybrid persistence: Redis for real-time decisions, Postgres for
 * durable history (flushed on score ≥70 or every 5min for 40-69).
 */
import 'server-only'
import { createHmac } from 'crypto'
import { getRedisClient, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { getCachedAbuseScore, triggerAbuseIPDBLookup } from '@/lib/threat-intel'

// ── IP Hashing ─────────────────────────────────────────────────────

/** HMAC-SHA256 IP hash using IP_HASH_SECRET. Truncated to 16 hex chars. */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return ip.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
        .toString(16).replace('-', '').padStart(8, '0')
    }
    throw new Error('IP_HASH_SECRET is required in production')
  }
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16)
}

// ── Signal Weights ─────────────────────────────────────────────────

interface SignalWeights {
  rateLimitHits: number     // 0-100 normalized
  authFailures: number      // 0-100 normalized
  attackPatterns: number    // 0-100 normalized
  abuseipdb: number         // 0-100 (direct confidence score)
  sessionAnomalies: number  // 0-100 normalized
}

/** Weighted sum for unauthenticated traffic (IP-primary). */
function scoreUnauthenticated(signals: SignalWeights): number {
  return Math.min(100, Math.round(
    signals.rateLimitHits    * 0.25 +
    signals.authFailures     * 0.25 +
    signals.attackPatterns   * 0.20 +
    signals.abuseipdb        * 0.20 +
    signals.sessionAnomalies * 0.10
  ))
}

/** Weighted sum for authenticated traffic (userId-primary, CGNAT-safe). */
function scoreAuthenticated(signals: SignalWeights): number {
  return Math.min(100, Math.round(
    signals.rateLimitHits    * 0.15 +
    signals.authFailures     * 0.30 +
    signals.attackPatterns   * 0.20 +
    signals.abuseipdb        * 0.10 +
    signals.sessionAnomalies * 0.25
  ))
}

// ── Signal Collectors ──────────────────────────────────────────────

async function collectIpSignals(ipHash: string, realIp: string): Promise<SignalWeights> {
  const client = await getRedisClient()
  const [rateLimitRaw, authFailRaw, attackRaw, sessionRaw] = await Promise.all([
    client.get(`${CACHE_KEYS.THREAT_IP_SCORE}:${ipHash}:rate-hits`),
    client.get(`${CACHE_KEYS.THREAT_IP_SCORE}:${ipHash}:auth-fails`),
    client.get(`${CACHE_KEYS.THREAT_IP_SCORE}:${ipHash}:attack-hits`),
    client.get(`${CACHE_KEYS.THREAT_IP_SCORE}:${ipHash}:session-anomalies`),
  ])

  const abuseResult = await getCachedAbuseScore(ipHash)
  if (!abuseResult) {
    triggerAbuseIPDBLookup(realIp, ipHash)
  }

  return {
    rateLimitHits:    Math.min(100, (parseInt(rateLimitRaw ?? '0') / 10) * 100),
    authFailures:     Math.min(100, (parseInt(authFailRaw ?? '0') / 5) * 100),
    attackPatterns:   Math.min(100, (parseInt(attackRaw ?? '0') / 3) * 100),
    abuseipdb:        abuseResult?.abuseConfidenceScore ?? 0,
    sessionAnomalies: Math.min(100, (parseInt(sessionRaw ?? '0') / 2) * 100),
  }
}

async function collectUserSignals(userId: string): Promise<SignalWeights> {
  const client = await getRedisClient()
  const [rateLimitRaw, authFailRaw, attackRaw, sessionRaw] = await Promise.all([
    client.get(`${CACHE_KEYS.THREAT_USER_SCORE}:${userId}:rate-hits`),
    client.get(`${CACHE_KEYS.THREAT_USER_SCORE}:${userId}:auth-fails`),
    client.get(`${CACHE_KEYS.THREAT_USER_SCORE}:${userId}:attack-hits`),
    client.get(`${CACHE_KEYS.THREAT_USER_SCORE}:${userId}:session-anomalies`),
  ])

  return {
    rateLimitHits:    Math.min(100, (parseInt(rateLimitRaw ?? '0') / 10) * 100),
    authFailures:     Math.min(100, (parseInt(authFailRaw ?? '0') / 5) * 100),
    attackPatterns:   Math.min(100, (parseInt(attackRaw ?? '0') / 3) * 100),
    abuseipdb:        0, // not used for auth traffic
    sessionAnomalies: Math.min(100, (parseInt(sessionRaw ?? '0') / 2) * 100),
  }
}

// ── Public API ────────────────────────────────────────────────────

export interface ThreatScore {
  score: number
  signals: SignalWeights
  source: 'internal' | 'abuseipdb' | 'combined'
  primaryKey: 'ip' | 'user'
}

/**
 * Compute composite threat score.
 * For authenticated users: score by userId (CGNAT-safe).
 * For unauthenticated: score by ipHash.
 * Score ≥70 triggers async DB flush.
 */
export async function computeThreatScore(params: {
  realIp: string
  ipHash: string
  userId?: string
}): Promise<ThreatScore> {
  const { realIp, ipHash, userId } = params

  let signals: SignalWeights
  let score: number
  let primaryKey: 'ip' | 'user'

  if (userId) {
    signals = await collectUserSignals(userId)
    score = scoreAuthenticated(signals)
    primaryKey = 'user'
  } else {
    signals = await collectIpSignals(ipHash, realIp)
    score = scoreUnauthenticated(signals)
    primaryKey = 'ip'
  }

  const source = signals.abuseipdb > 0 ? 'combined' : 'internal'
  const result: ThreatScore = { score, signals, source, primaryKey }

  const scoreKey = userId
    ? `${CACHE_KEYS.THREAT_USER_SCORE}:${userId}:score`
    : `${CACHE_KEYS.THREAT_IP_SCORE}:${ipHash}:score`
  const client = await getRedisClient()
  await client.setEx(scoreKey, CACHE_TTL.THREAT_SCORE, String(score))

  if (score >= 70) {
    void flushScoreToDB({ ipHash, userId, score, signals, source })
  }

  return result
}

/** Increment a raw signal counter (e.g., after a rate limit hit). */
export async function incrementSignal(
  key: 'ip' | 'user',
  id: string,
  signal: 'rate-hits' | 'auth-fails' | 'attack-hits' | 'session-anomalies'
): Promise<void> {
  try {
    const client = await getRedisClient()
    const prefix = key === 'ip' ? CACHE_KEYS.THREAT_IP_SCORE : CACHE_KEYS.THREAT_USER_SCORE
    const redisKey = `${prefix}:${id}:${signal}`
    const count = await client.incr(redisKey)
    if (count === 1) await client.expire(redisKey, CACHE_TTL.THREAT_SCORE)
  } catch (err) {
    console.error('[ThreatScoring] incrementSignal failed:', err instanceof Error ? err.message : err)
  }
}

/** Get cached score from Redis (0 if not yet computed). */
export async function getCachedScore(key: 'ip' | 'user', id: string): Promise<number> {
  try {
    const client = await getRedisClient()
    const prefix = key === 'ip' ? CACHE_KEYS.THREAT_IP_SCORE : CACHE_KEYS.THREAT_USER_SCORE
    const raw = await client.get(`${prefix}:${id}:score`)
    return raw ? parseInt(raw) : 0
  } catch {
    return 0
  }
}

async function flushScoreToDB(params: {
  ipHash: string
  userId?: string
  score: number
  signals: SignalWeights
  source: string
}): Promise<void> {
  try {
    await prisma.threatScoreHistory.create({
      data: {
        ipHash: params.ipHash,
        userId: params.userId ?? null,
        score: params.score,
        signals: params.signals,
        source: params.source,
      },
    })
  } catch (err) {
    console.error('[ThreatScoring] DB flush failed:', err instanceof Error ? err.message : err)
  }
}
