-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('ESSENTIEL', 'RENDEZ_VOUS', 'BUSINESS');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlanFeature" AS ENUM ('BOOKING', 'DEPOSITS', 'STAFF', 'GOOGLE_CALENDAR', 'QUOTES', 'REPORTS', 'TILL', 'REMINDERS', 'CUSTOM_DOMAIN');

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "extraModules" "PlanFeature"[],
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'ESSENTIEL',
ADD COLUMN     "renewalNoticeSentAt" TIMESTAMPTZ(3),
ADD COLUMN     "subscriptionEndsAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "periodEndsAt" TIMESTAMPTZ(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'MOBILE_MONEY',
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_payments_providerId_createdAt_idx" ON "subscription_payments"("providerId", "createdAt");

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Accounts that predate billing keep everything they already had: introducing
-- packages must not quietly take a feature away from someone already using it.
-- Accounts created from here on start on ESSENTIEL through the column default.
UPDATE "providers" SET "plan" = 'BUSINESS' WHERE "plan" = 'ESSENTIEL';
