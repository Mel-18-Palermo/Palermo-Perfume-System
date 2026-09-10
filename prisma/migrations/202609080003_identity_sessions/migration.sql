ALTER TABLE "Customer" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0 CHECK ("authVersion" >= 0);
CREATE TABLE "IdentitySession" (
  "tokenHash" CHAR(64) PRIMARY KEY,
  "customerId" UUID REFERENCES "Customer"("id") ON DELETE CASCADE,
  "adminId" UUID REFERENCES "AdminAccount"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "authVersion" INTEGER NOT NULL DEFAULT 0 CHECK ("authVersion" >= 0),
  CONSTRAINT "IdentitySession_exact_principal" CHECK (num_nonnulls("customerId", "adminId") = 1),
  CONSTRAINT "IdentitySession_expiration" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "IdentitySession_hash" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "IdentitySession_customerId_idx" ON "IdentitySession"("customerId");
CREATE INDEX "IdentitySession_adminId_idx" ON "IdentitySession"("adminId");
CREATE INDEX "IdentitySession_expiresAt_idx" ON "IdentitySession"("expiresAt");
