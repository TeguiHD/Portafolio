import { NextRequest, NextResponse } from 'next/server'
import { verifySessionForApi } from '@/lib/auth/dal'
import { hasPermission } from '@/lib/permission-check'
import { getAutonomousDefenseDecisions } from '@/lib/autonomous-defense'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { getRedisClient, CACHE_KEYS } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseOptionalDate(value: string | null): Date | undefined {
    if (!value) return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * GET /api/admin/security/autonomous-defense
 * view=decisions (default) — SOAR-lite decisions from audit log
 * view=metrics  — today's block/MFA/cooldown counters from Redis
 * view=pending  — actions awaiting human approval
 */
export async function GET(request: NextRequest) {
    try {
        const session = await verifySessionForApi()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const canView = await hasPermission(
            session.user.id,
            session.user.role,
            'security.view'
        )

        if (!canView) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const view = searchParams.get('view') ?? 'decisions'

        if (view === 'metrics') {
            try {
                const client = await getRedisClient()
                const [blocks, mfaStepups, cooldowns] = await Promise.all([
                    client.get(CACHE_KEYS.THREAT_METRICS_BLOCKS),
                    client.get(CACHE_KEYS.THREAT_METRICS_MFA),
                    client.get(CACHE_KEYS.THREAT_METRICS_COOLDOWNS),
                ])
                return NextResponse.json({
                    today: {
                        blocks: parseInt(blocks ?? '0'),
                        mfaStepups: parseInt(mfaStepups ?? '0'),
                        cooldowns: parseInt(cooldowns ?? '0'),
                    }
                })
            } catch {
                return NextResponse.json({ error: 'Redis unavailable' }, { status: 503 })
            }
        }

        if (view === 'pending') {
            const pending = await prisma.threatPendingAction.findMany({
                where: { status: 'pending' },
                orderBy: { createdAt: 'desc' },
                take: 50,
            })
            return NextResponse.json({ pending })
        }

        // Default: audit log decisions
        const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)
        const actionParam = searchParams.get('action')
        const action = actionParam === 'decision' || actionParam === 'approval_required'
            ? actionParam
            : undefined
        const userId = searchParams.get('userId') || undefined
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        const result = await getAutonomousDefenseDecisions({
            page,
            limit,
            action,
            userId,
            startDate: parseOptionalDate(startDateParam),
            endDate: parseOptionalDate(endDateParam),
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('[Autonomous Defense API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch autonomous defense decisions' },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/admin/security/autonomous-defense
 * Approve or reject a pending action from the human approval queue.
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await verifySessionForApi()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const canManage = await hasPermission(
            session.user.id,
            session.user.role,
            'security.incidents.resolve'
        )

        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json() as { id: string; action: 'approved' | 'rejected' }
        const { id, action } = body

        if (!id || !['approved', 'rejected'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const pending = await prisma.threatPendingAction.update({
            where: { id },
            data: {
                status: action,
                reviewedBy: session.user.id,
                reviewedAt: new Date(),
            },
        })

        await createAuditLog({
            action: AuditActions.AUTONOMOUS_DEFENSE_APPROVAL_REQUIRED,
            category: 'security',
            userId: session.user.id,
            targetId: id,
            targetType: 'threat-pending-action',
            ipAddress: request.headers.get('x-forwarded-for') ?? 'unknown',
            metadata: { reviewAction: action, actionType: pending.actionType, ipHash: pending.ipHash },
        })

        return NextResponse.json({ ok: true, status: action })
    } catch (error) {
        console.error('[Autonomous Defense API] PATCH error:', error)
        return NextResponse.json({ error: 'Failed to process review' }, { status: 500 })
    }
}
