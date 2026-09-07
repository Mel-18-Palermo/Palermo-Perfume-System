-- Provision the private schema and its owner before deployment.
-- The application/migration role deliberately cannot create arbitrary database schemas.

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('DELIVERY', 'BILLING');

-- CreateEnum
CREATE TYPE "CatalogueStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "NoteLayer" AS ENUM ('TOP', 'MIDDLE', 'BASE');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('CURRENT', 'STALE');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('GENERAL', 'SEASONAL', 'LIMITED_EDITION');

-- CreateEnum
CREATE TYPE "SuitabilityCategory" AS ENUM ('OCCASION', 'MOOD', 'WEATHER', 'DAYPART', 'SEASON');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('RECORDED', 'RELEASED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('STARTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FALLBACK', 'FAILED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "authUserId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "deactivatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "billingSameAsDelivery" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" "AddressType" NOT NULL,
    "recipientName" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceProfile" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "preferredIntensityId" UUID,
    "sensitivityAvoidance" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FragranceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileFavouriteNote" (
    "profileId" UUID NOT NULL,
    "noteId" UUID NOT NULL,

    CONSTRAINT "ProfileFavouriteNote_pkey" PRIMARY KEY ("profileId","noteId")
);

-- CreateTable
CREATE TABLE "FragranceIdentity" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "primaryFamilyId" UUID NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "IdentityStatus" NOT NULL DEFAULT 'CURRENT',
    "generatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FragranceIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" UUID NOT NULL,
    "authUserId" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceFamily" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FragranceFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceNote" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FragranceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intensity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Intensity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfume" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "primaryFamilyId" UUID NOT NULL,
    "intensityId" UUID,
    "longevity" TEXT,
    "projection" TEXT,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Perfume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfumeImage" (
    "id" UUID NOT NULL,
    "perfumeId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PerfumeImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfumeNote" (
    "perfumeId" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "layer" "NoteLayer" NOT NULL,

    CONSTRAINT "PerfumeNote_pkey" PRIMARY KEY ("perfumeId","noteId","layer")
);

-- CreateTable
CREATE TABLE "PerfumeVariant" (
    "id" UUID NOT NULL,
    "perfumeId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "bottleSize" TEXT NOT NULL,
    "concentration" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "availability" "Availability" NOT NULL DEFAULT 'AVAILABLE',
    "personalisedLabel" BOOLEAN NOT NULL DEFAULT false,
    "engravingName" BOOLEAN NOT NULL DEFAULT false,
    "giftMessage" BOOLEAN NOT NULL DEFAULT false,
    "giftPackagingOptions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "PerfumeVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CollectionType" NOT NULL DEFAULT 'GENERAL',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPerfume" (
    "collectionId" UUID NOT NULL,
    "perfumeId" UUID NOT NULL,

    CONSTRAINT "CollectionPerfume_pkey" PRIMARY KEY ("collectionId","perfumeId")
);

-- CreateTable
CREATE TABLE "SuitabilityTag" (
    "id" UUID NOT NULL,
    "category" "SuitabilityCategory" NOT NULL,
    "value" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SuitabilityTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfumeSuitability" (
    "perfumeId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "PerfumeSuitability_pkey" PRIMARY KEY ("perfumeId","tagId")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "currency" CHAR(3),
    "eligibility" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" TIMESTAMPTZ(3),
    "activeUntil" TIMESTAMPTZ(3),

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "visitorSessionKey" TEXT,
    "promotionId" UUID,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "personalisedLabel" TEXT,
    "engravingName" TEXT,
    "giftMessage" TEXT,
    "giftPackagingId" TEXT,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryMethod" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "chargeMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "displayInformation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "promotionId" UUID,
    "deliveryMethodId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotalMinor" INTEGER NOT NULL,
    "discountTotalMinor" INTEGER NOT NULL,
    "deliveryChargeMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "deliveryAddressSnapshot" JSONB NOT NULL,
    "billingAddressSnapshot" JSONB NOT NULL,
    "deliveryMethodSnapshot" JSONB NOT NULL,
    "placedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancellationRequestedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "personalisedLabel" TEXT,
    "engravingName" TEXT,
    "giftMessage" TEXT,
    "giftPackagingId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'STRIPE_SANDBOX',
    "providerReference" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "paymentReferenceSnapshot" TEXT NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "trackingReference" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmationSource" TEXT,
    "deliveredAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "variantId" UUID NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("variantId")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "batchCode" TEXT NOT NULL,
    "producedQuantity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'RECORDED',
    "productionDate" TIMESTAMPTZ(3) NOT NULL,
    "releasedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "productionBatchId" UUID,
    "quantityDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "minSelections" INTEGER NOT NULL DEFAULT 1,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "quizVersion" TEXT NOT NULL,
    "customerId" UUID,
    "visitorSessionKey" TEXT,
    "status" "QuizStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "attemptId" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "optionId" UUID NOT NULL,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("attemptId","questionId","optionId")
);

-- CreateTable
CREATE TABLE "RecommendationRun" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "quizAttemptId" UUID,
    "profileId" UUID,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "runId" UUID NOT NULL,
    "perfumeId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("runId","perfumeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_authUserId_key" ON "Customer"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Address_customerId_type_key" ON "Address"("customerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FragranceProfile_customerId_key" ON "FragranceProfile"("customerId");

-- CreateIndex
CREATE INDEX "ProfileFavouriteNote_noteId_idx" ON "ProfileFavouriteNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "FragranceIdentity_profileId_key" ON "FragranceIdentity"("profileId");

-- CreateIndex
CREATE INDEX "FragranceIdentity_primaryFamilyId_idx" ON "FragranceIdentity"("primaryFamilyId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_name_key" ON "AdminRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_authUserId_key" ON "AdminAccount"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");

-- CreateIndex
CREATE INDEX "AdminAccount_roleId_idx" ON "AdminAccount"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "FragranceFamily_name_key" ON "FragranceFamily"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FragranceNote_name_key" ON "FragranceNote"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Intensity_name_key" ON "Intensity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Perfume_slug_key" ON "Perfume"("slug");

-- CreateIndex
CREATE INDEX "Perfume_primaryFamilyId_status_idx" ON "Perfume"("primaryFamilyId", "status");

-- CreateIndex
CREATE INDEX "Perfume_intensityId_idx" ON "Perfume"("intensityId");

-- CreateIndex
CREATE INDEX "PerfumeImage_perfumeId_sortOrder_idx" ON "PerfumeImage"("perfumeId", "sortOrder");

-- CreateIndex
CREATE INDEX "PerfumeNote_noteId_idx" ON "PerfumeNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfumeVariant_sku_key" ON "PerfumeVariant"("sku");

-- CreateIndex
CREATE INDEX "PerfumeVariant_perfumeId_idx" ON "PerfumeVariant"("perfumeId");

-- CreateIndex
CREATE INDEX "CollectionPerfume_perfumeId_idx" ON "CollectionPerfume"("perfumeId");

-- CreateIndex
CREATE UNIQUE INDEX "SuitabilityTag_category_value_key" ON "SuitabilityTag"("category", "value");

-- CreateIndex
CREATE INDEX "PerfumeSuitability_tagId_idx" ON "PerfumeSuitability"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_visitorSessionKey_key" ON "Cart"("visitorSessionKey");

-- CreateIndex
CREATE INDEX "Cart_customerId_status_idx" ON "Cart"("customerId", "status");

-- CreateIndex
CREATE INDEX "Cart_promotionId_idx" ON "Cart"("promotionId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_placedAt_idx" ON "Order"("customerId", "placedAt");

-- CreateIndex
CREATE INDEX "Order_promotionId_idx" ON "Order"("promotionId");

-- CreateIndex
CREATE INDEX "Order_deliveryMethodId_idx" ON "Order"("deliveryMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_customerId_idempotencyKey_key" ON "Order"("customerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingReference_key" ON "Shipment"("trackingReference");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_occurredAt_idx" ON "TrackingEvent"("shipmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryReservation_variantId_status_idx" ON "InventoryReservation"("variantId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_orderId_variantId_key" ON "InventoryReservation"("orderId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_batchCode_key" ON "ProductionBatch"("batchCode");

-- CreateIndex
CREATE INDEX "ProductionBatch_variantId_idx" ON "ProductionBatch"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_id_variantId_key" ON "ProductionBatch"("id", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_productionBatchId_key" ON "InventoryMovement"("productionBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_reference_key" ON "InventoryMovement"("reference");

-- CreateIndex
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_productionBatchId_variantId_key" ON "InventoryMovement"("productionBatchId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_id_version_key" ON "Quiz"("id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_id_quizId_key" ON "QuizQuestion"("id", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_quizId_sortOrder_key" ON "QuizQuestion"("quizId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuizOption_id_questionId_key" ON "QuizOption"("id", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizOption_questionId_sortOrder_key" ON "QuizOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_quizVersion_idx" ON "QuizAttempt"("quizId", "quizVersion");

-- CreateIndex
CREATE INDEX "QuizAttempt_customerId_idx" ON "QuizAttempt"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_id_quizId_key" ON "QuizAttempt"("id", "quizId");

-- CreateIndex
CREATE INDEX "QuizResponse_questionId_quizId_idx" ON "QuizResponse"("questionId", "quizId");

-- CreateIndex
CREATE INDEX "QuizResponse_optionId_questionId_idx" ON "QuizResponse"("optionId", "questionId");

-- CreateIndex
CREATE INDEX "RecommendationRun_customerId_idx" ON "RecommendationRun"("customerId");

-- CreateIndex
CREATE INDEX "RecommendationRun_quizAttemptId_idx" ON "RecommendationRun"("quizAttemptId");

-- CreateIndex
CREATE INDEX "RecommendationRun_profileId_idx" ON "RecommendationRun"("profileId");

-- CreateIndex
CREATE INDEX "RecommendationItem_perfumeId_idx" ON "RecommendationItem"("perfumeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationItem_runId_rank_key" ON "RecommendationItem"("runId", "rank");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceProfile" ADD CONSTRAINT "FragranceProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceProfile" ADD CONSTRAINT "FragranceProfile_preferredIntensityId_fkey" FOREIGN KEY ("preferredIntensityId") REFERENCES "Intensity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileFavouriteNote" ADD CONSTRAINT "ProfileFavouriteNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "FragranceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileFavouriteNote" ADD CONSTRAINT "ProfileFavouriteNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "FragranceNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceIdentity" ADD CONSTRAINT "FragranceIdentity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "FragranceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceIdentity" ADD CONSTRAINT "FragranceIdentity_primaryFamilyId_fkey" FOREIGN KEY ("primaryFamilyId") REFERENCES "FragranceFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AdminRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAccount" ADD CONSTRAINT "AdminAccount_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AdminRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_primaryFamilyId_fkey" FOREIGN KEY ("primaryFamilyId") REFERENCES "FragranceFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_intensityId_fkey" FOREIGN KEY ("intensityId") REFERENCES "Intensity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeImage" ADD CONSTRAINT "PerfumeImage_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeNote" ADD CONSTRAINT "PerfumeNote_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeNote" ADD CONSTRAINT "PerfumeNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "FragranceNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeVariant" ADD CONSTRAINT "PerfumeVariant_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPerfume" ADD CONSTRAINT "CollectionPerfume_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPerfume" ADD CONSTRAINT "CollectionPerfume_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeSuitability" ADD CONSTRAINT "PerfumeSuitability_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfumeSuitability" ADD CONSTRAINT "PerfumeSuitability_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SuitabilityTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "DeliveryMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productionBatchId_variantId_fkey" FOREIGN KEY ("productionBatchId", "variantId") REFERENCES "ProductionBatch"("id", "variantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_quizVersion_fkey" FOREIGN KEY ("quizId", "quizVersion") REFERENCES "Quiz"("id", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_attemptId_quizId_fkey" FOREIGN KEY ("attemptId", "quizId") REFERENCES "QuizAttempt"("id", "quizId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_questionId_quizId_fkey" FOREIGN KEY ("questionId", "quizId") REFERENCES "QuizQuestion"("id", "quizId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_optionId_questionId_fkey" FOREIGN KEY ("optionId", "questionId") REFERENCES "QuizOption"("id", "questionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRun" ADD CONSTRAINT "RecommendationRun_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRun" ADD CONSTRAINT "RecommendationRun_quizAttemptId_fkey" FOREIGN KEY ("quizAttemptId") REFERENCES "QuizAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRun" ADD CONSTRAINT "RecommendationRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "FragranceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RecommendationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
