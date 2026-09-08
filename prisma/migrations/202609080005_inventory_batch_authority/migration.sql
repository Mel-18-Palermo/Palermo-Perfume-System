-- Durable request identity and attributable administrator actions for production batches.
ALTER TABLE "ProductionBatch"
  ADD COLUMN "recordIdempotencyKey" TEXT,
  ADD COLUMN "releaseIdempotencyKey" TEXT,
  ADD COLUMN "recordedByAdminId" UUID,
  ADD COLUMN "releasedByAdminId" UUID;

CREATE UNIQUE INDEX "ProductionBatch_recordIdempotencyKey_key"
  ON "ProductionBatch"("recordIdempotencyKey");
CREATE UNIQUE INDEX "ProductionBatch_releaseIdempotencyKey_key"
  ON "ProductionBatch"("releaseIdempotencyKey");
CREATE INDEX "ProductionBatch_recordedByAdminId_idx"
  ON "ProductionBatch"("recordedByAdminId");
CREATE INDEX "ProductionBatch_releasedByAdminId_idx"
  ON "ProductionBatch"("releasedByAdminId");

ALTER TABLE "ProductionBatch"
  ADD CONSTRAINT "ProductionBatch_recordedByAdminId_fkey"
    FOREIGN KEY ("recordedByAdminId") REFERENCES "AdminAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionBatch_releasedByAdminId_fkey"
    FOREIGN KEY ("releasedByAdminId") REFERENCES "AdminAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionBatch_request_identity" CHECK (
    ("recordIdempotencyKey" IS NULL OR length("recordIdempotencyKey") BETWEEN 8 AND 128)
    AND ("releaseIdempotencyKey" IS NULL OR length("releaseIdempotencyKey") BETWEEN 8 AND 128)
  );
