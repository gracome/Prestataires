-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PROVIDER', 'STAFF', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ValidationMethod" AS ENUM ('NO_DEPOSIT', 'MANUAL_PAYMENT', 'ONLINE_PAYMENT');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'STARTING_FROM', 'QUOTE_ONLY');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('TEMPORARILY_RESERVED', 'AWAITING_PAYMENT', 'PAYMENT_PROOF_SUBMITTED', 'CONFIRMED', 'PAYMENT_REJECTED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TimeBlockType" AS ENUM ('TIME_OFF', 'HOLIDAY', 'MANUAL_BLOCK', 'EXTERNAL_CALENDAR');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'PROVIDER', 'SYSTEM');

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'DRAFT',
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "whatsappPrefill" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "country" TEXT,
    "mapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Porto-Novo',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "customDomain" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "providerId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PROVIDER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_settings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slotGranularityMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "minLeadTimeMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "holdDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "proofDeadlineMinutes" INTEGER NOT NULL DEFAULT 30,
    "verificationDeadlineMinutes" INTEGER NOT NULL DEFAULT 120,
    "syncToGoogleCalendar" BOOLEAN NOT NULL DEFAULT true,
    "blockOnGoogleBusy" BOOLEAN NOT NULL DEFAULT true,
    "requireCustomerEmail" BOOLEAN NOT NULL DEFAULT true,
    "allowCustomerCancellation" BOOLEAN NOT NULL DEFAULT true,
    "cancellationNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "cancellationPolicy" TEXT,
    "bookingTerms" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booking_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#B0797A',
    "secondaryColor" TEXT NOT NULL DEFAULT '#2F2A2B',
    "accentColor" TEXT NOT NULL DEFAULT '#E8C7A8',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FBF8F6',
    "surfaceColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textColor" TEXT NOT NULL DEFAULT '#2B2422',
    "mutedTextColor" TEXT NOT NULL DEFAULT '#6B5F5A',
    "headingFont" TEXT NOT NULL DEFAULT 'Playfair Display',
    "bodyFont" TEXT NOT NULL DEFAULT 'Inter',
    "buttonRadius" TEXT NOT NULL DEFAULT 'full',
    "layoutVariant" TEXT NOT NULL DEFAULT 'classic',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "showAbout" BOOLEAN NOT NULL DEFAULT true,
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "showPricing" BOOLEAN NOT NULL DEFAULT true,
    "showGallery" BOOLEAN NOT NULL DEFAULT true,
    "showHours" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showBooking" BOOLEAN NOT NULL DEFAULT true,
    "showContact" BOOLEAN NOT NULL DEFAULT true,
    "showFaq" BOOLEAN NOT NULL DEFAULT true,
    "showQuoteRequest" BOOLEAN NOT NULL DEFAULT false,
    "heroHeadline" TEXT,
    "heroSubheadline" TEXT,
    "aboutTitle" TEXT,
    "aboutBody" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "priceType" "PriceType" NOT NULL DEFAULT 'FIXED',
    "durationMinutes" INTEGER NOT NULL,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositType" "DepositType" NOT NULL DEFAULT 'NONE',
    "depositValue" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,
    "breakStartMinute" INTEGER,
    "breakEndMinute" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_blocks" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "TimeBlockType" NOT NULL DEFAULT 'MANUAL_BLOCK',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "externalEventId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "time_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerNote" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "serviceEndsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'TEMPORARILY_RESERVED',
    "validationMethod" "ValidationMethod" NOT NULL DEFAULT 'NO_DEPOSIT',
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "balanceAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "paymentSubmittedAt" TIMESTAMPTZ(3),
    "paymentVerifiedAt" TIMESTAMPTZ(3),
    "paymentRejectedAt" TIMESTAMPTZ(3),
    "paymentRejectionReason" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "googleEventId" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledBy" "CancelledBy",
    "cancellationReason" TEXT,
    "accessToken" TEXT NOT NULL,
    "providerNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_events" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedByUserId" TEXT,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_instructions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "googleAccount" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMPTZ(3) NOT NULL,
    "scope" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMPTZ(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "description" TEXT NOT NULL,
    "budgetAmount" INTEGER,
    "preferredDate" TIMESTAMPTZ(3),
    "attachmentKey" TEXT,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'NEW',
    "providerNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "succeeded" BOOLEAN,
    "detail" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_slug_key" ON "providers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "providers_customDomain_key" ON "providers"("customDomain");

-- CreateIndex
CREATE INDEX "providers_status_idx" ON "providers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_providerId_idx" ON "users"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "booking_settings_providerId_key" ON "booking_settings"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "themes_providerId_key" ON "themes"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_providerId_key" ON "site_settings"("providerId");

-- CreateIndex
CREATE INDEX "social_links_providerId_idx" ON "social_links"("providerId");

-- CreateIndex
CREATE INDEX "faq_items_providerId_idx" ON "faq_items"("providerId");

-- CreateIndex
CREATE INDEX "gallery_images_providerId_idx" ON "gallery_images"("providerId");

-- CreateIndex
CREATE INDEX "services_providerId_active_idx" ON "services"("providerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "services_providerId_slug_key" ON "services"("providerId", "slug");

-- CreateIndex
CREATE INDEX "working_hours_providerId_idx" ON "working_hours"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_providerId_dayOfWeek_key" ON "working_hours"("providerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "time_blocks_providerId_startsAt_endsAt_idx" ON "time_blocks"("providerId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "time_blocks_providerId_externalEventId_key" ON "time_blocks"("providerId", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_reference_key" ON "appointments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_accessToken_key" ON "appointments"("accessToken");

-- CreateIndex
CREATE INDEX "appointments_providerId_startsAt_idx" ON "appointments"("providerId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_providerId_status_idx" ON "appointments"("providerId", "status");

-- CreateIndex
CREATE INDEX "appointments_status_expiresAt_idx" ON "appointments"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "appointment_events_appointmentId_createdAt_idx" ON "appointment_events"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_proofs_appointmentId_idx" ON "payment_proofs"("appointmentId");

-- CreateIndex
CREATE INDEX "payment_instructions_providerId_active_idx" ON "payment_instructions"("providerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_providerId_key" ON "calendar_connections"("providerId");

-- CreateIndex
CREATE INDEX "quote_requests_providerId_status_idx" ON "quote_requests"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_dedupeKey_key" ON "notification_logs"("dedupeKey");

-- CreateIndex
CREATE INDEX "notification_logs_providerId_createdAt_idx" ON "notification_logs"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_providerId_createdAt_idx" ON "audit_logs"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "job_runs_name_startedAt_idx" ON "job_runs"("name", "startedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_instructions" ADD CONSTRAINT "payment_instructions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

