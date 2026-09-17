CREATE TABLE "CatalogueCreateRequest" (
  "id" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "fingerprint" CHAR(64) NOT NULL,
  "resultId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueCreateRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogueCreateRequest_operation_allowed" CHECK ("operation" IN ('PERFUME', 'VARIANT')),
  CONSTRAINT "CatalogueCreateRequest_key_nonempty" CHECK (length(trim("key")) BETWEEN 1 AND 128)
);

CREATE UNIQUE INDEX "CatalogueCreateRequest_operation_key_key"
ON "CatalogueCreateRequest"("operation", "key");
