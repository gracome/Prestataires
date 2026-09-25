-- Prevent double booking at the database level (cahier des charges section 15).
--
-- The application re-checks availability inside the booking transaction, but
-- two requests can pass that check at the same instant. This constraint is
-- what actually settles the race: Postgres refuses the second INSERT and the
-- API turns the resulting 23P01 into a clear "slot already taken" answer.
--
-- btree_gist is required to mix an equality operator on provider_id with the
-- range overlap operator in one exclusion constraint.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- The range is built inline rather than stored in a generated column, so the
-- Prisma schema stays the single description of the table's columns.
-- '[)' makes it half-open: an appointment ending at 15:00 and one starting at
-- 15:00 do not overlap.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "providerId" WITH =,
    (tstzrange("startsAt", "endsAt", '[)')) WITH &&
  )
  WHERE (
    "status" IN (
      'TEMPORARILY_RESERVED',
      'AWAITING_PAYMENT',
      'PAYMENT_PROOF_SUBMITTED',
      'CONFIRMED',
      'COMPLETED',
      'NO_SHOW'
    )
  );

-- A reserved window must be non-empty and correctly ordered.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_window_ordered"
  CHECK ("endsAt" > "startsAt" AND "serviceEndsAt" > "startsAt" AND "serviceEndsAt" <= "endsAt");

ALTER TABLE "time_blocks"
  ADD CONSTRAINT "time_blocks_window_ordered"
  CHECK ("endsAt" > "startsAt");

-- Money is stored in minor units and can never be negative.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_amounts_non_negative"
  CHECK ("totalAmount" >= 0 AND "depositAmount" >= 0 AND "balanceAmount" >= 0);

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_deposit_within_total"
  CHECK ("depositAmount" <= "totalAmount");

ALTER TABLE "services"
  ADD CONSTRAINT "services_duration_positive"
  CHECK ("durationMinutes" > 0 AND "bufferAfterMinutes" >= 0);

ALTER TABLE "services"
  ADD CONSTRAINT "services_price_non_negative"
  CHECK ("price" >= 0 AND "depositValue" >= 0);

-- Weekly opening rules live in minutes from local midnight.
ALTER TABLE "working_hours"
  ADD CONSTRAINT "working_hours_minutes_in_range"
  CHECK (
    "openMinute" >= 0 AND "openMinute" < 1440
    AND "closeMinute" > 0 AND "closeMinute" <= 2880
    AND ("breakStartMinute" IS NULL OR ("breakStartMinute" >= 0 AND "breakStartMinute" < 2880))
    AND ("breakEndMinute" IS NULL OR ("breakEndMinute" >= 0 AND "breakEndMinute" <= 2880))
  );

-- Index used by the expiration sweep and by the availability read path.
CREATE INDEX IF NOT EXISTS "appointments_pending_expiry_idx"
  ON "appointments" ("expiresAt")
  WHERE "status" IN (
    'TEMPORARILY_RESERVED',
    'AWAITING_PAYMENT',
    'PAYMENT_PROOF_SUBMITTED'
  );
