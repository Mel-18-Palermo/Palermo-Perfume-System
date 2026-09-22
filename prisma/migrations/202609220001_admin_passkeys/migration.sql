CREATE TYPE "WebAuthnChallengeType" AS ENUM ('REGISTRATION', 'AUTHENTICATION');

CREATE TABLE "AdminPasskeyCredential" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" INTEGER NOT NULL,
  "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "credentialDeviceType" TEXT NOT NULL,
  "credentialBackedUp" BOOLEAN NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AdminPasskeyCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPasskeyCredential_credentialId_key" ON "AdminPasskeyCredential"("credentialId");
CREATE INDEX "AdminPasskeyCredential_adminId_idx" ON "AdminPasskeyCredential"("adminId");
CREATE INDEX "AdminPasskeyCredential_adminId_revokedAt_idx" ON "AdminPasskeyCredential"("adminId", "revokedAt");
ALTER TABLE "AdminPasskeyCredential" ADD CONSTRAINT "AdminPasskeyCredential_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WebAuthnChallenge" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "challenge" TEXT NOT NULL,
  "adminId" UUID,
  "email" TEXT,
  "type" "WebAuthnChallengeType" NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebAuthnChallenge_challenge_key" ON "WebAuthnChallenge"("challenge");
CREATE INDEX "WebAuthnChallenge_adminId_type_expiresAt_idx" ON "WebAuthnChallenge"("adminId", "type", "expiresAt");
CREATE INDEX "WebAuthnChallenge_email_type_expiresAt_idx" ON "WebAuthnChallenge"("email", "type", "expiresAt");
ALTER TABLE "WebAuthnChallenge" ADD CONSTRAINT "WebAuthnChallenge_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
