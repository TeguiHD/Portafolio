/*
  Warnings:

  - The `status` column on the `Quotation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'PENDING', 'REVISION', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'PAYPAL', 'CRYPTO', 'OTHER');

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "ClientShareCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientShareCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationPayment" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationStatusHistory" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "fromStatus" "QuotationStatus",
    "toStatus" "QuotationStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientShareCode_code_key" ON "ClientShareCode"("code");

-- CreateIndex
CREATE INDEX "ClientShareCode_code_idx" ON "ClientShareCode"("code");

-- CreateIndex
CREATE INDEX "ClientShareCode_expiresAt_idx" ON "ClientShareCode"("expiresAt");

-- CreateIndex
CREATE INDEX "ClientShareCode_clientId_idx" ON "ClientShareCode"("clientId");

-- CreateIndex
CREATE INDEX "ClientShareCode_createdById_idx" ON "ClientShareCode"("createdById");

-- CreateIndex
CREATE INDEX "QuotationPayment_quotationId_idx" ON "QuotationPayment"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationPayment_paidAt_idx" ON "QuotationPayment"("paidAt");

-- CreateIndex
CREATE INDEX "QuotationStatusHistory_quotationId_createdAt_idx" ON "QuotationStatusHistory"("quotationId", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- AddForeignKey
ALTER TABLE "ClientShareCode" ADD CONSTRAINT "ClientShareCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "QuotationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationPayment" ADD CONSTRAINT "QuotationPayment_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationStatusHistory" ADD CONSTRAINT "QuotationStatusHistory_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
