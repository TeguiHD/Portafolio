/**
 * SOAR-lite autonomous defense evaluator.
 *
 * Phase 1 is intentionally decision-only: it proposes reversible mitigations
 * and logs them in dry-run mode. Enforcement must be added behind explicit
 * approval gates per action type.
 */
import 'server-only'
import { AuditActions, createAuditLog, getAuditLogs } from '@/lib/audit'
import { executeActions } from '@/lib/enforcement-executor'
import type { SecurityEvent, SecurityEventSeverity } from '@/lib/security-logger'

export type AutonomousDefenseMode = 'off' | 'dry-run' | 'active'

export type AutonomousDefenseActionType =
    | 'ALERT_SECURITY_TEAM'
    | 'LOWER_RATE_LIMIT'
    | 'REQUIRE_MFA_STEP_UP'
    | 'REVOKE_SESSION'
    | 'TEMP_BLOCK_IP'
    | 'COOLDOWN_EXPENSIVE_ENDPOINT'
    | 'DISABLE_PUBLIC_SHARE_TOKEN'
    | 'HUMAN_REVIEW_REQUIRED'

export interface AutonomousDefenseAction {
    type: AutonomousDefenseActionType
    scope: 'ip' | 'user' | 'session' | 'endpoint' | 'token' | 'global'
    reversible: boolean
    requiresApproval: boolean
    ttlSeconds?: number
    reason: string
    metadata?: Record<string, unknown>
}

export interface AutonomousDefenseDecision {
    id: string
    ruleId: string
    ruleVersion: string
    mode: AutonomousDefenseMode
    severity: SecurityEventSeverity
    confidence: number
    eventId: string
    eventType: string
    ipAddressHash: string
    userId?: string
    sessionId?: string
    resource?: string
    actions: AutonomousDefenseAction[]
    createdAt: string
}

export interface AutonomousDefenseDecisionFilters {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
    userId?: string
    action?: 'decision' | 'approval_required'
}

interface AutonomousRule {
    id: string
    version: string
    severity: SecurityEventSeverity
    confidence: number
    match: (event: SecurityEvent) => boolean
    actions: (event: SecurityEvent) => AutonomousDefenseAction[]
}

const DEFAULT_MODE: AutonomousDefenseMode = 'dry-run'

function getMode(): AutonomousDefenseMode {
    const raw = process.env.AUTONOMOUS_DEFENSE_MODE?.trim().toLowerCase()
    if (raw === 'off' || raw === 'dry-run' || raw === 'active') {
        return raw
    }
    return DEFAULT_MODE
}

function decisionId(ruleId: string, eventId: string): string {
    return `ad-${ruleId}-${eventId}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120)
}

function isExpensiveEndpoint(resource?: string): boolean {
    if (!resource) return false
    return [
        '/api/finance/ocr',
        '/api/cv/chat',
        '/api/quotations/chat',
        '/api/jobs/vacancies',
        '/api/quotations/generate',
    ].some((prefix) => resource.startsWith(prefix))
}

function hasHighVelocity(event: SecurityEvent): boolean {
    return (event.enrichedData?.requestCount ?? 0) >= 50
}

function inferRateLimitCategory(resource?: string): string {
    if (!resource) return 'api'
    if (resource.startsWith('/api/auth')) return 'auth'
    if (resource.startsWith('/api/finance')) return 'finance'
    if (resource.startsWith('/api/admin')) return 'admin'
    return 'api'
}

const autonomousRules: AutonomousRule[] = [
    {
        id: 'critical-event-human-review',
        version: '2026-04-25.1',
        severity: 'CRITICAL',
        confidence: 95,
        match: (event) => event.severity === 'CRITICAL',
        actions: () => [
            {
                type: 'ALERT_SECURITY_TEAM',
                scope: 'global',
                reversible: true,
                requiresApproval: false,
                reason: 'Critical security event requires immediate visibility.',
            },
            {
                type: 'HUMAN_REVIEW_REQUIRED',
                scope: 'global',
                reversible: true,
                requiresApproval: true,
                reason: 'Critical incidents require human approval before irreversible actions.',
            },
        ],
    },
    {
        id: 'brute-force-progressive-throttle',
        version: '2026-04-25.1',
        severity: 'HIGH',
        confidence: 90,
        match: (event) =>
            event.category === 'BRUTE_FORCE' ||
            (event.category === 'AUTHENTICATION' && event.outcome === 'FAILURE'),
        actions: (event) => [
            {
                type: 'LOWER_RATE_LIMIT',
                scope: 'ip',
                reversible: true,
                requiresApproval: false,
                ttlSeconds: event.severity === 'HIGH' ? 900 : 300,
                reason: 'Repeated authentication failures should trigger temporary throttling.',
            },
        ],
    },
    {
        id: 'session-anomaly-step-up',
        version: '2026-04-25.1',
        severity: 'HIGH',
        confidence: 88,
        match: (event) => event.category === 'SESSION' && event.eventType === 'SESSION_ANOMALY',
        actions: (event) => [
            {
                type: 'REQUIRE_MFA_STEP_UP',
                scope: event.userId ? 'user' : 'session',
                reversible: true,
                requiresApproval: false,
                ttlSeconds: 1800,
                reason: 'Session anomaly should force fresh MFA before privileged activity.',
            },
            {
                type: 'REVOKE_SESSION',
                scope: 'session',
                reversible: false,
                requiresApproval: true,
                reason: 'Session revocation is allowed only after approval until false positives are measured.',
            },
        ],
    },
    {
        id: 'api-abuse-expensive-endpoint-cooldown',
        version: '2026-04-25.1',
        severity: 'MEDIUM',
        confidence: 82,
        match: (event) =>
            (event.category === 'API_ABUSE' || event.category === 'RATE_LIMITING') &&
            isExpensiveEndpoint(event.resource),
        actions: () => [
            {
                type: 'COOLDOWN_EXPENSIVE_ENDPOINT',
                scope: 'endpoint',
                reversible: true,
                requiresApproval: false,
                ttlSeconds: 600,
                reason: 'Costly endpoints should cool down under abuse to protect availability and spend.',
            },
        ],
    },
    {
        id: 'injection-temp-block-candidate',
        version: '2026-04-25.1',
        severity: 'HIGH',
        confidence: 86,
        match: (event) =>
            event.category === 'INJECTION_ATTEMPT' ||
            event.eventType.includes('INJECTION_ATTEMPT'),
        actions: () => [
            {
                type: 'TEMP_BLOCK_IP',
                scope: 'ip',
                reversible: true,
                requiresApproval: false,
                ttlSeconds: 900,
                reason: 'Blocked injection attempts are strong indicators for temporary containment.',
            },
        ],
    },
    {
        id: 'high-velocity-throttle',
        version: '2026-04-25.1',
        severity: 'MEDIUM',
        confidence: 80,
        match: hasHighVelocity,
        actions: () => [
            {
                type: 'LOWER_RATE_LIMIT',
                scope: 'ip',
                reversible: true,
                requiresApproval: false,
                ttlSeconds: 300,
                reason: 'High request velocity should trigger a short adaptive throttle.',
            },
        ],
    },
]

export function evaluateAutonomousDefense(event: SecurityEvent): AutonomousDefenseDecision[] {
    const mode = getMode()
    if (mode === 'off') {
        return []
    }

    return autonomousRules
        .filter((rule) => rule.match(event))
        .map((rule) => ({
            id: decisionId(rule.id, event.eventId),
            ruleId: rule.id,
            ruleVersion: rule.version,
            mode,
            severity: rule.severity,
            confidence: rule.confidence,
            eventId: event.eventId,
            eventType: event.eventType,
            ipAddressHash: event.ipAddressHash,
            userId: event.userId,
            sessionId: event.sessionId,
            resource: event.resource,
            actions: rule.actions(event).map((action) => ({
                ...action,
                metadata: {
                    ...action.metadata,
                    eventId: event.eventId,
                    eventType: event.eventType,
                    path: event.resource,
                    category: inferRateLimitCategory(event.resource),
                    ipHash: event.ipAddressHash,
                    userId: event.userId,
                },
            })),
            createdAt: new Date().toISOString(),
        }))
}

export function logAutonomousDefenseDecision(decision: AutonomousDefenseDecision): void {
    const approvedActions = decision.actions.filter((action) => !action.requiresApproval)
    const gatedActions = decision.actions.filter((action) => action.requiresApproval)

    console.warn('[AUTONOMOUS-DEFENSE]', JSON.stringify({
        id: decision.id,
        mode: decision.mode,
        ruleId: decision.ruleId,
        ruleVersion: decision.ruleVersion,
        severity: decision.severity,
        confidence: decision.confidence,
        eventId: decision.eventId,
        eventType: decision.eventType,
        ipAddressHash: decision.ipAddressHash,
        userId: decision.userId,
        sessionId: decision.sessionId,
        resource: decision.resource,
        proposedActions: approvedActions,
        approvalRequired: gatedActions,
    }))

    persistAutonomousDefenseDecision(decision).catch((error) => {
        console.error('[AUTONOMOUS-DEFENSE] Failed to persist decision', {
            id: decision.id,
            ruleId: decision.ruleId,
            error: error instanceof Error ? error.message : String(error),
        })
    })
}

async function persistAutonomousDefenseDecision(decision: AutonomousDefenseDecision): Promise<void> {
    if (process.env.AUTONOMOUS_DEFENSE_AUDIT === 'false') {
        return
    }

    const approvalRequired = decision.actions.some((action) => action.requiresApproval)
    const action = approvalRequired
        ? AuditActions.AUTONOMOUS_DEFENSE_APPROVAL_REQUIRED
        : AuditActions.AUTONOMOUS_DEFENSE_DECISION

    await createAuditLog({
        action,
        category: 'security',
        userId: decision.userId || null,
        targetId: decision.id,
        targetType: 'autonomous-defense-decision',
        ipAddress: decision.ipAddressHash,
        metadata: {
            mode: decision.mode,
            ruleId: decision.ruleId,
            ruleVersion: decision.ruleVersion,
            severity: decision.severity,
            confidence: decision.confidence,
            eventId: decision.eventId,
            eventType: decision.eventType,
            sessionId: decision.sessionId,
            resource: decision.resource,
            actions: decision.actions,
            approvalRequired,
        },
    })
}

/**
 * Evaluate security event and enforce actions if mode is 'active'.
 * In dry-run: logs decisions only. In off: no-op.
 */
export async function evaluateAndEnforce(
    event: SecurityEvent,
    score: number,
    sessionId?: string
): Promise<void> {
    const mode = getMode()
    if (mode === 'off') return

    const decisions = evaluateAutonomousDefense(event)
    if (decisions.length === 0) return

    for (const decision of decisions) {
        logAutonomousDefenseDecision(decision)

        if (mode === 'active' && decision.actions.length > 0) {
            await executeActions(decision.actions, {
                ipHash: event.ipAddressHash,
                score,
                userId: event.userId,
                sessionId,
                mode: 'active',
            })
        }
    }
}

export async function getAutonomousDefenseDecisions(filters: AutonomousDefenseDecisionFilters = {}) {
    const action =
        filters.action === 'approval_required'
            ? AuditActions.AUTONOMOUS_DEFENSE_APPROVAL_REQUIRED
            : filters.action === 'decision'
                ? AuditActions.AUTONOMOUS_DEFENSE_DECISION
                : 'autonomous_defense.'

    return getAuditLogs({
        page: filters.page,
        limit: filters.limit,
        category: 'security',
        action,
        userId: filters.userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
    })
}
