CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN', 'REMOVED');

CREATE TABLE "Review" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "perfumeId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "moderatedById" UUID,
  "moderatedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
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
