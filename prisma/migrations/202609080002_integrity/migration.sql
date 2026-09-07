-- Constraints Prisma cannot express. D-003/D-004, D-034–D-047, D-067–D-072.
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_email_canonical" CHECK (email = lower(btrim(email)) AND length(email) > 3);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_lifecycle" CHECK (
  (status <> 'ACTIVE' OR "emailVerifiedAt" IS NOT NULL) AND
  (status <> 'DEACTIVATED' OR "deactivatedAt" IS NOT NULL) AND revision > 0);
ALTER TABLE "AdminAccount" ADD CONSTRAINT "AdminAccount_email_canonical" CHECK (email = lower(btrim(email)) AND length(email) > 3);
ALTER TABLE "Address" ADD CONSTRAINT "Address_country" CHECK (country ~ '^[A-Z]{2}$');
ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_lifecycle" CHECK (revision > 0 AND (status <> 'ARCHIVED' OR "archivedAt" IS NOT NULL));
ALTER TABLE "PerfumeVariant" ADD CONSTRAINT "Variant_price" CHECK ("priceMinor" >= 0 AND currency ~ '^[A-Z]{3}$');
ALTER TABLE "PerfumeVariant" ADD CONSTRAINT "Variant_packaging" CHECK (jsonb_typeof("giftPackagingOptions") = 'array');
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_exactly_one_owner" CHECK (num_nonnulls("customerId", "visitorSessionKey") = 1);
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_revision" CHECK (revision > 0 AND ("visitorSessionKey" IS NULL OR length("visitorSessionKey") > 0));
CREATE UNIQUE INDEX "Cart_one_active_customer" ON "Cart" ("customerId") WHERE status = 'ACTIVE' AND "customerId" IS NOT NULL;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_positive_quantity" CHECK (quantity > 0);
ALTER TABLE "DeliveryMethod" ADD CONSTRAINT "DeliveryMethod_charge" CHECK ("chargeMinor" >= 0 AND currency ~ '^[A-Z]{3}$');
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_discount" CHECK (
  "discountValue" >= 0 AND (("discountType" = 'FIXED' AND currency ~ '^[A-Z]{3}$' AND currency IS NOT NULL)
    OR ("discountType" = 'PERCENTAGE' AND "discountValue" <= 10000 AND currency IS NULL)));
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_dates" CHECK ("activeFrom" IS NULL OR "activeUntil" IS NULL OR "activeFrom" < "activeUntil");
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals" CHECK (
  "subtotalMinor" >= 0 AND "discountTotalMinor" >= 0 AND "discountTotalMinor" <= "subtotalMinor"
  AND "deliveryChargeMinor" >= 0 AND "totalMinor" >= 0 AND currency ~ '^[A-Z]{3}$'
  AND "totalMinor"::bigint = "subtotalMinor"::bigint - "discountTotalMinor"::bigint + "deliveryChargeMinor"::bigint);
ALTER TABLE "Order" ADD CONSTRAINT "Order_snapshot_objects" CHECK (
  jsonb_typeof("deliveryAddressSnapshot") = 'object' AND jsonb_typeof("billingAddressSnapshot") = 'object'
  AND jsonb_typeof("deliveryMethodSnapshot") = 'object');
ALTER TABLE "Order" ADD CONSTRAINT "Order_retry_identity" CHECK (length("idempotencyKey") > 0 AND length("requestFingerprint") > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_price" CHECK (quantity > 0 AND "unitPriceMinor" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_provider" CHECK (provider = 'STRIPE_SANDBOX' AND (status <> 'SUCCEEDED' OR "providerReference" IS NOT NULL));
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_total" CHECK ("totalMinor" >= 0 AND currency ~ '^[A-Z]{3}$');
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_confirmation" CHECK (
  (status = 'DELIVERED' AND "deliveredAt" IS NOT NULL AND "confirmationSource" = 'INTERNAL_SIMULATOR')
  OR (status <> 'DELIVERED' AND "deliveredAt" IS NULL AND "confirmationSource" IS NULL));
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_available" CHECK (
  "onHand" >= 0 AND reserved >= 0 AND reserved <= "onHand" AND "lowStockThreshold" >= 0);
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_quantity" CHECK (quantity > 0);
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_nonzero" CHECK ("quantityDelta" <> 0 AND length(reference) > 0);
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_quantity_release" CHECK (
  "producedQuantity" > 0 AND ((status = 'RECORDED' AND "releasedAt" IS NULL) OR (status = 'RELEASED' AND "releasedAt" IS NOT NULL)));
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_selection_bounds" CHECK ("minSelections" >= 0 AND "maxSelections" >= GREATEST(1, "minSelections") AND (NOT required OR "minSelections" > 0));
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_owner" CHECK (num_nonnulls("customerId", "visitorSessionKey") = 1);
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_completion" CHECK ((status = 'COMPLETED') = ("completedAt" IS NOT NULL));
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_rank" CHECK (rank > 0);
ALTER TABLE "RecommendationRun" ADD CONSTRAINT "RecommendationRun_context" CHECK ("quizAttemptId" IS NOT NULL OR "profileId" IS NOT NULL);

-- Preserve historical snapshots while allowing fulfilment/payment lifecycle work.
CREATE FUNCTION preserve_order_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['status','cancellationRequestedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','cancellationRequestedAt']) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Order snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER order_snapshot_immutable BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION preserve_order_snapshot();

CREATE FUNCTION reject_historical_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Historical record is append-only';
END;
$$;
CREATE TRIGGER order_item_immutable BEFORE UPDATE OR DELETE ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER invoice_immutable BEFORE UPDATE OR DELETE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER inventory_movement_immutable BEFORE UPDATE OR DELETE ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();

CREATE FUNCTION invoice_requires_verified_payment() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Payment" p JOIN "Order" o ON o.id = p."orderId"
    WHERE p."orderId" = NEW."orderId" AND p.status = 'SUCCEEDED'
      AND o."totalMinor" = NEW."totalMinor" AND o.currency = NEW.currency
      AND p."providerReference" = NEW."paymentReferenceSnapshot") THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Invoice requires verified payment and matching snapshots';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoice_payment_guard BEFORE INSERT ON "Invoice" FOR EACH ROW EXECUTE FUNCTION invoice_requires_verified_payment();
