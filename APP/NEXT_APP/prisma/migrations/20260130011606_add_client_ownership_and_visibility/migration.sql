/*
  Warnings:

  - Added the required column `userId` to the `QuotationClient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add userId as nullable first
ALTER TABLE "QuotationClient" ADD COLUMN     "userId" TEXT;

-- Update existing clients to belong to superadmin
UPDATE "QuotationClient" SET "userId" = 'cml02sswm0000qlijmwxh50l5' WHERE "userId" IS NULL;

-- Now make it NOT NULL
ALTER TABLE "QuotationClient" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Quotation_userId_idx" ON "Quotation"("userId");

-- CreateIndex
CREATE INDEX "QuotationClient_userId_idx" ON "QuotationClient"("userId");

-- AddForeignKey
ALTER TABLE "QuotationClient" ADD CONSTRAINT "QuotationClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
