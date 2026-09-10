ALTER TABLE "Payment"
ADD COLUMN "lastProviderEventId" TEXT;

CREATE UNIQUE INDEX "Payment_lastProviderEventId_key"
ON "Payment"("lastProviderEventId");
