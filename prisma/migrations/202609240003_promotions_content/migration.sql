CREATE TYPE "PromotionalContentStatus" AS ENUM ('DRAFT', 'GENERATED', 'PREVIEW', 'APPROVED', 'REJECTED', 'FAILED');

CREATE TABLE "PromotionalContent" (
  "id" UUID NOT NULL,
  "promotionId" UUID,
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "status" "PromotionalContentStatus" NOT NULL DEFAULT 'DRAFT',
  "provider" TEXT,
  "providerJobId" TEXT,
  "previewUrl" TEXT,
  "failureCode" TEXT,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PromotionalContent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromotionalContent_review_check" CHECK (
    ("status" IN ('APPROVED', 'REJECTED') AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL) OR
    ("status" NOT IN ('APPROVED', 'REJECTED') AND "reviewedById" IS NULL AND "reviewedAt" IS NULL)
  ),
  CONSTRAINT "PromotionalContent_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PromotionalContent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AdminAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PromotionalContent_promotionId_status_idx" ON "PromotionalContent"("promotionId", "status");
CREATE INDEX "PromotionalContent_reviewedById_idx" ON "PromotionalContent"("reviewedById");
