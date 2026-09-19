ALTER TABLE "IdentitySession"
  ADD COLUMN "lastActivityAt" TIMESTAMPTZ(3);

UPDATE "IdentitySession"
SET "lastActivityAt" = "createdAt";

ALTER TABLE "IdentitySession"
  ALTER COLUMN "lastActivityAt" SET NOT NULL;

CREATE INDEX "IdentitySession_lastActivityAt_idx" ON "IdentitySession"("lastActivityAt");
