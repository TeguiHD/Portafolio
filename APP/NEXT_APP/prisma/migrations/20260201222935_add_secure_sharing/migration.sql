/*
  Warnings:

  - A unique constraint covering the columns `[sharingCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'COMMENT', 'EDIT', 'FULL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sharingCode" TEXT;

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL DEFAULT 'VIEW',
    "sharedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConnection_requesterId_idx" ON "UserConnection"("requesterId");

-- CreateIndex
CREATE INDEX "UserConnection_addresseeId_idx" ON "UserConnection"("addresseeId");

-- CreateIndex
CREATE INDEX "UserConnection_status_idx" ON "UserConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_requesterId_addresseeId_key" ON "UserConnection"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "SharedClient_sharedWithUserId_idx" ON "SharedClient"("sharedWithUserId");

-- CreateIndex
CREATE INDEX "SharedClient_clientId_idx" ON "SharedClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedClient_clientId_sharedWithUserId_key" ON "SharedClient"("clientId", "sharedWithUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_sharingCode_key" ON "User"("sharingCode");

-- CreateIndex
CREATE INDEX "User_sharingCode_idx" ON "User"("sharingCode");

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedClient" ADD CONSTRAINT "SharedClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "QuotationClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedClient" ADD CONSTRAINT "SharedClient_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
