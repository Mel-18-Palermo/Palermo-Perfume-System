-- Imported historical demo payments are intentionally distinct from live Stripe sandbox transactions.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_provider";

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_provider" CHECK (
  provider IN ('STRIPE_SANDBOX', 'DEMO_HISTORY_IMPORT')
  AND (status <> 'SUCCEEDED' OR "providerReference" IS NOT NULL)
);
