ALTER TABLE "User"
    ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "mfaSecret" TEXT,
    ADD COLUMN "mfaRecoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "mfaBackupEmail" TEXT;