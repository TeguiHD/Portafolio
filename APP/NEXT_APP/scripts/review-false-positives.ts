/**
 * Review autonomous-defense false-positive candidates.
 *
 * This script is intentionally read-only. It summarizes high scores, pending
 * human actions and rejected actions so operators can decide whether thresholds
 * need tuning before AUTONOMOUS_DEFENSE_MODE=active.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

interface Args {
  days: number
  minScore: number
  json: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const getValue = (name: string, fallback: string) => {
    const idx = args.indexOf(name)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }

  return {
    days: Math.max(1, parseInt(getValue('--days', '7'), 10)),
    minScore: Math.max(1, Math.min(100, parseInt(getValue('--min-score', '70'), 10))),
    json: args.includes('--json'),
  }
}

function createPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  })
}

function bucketKey(row: { ipHash: string; userId: string | null }) {
  return row.userId ? `user:${row.userId}` : `ip:${row.ipHash}`
}

async function main() {
  const args = parseArgs()
  const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000)
  const prisma = createPrisma()

  try {
    const [scores, pendingActions, decisions] = await Promise.all([
      prisma.threatScoreHistory.findMany({
        where: {
          createdAt: { gte: since },
          score: { gte: args.minScore },
        },
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      prisma.threatPendingAction.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          category: 'security',
          action: { startsWith: 'autonomous_defense.' },
        },
        select: {
          id: true,
          action: true,
          targetId: true,
          targetType: true,
          userId: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    const grouped = new Map<string, {
      key: string
      ipHash: string
      userId: string | null
      count: number
      maxScore: number
      latestAt: Date
      sources: Set<string>
    }>()

    for (const row of scores) {
      const key = bucketKey(row)
      const current = grouped.get(key)
      if (!current) {
        grouped.set(key, {
          key,
          ipHash: row.ipHash,
          userId: row.userId,
          count: 1,
          maxScore: row.score,
          latestAt: row.createdAt,
          sources: new Set([row.source]),
        })
      } else {
        current.count += 1
        current.maxScore = Math.max(current.maxScore, row.score)
        if (row.createdAt > current.latestAt) current.latestAt = row.createdAt
        current.sources.add(row.source)
      }
    }

    const rejected = pendingActions.filter((action) => action.status === 'rejected')
    const pending = pendingActions.filter((action) => action.status === 'pending')
    const approved = pendingActions.filter((action) => action.status === 'approved')
    const falsePositiveRate = pendingActions.length === 0
      ? 0
      : (rejected.length / pendingActions.length) * 100

    const scoreReview = [...grouped.values()]
      .sort((a, b) => b.maxScore - a.maxScore || b.count - a.count)
      .slice(0, 25)
      .map((item) => ({
        key: item.key,
        ipHash: item.ipHash,
        userId: item.userId,
        count: item.count,
        maxScore: item.maxScore,
        latestAt: item.latestAt.toISOString(),
        sources: [...item.sources],
        recommendedReview:
          item.maxScore >= 90 ? 'critical-review' :
          item.count >= 3 ? 'threshold-tuning-review' :
          'sample-review',
      }))

    const report = {
      window: {
        since: since.toISOString(),
        days: args.days,
        minScore: args.minScore,
      },
      summary: {
        highScoreRows: scores.length,
        distinctSubjects: grouped.size,
        autonomousDecisionLogs: decisions.length,
        pendingActions: pending.length,
        approvedActions: approved.length,
        rejectedActions: rejected.length,
        falsePositiveRate: Number(falsePositiveRate.toFixed(2)),
      },
      scoreReview,
      pendingActions: pending.slice(0, 25).map((action) => ({
        id: action.id,
        actionType: action.actionType,
        ipHash: action.ipHash,
        userId: action.userId,
        score: action.score,
        createdAt: action.createdAt.toISOString(),
        expiresAt: action.expiresAt.toISOString(),
      })),
      rejectedActions: rejected.slice(0, 25).map((action) => ({
        id: action.id,
        actionType: action.actionType,
        ipHash: action.ipHash,
        userId: action.userId,
        score: action.score,
        reviewedAt: action.reviewedAt?.toISOString() ?? null,
      })),
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
      return
    }

    console.log('\nAutonomous Defense False-Positive Review')
    console.log('=======================================')
    console.log(`Window: last ${args.days} day(s), score >= ${args.minScore}`)
    console.log(`High-score rows: ${report.summary.highScoreRows}`)
    console.log(`Distinct subjects: ${report.summary.distinctSubjects}`)
    console.log(`Autonomous decision logs: ${report.summary.autonomousDecisionLogs}`)
    console.log(`Pending / approved / rejected: ${pending.length} / ${approved.length} / ${rejected.length}`)
    console.log(`False-positive rate from rejected pending actions: ${report.summary.falsePositiveRate}%`)

    if (report.summary.falsePositiveRate > 2) {
      console.log('\nACTION: False-positive rate is above 2%. Keep dry-run and tune thresholds.')
    } else {
      console.log('\nACTION: False-positive rate is within target. Review samples before active mode.')
    }

    console.log('\nTop subjects to review:')
    for (const item of scoreReview) {
      console.log(`- ${item.key} max=${item.maxScore} count=${item.count} latest=${item.latestAt} sources=${item.sources.join(',')} review=${item.recommendedReview}`)
    }

    if (scoreReview.length === 0) {
      console.log('- No high-score subjects found in this window.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
