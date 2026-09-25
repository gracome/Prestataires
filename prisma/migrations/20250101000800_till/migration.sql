-- The till.
--
-- A provider records here the prestations she carried out and was paid for
-- outside the online booking journey: walk-ins, regulars who call, anyone who
-- never touched the form. Without it her reports would describe a fraction of
-- her own business.
--
-- Additive: one new type, one new table, no existing column touched.

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'MOBILE_MONEY',
  'CARD',
  'BANK_TRANSFER',
  'OTHER'
);

CREATE TABLE "sales" (
  "id"           TEXT NOT NULL,
  "providerId"   TEXT NOT NULL,
  "serviceId"    TEXT,
  -- What was sold, written down at the time: renaming a prestation later must
  -- not rewrite last month's till.
  "label"        TEXT NOT NULL,
  "amount"       INTEGER NOT NULL,
  "currency"     TEXT NOT NULL,
  "method"       "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "customerName" TEXT,
  "occurredAt"   TIMESTAMPTZ(3) NOT NULL,
  "note"         TEXT,
  "recordedById" TEXT,
  "createdAt"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- The day view and every report read by provider and date.
CREATE INDEX "sales_providerId_occurredAt_idx" ON "sales"("providerId", "occurredAt");
CREATE INDEX "sales_serviceId_idx" ON "sales"("serviceId");
CREATE INDEX "sales_recordedById_idx" ON "sales"("recordedById");

-- Deleting a provider takes her till with her.
ALTER TABLE "sales"
  ADD CONSTRAINT "sales_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "providers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Deleting a prestation or an account must never erase a day's takings, so
-- these detach instead of cascading.
ALTER TABLE "sales"
  ADD CONSTRAINT "sales_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
