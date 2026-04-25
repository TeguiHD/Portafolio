/**
 * EnforcementExecutor — writes threat decisions to Redis with atomic Lua scripts.
 *
 * Reversible actions execute immediately.
 * Irreversible actions (permanent block, account suspend) go to ThreatPendingAction queue.
 * Every action is written to AuditLog.
 *
 * Offense escalation: 15min (L1) → 1h (L2) → 24h (L3) + human queue.
 * Atomic: offense-count INCR + EXPIRE via Lua to prevent race conditions.
 */
import 'server-only'
import { createHash } from 'crypto'
import { getRedisClient, evalLua, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { sendSecurityAlert } from '@/lib/security-alerts'
import type { AutonomousDefenseAction } from '@/lib/autonomous-defense'

// Lua script: atomic INCR + conditional EXPIRE
const LUA_INCR_EXPIRE = `
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local count = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIRE', key, ttl)
end
return count
`

// ── Offense Counter ────────────────────────────────────────────────

async function incrementOffenseCount(scopeKey: string): Promise<1 | 2 | 3> {
  const key = `${CACHE_KEYS.THREAT_OFFENSE_COUNT}:${scopeKey}`
  const count = await evalLua(LUA_INCR_EXPIRE, [key], [String(CACHE_TTL.THREAT_OFFENSE_COUNT)]) as number
  if (count >= 3) return 3
  if (count >= 2) return 2
  return 1
}

function makeBlockId(auditId: string): string {
  return auditId.slice(0, 8)
}

async function incrementMetric(client: Awaited<ReturnType<typeof getRedisClient>>, key: string): Promise<void> {
  const count = await client.incr(key)
  if (count === 1) {
    await client.expire(key, CACHE_TTL.THREAT_METRICS)
  }
}

// ── Action Executors ───────────────────────────────────────────────

async function executeLowerRateLimit(action: AutonomousDefenseAction, scopeKey: string): Promise<void> {
  const offenseLevel = await incrementOffenseCount(scopeKey)
  const reductions = [0.5, 0.25, 0.1] as const
  const reduction = reductions[offenseLevel - 1]

  const client = await getRedisClient()
  const category = (action.metadata?.category as string) ?? 'api'
  const key = `${CACHE_KEYS.THREAT_RATE_OVERRIDE}:${scopeKey}:${category}`
  await client.setEx(key, CACHE_TTL.THREAT_BLOCK_L1, String(reduction))

  await createAuditLog({
    action: AuditActions.AUTONOMOUS_DEFENSE_DECISION,
    category: 'security',
    userId: (action.metadata?.userId as string | null) ?? null,
    targetId: scopeKey,
    targetType: 'ip-rate-limit',
    ipAddress: scopeKey,
    metadata: { actionType: 'LOWER_RATE_LIMIT', reduction, offenseLevel },
  })
}

async function executeCooldownEndpoint(action: AutonomousDefenseAction, scopeKey: string): Promise<void> {
  const offenseLevel = await incrementOffenseCount(scopeKey)
  const ttls = [CACHE_TTL.THREAT_COOLDOWN_L1, CACHE_TTL.THREAT_COOLDOWN_L2, CACHE_TTL.THREAT_COOLDOWN_L3] as const
  const ttl = ttls[offenseLevel - 1]

  const path = (action.metadata?.path as string) ?? '*'
  const client = await getRedisClient()
  await client.setEx(`${CACHE_KEYS.THREAT_ENDPOINT_COOLDOWN}:${path}:${scopeKey}`, ttl, '1')
  await incrementMetric(client, CACHE_KEYS.THREAT_METRICS_COOLDOWNS)

  await createAuditLog({
    action: AuditActions.AUTONOMOUS_DEFENSE_DECISION,
    category: 'security',
    userId: null,
    targetId: scopeKey,
    targetType: 'endpoint-cooldown',
    ipAddress: scopeKey,
    metadata: { actionType: 'COOLDOWN_EXPENSIVE_ENDPOINT', path, ttlSeconds: ttl, offenseLevel },
  })
}

async function executeMfaStepUp(action: AutonomousDefenseAction, sessionId: string): Promise<void> {
  const sessionHash = createHash('sha256').update(sessionId).digest('hex').slice(0, 16)
  const client = await getRedisClient()
  await client.setEx(
    `${CACHE_KEYS.THREAT_MFA_STEP_UP}:${sessionHash}`,
    CACHE_TTL.THREAT_MFA_STEP_UP,
    new Date().toISOString()
  )
  await incrementMetric(client, CACHE_KEYS.THREAT_METRICS_MFA)

  await createAuditLog({
    action: AuditActions.AUTONOMOUS_DEFENSE_DECISION,
    category: 'security',
    userId: (action.metadata?.userId as string | null) ?? null,
    targetId: sessionHash,
    targetType: 'mfa-step-up',
    ipAddress: (action.metadata?.ipHash as string) ?? '',
    metadata: { actionType: 'REQUIRE_MFA_STEP_UP', sessionHash },
  })
}

async function executeTempBlockIp(
  action: AutonomousDefenseAction,
  ipHash: string,
  score: number
): Promise<string> {
  const offenseLevel = await incrementOffenseCount(ipHash)
  const ttls = [CACHE_TTL.THREAT_BLOCK_L1, CACHE_TTL.THREAT_BLOCK_L2, CACHE_TTL.THREAT_BLOCK_L3] as const
  const ttl = ttls[offenseLevel - 1]

  const client = await getRedisClient()
  await client.setEx(`${CACHE_KEYS.THREAT_BLOCK}:${ipHash}`, ttl, String(offenseLevel))
  await incrementMetric(client, CACHE_KEYS.THREAT_METRICS_BLOCKS)

  const auditEntry = await prisma.auditLog.create({
    data: {
      action: AuditActions.AUTONOMOUS_DEFENSE_DECISION,
      category: 'security',
      userId: null,
      targetId: ipHash,
      targetType: 'ip-block',
      ipAddress: ipHash,
      metadata: { actionType: 'TEMP_BLOCK_IP', level: offenseLevel, ttlSeconds: ttl, score },
    },
  })

  const blockId = makeBlockId(auditEntry.id)

  if (offenseLevel === 3) {
    await prisma.threatPendingAction.create({
      data: {
        actionType: 'PERMANENT_BLOCK',
        ipHash,
        score,
        context: { reason: action.reason, metadata: action.metadata ?? null, blockId } as unknown as import('@prisma/client').Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const stormKey = 'threat:metrics:l3-storm'
    const stormCount = await client.incr(stormKey)
    if (stormCount === 1) await client.expire(stormKey, 5 * 60)

    const alertTitle = stormCount > 10
      ? 'MASS BLOCK ALERT — Possible false positive storm or attack'
      : `Level 3 Block — Score ${score}/100`

    await sendSecurityAlert({
      severity: 'critical',
      type: 'TEMP_BLOCK_L3',
      title: alertTitle,
      description: `IP ${ipHash} auto-blocked for 24h. Human review required.`,
      details: { ipHash, score, offenseLevel, blockId, reason: action.reason, stormCount },
      sourceIP: ipHash,
    })
  }

  return blockId
}

// ── Main Entry Point ──────────────────────────────────────────────

export interface ExecutionResult {
  executed: string[]
  queued: string[]
  blockId?: string
}

/**
 * Execute a list of autonomous defense actions.
 * In dry-run mode: logs only, no Redis writes.
 */
export async function executeActions(
  actions: AutonomousDefenseAction[],
  context: {
    ipHash: string
    score: number
    userId?: string
    sessionId?: string
    mode: 'dry-run' | 'active'
  }
): Promise<ExecutionResult> {
  const result: ExecutionResult = { executed: [], queued: [] }

  for (const action of actions) {
    if (context.mode === 'dry-run') {
      console.log('[EnforcementExecutor] DRY-RUN:', action.type, JSON.stringify(action))
      result.executed.push(`DRY-RUN:${action.type}`)
      continue
    }

    if (action.requiresApproval) {
      result.queued.push(action.type)
      continue
    }

    try {
      const scopeKey = context.userId ?? context.ipHash

      switch (action.type) {
        case 'LOWER_RATE_LIMIT':
          await executeLowerRateLimit(action, scopeKey)
          result.executed.push(action.type)
          break

        case 'COOLDOWN_EXPENSIVE_ENDPOINT':
          await executeCooldownEndpoint(action, context.ipHash)
          result.executed.push(action.type)
          break

        case 'REQUIRE_MFA_STEP_UP':
          if (context.sessionId) {
            await executeMfaStepUp(action, context.sessionId)
            result.executed.push(action.type)
          }
          break

        case 'TEMP_BLOCK_IP':
          result.blockId = await executeTempBlockIp(action, context.ipHash, context.score)
          result.executed.push(action.type)
          break

        case 'ALERT_SECURITY_TEAM':
          await sendSecurityAlert({
            severity: 'high',
            type: action.type,
            title: 'Autonomous Defense Alert',
            description: action.reason,
            details: { ipHash: context.ipHash, userId: context.userId, score: context.score },
            sourceIP: context.ipHash,
          })
          result.executed.push(action.type)
          break

        case 'HUMAN_REVIEW_REQUIRED':
          result.queued.push(action.type)
          break

        default:
          console.warn('[EnforcementExecutor] Unknown action type:', action.type)
      }
    } catch (err) {
      console.error('[EnforcementExecutor] Action failed:', action.type, err instanceof Error ? err.message : err)
    }
  }

  return result
}
