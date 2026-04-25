# Military-Grade Autonomous Defense System — Design Spec
**Date:** 2026-04-25  
**Status:** Approved  
**References:** NIST SP 800-61r3, NIST SP 800-207 (Zero Trust), OWASP ASVS 5.0 L3, MITRE ATT&CK, CISA Secure by Design, CIS Controls v8

---

## 1. Problem Statement

The existing SOAR-lite engine (`autonomous-defense.ts`) operates in `dry-run` mode only — it identifies threats and proposes actions but never executes them. Rate limiting in `proxy.ts` uses in-memory state (lost on restart, not distributed, not adaptive). There is no behavioral scoring across time, no external threat intelligence, and no escalation mechanism.

Threat model: sophisticated adversary with full knowledge of the codebase, capable of slow distributed attacks, false-positive injection, and exploiting any single point of failure.

---

## 2. Goals

- Real enforcement: block, cooldown, MFA step-up, dynamic rate limit — all written to Redis, read by the proxy before any Next.js logic executes
- Behavioral scoring: composite `[0-100]` score per IP and user, combining internal signals + AbuseIPDB reputation
- Graduated escalation: 15min → 1h → 24h auto-escalation with human queue for irreversible actions
- Zero Trust: each layer validates independently; Redis failure = fail-closed in production
- Full audit trail: every enforcement action persisted to AuditLog + new Prisma models

---

## 3. Architecture

```
REQUEST
   │
   ▼
┌──────────────────────────────┐
│  proxy.ts  [Node.js runtime] │  Layer 0 — blocks before Next.js
│  • 3 parallel Redis checks   │  threat:block / mfa-step-up / endpoint-cooldown
│  • Dynamic rate limit read   │  threat:ratelimit-override
└─────────────┬────────────────┘
              │ passes
              ▼
┌──────────────────────────────┐
│  Route Handler / DAL         │  Layer 1 — authn/authz
│  • auth() + DAL permissions  │
│  • secureApiEndpoint()       │
└─────────────┬────────────────┘
              │ security event
              ▼
┌──────────────────────────────┐
│  SecurityLogger              │  Layer 2 — observability (exists)
│  • structured event          │
│  • enrichedData (UA, count)  │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  ThreatScoringEngine         │  Layer 3 — NEW
│  • Redis real-time score     │
│  • AbuseIPDB lookup (async)  │
│  • flush to DB at score ≥70  │
└─────────────┬────────────────┘
              │ composite score
              ▼
┌──────────────────────────────┐
│  AutonomousDefenseEngine     │  Layer 4 — extend existing
│  • rule evaluation           │
│  • mode: dry-run | active    │
└─────────────┬────────────────┘
              │ decision
              ▼
┌──────────────────────────────┐
│  EnforcementExecutor         │  Layer 5 — NEW
│  • Redis: block/rate/MFA/    │
│    cooldown with escalation  │
│  • DB: human approval queue  │
│  • Alert: security-alerts.ts │
└──────────────────────────────┘
```

**Principles:**
- Zero Trust: no layer trusts the previous one
- Fail-closed in production: Redis down = block by default
- No coupling: each layer can fail without cascading
- Edge separation: proxy.ts reads Redis only (no Prisma calls)
- Full audit: every action writes to AuditLog

---

## 4. Threat Scoring Engine (`src/lib/threat-scoring.ts`)

### Redis Key Schema

```
threat:ip:{ipHash}:score              → number [0-100], TTL 24h
threat:ip:{ipHash}:events             → sorted set (score=timestamp), TTL 1h
threat:ip:{ipHash}:abuseipdb          → cached AbuseIPDB result JSON, TTL 12h
threat:ip:{ipHash}:offense-count      → number, TTL 24h
threat:user:{userId}:score            → number [0-100], TTL 24h
threat:user:{userId}:events           → sorted set, TTL 1h
threat:block:{ipHash}                 → "1"|"2"|"3" (block level), TTL variable
threat:mfa-step-up:{sessionId}        → ISO timestamp, TTL 15min
threat:endpoint-cooldown:{path}:{ipHash} → "1", TTL variable
threat:ratelimit-override:{ipHash}:{category} → reduced limit number, TTL = window
threat:metrics:blocks                 → counter, TTL 24h
threat:metrics:mfa-stepup            → counter, TTL 24h
threat:metrics:cooldowns             → counter, TTL 24h
```

### Score Composition (MITRE ATT&CK informed)

| Signal | Weight | Source |
|--------|--------|--------|
| Rate limit hits (last 24h) | 25% | Redis internal |
| Auth failures / brute force | 25% | SecurityLogger events |
| Attack patterns (SQLi, traversal, scanning) | 20% | proxy.ts incidents |
| AbuseIPDB confidence score | 20% | External API (cached) |
| Session anomalies | 10% | session-manager |

### Thresholds

| Score | Action |
|-------|--------|
| 0–39 | No action |
| 40–69 | Monitor; trigger AbuseIPDB lookup if not cached |
| 70–79 | Auto-enforce Level 1; flush to DB |
| 80–89 | Auto-enforce Level 2 |
| ≥ 90 | Auto-enforce Level 3 + human queue + critical alert |

### DB Flush Strategy

- Flush on score ≥ 70 (enforcement event)
- Flush every 5 minutes via lightweight async job for scores 40–69
- BD never blocks real-time decisions

---

## 5. Threat Intelligence (`src/lib/threat-intel.ts`)

### AbuseIPDB Integration

- Endpoint: `https://api.abuseipdb.com/api/v2/check`
- API key from `ABUSEIPDB_API_KEY` env var
- Cache: `threat:ip:{ipHash}:abuseipdb` TTL 12h
- Only queried for IPs with internal score ≥ 40 (conserve free-tier quota)
- Budget: max 80 lookups/day (free tier = 1000/day; safety margin)
- **Non-blocking**: fire-and-forget per request; result applied to next request

### Circuit Breaker

- 3 consecutive failures → degraded mode (ignore AbuseIPDB signal)
- Auto-recovery after 10 minutes
- State stored in Redis: `threat:intel:abuseipdb:breaker`
- System continues with internal-only scoring in degraded mode

---

## 6. Enforcement Executor (`src/lib/enforcement-executor.ts`)

### LOWER_RATE_LIMIT

Sets `threat:ratelimit-override:{ipHash}:{category}` with reduced limit.  
Escalation: 50% → 25% → 10% of normal limit per offense level.  
Proxy reads this key before applying static limits.

### COOLDOWN_EXPENSIVE_ENDPOINT

Sets `threat:endpoint-cooldown:{path}:{ipHash}`.  
Affected paths: `/api/finance/ocr`, `/api/cv/chat`, `/api/quotations/chat`, `/api/quotations/generate`, `/api/jobs/vacancies/[id]/analyze`.  
TTL escalation: 5min (L1) → 15min (L2) → 1h (L3).

### REQUIRE_MFA_STEP_UP

Sets `threat:mfa-step-up:{sessionId}` with request timestamp, TTL 15min.  
Proxy returns 401 + `X-MFA-Required: step-up` header.  
Client redirects to MFA verification flow.  
If TTL expires without completion → session invalidated automatically.

### TEMP_BLOCK_IP

Sets `threat:block:{ipHash}` with level value.

| Level | Score range | Condition | TTL | Follow-up |
|-------|-------------|-----------|-----|-----------|
| 1 | 70–79 | Confidence ≥ 80% | 15min | Auto-remove |
| 2 | 80–89 | Reoffense or confidence ≥ 90% | 1h | Auto-remove |
| 3 | ≥ 90 or critical pattern | SQLi/traversal confirmed | 24h | Human queue |

Proxy returns 403 for blocked IPs before any Next.js processing.

### REVOKE_SESSION (semi-automatic)

Triggered by: IP + UA + country change within 5 minutes (session hijacking signal).  
Action: immediate session invalidation in DB + Redis session list.  
Notifications: user email alert + admin security alert.  
Logged to AuditLog with full context.

### Escalation Counter

```
threat:ip:{ipHash}:offense-count → TTL 24h
1st offense → Level 1 (15min)
2nd offense in <24h → Level 2 (1h) automatic
3rd offense in <24h → Level 3 (24h) + human queue
```

---

## 7. Human Approval Queue

### Irreversible actions requiring human approval

- Permanent IP block (beyond 24h Level 3)
- Account suspension
- Extension of Level 3 block beyond initial 24h

### New Prisma Models

```prisma
model ThreatScoreHistory {
  id        String   @id @default(cuid())
  ipHash    String
  userId    String?
  score     Int
  signals   Json     // breakdown per signal with weights
  source    String   // "internal" | "abuseipdb" | "combined"
  createdAt DateTime @default(now())

  @@index([ipHash, createdAt])
  @@index([userId, createdAt])
}

model ThreatPendingAction {
  id          String    @id @default(cuid())
  actionType  String    // "PERMANENT_BLOCK" | "ACCOUNT_SUSPEND" | "EXTEND_BLOCK"
  ipHash      String?
  userId      String?
  score       Int
  context     Json      // full event + decision context
  status      String    @default("pending") // "pending"|"approved"|"rejected"
  reviewedBy  String?   // admin userId
  reviewedAt  DateTime?
  createdAt   DateTime  @default(now())
  expiresAt   DateTime  // auto-expire if no human action taken

  @@index([status, createdAt])
}
```

### Admin UI (`/admin/security`)

- Active blocks table: IP hash, level, TTL remaining, score, AbuseIPDB confidence
- Pending approval queue: full context + Approve / Reject / Escalate buttons
- Day metrics: blocks, MFA step-ups, cooldowns, false positive rate
- All approval actions write to AuditLog with reviewer identity

---

## 8. Proxy Middleware Changes

```typescript
// src/middleware.ts / src/proxy.ts
export const runtime = 'nodejs'  // Required for redis npm package on VPS

// Session identifier for MFA step-up check:
// Proxy cannot call auth() (no Prisma in middleware).
// Instead: read next-auth session cookie, hash its value with SHA-256.
// EnforcementExecutor writes the same hash when setting mfa-step-up.
const sessionCookie = request.cookies.get('next-auth.session-token')?.value
  ?? request.cookies.get('__Secure-next-auth.session-token')?.value
const sessionHash = sessionCookie ? sha256hex(sessionCookie) : null

// Per-request enforcement checks (parallel, ~1-2ms with local Redis)
const [blockLevel, mfaFlag, cooldownActive] = await Promise.all([
  redis.get(`threat:block:${ipHash}`),
  sessionHash ? redis.get(`threat:mfa-step-up:${sessionHash}`) : Promise.resolve(null),
  redis.get(`threat:endpoint-cooldown:${pathname}:${ipHash}`)
])

// Short-circuit responses with full security headers
if (blockLevel) return blocked403(earlySecurityHeaders)
if (mfaFlag)    return mfaRequired401(earlySecurityHeaders)
if (cooldownActive) return cooldown429(earlySecurityHeaders, ttl)

// Dynamic rate limit (read override if exists)
const overrideLimit = await redis.get(`threat:ratelimit-override:${ipHash}:${category}`)
const effectiveLimit = overrideLimit ? parseInt(overrideLimit) : staticLimit
```

Fail-closed: if Redis throws in production, the request is blocked by default.

---

## 9. Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/threat-scoring.ts` | Create | Hybrid Redis+DB scoring engine |
| `src/lib/threat-intel.ts` | Create | AbuseIPDB + circuit breaker |
| `src/lib/enforcement-executor.ts` | Create | Redis enforcement with escalation |
| `src/lib/autonomous-defense.ts` | Modify | Wire real enforcement in active mode |
| `src/proxy.ts` | Modify | Node.js runtime + parallel Redis checks |
| `src/lib/redis.ts` | Modify | Add threat key constants |
| `prisma/schema.prisma` | Modify | ThreatScoreHistory + ThreatPendingAction |
| `src/app/api/admin/security/autonomous-defense/route.ts` | Modify | Metrics + pending queue endpoints |
| `src/app/admin/security/` | Modify | Active blocks + approval queue UI |
| `.env.example` | Modify | ABUSEIPDB_API_KEY |
| `tests/e2e/autonomous-defense.spec.ts` | Create | Enforcement E2E tests |
| `tests/e2e/threat-scoring.spec.ts` | Create | Scoring + circuit breaker tests |

---

## 10. Testing Strategy

### E2E — `autonomous-defense.spec.ts`
- Blocked IP receives 403 with security headers (Level 1, 2, 3)
- Endpoint cooldown returns 429 with correct `Retry-After`
- MFA step-up returns 401 with `X-MFA-Required: step-up`
- Dynamic rate limit override applied below static limit
- 3 offenses in <24h auto-escalates to Level 3 + creates pending action
- Circuit breaker: AbuseIPDB 3 failures → system continues on internal scoring only

### E2E — `threat-scoring.spec.ts`
- Composite score calculates correctly per signal weight
- Score ≥ 70 triggers DB flush
- AbuseIPDB cache hit avoids external call
- Score ≥ 90 creates entry in ThreatPendingAction

### Unit coverage targets
- `threat-scoring.ts`: all signal weight combinations
- `enforcement-executor.ts`: escalation counter logic
- `threat-intel.ts`: circuit breaker state transitions

---

## 11. Environment Variables

```env
AUTONOMOUS_DEFENSE_MODE=active          # off | dry-run | active
AUTONOMOUS_DEFENSE_AUDIT=true
ABUSEIPDB_API_KEY=                      # Free tier: 1000 req/day
ABUSEIPDB_MAX_DAILY_LOOKUPS=80          # Safety budget
```

---

## 12. Security Properties

| Property | Implementation |
|----------|----------------|
| Zero Trust | Each layer validates independently |
| Fail-closed | Redis failure blocks in production |
| No single point of failure | AbuseIPDB circuit breaker; in-memory fallback in dev only |
| Auditability | Every action in AuditLog with full context |
| False positive protection | Graduated TTLs; human gate for permanent actions |
| Anti-weaponization | Attacker cannot permanently block legitimate users automatically |
| Forense readiness | ThreatScoreHistory + AuditLog queryable by incident timeline |
| NIST SP 800-61 alignment | Graduated response, evidence preservation, human-in-the-loop for irreversible |
| OWASP ASVS L3 | Rate limiting, anomaly detection, session protection, audit logging |
