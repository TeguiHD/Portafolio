-- CreateEnum
CREATE TYPE "UserDeletionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETION_REQUESTED', 'DELETION_SCHEDULED', 'ANONYMIZED', 'DELETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "dataExportedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "deletionStatus" "UserDeletionStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "User_deletionStatus_idx" ON "User"("deletionStatus");

-- CreateIndex
CREATE INDEX "User_deletionScheduledAt_idx" ON "User"("deletionScheduledAt");
