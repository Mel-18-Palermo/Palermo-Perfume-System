CREATE TYPE "SupportActor" AS ENUM ('CUSTOMER', 'ASSISTANT');
CREATE TYPE "SupportIntent" AS ENUM ('PRODUCT', 'POLICY', 'ORDER', 'DELIVERY', 'FEEDBACK');

CREATE TABLE "SupportConversation" (
  "id" UUID NOT NULL,
  "customerId" UUID,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SupportConversation_customerId_createdAt_idx" ON "SupportConversation"("customerId", "createdAt");
CREATE INDEX "SupportConversation_expiresAt_idx" ON "SupportConversation"("expiresAt");

CREATE TABLE "SupportMessage" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "actor" "SupportActor" NOT NULL,
  "intent" "SupportIntent" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");

CREATE TABLE "SupportFeedback" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "SupportFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SupportFeedback_conversationId_idx" ON "SupportFeedback"("conversationId");
