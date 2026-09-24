CREATE TYPE "LoyaltyEntryType" AS ENUM ('ORDER_REWARD', 'REFERRAL_REWARD');

CREATE TABLE "LoyaltyAccount" (
  "id" UUID NOT NULL, "customerId" UUID NOT NULL, "points" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyAccount_customerId_key" UNIQUE ("customerId"),
  CONSTRAINT "LoyaltyAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Subscription" (
  "id" UUID NOT NULL, "customerId" UUID NOT NULL, "optedIn" BOOLEAN NOT NULL,
  "optedInAt" TIMESTAMPTZ(3), "optedOutAt" TIMESTAMPTZ(3), "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_customerId_key" UNIQUE ("customerId"),
  CONSTRAINT "Subscription_optedIn_timestamps_check" CHECK (
    ("optedIn" = true AND "optedInAt" IS NOT NULL AND "optedOutAt" IS NULL) OR
    ("optedIn" = false AND "optedInAt" IS NULL AND "optedOutAt" IS NOT NULL)
  ),
  CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ReferralCode" (
  "id" UUID NOT NULL, "customerId" UUID NOT NULL, "code" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReferralCode_customerId_key" UNIQUE ("customerId"), CONSTRAINT "ReferralCode_code_key" UNIQUE ("code"),
  CONSTRAINT "ReferralCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Referral" (
  "id" UUID NOT NULL, "referrerCustomerId" UUID NOT NULL, "referredCustomerId" UUID NOT NULL, "qualifyingOrderId" UUID,
  "qualifiedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id"), CONSTRAINT "Referral_referredCustomerId_key" UNIQUE ("referredCustomerId"),
  CONSTRAINT "Referral_qualifyingOrderId_key" UNIQUE ("qualifyingOrderId"),
  CONSTRAINT "Referral_distinct_customers_check" CHECK ("referrerCustomerId" <> "referredCustomerId"),
  CONSTRAINT "Referral_qualification_metadata_check" CHECK (("qualifyingOrderId" IS NULL) = ("qualifiedAt" IS NULL)),
  CONSTRAINT "Referral_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Referral_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Referral_qualifyingOrderId_fkey" FOREIGN KEY ("qualifyingOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Referral_referrerCustomerId_createdAt_idx" ON "Referral"("referrerCustomerId", "createdAt");

CREATE TABLE "LoyaltyLedgerEntry" (
  "id" UUID NOT NULL, "accountId" UUID NOT NULL, "type" "LoyaltyEntryType" NOT NULL, "points" INTEGER NOT NULL,
  "identity" TEXT NOT NULL, "orderId" UUID, "referralId" UUID, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id"), CONSTRAINT "LoyaltyLedgerEntry_identity_key" UNIQUE ("identity"),
  CONSTRAINT "LoyaltyLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyLedgerEntry_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LoyaltyLedgerEntry_accountId_createdAt_idx" ON "LoyaltyLedgerEntry"("accountId", "createdAt");
CREATE INDEX "LoyaltyLedgerEntry_orderId_idx" ON "LoyaltyLedgerEntry"("orderId");
CREATE INDEX "LoyaltyLedgerEntry_referralId_idx" ON "LoyaltyLedgerEntry"("referralId");
