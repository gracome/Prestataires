-- CreateEnum
CREATE TYPE "GatewayMode" AS ENUM ('SANDBOX', 'LIVE');

-- AlterEnum
ALTER TYPE "PlanFeature" ADD VALUE 'ONLINE_PAYMENT';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "gatewayProvider" TEXT,
ADD COLUMN     "gatewayTransactionId" TEXT;

-- CreateTable
CREATE TABLE "payment_gateway_accounts" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'fedapay',
    "mode" "GatewayMode" NOT NULL DEFAULT 'SANDBOX',
    "publicKey" TEXT NOT NULL,
    "secretKeyEncrypted" TEXT NOT NULL,
    "webhookSecretEncrypted" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_gateway_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_accounts_providerId_key" ON "payment_gateway_accounts"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_gatewayTransactionId_key" ON "appointments"("gatewayTransactionId");

-- AddForeignKey
ALTER TABLE "payment_gateway_accounts" ADD CONSTRAINT "payment_gateway_accounts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

