ALTER TABLE "Payment"
ADD COLUMN "attemptSequence" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_attempt_sequence_non_negative"
CHECK ("attemptSequence" >= 0);
