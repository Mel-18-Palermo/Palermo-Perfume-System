CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN', 'REMOVED');
CREATE TYPE "LoyaltyEntryType" AS ENUM ('ORDER_REWARD', 'REFERRAL_REWARD', 'REDEMPTION', 'ADJUSTMENT');
CREATE TYPE "PromotionalContentStatus" AS ENUM ('DRAFT', 'GENERATED', 'PREVIEW', 'APPROVED', 'REJECTED', 'FAILED');
CREATE TYPE "SupportActor" AS ENUM ('CUSTOMER', 'ASSISTANT');

CREATE TABLE "Review" (
  "id" UUID NOT NULL, "customerId" UUID NOT NULL, "perfumeId" UUID NOT NULL, "rating" INTEGER NOT NULL, "text" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING', "moderatedById" UUID, "moderatedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_customerId_perfumeId_key" UNIQUE ("customerId", "perfumeId"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "Review_moderation_check" CHECK (("status" = 'PENDING' AND "moderatedById" IS NULL AND "moderatedAt" IS NULL) OR ("status" <> 'PENDING' AND "moderatedById" IS NOT NULL AND "moderatedAt" IS NOT NULL)),
  CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Review_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "AdminAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Review_perfumeId_status_createdAt_idx" ON "Review"("perfumeId", "status", "createdAt");
CREATE INDEX "Review_moderatedById_idx" ON "Review"("moderatedById");

CREATE TABLE "LoyaltyAccount" ("id" UUID NOT NULL, "customerId" UUID NOT NULL, "points" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id"), CONSTRAINT "LoyaltyAccount_customerId_key" UNIQUE ("customerId"), CONSTRAINT "LoyaltyAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "Subscription" ("id" UUID NOT NULL, "customerId" UUID NOT NULL, "optedIn" BOOLEAN NOT NULL DEFAULT false, "optedInAt" TIMESTAMPTZ(3), "optedOutAt" TIMESTAMPTZ(3), "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"), CONSTRAINT "Subscription_customerId_key" UNIQUE ("customerId"), CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "ReferralCode" ("id" UUID NOT NULL, "customerId" UUID NOT NULL, "code" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id"), CONSTRAINT "ReferralCode_customerId_key" UNIQUE ("customerId"), CONSTRAINT "ReferralCode_code_key" UNIQUE ("code"), CONSTRAINT "ReferralCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE TABLE "Referral" ("id" UUID NOT NULL, "referrerCustomerId" UUID NOT NULL, "referredCustomerId" UUID NOT NULL, "qualifyingOrderId" UUID, "qualifiedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Referral_pkey" PRIMARY KEY ("id"), CONSTRAINT "Referral_referredCustomerId_key" UNIQUE ("referredCustomerId"), CONSTRAINT "Referral_qualifyingOrderId_key" UNIQUE ("qualifyingOrderId"), CONSTRAINT "Referral_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Referral_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Referral_qualifyingOrderId_fkey" FOREIGN KEY ("qualifyingOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "Referral_referrerCustomerId_createdAt_idx" ON "Referral"("referrerCustomerId", "createdAt");
CREATE TABLE "LoyaltyLedgerEntry" ("id" UUID NOT NULL, "accountId" UUID NOT NULL, "type" "LoyaltyEntryType" NOT NULL, "points" INTEGER NOT NULL, "identity" TEXT NOT NULL, "orderId" UUID, "referralId" UUID, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id"), CONSTRAINT "LoyaltyLedgerEntry_identity_key" UNIQUE ("identity"), CONSTRAINT "LoyaltyLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "LoyaltyLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "LoyaltyLedgerEntry_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "LoyaltyLedgerEntry_accountId_createdAt_idx" ON "LoyaltyLedgerEntry"("accountId", "createdAt");
CREATE INDEX "LoyaltyLedgerEntry_orderId_idx" ON "LoyaltyLedgerEntry"("orderId");
CREATE INDEX "LoyaltyLedgerEntry_referralId_idx" ON "LoyaltyLedgerEntry"("referralId");

CREATE TABLE "PromotionalContent" ("id" UUID NOT NULL, "promotionId" UUID, "title" TEXT NOT NULL, "brief" TEXT NOT NULL, "status" "PromotionalContentStatus" NOT NULL DEFAULT 'DRAFT', "provider" TEXT, "providerJobId" TEXT, "previewUrl" TEXT, "failureCode" TEXT, "reviewedById" UUID, "reviewedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "PromotionalContent_pkey" PRIMARY KEY ("id"), CONSTRAINT "PromotionalContent_review_check" CHECK (("status" IN ('APPROVED','REJECTED') AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL) OR ("status" NOT IN ('APPROVED','REJECTED') AND "reviewedById" IS NULL AND "reviewedAt" IS NULL)), CONSTRAINT "PromotionalContent_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "PromotionalContent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AdminAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "PromotionalContent_promotionId_status_idx" ON "PromotionalContent"("promotionId", "status");
CREATE INDEX "PromotionalContent_reviewedById_idx" ON "PromotionalContent"("reviewedById");

CREATE TABLE "SupportConversation" ("id" UUID NOT NULL, "customerId" UUID, "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupportConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "SupportConversation_customerId_createdAt_idx" ON "SupportConversation"("customerId", "createdAt");
CREATE INDEX "SupportConversation_expiresAt_idx" ON "SupportConversation"("expiresAt");
CREATE TABLE "SupportMessage" ("id" UUID NOT NULL, "conversationId" UUID NOT NULL, "actor" "SupportActor" NOT NULL, "intent" TEXT NOT NULL, "content" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");
CREATE TABLE "SupportFeedback" ("id" UUID NOT NULL, "conversationId" UUID NOT NULL, "customerId" UUID, "rating" INTEGER NOT NULL, "comment" TEXT, "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SupportFeedback_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupportFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "SupportFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "SupportFeedback_conversationId_idx" ON "SupportFeedback"("conversationId");
