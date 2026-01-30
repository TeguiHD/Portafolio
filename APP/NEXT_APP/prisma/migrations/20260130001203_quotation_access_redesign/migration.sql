/*
  Warnings:

  - You are about to drop the column `specificAccessCode` on the `Quotation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clientId,slug]` on the table `Quotation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Quotation" DROP COLUMN "specificAccessCode",
ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "accessMode" TEXT NOT NULL DEFAULT 'code',
ADD COLUMN     "codeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE INDEX "Quotation_slug_idx" ON "Quotation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_clientId_slug_key" ON "Quotation"("clientId", "slug");
