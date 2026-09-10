-- Persist cancellation request identity without changing historical orders.
ALTER TABLE "Order" ADD COLUMN "cancellationIdempotencyKey" TEXT;

CREATE UNIQUE INDEX "Order_cancellationIdempotencyKey_key"
  ON "Order"("cancellationIdempotencyKey");

ALTER TABLE "Order" ADD CONSTRAINT "Order_cancellation_request_identity" CHECK (
  "cancellationIdempotencyKey" IS NULL
  OR length("cancellationIdempotencyKey") BETWEEN 16 AND 128
);

CREATE OR REPLACE FUNCTION preserve_order_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['status','cancellationRequestedAt','cancellationIdempotencyKey']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','cancellationRequestedAt','cancellationIdempotencyKey']) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Order snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$;
