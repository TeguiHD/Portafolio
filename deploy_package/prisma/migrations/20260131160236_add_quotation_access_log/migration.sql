-- AlterTable
ALTER TABLE "QuotationClient" ADD COLUMN     "address" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactRole" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rut" TEXT;

-- CreateTable
CREATE TABLE "QuotationAccessLog" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "clientSlug" TEXT NOT NULL,
    "quotationSlug" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "fingerprint" TEXT,
    "accessResult" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationAccessLog_quotationId_createdAt_idx" ON "QuotationAccessLog"("quotationId", "createdAt");

-- CreateIndex
CREATE INDEX "QuotationAccessLog_ipAddress_createdAt_idx" ON "QuotationAccessLog"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "QuotationAccessLog_accessResult_idx" ON "QuotationAccessLog"("accessResult");

-- CreateIndex
CREATE INDEX "QuotationAccessLog_createdAt_idx" ON "QuotationAccessLog"("createdAt");
