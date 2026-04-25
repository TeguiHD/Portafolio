-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "htmlContent" TEXT;

-- AlterTable
ALTER TABLE "VacancyAnalysis" ALTER COLUMN "matchedSkills" DROP DEFAULT,
ALTER COLUMN "missingSkills" DROP DEFAULT,
ALTER COLUMN "recommendedSkills" DROP DEFAULT,
ALTER COLUMN "extractedKeywords" DROP DEFAULT,
ALTER COLUMN "learningPlan" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ThreatScoreHistory" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userId" TEXT,
    "score" INTEGER NOT NULL,
    "signals" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreatScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatPendingAction" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "ipHash" TEXT,
    "userId" TEXT,
    "score" INTEGER NOT NULL,
    "context" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreatScoreHistory_ipHash_createdAt_idx" ON "ThreatScoreHistory"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "ThreatScoreHistory_userId_createdAt_idx" ON "ThreatScoreHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ThreatPendingAction_status_createdAt_idx" ON "ThreatPendingAction"("status", "createdAt");
