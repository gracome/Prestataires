-- Online payment of the subscription, by the provider herself.
--
-- Additive: one enum and one table, nothing existing is altered.

DO $$ BEGIN
  CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "subscription_checkouts" (
  "id"                   TEXT NOT NULL,
  "providerId"           TEXT NOT NULL,
  "plan"                 "Plan" NOT NULL,
  "billingPeriod"        "BillingPeriod" NOT NULL,
  "extraModules"         "PlanFeature"[] NOT NULL DEFAULT ARRAY[]::"PlanFeature"[],
  "amount"               INTEGER NOT NULL,
  "currency"             TEXT NOT NULL,
  "gatewayTransactionId" TEXT,
  "status"               "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"               TIMESTAMPTZ(3),
  "createdAt"            TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "subscription_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_checkouts_gatewayTransactionId_key"
  ON "subscription_checkouts"("gatewayTransactionId");
CREATE INDEX IF NOT EXISTS "subscription_checkouts_providerId_createdAt_idx"
  ON "subscription_checkouts"("providerId", "createdAt");

ALTER TABLE "subscription_checkouts"
  ADD CONSTRAINT "subscription_checkouts_providerId_fkey" FOREIGN KEY ("providerId")
    REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
