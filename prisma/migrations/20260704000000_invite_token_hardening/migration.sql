-- AlterTable: Add tokenHash and expiresAt, drop token
ALTER TABLE "OnboardingInvite" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "OnboardingInvite" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill: hash existing tokens using SHA-256
UPDATE "OnboardingInvite" SET "tokenHash" = encode(sha256("token"::bytea), 'hex');

-- Enforce NOT NULL after backfill
ALTER TABLE "OnboardingInvite" ALTER COLUMN "tokenHash" SET NOT NULL;

-- Add unique constraint on tokenHash
CREATE UNIQUE INDEX "OnboardingInvite_tokenHash_key" ON "OnboardingInvite"("tokenHash");

-- Drop old token column
ALTER TABLE "OnboardingInvite" DROP COLUMN "token";
